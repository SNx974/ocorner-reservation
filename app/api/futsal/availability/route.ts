export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Date manquante" }, { status: 400 });

  const settings = await prisma.settings.findMany();
  const getSetting = (key: string, fallback: string) =>
    settings.find((s) => s.key === key)?.value ?? fallback;
  const maxCourts = parseInt(getSetting("futsal_max_courts", "3"));

  const slots = await prisma.futsalTimeSlot.findMany({
    where: { isActive: true },
    orderBy: { hour: "asc" },
  });

  const start = new Date(date + "T00:00:00");
  const end = new Date(date + "T23:59:59");

  // Count active reservations per slot
  const reservations = await prisma.reservation.findMany({
    where: {
      type: "futsal",
      date: { gte: start, lte: end },
      status: { notIn: ["cancelled", "expired"] },
    },
    select: { futsalTimeSlotId: true, courtNumber: true },
  });

  const bookedPerSlot: Record<string, number[]> = {};
  for (const r of reservations) {
    if (!r.futsalTimeSlotId) continue;
    if (!bookedPerSlot[r.futsalTimeSlotId]) bookedPerSlot[r.futsalTimeSlotId] = [];
    if (r.courtNumber) bookedPerSlot[r.futsalTimeSlotId].push(r.courtNumber);
  }

  const result = slots.map((slot) => {
    const bookedCourts = bookedPerSlot[slot.id] ?? [];
    const availableCourts: number[] = [];
    for (let c = 1; c <= maxCourts; c++) {
      if (!bookedCourts.includes(c)) availableCourts.push(c);
    }
    return {
      id: slot.id,
      hour: slot.hour,
      label: `${slot.hour}:00`,
      totalCourts: maxCourts,
      availableCourts,
      available: availableCourts.length > 0,
    };
  });

  return NextResponse.json(result);
}
