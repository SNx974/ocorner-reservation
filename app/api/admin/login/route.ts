export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signJWT } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  // ── New: username + password login via AdminUser table ──
  if (username && password) {
    const user = await prisma.adminUser.findUnique({ where: { username } }).catch(() => null);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Identifiants incorrects" }, { status: 401 });
    }
    const token = signJWT({ id: user.id, username: user.username, role: user.role });
    return NextResponse.json({ token, role: user.role, username: user.username, success: true });
  }

  // ── Legacy: password-only login (ADMIN_SECRET) ──
  if (password && !username) {
    const setting = await prisma.settings.findUnique({ where: { key: "admin_password" } }).catch(() => null);
    const adminPassword = setting?.value ?? process.env.ADMIN_PASSWORD ?? "admin2024";
    if (password !== adminPassword) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }
    return NextResponse.json({
      token: process.env.ADMIN_SECRET ?? "admin-secret-token",
      role: "admin",
      username: "admin",
      success: true,
    });
  }

  return NextResponse.json({ error: "Identifiants manquants" }, { status: 400 });
}
