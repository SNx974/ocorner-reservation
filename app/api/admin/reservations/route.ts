export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/utils";
import { sendCancellationEmail, sendRescheduleEmail, sendConfirmationEmail } from "@/lib/email";
import { allocateFutsalCourts, isFootFormula } from "@/lib/futsal-allocation";

function checkAdminAuth(req: NextRequest): boolean {
  return checkAuth(req.headers.get("x-admin-token")).valid;
}

// Build + send a confirmation email from a reservation (birthday or foot à 5)
function sendReservationConfirmation(r: {
  type: string; clientName: string; clientEmail: string; reference: string; date: Date;
  formula?: { name: string } | null; timeSlot?: { time: string } | null;
  futsalTimeSlot?: { hour: number; minute: number } | null;
  childrenCount?: number; playerCount?: number | null; courtNumber?: number | null;
  totalPrice: number; depositAmount: number; paymentType: string; status: string; qrCode?: string | null;
}) {
  const isFutsal = r.type === "futsal";
  const time = r.timeSlot?.time
    ?? (r.futsalTimeSlot ? `${r.futsalTimeSlot.hour}h${r.futsalTimeSlot.minute > 0 ? String(r.futsalTimeSlot.minute).padStart(2, "0") : "00"}` : "—");
  return sendConfirmationEmail({
    clientName: r.clientName,
    clientEmail: r.clientEmail,
    reference: r.reference,
    formulaName: r.formula?.name ?? (isFutsal ? `Foot à 5 — Terrain ${r.courtNumber ?? ""}`.trim() : "Réservation"),
    date: r.date,
    time,
    childrenCount: isFutsal ? (r.playerCount ?? 0) : (r.childrenCount ?? 0),
    totalPrice: r.totalPrice,
    depositAmount: r.depositAmount,
    paymentType: r.paymentType,
    status: r.status,
    qrCode: r.qrCode ?? undefined,
    isBirthday: !isFutsal,
  });
}

// A "real" client email (not the admin placeholder)
function isRealEmail(email?: string): boolean {
  return !!email && email.includes("@") && !email.startsWith("admin+");
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const formulaId = searchParams.get("formulaId");
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // Auto-expire stale reservations
  await prisma.reservation.updateMany({
    where: {
      status: { in: ["pending", "deposit_pending"] },
      expiresAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (formulaId) where.formulaId = formulaId;
  if (type) where.type = type;
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    where.date = { gte: d, lt: next };
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: { formula: true, timeSlot: true, futsalTimeSlot: true, futsalSlots: { include: { futsalTimeSlot: true } }, participants: true, promoCode: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return NextResponse.json({ reservations, total, page, limit });
}

// POST — admin manual reservation creation (confirmed, no payment)
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { generateReference, generateQRCode } = await import("@/lib/utils");

  const reference = generateReference();

  // Birthday reservation
  if (body.type === "birthday") {
    const { clientName, clientEmail, clientPhone, formulaId, timeSlotId, date, childrenCount, notes, customPrice, amountPaid, paymentNote } = body;
    const formula = await prisma.formula.findUnique({ where: { id: formulaId } });
    const autoPrice = formula ? formula.pricePerChild * parseInt(childrenCount) : 0;
    const totalPrice = customPrice !== undefined && customPrice !== "" ? parseFloat(customPrice) : autoPrice;
    const paid = amountPaid !== undefined && amountPaid !== "" ? parseFloat(amountPaid) : totalPrice;
    const depositPaid = paid >= totalPrice || paid > 0;
    const fullPaymentPaid = paid >= totalPrice;
    const depositAmount = paid < totalPrice ? paid : 0;
    const adminNotes = [notes, paymentNote ? `Paiement: ${paymentNote}` : ""].filter(Boolean).join(" | ");

    // Custom time range (e.g. "14:00-18:00") → reuse or create an INACTIVE TimeSlot
    // (inactive so it never shows up on the public calendar).
    let effectiveTimeSlotId = timeSlotId;
    if (body.customTime && String(body.customTime).trim()) {
      const t = String(body.customTime).trim();
      let ts = await prisma.timeSlot.findFirst({ where: { time: t } });
      if (!ts) ts = await prisma.timeSlot.create({ data: { time: t, isActive: false } });
      effectiveTimeSlotId = ts.id;
    }

    // Birthday-foot: reserve a futsal court for the whole session
    let footSlots: { futsalTimeSlotId: string; courtNumber: number }[] = [];
    if (isFootFormula(formula?.category, formula?.name)) {
      const slot = await prisma.timeSlot.findUnique({ where: { id: effectiveTimeSlotId } });
      if (slot) {
        const alloc = await allocateFutsalCourts({ date, timeSlotTime: slot.time });
        if (!alloc.ok) return NextResponse.json({ error: alloc.error }, { status: 409 });
        footSlots = alloc.rows;
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        reference, type: "birthday",
        clientName, clientEmail: clientEmail || `admin+${reference}@ocorner.re`,
        clientPhone: clientPhone || "0000000000",
        formulaId, timeSlotId: effectiveTimeSlotId,
        date: new Date(date),
        childrenCount: parseInt(childrenCount),
        totalPrice, basePrice: autoPrice,
        paymentType: "admin", depositAmount,
        depositPaid, fullPaymentPaid,
        ...(depositPaid ? { depositPaidAt: new Date(), depositPaymentMethod: "onsite" } : {}),
        ...(fullPaymentPaid ? { fullPaymentPaidAt: new Date() } : {}),
        status: "confirmed",
        notes: adminNotes || undefined,
        ...(footSlots.length ? { futsalSlots: { create: footSlots } } : {}),
      },
      include: { formula: true, timeSlot: true },
    });
    const qrCode = await generateQRCode(JSON.stringify({ ref: reference, id: reservation.id, type: "birthday" }));
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });
    // Auto-send confirmation if a real client email was provided
    if (isRealEmail(clientEmail)) {
      sendReservationConfirmation({ ...reservation, qrCode }).catch(console.error);
    }
    return NextResponse.json(reservation);
  }

  // Futsal reservation
  if (body.type === "futsal") {
    const { clientName, clientEmail, clientPhone, futsalTimeSlotId, courtNumber, slots, date, playerCount, notes, amountPaid, paymentMethod } = body;
    const settings = await prisma.settings.findMany();
    const getSetting = (key: string, fallback: string) => settings.find(s => s.key === key)?.value ?? fallback;
    const offpeakPrice = parseFloat(getSetting("futsal_price_offpeak", getSetting("futsal_court_price", "90")));
    const peakPrice = parseFloat(getSetting("futsal_price_peak", getSetting("futsal_court_price", "110")));
    const peakHour = parseInt(getSetting("futsal_price_peak_from", "17"));

    // Normalize cart (multi-slot) — accept `slots` array or legacy single slot
    const cart: Array<{ futsalTimeSlotId: string; courtNumber: number }> =
      Array.isArray(slots) && slots.length > 0
        ? slots.map((s: { futsalTimeSlotId: string; courtNumber: number | string }) => ({ futsalTimeSlotId: s.futsalTimeSlotId, courtNumber: parseInt(String(s.courtNumber)) }))
        : (futsalTimeSlotId ? [{ futsalTimeSlotId, courtNumber: parseInt(courtNumber) }] : []);
    if (cart.length === 0) return NextResponse.json({ error: "Aucun créneau sélectionné" }, { status: 400 });

    // Load slots + compute total (sum of peak/offpeak per slot)
    const slotRecords = await prisma.futsalTimeSlot.findMany({ where: { id: { in: cart.map(c => c.futsalTimeSlotId) } } });
    const slotById = new Map(slotRecords.map(s => [s.id, s]));
    let totalPrice = 0;
    for (const c of cart) {
      const h = slotById.get(c.futsalTimeSlotId)?.hour ?? 10;
      totalPrice += h >= peakHour ? peakPrice : offpeakPrice;
    }

    const paid = amountPaid !== undefined && amountPaid !== "" ? parseFloat(amountPaid) : totalPrice;
    const fullPaymentPaid = paid >= totalPrice;
    const depositPaid = paid > 0;
    const depositAmount = paid < totalPrice ? paid : 0;
    const paymentLabel = paymentMethod === "cb" ? "CB" : paymentMethod === "especes" ? "Espèces" : "";
    const adminNotes = [notes, paymentLabel ? `Paiement: ${paymentLabel}` : ""].filter(Boolean).join(" | ");
    const reservation = await prisma.reservation.create({
      data: {
        reference, type: "futsal",
        clientName, clientEmail: clientEmail || `admin+${reference}@ocorner.re`,
        clientPhone: clientPhone || "0000000000",
        futsalTimeSlotId: cart[0].futsalTimeSlotId, courtNumber: cart[0].courtNumber,
        date: new Date(date), playerCount: parseInt(playerCount),
        totalPrice, basePrice: totalPrice,
        paymentType: "admin", depositAmount,
        depositPaid, fullPaymentPaid,
        ...(depositPaid ? { depositPaidAt: new Date(), depositPaymentMethod: paymentMethod === "cb" ? "cb" : "onsite" } : {}),
        ...(fullPaymentPaid ? { fullPaymentPaidAt: new Date() } : {}),
        status: "confirmed",
        notes: adminNotes || undefined,
        shareToken: crypto.randomUUID(),
        futsalSlots: { create: cart.map(c => ({ futsalTimeSlotId: c.futsalTimeSlotId, courtNumber: c.courtNumber })) },
      },
      include: { futsalTimeSlot: true, futsalSlots: { include: { futsalTimeSlot: true } } },
    });
    const qrCode = await generateQRCode(JSON.stringify({ ref: reference, id: reservation.id, type: "futsal" }));
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });
    // Auto-send confirmation if a real client email was provided
    if (isRealEmail(clientEmail)) {
      sendReservationConfirmation({ ...reservation, qrCode }).catch(console.error);
    }
    return NextResponse.json(reservation);
  }

  return NextResponse.json({ error: "Type invalide" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, action, notes } = body;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { formula: true, timeSlot: true, futsalTimeSlot: true },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "confirm":
      updateData = { status: "confirmed", expiresAt: null };
      break;
    case "cancel":
      updateData = { status: "cancelled" };
      sendCancellationEmail({
        clientName: reservation.clientName,
        clientEmail: reservation.clientEmail,
        reference: reservation.reference,
        formulaName: reservation.formula?.name ?? "Futsal",
        date: reservation.date,
        time: reservation.timeSlot?.time ?? `${reservation.futsalTimeSlot?.hour ?? 0}:00`,
        childrenCount: reservation.childrenCount,
        totalPrice: reservation.totalPrice,
        depositAmount: reservation.depositAmount,
        paymentType: reservation.paymentType,
        status: "cancelled",
      }).catch(console.error);
      break;
    case "mark_deposit_paid":
      updateData = {
        depositPaid: true,
        depositPaidAt: new Date(),
        depositPaymentMethod: "onsite",
        status: "confirmed",
        expiresAt: null,
        ...(notes ? { adminNotes: notes } : {}),
      };
      break;
    case "mark_fully_paid":
      updateData = {
        fullPaymentPaid: true,
        fullPaymentPaidAt: new Date(),
        status: "confirmed",
        expiresAt: null,
        ...(notes ? { adminNotes: notes } : {}),
      };
      break;
    case "reactivate":
      updateData = {
        status: "confirmed",
        expiresAt: null,
      };
      break;
    case "add_note":
      updateData = { adminNotes: notes };
      break;
    case "send_confirmation": {
      if (!reservation.clientEmail || !reservation.clientEmail.includes("@")) {
        return NextResponse.json({ error: "Aucune adresse email valide pour cette réservation" }, { status: 400 });
      }
      const result = await sendReservationConfirmation(reservation);
      if (result?.status !== "sent") {
        return NextResponse.json({ error: result?.errorMessage ?? "Échec de l'envoi" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `Mail envoyé à ${reservation.clientEmail}` });
    }
    case "reschedule": {
      const { newDate, newTimeSlotId, newFutsalTimeSlotId } = body;
      const oldDate = reservation.date;
      const fts = reservation.futsalTimeSlot as { hour?: number; minute?: number } | null;
      const oldTime = reservation.timeSlot?.time
        ?? (fts ? `${fts.hour ?? 0}h${(fts.minute ?? 0) > 0 ? String(fts.minute).padStart(2,"0") : "00"}` : "");
      updateData = {
        date: new Date(newDate),
        ...(newTimeSlotId ? { timeSlotId: newTimeSlotId } : {}),
        ...(newFutsalTimeSlotId ? { futsalTimeSlotId: newFutsalTimeSlotId } : {}),
      };
      // Look up new slot label
      let newTime = "";
      if (newTimeSlotId) {
        const ts = await prisma.timeSlot.findUnique({ where: { id: newTimeSlotId } });
        newTime = ts?.time ?? "";
      } else if (newFutsalTimeSlotId) {
        const fs = await prisma.futsalTimeSlot.findUnique({ where: { id: newFutsalTimeSlotId } }) as { hour?: number; minute?: number } | null;
        newTime = fs ? `${fs.hour ?? 0}h${(fs.minute ?? 0) > 0 ? String(fs.minute).padStart(2,"0") : "00"}` : "";
      } else {
        newTime = oldTime; // date change only, same time
      }
      sendRescheduleEmail({
        clientName: reservation.clientName,
        clientEmail: reservation.clientEmail,
        reference: reservation.reference,
        formulaName: reservation.formula?.name ?? "Foot à 5",
        isBirthday: reservation.type === "birthday",
        oldDate,
        oldTime,
        newDate: new Date(newDate),
        newTime,
        reservationId: reservation.id,
      }).catch(console.error);
      break;
    }
    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: updateData,
    include: { formula: true, timeSlot: true, futsalTimeSlot: true, promoCode: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["cancelled", "expired"].includes(reservation.status)) {
    return NextResponse.json(
      { error: "Seules les réservations annulées ou expirées peuvent être supprimées" },
      { status: 400 }
    );
  }

  // Delete related participants first
  await prisma.futsalParticipant.deleteMany({ where: { reservationId: id } });
  await prisma.reservation.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
