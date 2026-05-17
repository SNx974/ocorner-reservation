export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/partage?token=xxx  →  reservation + participants
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({
    where: { shareToken: token },
    include: {
      futsalTimeSlot: true,
      participants: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!reservation) return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });

  return NextResponse.json(reservation);
}
