import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const setting = await prisma.settings.findUnique({ where: { key: "admin_password" } });
  const adminPassword = setting?.value ?? process.env.ADMIN_PASSWORD ?? "admin2024";

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  return NextResponse.json({
    token: process.env.ADMIN_SECRET ?? "admin-secret-token",
    success: true,
  });
}
