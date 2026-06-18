export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function checkAdminAuth(req: NextRequest): boolean {
  const a = checkAuth(req.headers.get("x-admin-token"));
  if (!a.valid) return false;
  if (req.method !== "GET" && a.role !== "admin") return false; // moderators: read-only
  return true;
}

// GET all formulas (including inactive)
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formulas = await prisma.formula.findMany({ orderBy: [{ category: "asc" }, { pricePerChild: "asc" }] });
  return NextResponse.json(formulas);
}

// POST create new formula
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, category, includes, pricePerChild, minChildren } = body;
  if (!name || !category || pricePerChild == null || minChildren == null) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  const formula = await prisma.formula.create({
    data: { name, category, includes: includes ?? "", pricePerChild: parseFloat(pricePerChild), minChildren: parseInt(minChildren), isActive: true },
  });
  return NextResponse.json(formula);
}

// PATCH update formula
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  if (data.pricePerChild != null) data.pricePerChild = parseFloat(data.pricePerChild);
  if (data.minChildren != null) data.minChildren = parseInt(data.minChildren);
  const formula = await prisma.formula.update({ where: { id }, data });
  return NextResponse.json(formula);
}

// DELETE formula
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await prisma.formula.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
