export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST { participantId } — confirm participant payment (demo or webhook)
export async function POST(req: NextRequest) {
  const { participantId } = await req.json();
  if (!participantId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const participant = await prisma.futsalParticipant.update({
    where: { id: participantId },
    data: { isPaid: true, paidAt: new Date() },
    include: {
      reservation: {
        include: { futsalTimeSlot: true },
      },
    },
  });

  // Send confirmation email to participant if they have an email
  if (participant.email) {
    const r = participant.reservation;
    const slot = r.futsalTimeSlot;
    const slotLabel = slot
      ? `${slot.hour}h${(slot as { minute?: number }).minute && (slot as { minute: number }).minute > 0 ? String((slot as { minute: number }).minute).padStart(2, "0") : "00"}`
      : "—";

    import("@/lib/email").then(({ sendConfirmationEmail }) => {
      sendConfirmationEmail({
        clientName: participant.name,
        clientEmail: participant.email!,
        reference: r.reference,
        formulaName: `Futsal — Terrain ${r.courtNumber} — Part équipe`,
        date: r.date,
        time: slotLabel,
        childrenCount: 1,
        totalPrice: participant.amountDue,
        depositAmount: 0,
        paymentType: "online_full",
        status: "confirmed",
        isBirthday: false,
      }).catch(console.error);
    });
  }

  return NextResponse.json({ success: true, participant });
}
