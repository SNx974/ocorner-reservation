export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EMAIL_TEMPLATE_DEFAULTS } from "@/lib/email-template-defaults";

function checkAdminAuth(req: NextRequest): boolean {
  return req.headers.get("x-admin-token") === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = Object.keys(EMAIL_TEMPLATE_DEFAULTS);
  const settings = await prisma.settings.findMany({ where: { key: { in: keys } } });

  const result: Record<string, string> = { ...EMAIL_TEMPLATE_DEFAULTS };
  for (const s of settings) {
    result[s.key] = s.value;
  }

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: Record<string, string> = await req.json();
  const allowedKeys = Object.keys(EMAIL_TEMPLATE_DEFAULTS);

  const updates = Object.entries(body).filter(([k]) => allowedKeys.includes(k));

  await Promise.all(
    updates.map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
