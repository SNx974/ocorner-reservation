import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, format } from "date-fns";

// GET /api/availability?month=2026-05
// Returns for each day: { slotId: reservationCount }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // "2026-05"

  const ref = monthParam ? new Date(`${monthParam}-01`) : new Date();
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);

  // Fetch settings for max per slot
  const settings = await prisma.settings.findMany({
    where: { key: { in: ["max_per_slot", "birthday_max_per_slot"] } },
  });
  const maxPerSlot = parseInt(
    settings.find((s) => s.key === "birthday_max_per_slot")?.value ??
    settings.find((s) => s.key === "max_per_slot")?.value ?? "6"
  );

  // Only birthday reservations for this calendar
  const reservations = await prisma.reservation.findMany({
    where: {
      type: "birthday",
      date: { gte: start, lte: end },
      status: { notIn: ["cancelled", "expired"] },
    },
    select: { date: true, timeSlotId: true },
  });

  // Fetch all active slots
  const slots = await prisma.timeSlot.findMany({
    where: { isActive: true },
    orderBy: { time: "asc" },
  });

  // Build map: date -> slotId -> count
  const map: Record<string, Record<string, number>> = {};

  for (const r of reservations) {
    const day = format(new Date(r.date), "yyyy-MM-dd");
    if (!map[day]) map[day] = {};
    if (r.timeSlotId) map[day][r.timeSlotId] = (map[day][r.timeSlotId] ?? 0) + 1;
  }

  // Build response: for each day, compute availability per slot
  // Also add summary: totalAvailable for the day
  const result: Record<
    string,
    { slots: Record<string, { count: number; available: number; full: boolean }>; totalAvailable: number }
  > = {};

  // Generate all days of month
  const current = new Date(start);
  while (current <= end) {
    const day = format(current, "yyyy-MM-dd");
    const daySlots: Record<string, { count: number; available: number; full: boolean }> = {};
    let totalAvailable = 0;

    for (const slot of slots) {
      const count = map[day]?.[slot.id] ?? 0;
      const available = Math.max(0, maxPerSlot - count);
      daySlots[slot.id] = { count, available, full: available === 0 };
      totalAvailable += available;
    }

    result[day] = { slots: daySlots, totalAvailable };
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({ availability: result, maxPerSlot, slots });
}
