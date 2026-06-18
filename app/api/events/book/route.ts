export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateReference, generateQRCode, calculateExpiryDate } from "@/lib/utils";
import { sendEventConfirmationEmail } from "@/lib/email";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const IS_DEMO =
  !STRIPE_KEY || STRIPE_KEY.includes("placeholder") ||
  (!STRIPE_KEY.startsWith("sk_live_") && !STRIPE_KEY.startsWith("sk_test_") && !STRIPE_KEY.startsWith("rk_"));

const schema = z.object({
  slug: z.string(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(6),
  seats: z.number().int().min(1).max(50),
});

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const event = await prisma.event.findUnique({ where: { slug: data.slug } });
    if (!event || !event.isActive) {
      return NextResponse.json({ error: "Événement indisponible" }, { status: 404 });
    }

    // Capacity check
    if (event.capacity != null) {
      const existing = await prisma.reservation.findMany({
        where: { eventId: event.id, status: { notIn: ["cancelled", "expired"] } },
        select: { playerCount: true },
      });
      const booked = existing.reduce((s, r) => s + (r.playerCount ?? 1), 0);
      if (booked + data.seats > event.capacity) {
        const left = Math.max(0, event.capacity - booked);
        return NextResponse.json({ error: left > 0 ? `Plus que ${left} place(s) disponible(s)` : "Événement complet" }, { status: 409 });
      }
    }

    const totalPrice = event.price * data.seats;
    const reference = generateReference();
    const expiresAt = calculateExpiryDate(parseInt(process.env.BOOKING_EXPIRY_HOURS ?? "72"));
    const dateLabel = new Date(event.eventDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

    let status = "pending";
    let stripeCheckoutSessionId: string | undefined;
    let stripePaymentIntentId: string | undefined;
    let checkoutUrl: string | undefined;
    let fullPaymentPaid = false;

    if (totalPrice === 0) {
      status = "confirmed"; fullPaymentPaid = true;
    } else if (!IS_DEMO) {
      const { stripe, formatAmountForStripe, getOrCreateStripeCustomer } = await import("@/lib/stripe");
      let customerId: string | undefined;
      try { customerId = await getOrCreateStripeCustomer(data.clientEmail, data.clientName); } catch { /* silent */ }
      const baseUrl = getBaseUrl(req);
      const piDescription = `Event "${event.title}" — ${data.clientName} — ${dateLabel} — ${reference}`.slice(0, 240);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: { name: `${event.title} — ${data.seats} place(s)` },
            unit_amount: formatAmountForStripe(event.price),
          },
          quantity: data.seats,
        }],
        metadata: { reference, type: "event_full", clientEmail: data.clientEmail },
        payment_intent_data: { description: piDescription },
        success_url: `${baseUrl}/event/success?reference=${reference}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/event/${event.slug}`,
        locale: "fr",
        ...(customerId ? { customer: customerId } : { customer_email: data.clientEmail }),
      });
      stripeCheckoutSessionId = session.id;
      if (typeof session.payment_intent === "string") stripePaymentIntentId = session.payment_intent;
      checkoutUrl = session.url!;
    } else {
      // Demo mode: confirm immediately
      status = "confirmed"; fullPaymentPaid = true;
    }

    const reservation = await prisma.reservation.create({
      data: {
        reference,
        type: "event",
        eventId: event.id,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        playerCount: data.seats,
        date: event.eventDate,
        totalPrice,
        basePrice: totalPrice,
        paymentType: "online_full",
        depositAmount: 0,
        fullPaymentPaid,
        ...(fullPaymentPaid ? { fullPaymentPaidAt: new Date() } : {}),
        stripeCheckoutSessionId,
        stripePaymentIntentId,
        status,
        expiresAt: status === "confirmed" ? null : expiresAt,
      },
    });

    const qrCode = await generateQRCode(JSON.stringify({ ref: reference, id: reservation.id, type: "event" }));
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });

    sendEventConfirmationEmail({
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      reference,
      eventTitle: event.title,
      eventDate: event.eventDate,
      seats: data.seats,
      total: totalPrice,
      priceNote: event.priceNote,
      qrCode,
      reservationId: reservation.id,
    }).catch(console.error);

    return NextResponse.json({
      reference,
      checkoutUrl: checkoutUrl ?? `${getBaseUrl(req)}/event/success?reference=${reference}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Event booking error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
