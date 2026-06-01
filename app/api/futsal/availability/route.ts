export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Map birthday time slot string → futsal hours blocked
// e.g. "09:00-12:00" → [9, 10, 11]
function timeSlotToHours(time: string): number[] {
  const match = time.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return [];
  const startH = parseInt(match[1]);
  const endH = parseInt(match[3]);
  const endM = parseInt(match[4]);
  const hours: number[] = [];
  for (let h = startH; h < endH + (endM > 0 ? 1 : 0); h++) {
    hours.push(h);
  }
  // Remove the last hour if end is exactly on the hour (e.g. 12:00 end → don't block 12)
  if (endM === 0 && hours[hours.length - 1] === endH) hours.pop();
  return hours;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Date manquante" }, { status: 400 });

  const settings = await prisma.settings.findMany();
  const getSetting = (key: string, fallback: string) =>
    settings.find((s) => s.key === key)?.value ?? fallback;
  const maxCourts = parseInt(getSetting("futsal_max_courts", "3"));

  // Determine if date is in a vacation period
  const dayDate = new Date(date + "T12:00:00Z");
  const vacationPeriods = await prisma.vacationPeriod.findMany({
    where: { startDate: { lte: dayDate }, endDate: { gte: dayDate } },
  });
  const isVacation = vacationPeriods.length > 0;

  // Schedule filtering: which hours are open for client booking
  const schedStartKey = isVacation ? "futsal_hours_vacation_start" : "futsal_hours_offvacation_start";
  const schedEndKey   = isVacation ? "futsal_hours_vacation_end"   : "futsal_hours_offvacation_end";
  const schedStart = parseInt(getSetting(schedStartKey, "10"));
  const schedEnd   = parseInt(getSetting(schedEndKey,   "22"));

  const slots = await prisma.futsalTimeSlot.findMany({
    where: {
      isActive: true,
      hour: { gte: schedStart, lte: schedEnd },
    },
    orderBy: [{ hour: "asc" }, { minute: "asc" }],
  });

  const start = new Date(date + "T00:00:00");
  const end = new Date(date + "T23:59:59");

  // 1. Futsal reservations
  const futsalReservations = await prisma.reservation.findMany({
    where: {
      type: "futsal",
      date: { gte: start, lte: end },
      status: { notIn: ["cancelled", "expired"] },
    },
    select: { futsalTimeSlotId: true, courtNumber: true },
  });

  // 2. Birthday+foot reservations (marmaille_foot or foot category) → block a court
  const birthdayFootReservations = await prisma.reservation.findMany({
    where: {
      type: "birthday",
      date: { gte: start, lte: end },
      status: { notIn: ["cancelled", "expired"] },
      formula: { category: { in: ["marmaille_foot", "foot"] } },
    },
    include: { timeSlot: true },
  });

  // Build blocked courts per slot id
  const bookedPerSlot: Record<string, number[]> = {};

  for (const r of futsalReservations) {
    if (!r.futsalTimeSlotId) continue;
    if (!bookedPerSlot[r.futsalTimeSlotId]) bookedPerSlot[r.futsalTimeSlotId] = [];
    if (r.courtNumber) bookedPerSlot[r.futsalTimeSlotId].push(r.courtNumber);
  }

  // Map birthday foot → futsal slot hours → use court 1 (or first available)
  // Birthday foot always occupies court 1 during those hours
  const birthdayFootBlockedHours: Set<number> = new Set();
  for (const r of birthdayFootReservations) {
    if (!r.timeSlot) continue;
    const hours = timeSlotToHours(r.timeSlot.time);
    for (const h of hours) birthdayFootBlockedHours.add(h);
  }

  // For each slot, if birthday foot blocks that hour, mark court 1 as booked
  for (const slot of slots) {
    if (birthdayFootBlockedHours.has(slot.hour)) {
      if (!bookedPerSlot[slot.id]) bookedPerSlot[slot.id] = [];
      if (!bookedPerSlot[slot.id].includes(1)) bookedPerSlot[slot.id].push(1); // court 1 reserved for bday
    }
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
      minute: slot.minute ?? 0,
      label: `${slot.hour}:${String(slot.minute ?? 0).padStart(2, "0")}`,
      totalCourts: maxCourts,
      availableCourts,
      available: availableCourts.length > 0,
      birthdayFootBlocked: birthdayFootBlockedHours.has(slot.hour),
    };
  });

  return NextResponse.json({
    slots: result,
    schedule: {
      isVacation,
      vacationLabel: isVacation ? vacationPeriods[0].label : null,
      startHour: schedStart,
      endHour: schedEnd,
    },
  });
}
