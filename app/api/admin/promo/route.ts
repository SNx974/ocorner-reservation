export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function auth(req: NextRequest) {
  return req.headers.get("x-admin-token") === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(codes);
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const code = await prisma.promoCode.create({
    data: {
      code: body.code.trim().toUpperCase(),
      label: body.label,
      discountType: body.discountType,
      discountValue: parseFloat(body.discountValue),
      usageLimit: body.usageLimit ? parseInt(body.usageLimit) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      isActive: true,
    },
  });
  return NextResponse.json(code);
}

export async function PATCH(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...data } = await req.json();
  const updated = await prisma.promoCode.update({
    where: { id },
    data: {
      ...("isActive" in data ? { isActive: data.isActive } : {}),
      ...("label" in data ? { label: data.label } : {}),
      ...("discountValue" in data ? { discountValue: parseFloat(data.discountValue) } : {}),
      ...("usageLimit" in data ? { usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.promoCode.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
