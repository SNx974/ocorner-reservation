export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";

function getToken(req: NextRequest) {
  return req.headers.get("x-admin-token");
}

// GET — list all admin users
export async function GET(req: NextRequest) {
  if (!requireAdmin(getToken(req))) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(users);
}

// POST — create a new admin user
export async function POST(req: NextRequest) {
  if (!requireAdmin(getToken(req))) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  const { username, password, role } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Nom d'utilisateur et mot de passe requis" }, { status: 400 });
  }
  if (!["admin", "moderateur"].includes(role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }
  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Ce nom d'utilisateur existe déjà" }, { status: 409 });
  }
  const user = await prisma.adminUser.create({
    data: { username, passwordHash: hashPassword(password), role, isActive: true },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}

// PATCH — update user (role, active, reset password)
export async function PATCH(req: NextRequest) {
  if (!requireAdmin(getToken(req))) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  const { id, role, isActive, newPassword } = await req.json();
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (role !== undefined) {
    if (!["admin", "moderateur"].includes(role)) return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    data.role = role;
  }
  if (isActive !== undefined) data.isActive = isActive;
  if (newPassword) data.passwordHash = hashPassword(newPassword);

  const user = await prisma.adminUser.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(user);
}

// DELETE — remove a user
export async function DELETE(req: NextRequest) {
  if (!requireAdmin(getToken(req))) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
