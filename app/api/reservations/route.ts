export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateReference,
  calculateDeposit,
  calculateExpiryDate,
  generateQRCode,
} from "@/lib/utils";
import { sendConfirmationEmail } from "@/lib/email";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const IS_DEMO = !STRIPE_KEY || STRIPE_KEY.includes("placeholder");

const reservationSchema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8),
  formulaId: z.string(),
  timeSlotId: z.string(),
  date: z.string(),
  childrenCount: z.number().int().positive(),
  paymentType: z.enum(["online_full", "onsite_deposit"]),
  depositPaymentMethod: z.enum(["online", "onsite"]).optional(),
  notes: z.string().optional(),
  promoCodeId: z.string().optional(),
  discountAmount: z.number().optional(),
});

async function createStripeIntent(amount: number, metadata: Record<string, string>, description: string, clientEmail?: string, clientName?: string) {
  const { stripe, formatAmountForStripe, getOrCreateStripeCustomer } = await import("@/lib/stripe");
  let customerId: string | undefined;
  if (clientEmail) {
    try { customerId = await getOrCreateStripeCustomer(clientEmail, clientName); } catch { /* silent */ }
  }
  const intent = await stripe.paymentIntents.create({
    amount: formatAmountForStripe(amount),
    currency: "eur",
    metadata,
    description,
    ...(customerId ? { customer: customerId } : {}),
    ...(clientEmail && !customerId ? { receipt_email: clientEmail } : {}),
  });
  return intent;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = reservationSchema.parse(body);

    // Check closed dates
    const bookingDate = new Date(data.date);
    bookingDate.setUTCHours(0, 0, 0, 0);
    const closedOnDate = await prisma.closedDate.findFirst({
      where: { date: bookingDate, OR: [{ type: "all" }, { type: "birthday" }] },
    });
    if (closedOnDate) {
      return NextResponse.json({ error: "Cette date n'est pas disponible à la réservation." }, { status: 400 });
    }

    const formula = await prisma.formula.findUnique({ where: { id: data.formulaId } });
    if (!formula) return NextResponse.json({ error: "Formule introuvable" }, { status: 404 });

    if (data.childrenCount < formula.minChildren) {
      return NextResponse.json(
        { error: `Minimum ${formula.minChildren} enfants requis pour cette formule` },
        { status: 400 }
      );
    }

    const timeSlot = await prisma.timeSlot.findUnique({ where: { id: data.timeSlotId } });
    if (!timeSlot) return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });

    const settings = await prisma.settings.findMany();
    const getSetting = (key: string, fallback: string) =>
      settings.find((s) => s.key === key)?.value ?? fallback;

    const depositPct = parseFloat(getSetting("deposit_percentage", "30"));
    const depositMin = parseFloat(getSetting("deposit_min_amount", "50"));
    const expiryHours = parseInt(getSetting("booking_expiry_hours", "72"));

    const basePrice = formula.pricePerChild * data.childrenCount;
    let appliedDiscountAmount = 0;
    let validatedPromoCodeId: string | undefined;

    if (data.promoCodeId) {
      const promo = await prisma.promoCode.findUnique({ where: { id: data.promoCodeId } });
      if (promo && promo.isActive) {
        appliedDiscountAmount = data.discountAmount ?? 0;
        validatedPromoCodeId = promo.id;
      }
    }

    const totalPrice = Math.max(0, basePrice - appliedDiscountAmount);
    const depositAmount = calculateDeposit(totalPrice, depositPct, depositMin);
    const reference = generateReference();
    const expiresAt = calculateExpiryDate(expiryHours);

    let status = "pending";
    let stripePaymentIntentId: string | undefined;
    let stripeDepositIntentId: string | undefined;
    let stripeClientSecret: string | undefined;
    let depositPaid = false;
    let fullPaymentPaid = false;

    // Si total = 0 (promo 100%), confirmer directement sans Stripe
    if (totalPrice === 0) {
      status = "confirmed";
      depositPaid = true;
      fullPaymentPaid = true;
    }

    const needsOnlinePayment =
      totalPrice > 0 && (
        data.paymentType === "online_full" ||
        (data.paymentType === "onsite_deposit" && data.depositPaymentMethod === "online")
      );

    if (!IS_DEMO && needsOnlinePayment) {
      // Real Stripe flow
      if (data.paymentType === "online_full") {
        const intent = await createStripeIntent(
          totalPrice,
          { reference, type: "full" },
          `Réservation ${reference} - ${formula.name}`,
          data.clientEmail,
          data.clientName,
        );
        stripePaymentIntentId = intent.id;
        stripeClientSecret = intent.client_secret!;
        status = "pending";
      } else {
        const intent = await createStripeIntent(
          depositAmount,
          { reference, type: "deposit" },
          `Acompte ${reference} - ${formula.name}`,
          data.clientEmail,
          data.clientName,
        );
        stripeDepositIntentId = intent.id;
        stripeClientSecret = intent.client_secret!;
        status = "deposit_pending";
      }
    } else if (IS_DEMO && needsOnlinePayment) {
      // Demo mode: return a fake clientSecret so the frontend shows the demo form
      stripeClientSecret = `demo_secret_${reference}`;
      status = data.paymentType === "online_full" ? "pending" : "deposit_pending";
    } else {
      // onsite_deposit + pay onsite
      status = "deposit_pending";
    }

    const reservation = await prisma.reservation.create({
      data: {
        reference,
        type: "birthday",
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        formulaId: data.formulaId,
        timeSlotId: data.timeSlotId,
        date: new Date(data.date),
        childrenCount: data.childrenCount,
        basePrice,
        totalPrice,
        discountAmount: appliedDiscountAmount,
        promoCodeId: validatedPromoCodeId,
        paymentType: data.paymentType,
        depositAmount,
        depositPaid,
        fullPaymentPaid,
        stripePaymentIntentId,
        stripeDepositIntentId,
        depositPaymentMethod: data.depositPaymentMethod,
        status,
        expiresAt: needsOnlinePayment || data.paymentType === "onsite_deposit" ? expiresAt : null,
        notes: data.notes,
      },
      include: { formula: true, timeSlot: true },
    });

    if (validatedPromoCodeId) {
      await prisma.promoCode.update({
        where: { id: validatedPromoCodeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    const qrData = JSON.stringify({ ref: reference, id: reservation.id });
    const qrCode = await generateQRCode(qrData);
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });

    sendConfirmationEmail({
      clientName: reservation.clientName,
      clientEmail: reservation.clientEmail,
      reference,
      formulaName: formula.name,
      date: reservation.date,
      time: timeSlot.time,
      childrenCount: data.childrenCount,
      totalPrice,
      depositAmount,
      paymentType: data.paymentType,
      status,
      qrCode,
      isBirthday: true,
    }).catch(console.error);

    return NextResponse.json({
      reservation: { ...reservation, qrCode },
      clientSecret: stripeClientSecret,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 400 });
    }
    console.error("Reservation error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "Référence manquante" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({
    where: { reference },
    include: { formula: true, timeSlot: true },
  });
  if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

  return NextResponse.json(reservation);
}
