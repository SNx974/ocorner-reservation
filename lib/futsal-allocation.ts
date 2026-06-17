import { prisma } from "@/lib/prisma";
import { birthdayTimeToHours } from "@/lib/utils";

export interface AllocationRow {
  futsalTimeSlotId: string;
  courtNumber: number;
}

export interface AllocationResult {
  ok: boolean;
  error?: string;
  rows: AllocationRow[];
}

const FOOT_CATEGORIES = ["marmaille_foot", "foot"];

export function isFootFormula(category?: string | null, name?: string | null): boolean {
  return FOOT_CATEGORIES.includes(category ?? "") || !!name?.toLowerCase().includes("foot");
}

/**
 * Allocate a futsal court to a birthday-foot session for its whole duration.
 *
 * Strategy:
 *  - find a court free across EVERY hour of the session → keep it for all hours
 *  - otherwise allocate the lowest free court per hour (fallback)
 *  - if any hour has no free court at all → block (ok: false)
 *
 * Does not write to the DB — returns the rows to attach to the reservation.
 */
export async function allocateFutsalCourts(opts: {
  date: string | Date;
  timeSlotTime: string;
  excludeReservationId?: string;
}): Promise<AllocationResult> {
  const hours = birthdayTimeToHours(opts.timeSlotTime);
  if (hours.length === 0) return { ok: true, rows: [] };

  const settings = await prisma.settings.findMany({ where: { key: "futsal_max_courts" } });
  const maxCourts = parseInt(settings.find(s => s.key === "futsal_max_courts")?.value ?? "3");

  // Resolve a FutsalTimeSlot (full hour) for each needed hour
  const slotRecords = await prisma.futsalTimeSlot.findMany({
    where: { hour: { in: hours }, minute: 0 },
  });
  const hourToSlotId = new Map<number, string>();
  for (const s of slotRecords) if (!hourToSlotId.has(s.hour)) hourToSlotId.set(s.hour, s.id);

  // Day range
  const dayStr = typeof opts.date === "string" ? opts.date.slice(0, 10) : opts.date.toISOString().slice(0, 10);
  const start = new Date(dayStr + "T00:00:00");
  const end = new Date(dayStr + "T23:59:59");

  // Booked courts per hour (from futsal + already-allocated birthday-foot)
  const bookedByHour = new Map<number, Set<number>>();
  for (const h of hours) bookedByHour.set(h, new Set<number>());

  const reservations = await prisma.reservation.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { notIn: ["cancelled", "expired"] },
      ...(opts.excludeReservationId ? { id: { not: opts.excludeReservationId } } : {}),
    },
    select: {
      type: true,
      courtNumber: true,
      futsalTimeSlot: { select: { hour: true } },
      futsalSlots: { select: { courtNumber: true, futsalTimeSlot: { select: { hour: true } } } },
      timeSlot: { select: { time: true } },
      formula: { select: { category: true, name: true } },
    },
  });

  for (const r of reservations) {
    if (r.futsalSlots.length > 0) {
      // New-style allocation (futsal carts + allocated birthday-foot)
      for (const s of r.futsalSlots) {
        const h = s.futsalTimeSlot?.hour;
        if (h !== undefined && bookedByHour.has(h)) bookedByHour.get(h)!.add(s.courtNumber);
      }
    } else if (r.type === "futsal" && r.futsalTimeSlot && r.courtNumber) {
      // Legacy single-slot futsal reservation
      const h = r.futsalTimeSlot.hour;
      if (bookedByHour.has(h)) bookedByHour.get(h)!.add(r.courtNumber);
    } else if (r.type === "birthday" && isFootFormula(r.formula?.category, r.formula?.name) && r.timeSlot) {
      // Legacy birthday-foot without allocation → blocks court 1
      for (const h of birthdayTimeToHours(r.timeSlot.time)) {
        if (bookedByHour.has(h)) bookedByHour.get(h)!.add(1);
      }
    }
  }

  // Free courts per hour (only hours that have a real slot to block)
  const targetHours = hours.filter(h => hourToSlotId.has(h));
  const freeByHour = new Map<number, number[]>();
  for (const h of targetHours) {
    const booked = bookedByHour.get(h) ?? new Set<number>();
    const free: number[] = [];
    for (let c = 1; c <= maxCourts; c++) if (!booked.has(c)) free.push(c);
    if (free.length === 0) {
      return { ok: false, error: `Aucun terrain de futsal disponible à ${h}h pour cette séance.`, rows: [] };
    }
    freeByHour.set(h, free);
  }

  // Prefer one court free across the whole session
  let common: number[] = [];
  for (let c = 1; c <= maxCourts; c++) {
    if (targetHours.every(h => freeByHour.get(h)!.includes(c))) common.push(c);
  }

  const rows: AllocationRow[] = targetHours.map(h => ({
    futsalTimeSlotId: hourToSlotId.get(h)!,
    courtNumber: common.length > 0 ? common[0] : freeByHour.get(h)![0],
  }));

  return { ok: true, rows };
}

/**
 * Allocate ONE free hour of foot for a birthday (the "1h offerte").
 * Picks the first free (hour, court) within the party window. Never blocks:
 * returns null if nothing is free (the booking proceeds, staff schedules later).
 */
export async function allocateOneFootHour(opts: {
  date: string | Date;
  timeSlotTime: string;
  excludeReservationId?: string;
}): Promise<AllocationRow | null> {
  const hours = birthdayTimeToHours(opts.timeSlotTime);
  if (hours.length === 0) return null;

  const settings = await prisma.settings.findMany({ where: { key: "futsal_max_courts" } });
  const maxCourts = parseInt(settings.find(s => s.key === "futsal_max_courts")?.value ?? "3");

  const slotRecords = await prisma.futsalTimeSlot.findMany({ where: { hour: { in: hours }, minute: 0 } });
  const hourToSlotId = new Map<number, string>();
  for (const s of slotRecords) if (!hourToSlotId.has(s.hour)) hourToSlotId.set(s.hour, s.id);

  const dayStr = typeof opts.date === "string" ? opts.date.slice(0, 10) : opts.date.toISOString().slice(0, 10);
  const start = new Date(dayStr + "T00:00:00");
  const end = new Date(dayStr + "T23:59:59");

  const bookedByHour = new Map<number, Set<number>>();
  for (const h of hours) bookedByHour.set(h, new Set<number>());

  const reservations = await prisma.reservation.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { notIn: ["cancelled", "expired"] },
      ...(opts.excludeReservationId ? { id: { not: opts.excludeReservationId } } : {}),
    },
    select: {
      type: true, courtNumber: true,
      futsalTimeSlot: { select: { hour: true } },
      futsalSlots: { select: { courtNumber: true, futsalTimeSlot: { select: { hour: true } } } },
      timeSlot: { select: { time: true } },
      formula: { select: { category: true, name: true } },
    },
  });

  for (const r of reservations) {
    if (r.futsalSlots.length > 0) {
      for (const s of r.futsalSlots) {
        const h = s.futsalTimeSlot?.hour;
        if (h !== undefined && bookedByHour.has(h)) bookedByHour.get(h)!.add(s.courtNumber);
      }
    } else if (r.type === "futsal" && r.futsalTimeSlot && r.courtNumber) {
      const h = r.futsalTimeSlot.hour;
      if (bookedByHour.has(h)) bookedByHour.get(h)!.add(r.courtNumber);
    } else if (r.type === "birthday" && isFootFormula(r.formula?.category, r.formula?.name) && r.timeSlot) {
      for (const h of birthdayTimeToHours(r.timeSlot.time)) {
        if (bookedByHour.has(h)) bookedByHour.get(h)!.add(1);
      }
    }
  }

  // First free (hour, court) in chronological order
  for (const h of hours) {
    if (!hourToSlotId.has(h)) continue;
    const booked = bookedByHour.get(h) ?? new Set<number>();
    for (let c = 1; c <= maxCourts; c++) {
      if (!booked.has(c)) return { futsalTimeSlotId: hourToSlotId.get(h)!, courtNumber: c };
    }
  }
  return null;
}
