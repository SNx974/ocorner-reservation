export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function checkAdminAuth(req: NextRequest): boolean {
  return checkAuth(req.headers.get("x-admin-token")).valid;
}

// GET — list sent emails (paginated)
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "30");
  const type = searchParams.get("type") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const id = searchParams.get("id") ?? undefined;

  // Single email fetch (for preview)
  if (id) {
    const email = await prisma.sentEmail.findUnique({ where: { id } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(email);
  }

  const where = {
    ...(type ? { type } : {}),
    ...(search ? {
      OR: [
        { to: { contains: search, mode: "insensitive" as const } },
        { subject: { contains: search, mode: "insensitive" as const } },
        { reference: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [emails, total] = await Promise.all([
    prisma.sentEmail.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, to: true, subject: true, type: true, reference: true, status: true, sentAt: true },
    }),
    prisma.sentEmail.count({ where }),
  ]);

  return NextResponse.json({ emails, total, page, pages: Math.ceil(total / limit) });
}

// POST — resend an email by its ID
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const email = await prisma.sentEmail.findUnique({ where: { id } });
  if (!email) return NextResponse.json({ error: "Email introuvable" }, { status: 404 });

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Save a new "resend" record even without Resend key
    const saved = await prisma.sentEmail.create({
      data: {
        to: email.to, subject: `[Renvoi] ${email.subject}`,
        htmlContent: email.htmlContent, type: "manual",
        reference: email.reference, status: "no_key",
      },
    });
    return NextResponse.json({ success: true, newId: saved.id, warning: "Clé Resend non configurée" });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(key);

  let status = "sent";
  let errorMessage: string | undefined;
  try {
    await resend.emails.send({
      from: `Ocorner <${process.env.FROM_EMAIL ?? "noreply@ocorner.re"}>`,
      to: email.to,
      subject: `[Renvoi] ${email.subject}`,
      html: email.htmlContent,
    });
  } catch (e) {
    status = "failed";
    errorMessage = e instanceof Error ? e.message : String(e);
  }

  const saved = await prisma.sentEmail.create({
    data: {
      to: email.to, subject: `[Renvoi] ${email.subject}`,
      htmlContent: email.htmlContent, type: "manual",
      reference: email.reference, status, errorMessage,
    },
  });

  return NextResponse.json({ success: true, newId: saved.id, status });
}
