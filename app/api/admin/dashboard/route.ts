export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token");
  return token === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Auto-expire
  await prisma.reservation.updateMany({
    where: {
      status: { in: ["pending", "deposit_pending"] },
      expiresAt: { lt: now },
    },
    data: { status: "expired" },
  });

  const [
    todayReservations,
    todayConfirmed,
    weekReservations,
    pendingCount,
    depositPendingCount,
    confirmedCount,
    cancelledCount,
  ] = await Promise.all([
    prisma.reservation.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      include: { formula: true, timeSlot: true },
      orderBy: { date: "asc" },
    }),
    prisma.reservation.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, status: "confirmed" },
    }),
    prisma.reservation.findMany({
      where: { createdAt: { gte: weekStart, lte: weekEnd }, status: "confirmed" },
    }),
    prisma.reservation.count({ where: { status: "pending" } }),
    prisma.reservation.count({ where: { status: "deposit_pending" } }),
    prisma.reservation.count({ where: { status: "confirmed" } }),
    prisma.reservation.count({ where: { status: "cancelled" } }),
  ]);

  const todayRevenue = todayConfirmed.reduce((sum, r) => sum + r.totalPrice, 0);
  const weekRevenue = weekReservations.reduce((sum, r) => sum + r.totalPrice, 0);

  const recentReservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { formula: true, timeSlot: true },
  });

  return NextResponse.json({
    stats: {
      todayCount: todayReservations.length,
      todayRevenue,
      weekRevenue,
      pendingCount,
      depositPendingCount,
      confirmedCount,
      cancelledCount,
    },
    todayReservations,
    recentReservations,
  });
}
