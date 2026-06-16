export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/utils";
import { sendCancellationEmail, sendRescheduleEmail } from "@/lib/email";

function checkAdminAuth(req: NextRequest): boolean {
  return checkAuth(req.headers.get("x-admin-token")).valid;
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
    const reservation = await prisma.reservation.create({
      data: {
        reference, type: "birthday",
        clientName, clientEmail: clientEmail || `admin+${reference}@ocorner.re`,
        clientPhone: clientPhone || "0000000000",
        formulaId, timeSlotId,
        date: new Date(date),
        childrenCount: parseInt(childrenCount),
        totalPrice, basePrice: autoPrice,
        paymentType: "admin", depositAmount,
        depositPaid, fullPaymentPaid,
        ...(depositPaid ? { depositPaidAt: new Date(), depositPaymentMethod: "onsite" } : {}),
        ...(fullPaymentPaid ? { fullPaymentPaidAt: new Date() } : {}),
        status: "confirmed",
        notes: adminNotes || undefined,
      },
      include: { formula: true, timeSlot: true },
    });
    const qrCode = await generateQRCode(JSON.stringify({ ref: reference, id: reservation.id, type: "birthday" }));
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });
    return NextResponse.json(reservation);
  }

  // Futsal reservation
  if (body.type === "futsal") {
    const { clientName, clientEmail, clientPhone, futsalTimeSlotId, courtNumber, date, playerCount, notes, amountPaid, paymentMethod } = body;
    const settings = await prisma.settings.findMany();
    const getSetting = (key: string, fallback: string) => settings.find(s => s.key === key)?.value ?? fallback;
    const slotForPrice = futsalTimeSlotId ? await prisma.futsalTimeSlot.findUnique({ where: { id: futsalTimeSlotId } }) : null;
    const slotHour = slotForPrice?.hour ?? 10;
    const offpeakPrice = parseFloat(getSetting("futsal_price_offpeak", getSetting("futsal_court_price", "90")));
    const peakPrice = parseFloat(getSetting("futsal_price_peak", getSetting("futsal_court_price", "110")));
    const peakHour = parseInt(getSetting("futsal_price_peak_from", "17"));
    const courtPrice = slotHour >= peakHour ? peakPrice : offpeakPrice;
    const paid = amountPaid !== undefined && amountPaid !== "" ? parseFloat(amountPaid) : courtPrice;
    const fullPaymentPaid = paid >= courtPrice;
    const depositPaid = paid > 0;
    const depositAmount = paid < courtPrice ? paid : 0;
    const paymentLabel = paymentMethod === "cb" ? "CB" : paymentMethod === "especes" ? "Espèces" : "";
    const adminNotes = [notes, paymentLabel ? `Paiement: ${paymentLabel}` : ""].filter(Boolean).join(" | ");
    const reservation = await prisma.reservation.create({
      data: {
        reference, type: "futsal",
        clientName, clientEmail: clientEmail || `admin+${reference}@ocorner.re`,
        clientPhone: clientPhone || "0000000000",
        futsalTimeSlotId, courtNumber: parseInt(courtNumber),
        date: new Date(date), playerCount: parseInt(playerCount),
        totalPrice: courtPrice, basePrice: courtPrice,
        paymentType: "admin", depositAmount,
        depositPaid, fullPaymentPaid,
        ...(depositPaid ? { depositPaidAt: new Date(), depositPaymentMethod: paymentMethod === "cb" ? "cb" : "onsite" } : {}),
        ...(fullPaymentPaid ? { fullPaymentPaidAt: new Date() } : {}),
        status: "confirmed",
        notes: adminNotes || undefined,
        shareToken: crypto.randomUUID(),
      },
      include: { futsalTimeSlot: true },
    });
    const qrCode = await generateQRCode(JSON.stringify({ ref: reference, id: reservation.id, type: "futsal" }));
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });
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
