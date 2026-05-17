export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called after demo payment to mark reservation as confirmed
export async function POST(req: NextRequest) {
  const { reference } = await req.json();
  if (!reference) return NextResponse.json({ error: "Référence manquante" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({ where: { reference } });
  if (!reservation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const isDeposit = reservation.paymentType === "onsite_deposit";

  const updated = await prisma.reservation.update({
    where: { reference },
    data: {
      status: "confirmed",
      expiresAt: null,
      depositPaid: isDeposit ? true : reservation.depositPaid,
      depositPaidAt: isDeposit ? new Date() : reservation.depositPaidAt,
      fullPaymentPaid: !isDeposit ? true : reservation.fullPaymentPaid,
      fullPaymentPaidAt: !isDeposit ? new Date() : reservation.fullPaymentPaidAt,
    },
    include: { formula: true, timeSlot: true },
  });

  return NextResponse.json(updated);
}
