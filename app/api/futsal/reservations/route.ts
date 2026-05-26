export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateReference, calculateDeposit, calculateExpiryDate, generateQRCode } from "@/lib/utils";
import { sendConfirmationEmail } from "@/lib/email";
import crypto from "crypto";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";
// Demo mode: no key, placeholder text, or the key ends with "..." (not filled in yet)
const IS_DEMO =
  !STRIPE_KEY ||
  STRIPE_KEY.includes("placeholder") ||
  STRIPE_KEY.endsWith("...") ||
  STRIPE_KEY === "sk_live_..." ||
  STRIPE_KEY === "sk_test_..." ||
  (!STRIPE_KEY.startsWith("sk_live_") && !STRIPE_KEY.startsWith("sk_test_") && !STRIPE_KEY.startsWith("rk_"));

const schema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8),
  futsalTimeSlotId: z.string(),
  courtNumber: z.number().int().min(1).max(3),
  date: z.string(),
  playerCount: z.number().int().min(10),
  paymentType: z.enum(["online_full", "onsite_deposit"]),
  notes: z.string().optional(),
  promoCodeId: z.string().optional(),
  discountAmount: z.number().optional(),
});

// Build base URL from the request (works in all environments)
function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function createCheckoutSession(
  amount: number,
  description: string,
  metadata: Record<string, string>,
  reference: string,
  baseUrl: string,
) {
  const { stripe, formatAmountForStripe } = await import("@/lib/stripe");
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: description },
        unit_amount: formatAmountForStripe(amount),
      },
      quantity: 1,
    }],
    metadata,
    success_url: `${baseUrl}/futsal/success?reference=${reference}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/futsal/reserver`,
    locale: "fr",
    customer_email: metadata.clientEmail,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const settings = await prisma.settings.findMany();
    const getSetting = (key: string, fallback: string) =>
      settings.find((s) => s.key === key)?.value ?? fallback;

    const courtPrice = parseFloat(getSetting("futsal_court_price", getSetting("futsal_price_per_player", "110")));
    const minPlayers = parseInt(getSetting("futsal_min_players", "10"));
    const depositPct = parseFloat(getSetting("futsal_deposit_percentage", "30"));
    const depositMin = parseFloat(getSetting("futsal_deposit_min_amount", "30"));
    const expiryHours = parseInt(getSetting("booking_expiry_hours", "72"));

    if (data.playerCount < minPlayers) {
      return NextResponse.json({ error: `Minimum ${minPlayers} joueurs requis` }, { status: 400 });
    }

    const slot = await prisma.futsalTimeSlot.findUnique({ where: { id: data.futsalTimeSlotId } });
    if (!slot) return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });

    // Check court availability
    const start = new Date(data.date + "T00:00:00");
    const end = new Date(data.date + "T23:59:59");
    const existing = await prisma.reservation.findFirst({
      where: {
        type: "futsal",
        futsalTimeSlotId: data.futsalTimeSlotId,
        courtNumber: data.courtNumber,
        date: { gte: start, lte: end },
        status: { notIn: ["cancelled", "expired"] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Ce terrain est déjà réservé pour ce créneau" }, { status: 409 });
    }

    const basePrice = courtPrice;
    let appliedDiscount = 0;
    let validatedPromoId: string | undefined;

    if (data.promoCodeId) {
      const promo = await prisma.promoCode.findUnique({ where: { id: data.promoCodeId } });
      if (promo?.isActive) {
        appliedDiscount = data.discountAmount ?? 0;
        validatedPromoId = promo.id;
      }
    }

    const totalPrice = Math.max(0, basePrice - appliedDiscount);
    const depositAmount = calculateDeposit(totalPrice, depositPct, depositMin);
    const reference = generateReference();
    const expiresAt = calculateExpiryDate(expiryHours);
    const shareToken = crypto.randomUUID();
    const baseUrl = getBaseUrl(req);

    let status = "pending";
    let stripePaymentIntentId: string | undefined;
    let stripeDepositIntentId: string | undefined;
    let stripeCheckoutSessionId: string | undefined;
    let checkoutUrl: string | undefined;

    // Free (100% promo): confirm immediately, no Stripe
    if (totalPrice === 0) {
      status = "confirmed";
    } else if (!IS_DEMO) {
      // Real Stripe: create Checkout Session
      const slotLabel = `${slot.hour}h${slot.minute > 0 ? String(slot.minute).padStart(2, "0") : "00"}`;
      const description = data.paymentType === "online_full"
        ? `Terrain ${data.courtNumber} – Futsal ${slotLabel} – ${data.playerCount} joueurs`
        : `Acompte Terrain ${data.courtNumber} – Futsal ${slotLabel}`;
      const amountToPay = data.paymentType === "online_full" ? totalPrice : depositAmount;
      const session = await createCheckoutSession(
        amountToPay,
        description,
        {
          reference,
          type: data.paymentType === "online_full" ? "futsal_full" : "futsal_deposit",
          clientEmail: data.clientEmail,
        },
        reference,
        baseUrl,
      );
      stripeCheckoutSessionId = session.id;
      // Also store the payment intent ID if available
      if (typeof session.payment_intent === "string") {
        stripePaymentIntentId = session.payment_intent;
      }
      checkoutUrl = session.url!;
      status = data.paymentType === "online_full" ? "pending" : "deposit_pending";
    } else {
      // Demo mode: simulate
      status = data.paymentType === "online_full" ? "pending" : "deposit_pending";
    }

    const reservation = await prisma.reservation.create({
      data: {
        reference,
        type: "futsal",
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        futsalTimeSlotId: data.futsalTimeSlotId,
        courtNumber: data.courtNumber,
        playerCount: data.playerCount,
        date: new Date(data.date),
        basePrice,
        totalPrice,
        discountAmount: appliedDiscount,
        promoCodeId: validatedPromoId,
        paymentType: data.paymentType,
        depositAmount,
        depositPaid: false,
        fullPaymentPaid: totalPrice === 0,
        stripePaymentIntentId,
        stripeDepositIntentId,
        stripeCheckoutSessionId,
        status,
        expiresAt,
        notes: data.notes,
        shareToken,
      },
      include: { futsalTimeSlot: true },
    });

    if (validatedPromoId) {
      await prisma.promoCode.update({ where: { id: validatedPromoId }, data: { usageCount: { increment: 1 } } });
    }

    const qrData = JSON.stringify({ ref: reference, id: reservation.id, type: "futsal" });
    const qrCode = await generateQRCode(qrData);
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });

    sendConfirmationEmail({
      clientName: reservation.clientName,
      clientEmail: reservation.clientEmail,
      reference,
      formulaName: `Futsal — Terrain ${data.courtNumber} — ${data.playerCount} joueurs`,
      date: reservation.date,
      time: `${slot.hour}h${slot.minute > 0 ? String(slot.minute).padStart(2, "0") : "00"}`,
      childrenCount: data.playerCount,
      totalPrice,
      depositAmount,
      paymentType: data.paymentType,
      status,
      qrCode,
    }).catch(console.error);

    return NextResponse.json({
      reservation: { ...reservation, qrCode, shareToken },
      // Demo mode: client secret for simulation
      clientSecret: IS_DEMO && totalPrice > 0 ? `demo_secret_${reference}` : undefined,
      // Real Stripe: redirect URL
      checkoutUrl,
      // Free
      demoMode: IS_DEMO && totalPrice > 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 400 });
    }
    console.error("Futsal reservation error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference");
  const shareToken = searchParams.get("shareToken");

  if (reference) {
    const r = await prisma.reservation.findUnique({
      where: { reference },
      include: { futsalTimeSlot: true, participants: true },
    });
    if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(r);
  }

  if (shareToken) {
    const r = await prisma.reservation.findUnique({
      where: { shareToken },
      include: { futsalTimeSlot: true, participants: { orderBy: { createdAt: "asc" } } },
    });
    if (!r) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    return NextResponse.json(r);
  }

  return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });
}
