export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;

  try {
    if (webhookSecret && sig) {
      const { stripe } = await import("@/lib/stripe");
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_intent?: string | null;
      metadata?: Record<string, string>;
    };

    const reference = session.metadata?.reference;
    if (!reference) return NextResponse.json({ received: true });

    const reservation = await prisma.reservation.findUnique({ where: { reference } });
    if (!reservation) return NextResponse.json({ received: true });

    const type = session.metadata?.type ?? "";
    const isDeposit = type.includes("deposit");
    const piId = typeof session.payment_intent === "string" ? session.payment_intent : undefined;

    await prisma.reservation.update({
      where: { reference },
      data: {
        status: "confirmed",
        expiresAt: null,
        stripeCheckoutSessionId: session.id,
        ...(piId ? { stripePaymentIntentId: piId } : {}),
        depositPaid: isDeposit ? true : reservation.depositPaid,
        depositPaidAt: isDeposit && !reservation.depositPaid ? new Date() : reservation.depositPaidAt,
        depositPaymentMethod: isDeposit && !reservation.depositPaid ? "stripe" : reservation.depositPaymentMethod,
        fullPaymentPaid: !isDeposit ? true : reservation.fullPaymentPaid,
        fullPaymentPaidAt: !isDeposit && !reservation.fullPaymentPaid ? new Date() : reservation.fullPaymentPaidAt,
      },
    });
    console.log("Stripe: reservation " + reference + " confirmed (" + type + ")");
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as { id: string; metadata?: Record<string, string> };
    const reference = pi.metadata?.reference;
    if (reference) {
      const reservation = await prisma.reservation.findUnique({ where: { reference } });
      if (reservation && reservation.status !== "confirmed") {
        const isDeposit = (pi.metadata?.type ?? "").includes("deposit");
        await prisma.reservation.update({
          where: { reference },
          data: {
            status: "confirmed",
            expiresAt: null,
            depositPaid: isDeposit ? true : reservation.depositPaid,
            depositPaidAt: isDeposit && !reservation.depositPaid ? new Date() : reservation.depositPaidAt,
            depositPaymentMethod: isDeposit && !reservation.depositPaid ? "stripe" : reservation.depositPaymentMethod,
            fullPaymentPaid: !isDeposit ? true : reservation.fullPaymentPaid,
            fullPaymentPaidAt: !isDeposit && !reservation.fullPaymentPaid ? new Date() : reservation.fullPaymentPaidAt,
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
