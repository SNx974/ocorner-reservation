export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isExpired } from "@/lib/utils";
import { sendCancellationEmail } from "@/lib/email";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token");
  return token === process.env.ADMIN_SECRET;
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
      include: { formula: true, timeSlot: true, futsalTimeSlot: true, participants: true },
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
    const { clientName, clientEmail, clientPhone, formulaId, timeSlotId, date, childrenCount, notes } = body;
    const formula = await prisma.formula.findUnique({ where: { id: formulaId } });
    const totalPrice = formula ? formula.pricePerChild * parseInt(childrenCount) : 0;
    const reservation = await prisma.reservation.create({
      data: {
        reference, type: "birthday",
        clientName, clientEmail: clientEmail || `admin+${reference}@ocorner.re`,
        clientPhone: clientPhone || "0000000000",
        formulaId, timeSlotId,
        date: new Date(date),
        childrenCount: parseInt(childrenCount),
        totalPrice, basePrice: totalPrice,
        paymentType: "admin", depositAmount: 0,
        depositPaid: true, fullPaymentPaid: true,
        status: "confirmed", notes,
      },
      include: { formula: true, timeSlot: true },
    });
    const qrCode = await generateQRCode(JSON.stringify({ ref: reference, id: reservation.id, type: "birthday" }));
    await prisma.reservation.update({ where: { id: reservation.id }, data: { qrCode } });
    return NextResponse.json(reservation);
  }

  // Futsal reservation
  if (body.type === "futsal") {
    const { clientName, clientEmail, clientPhone, futsalTimeSlotId, courtNumber, date, playerCount, notes } = body;
    const settings = await prisma.settings.findMany();
    const courtPrice = parseFloat(settings.find(s => s.key === "futsal_court_price")?.value ?? "110");
    const reservation = await prisma.reservation.create({
      data: {
        reference, type: "futsal",
        clientName, clientEmail: clientEmail || `admin+${reference}@ocorner.re`,
        clientPhone: clientPhone || "0000000000",
        futsalTimeSlotId, courtNumber: parseInt(courtNumber),
        date: new Date(date), playerCount: parseInt(playerCount),
        totalPrice: courtPrice, basePrice: courtPrice,
        paymentType: "admin", depositAmount: 0,
        depositPaid: true, fullPaymentPaid: true,
        status: "confirmed", notes,
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
    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: updateData,
    include: { formula: true, timeSlot: true },
  });

  return NextResponse.json(updated);
}
