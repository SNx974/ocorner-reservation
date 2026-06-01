export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function auth(req: NextRequest) {
  return checkAuth(req.headers.get("x-admin-token")).valid;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dates = await prisma.closedDate.findMany({ orderBy: { date: "asc" } });
  return NextResponse.json(dates);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { date, label, type } = await req.json();
  // Normalize to UTC midnight
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const existing = await prisma.closedDate.findFirst({ where: { date: d, type: type ?? "all" } });
  if (existing) return NextResponse.json(existing);
  const closed = await prisma.closedDate.create({ data: { date: d, label: label ?? null, type: type ?? "all" } });
  return NextResponse.json(closed);
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.closedDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
