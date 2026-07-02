export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function auth(req: NextRequest) {
  const a = checkAuth(req.headers.get("x-admin-token"));
  if (!a.valid) return false;
  if (req.method !== "GET" && a.role !== "admin") return false; // moderators: read-only
  return true;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slots = await prisma.futsalTimeSlot.findMany({ orderBy: [{ hour: "asc" }, { minute: "asc" }] });
  return NextResponse.json(slots);
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.price !== undefined) {
    data.price = body.price === "" || body.price === null ? null : parseFloat(body.price);
  }
  const slot = await prisma.futsalTimeSlot.update({ where: { id: body.id }, data });
  return NextResponse.json(slot);
}

// Regenerate slots for a given mode: "hour" (10h00→22h00) or "half" (10h30→22h30)
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mode } = await req.json() as { mode: "hour" | "half" };

  const targetMinute = mode === "hour" ? 0 : 30;
  const otherMinute  = mode === "hour" ? 30 : 0;

  // Delete all slots of the OTHER type that are not linked to a reservation
  const usedSlotIds = (
    await prisma.reservation.findMany({
      where: { futsalTimeSlotId: { not: null } },
      select: { futsalTimeSlotId: true },
    })
  ).map((r) => r.futsalTimeSlotId).filter(Boolean) as string[];

  // Delete unlinked slots of the other type (clean duplicates / wrong mode)
  await prisma.futsalTimeSlot.deleteMany({
    where: { minute: otherMinute, id: { notIn: usedSlotIds } },
  });
  // Also delete unlinked duplicates of the target type
  await prisma.futsalTimeSlot.deleteMany({
    where: { minute: targetMinute, id: { notIn: usedSlotIds } },
  });

  // Find which hours already exist (from linked slots we couldn't delete)
  const existingSlots = await prisma.futsalTimeSlot.findMany({
    where: { minute: targetMinute },
    select: { hour: true },
  });
  const existingHours = new Set(existingSlots.map(s => s.hour));

  // Create only missing slots (9h → 22h)
  const toCreate: { hour: number; minute: number; isActive: boolean }[] = [];
  for (let h = 9; h <= 22; h++) {
    if (!existingHours.has(h)) {
      toCreate.push({ hour: h, minute: targetMinute, isActive: true });
    }
  }
  if (toCreate.length > 0) {
    await prisma.futsalTimeSlot.createMany({ data: toCreate });
  }

  const slots = await prisma.futsalTimeSlot.findMany({ orderBy: [{ hour: "asc" }, { minute: "asc" }] });
  return NextResponse.json(slots);
}
