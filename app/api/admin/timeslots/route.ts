export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function auth(req: NextRequest) {
  return checkAuth(req.headers.get("x-admin-token")).valid;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slots = await prisma.timeSlot.findMany({ orderBy: { time: "asc" } });
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { time } = await req.json();
  if (!time?.trim()) return NextResponse.json({ error: "Heure requise" }, { status: 400 });
  const slot = await prisma.timeSlot.create({ data: { time: time.trim() } });
  return NextResponse.json(slot);
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, isActive } = await req.json();
  const slot = await prisma.timeSlot.update({ where: { id }, data: { isActive } });
  return NextResponse.json(slot);
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.timeSlot.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
