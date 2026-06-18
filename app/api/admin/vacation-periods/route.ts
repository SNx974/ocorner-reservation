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
  const periods = await prisma.vacationPeriod.findMany({ orderBy: { startDate: "asc" } });
  return NextResponse.json(periods);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { label, startDate, endDate } = await req.json();
  const start = new Date(startDate); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate); end.setUTCHours(23, 59, 59, 999);
  const period = await prisma.vacationPeriod.create({ data: { label, startDate: start, endDate: end } });
  return NextResponse.json(period);
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.vacationPeriod.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
