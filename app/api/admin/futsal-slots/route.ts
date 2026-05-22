export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function auth(req: NextRequest) {
  return checkAuth(req.headers.get("x-admin-token")).valid;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slots = await prisma.futsalTimeSlot.findMany({ orderBy: [{ hour: "asc" }, { minute: "asc" }] });
  return NextResponse.json(slots);
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, isActive } = await req.json();
  const slot = await prisma.futsalTimeSlot.update({ where: { id }, data: { isActive } });
  return NextResponse.json(slot);
}
