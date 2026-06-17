export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? "";
const IS_DEMO =
  !STRIPE_KEY ||
  STRIPE_KEY.includes("placeholder") ||
  STRIPE_KEY.endsWith("...") ||
  STRIPE_KEY === "sk_live_..." ||
  STRIPE_KEY === "sk_test_..." ||
  (!STRIPE_KEY.startsWith("sk_live_") && !STRIPE_KEY.startsWith("sk_test_") && !STRIPE_KEY.startsWith("rk_"));

const schema = z.object({
  shareToken: z.string(),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const reservation = await prisma.reservation.findUnique({
      where: { shareToken: data.shareToken },
      include: { participants: true },
    });
    if (!reservation) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    if (reservation.type !== "futsal") return NextResponse.json({ error: "Réservation invalide" }, { status: 400 });

    const playerCount = reservation.playerCount ?? 10;
    const alreadyJoined = reservation.participants.length;
    if (alreadyJoined >= playerCount) {
      return NextResponse.json({ error: "Toutes les places sont déjà prises" }, { status: 409 });
    }

    const amountDue = reservation.totalPrice / playerCount;

    let stripeClientSecret: string | undefined;
    let stripePaymentIntentId: string | undefined;

    if (!IS_DEMO) {
      const { stripe, formatAmountForStripe } = await import("@/lib/stripe");
      const intent = await stripe.paymentIntents.create({
        amount: formatAmountForStripe(amountDue),
        currency: "eur",
        metadata: { reference: reservation.reference, participant: data.name },
        description: `Part Foot à 5 ${reservation.reference} — ${data.name}`,
      });
      stripePaymentIntentId = intent.id;
      stripeClientSecret = intent.client_secret!;
    } else {
      stripeClientSecret = `demo_secret_participant_${Date.now()}`;
    }

    const participant = await prisma.futsalParticipant.create({
      data: {
        reservationId: reservation.id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        amountDue,
        stripePaymentIntentId,
        stripeClientSecret,
      },
    });

    return NextResponse.json({ participant, clientSecret: stripeClientSecret });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Participant error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { shareToken, participantId } = await req.json();

  const participant = await prisma.futsalParticipant.findUnique({
    where: { id: participantId },
    include: { reservation: true },
  });
  if (!participant || participant.reservation.shareToken !== shareToken) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const updated = await prisma.futsalParticipant.update({
    where: { id: participantId },
    data: { isPaid: true, paidAt: new Date() },
  });

  return NextResponse.json(updated);
}
