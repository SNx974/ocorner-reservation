export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fallback confirmation: verify a Stripe Checkout session directly (does not
// depend on the webhook). Called by the success pages after the Stripe redirect.
export async function POST(req: NextRequest) {
  const { sessionId, reference } = await req.json();
  if (!reference) return NextResponse.json({ error: "Référence manquante" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({ where: { reference } });
  if (!reservation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Already paid (e.g. webhook already fired) → nothing to do
  if (reservation.fullPaymentPaid || reservation.depositPaid) {
    return NextResponse.json({ confirmed: true, alreadyPaid: true });
  }

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";
  const IS_DEMO = !STRIPE_KEY || STRIPE_KEY.includes("placeholder") || (!STRIPE_KEY.startsWith("sk_") && !STRIPE_KEY.startsWith("rk_"));
  if (IS_DEMO || !sessionId) {
    return NextResponse.json({ confirmed: false });
  }

  try {
    const { stripe } = await import("@/lib/stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ confirmed: false, paymentStatus: session.payment_status });
    }

    const type = (session.metadata?.type as string) ?? "";
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
    return NextResponse.json({ confirmed: true });
  } catch (e) {
    console.error("verify-session error", e);
    return NextResponse.json({ confirmed: false, error: "Vérification impossible" });
  }
}
