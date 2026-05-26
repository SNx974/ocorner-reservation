export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function auth(req: NextRequest) {
  return checkAuth(req.headers.get("x-admin-token")).valid;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slots = await prisma.futsalTimeSlot.findMany({ orderBy: [{ hour: "asc" }, { minute: "asc" }] });
  return NextResponse.json(slots);
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, isActive } = await req.json();
  const slot = await prisma.futsalTimeSlot.update({ where: { id }, data: { isActive } });
  return NextResponse.json(slot);
}

// Regenerate all slots for a given mode: "hour" or "half"
// "hour"  → 10h00, 11h00, ..., 21h00
// "half"  → 10h30, 11h30, ..., 21h30
// "both"  → 10h00, 10h30, 11h00, 11h30, ..., 21h00, 21h30
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mode } = await req.json() as { mode: "hour" | "half" | "both" };

  const minutes: number[] = mode === "hour" ? [0] : mode === "half" ? [30] : [0, 30];

  const entries: { hour: number; minute: number; isActive: boolean }[] = [];
  for (let h = 10; h <= 21; h++) {
    for (const m of minutes) {
      entries.push({ hour: h, minute: m, isActive: true });
    }
  }

  // Delete all existing slots that are NOT linked to any reservation
  const usedSlotIds = (
    await prisma.reservation.findMany({
      where: { futsalTimeSlotId: { not: null } },
      select: { futsalTimeSlotId: true },
    })
  )
    .map((r) => r.futsalTimeSlotId)
    .filter(Boolean) as string[];

  await prisma.futsalTimeSlot.deleteMany({
    where: { id: { notIn: usedSlotIds } },
  });

  // Create new slots
  await prisma.futsalTimeSlot.createMany({ data: entries, skipDuplicates: true });

  const slots = await prisma.futsalTimeSlot.findMany({ orderBy: [{ hour: "asc" }, { minute: "asc" }] });
  return NextResponse.json(slots);
}
