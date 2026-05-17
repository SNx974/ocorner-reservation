export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST { participantId } — confirm participant payment (demo or webhook)
export async function POST(req: NextRequest) {
  const { participantId } = await req.json();
  if (!participantId) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

  const updated = await prisma.futsalParticipant.update({
    where: { id: participantId },
    data: { isPaid: true, paidAt: new Date() },
  });

  return NextResponse.json(updated);
}
