import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { generateQRCode } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    const { reference, type } = intent.metadata;

    const reservation = await prisma.reservation.findUnique({ where: { reference } });
    if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

    if (type === "full") {
      await prisma.reservation.update({
        where: { reference },
        data: {
          status: "confirmed",
          fullPaymentPaid: true,
          fullPaymentPaidAt: new Date(),
          expiresAt: null,
        },
      });
    } else if (type === "deposit") {
      await prisma.reservation.update({
        where: { reference },
        data: {
          status: "confirmed",
          depositPaid: true,
          depositPaidAt: new Date(),
          expiresAt: null,
        },
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    const { reference } = intent.metadata;
    // Keep as deposit_pending — do NOT auto-cancel, let expiry handle it
    console.log(`Payment failed for reservation ${reference}`);
  }

  return NextResponse.json({ received: true });
}
