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

const cartSlotSchema = z.object({
  futsalTimeSlotId: z.string(),
  courtNumber: z.number().int().min(1).max(3),
});

const schema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(8),
  // Cart of (slot + court) lines — multiple allowed. Legacy single fields kept for compat.
  slots: z.array(cartSlotSchema).min(1).optional(),
  futsalTimeSlotId: z.string().optional(),
  courtNumber: z.number().int().min(1).max(3).optional(),
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
  clientName?: string,
  piDescription?: string,
) {
  const { stripe, formatAmountForStripe, getOrCreateStripeCustomer } = await import("@/lib/stripe");
  let customerId: string | undefined;
  if (metadata.clientEmail) {
    try { customerId = await getOrCreateStripeCustomer(metadata.clientEmail, clientName); } catch { /* silent */ }
  }
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
    // Description shown in the Stripe payments list (on the underlying PaymentIntent)
    ...(piDescription ? { payment_intent_data: { description: piDescription } } : {}),
    success_url: `${baseUrl}/futsal/success?reference=${reference}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/futsal/reserver`,
    locale: "fr",
    ...(customerId ? { customer: customerId } : { customer_email: metadata.clientEmail }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const settings = await prisma.settings.findMany();
    const getSetting = (key: string, fallback: string) =>
      settings.find((s) => s.key === key)?.value ?? fallback;

    // Check closed dates
    const bookingDate = new Date(data.date);
    bookingDate.setUTCHours(0, 0, 0, 0);
    const closedOnDate = await prisma.closedDate.findFirst({
      where: { date: bookingDate, OR: [{ type: "all" }, { type: "futsal" }] },
    });
    if (closedOnDate) {
      return NextResponse.json({ error: "Cette date n'est pas disponible à la réservation." }, { status: 400 });
    }

    // Check vacation schedule
    const dayMid = new Date(data.date + "T12:00:00Z");
    const vacPeriods = await prisma.vacationPeriod.findMany({
      where: { startDate: { lte: dayMid }, endDate: { gte: dayMid } },
    });
    const isVacation = vacPeriods.length > 0;

    // Normalize the cart (multi-slot) — accept `slots` array or legacy single slot
    const cart = (data.slots && data.slots.length > 0)
      ? data.slots
      : (data.futsalTimeSlotId && data.courtNumber
          ? [{ futsalTimeSlotId: data.futsalTimeSlotId, courtNumber: data.courtNumber }]
          : []);
    if (cart.length === 0) {
      return NextResponse.json({ error: "Aucun créneau sélectionné" }, { status: 400 });
    }
    // Reject internal duplicates (same slot + court twice)
    const seenKeys = new Set<string>();
    for (const c of cart) {
      const k = `${c.futsalTimeSlotId}:${c.courtNumber}`;
      if (seenKeys.has(k)) return NextResponse.json({ error: "Créneau en double dans le panier" }, { status: 400 });
      seenKeys.add(k);
    }

    // Load all selected slots
    const slotIds = Array.from(new Set(cart.map(c => c.futsalTimeSlotId)));
    const slotRecords = await prisma.futsalTimeSlot.findMany({ where: { id: { in: slotIds } } });
    const slotById = new Map(slotRecords.map(s => [s.id, s]));
    for (const c of cart) {
      if (!slotById.has(c.futsalTimeSlotId)) return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
    }

    // Enforce per-day schedule
    const schedKey = isVacation ? "futsal_schedule_vacation" : "futsal_schedule_offvacation";
    const schedRaw = getSetting(schedKey, "");
    type DaySched = { open: boolean; start: number; end: number };
    const defaultSched: Record<number, DaySched> = isVacation
      ? { 0:{open:true,start:9,end:19},1:{open:true,start:9,end:23},2:{open:true,start:9,end:23},3:{open:true,start:9,end:23},4:{open:true,start:9,end:23},5:{open:true,start:9,end:23},6:{open:true,start:9,end:20} }
      : { 0:{open:true,start:9,end:19},1:{open:true,start:15,end:23},2:{open:true,start:15,end:23},3:{open:true,start:9,end:23},4:{open:true,start:15,end:23},5:{open:true,start:9,end:23},6:{open:true,start:9,end:20} };
    let weekSched: Record<number, DaySched> = { ...defaultSched };
    try { if (schedRaw) weekSched = { ...defaultSched, ...JSON.parse(schedRaw) }; } catch { /* use defaults */ }
    const dow = new Date(data.date + "T12:00:00Z").getUTCDay();
    const dayConfig = weekSched[dow] ?? { open: true, start: 10, end: 22 };
    if (!dayConfig.open) {
      return NextResponse.json({ error: "Le futsal est fermé ce jour." }, { status: 400 });
    }

    const offpeakPrice = parseFloat(getSetting("futsal_price_offpeak", getSetting("futsal_court_price", "90")));
    const peakPrice = parseFloat(getSetting("futsal_price_peak", getSetting("futsal_court_price", "110")));
    const peakHour = parseInt(getSetting("futsal_price_peak_from", "17"));
    const minPlayers = parseInt(getSetting("futsal_min_players", "10"));
    const depositPct = parseFloat(getSetting("futsal_deposit_percentage", "30"));
    const depositMin = parseFloat(getSetting("futsal_deposit_min_amount", "30"));
    const expiryHours = parseInt(getSetting("booking_expiry_hours", "72"));

    if (data.playerCount < minPlayers) {
      return NextResponse.json({ error: `Minimum ${minPlayers} joueurs requis` }, { status: 400 });
    }

    // Validate each slot against the day schedule + compute base price (sum of slots)
    let basePrice = 0;
    for (const c of cart) {
      const s = slotById.get(c.futsalTimeSlotId)!;
      if (s.hour < dayConfig.start || s.hour > dayConfig.end) {
        return NextResponse.json({ error: `Le créneau ${s.hour}h n'est pas disponible (ouverture de ${dayConfig.start}h à ${dayConfig.end}h).` }, { status: 400 });
      }
      basePrice += s.hour >= peakHour ? peakPrice : offpeakPrice;
    }

    // Check court availability across all selected slots (legacy + cart rows)
    const start = new Date(data.date + "T00:00:00");
    const end = new Date(data.date + "T23:59:59");
    const existingRes = await prisma.reservation.findMany({
      where: {
        type: "futsal",
        date: { gte: start, lte: end },
        status: { notIn: ["cancelled", "expired"] },
      },
      select: {
        futsalTimeSlotId: true, courtNumber: true,
        futsalSlots: { select: { futsalTimeSlotId: true, courtNumber: true } },
      },
    });
    const bookedKeys = new Set<string>();
    for (const r of existingRes) {
      if (r.futsalSlots.length > 0) {
        for (const s of r.futsalSlots) bookedKeys.add(`${s.futsalTimeSlotId}:${s.courtNumber}`);
      } else if (r.futsalTimeSlotId && r.courtNumber) {
        bookedKeys.add(`${r.futsalTimeSlotId}:${r.courtNumber}`);
      }
    }
    for (const c of cart) {
      if (bookedKeys.has(`${c.futsalTimeSlotId}:${c.courtNumber}`)) {
        const s = slotById.get(c.futsalTimeSlotId)!;
        return NextResponse.json({ error: `Le terrain ${c.courtNumber} est déjà réservé à ${s.hour}h` }, { status: 409 });
      }
    }

    // Human-readable labels for Stripe + email
    const sortedCart = cart
      .map(c => ({ court: c.courtNumber, slot: slotById.get(c.futsalTimeSlotId)! }))
      .sort((a, b) => a.slot.hour - b.slot.hour || a.slot.minute - b.slot.minute || a.court - b.court);
    const slotsLabel = sortedCart
      .map(c => `${c.slot.hour}h${c.slot.minute > 0 ? String(c.slot.minute).padStart(2, "0") : "00"} T${c.court}`)
      .join(", ");
    const courtsList = Array.from(new Set(cart.map(c => c.courtNumber))).sort((a, b) => a - b).join(", ");
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
      const description = (data.paymentType === "online_full"
        ? `Futsal ${slotsLabel} – ${data.playerCount} joueurs`
        : `Acompte Futsal ${slotsLabel}`).slice(0, 240);
      // Description shown in the Stripe payments list: "Nom — Terrain X — Date — Réf"
      const dateLabel = new Date(data.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      const piDescription = (`${data.clientName} — Terrain ${courtsList} — ${dateLabel} — ${reference}`).slice(0, 240);
      const finalPiDescription = data.paymentType === "online_full" ? piDescription : `Acompte — ${piDescription}`;
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
        data.clientName,
        finalPiDescription,
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
        futsalTimeSlotId: cart[0].futsalTimeSlotId,
        courtNumber: cart[0].courtNumber,
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
        futsalSlots: {
          create: cart.map(c => ({ futsalTimeSlotId: c.futsalTimeSlotId, courtNumber: c.courtNumber })),
        },
      },
      include: { futsalTimeSlot: true, futsalSlots: { include: { futsalTimeSlot: true } } },
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
      formulaName: `Futsal — Terrain ${courtsList} — ${data.playerCount} joueurs`,
      date: reservation.date,
      time: slotsLabel,
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
      include: { futsalTimeSlot: true, futsalSlots: { include: { futsalTimeSlot: true } }, participants: true },
    });
    if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(r);
  }

  if (shareToken) {
    const r = await prisma.reservation.findUnique({
      where: { shareToken },
      include: { futsalTimeSlot: true, futsalSlots: { include: { futsalTimeSlot: true } }, participants: { orderBy: { createdAt: "asc" } } },
    });
    if (!r) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    return NextResponse.json(r);
  }

  return NextResponse.json({ error: "Paramètre manquant" }, { status: 400 });
}
