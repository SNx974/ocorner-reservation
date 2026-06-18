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

// POST — resend an existing email OR send a test email
// body: { id } → resend existing
// body: { action: "test", to: "..." } → send test email
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // ── Test email ────────────────────────────────────────────────────────
  if (body.action === "test") {
    const to = body.to as string | undefined;
    if (!to || !to.includes("@")) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
    }
    const { sendTestEmail } = await import("@/lib/email");
    const result = await sendTestEmail(to);
    if (result.ok) {
      return NextResponse.json({ success: true, message: `Email de test envoyé à ${to}` });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  }

  // ── Resend existing email ─────────────────────────────────────────────
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const email = await prisma.sentEmail.findUnique({ where: { id } });
  if (!email) return NextResponse.json({ error: "Email introuvable" }, { status: 404 });

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    const saved = await prisma.sentEmail.create({
      data: {
        to: email.to, subject: `[Renvoi] ${email.subject}`,
        htmlContent: email.htmlContent, type: "manual",
        reference: email.reference, status: "no_key",
        errorMessage: "BREVO_API_KEY non configurée",
      },
    });
    return NextResponse.json({ success: false, newId: saved.id, warning: "Clé Brevo non configurée" });
  }

  // Send via Brevo
  const fromEmail = process.env.FROM_EMAIL ?? "noreply@ocorner.re";
  let status = "sent";
  let errorMessage: string | undefined;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "accept": "application/json", "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        sender: { name: "Ocorner", email: fromEmail },
        to: [{ email: email.to }],
        subject: `[Renvoi] ${email.subject}`,
        htmlContent: email.htmlContent,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      status = "failed";
      errorMessage = `Brevo ${res.status}: ${txt}`;
    }
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

  return NextResponse.json({ success: status === "sent", newId: saved.id, status, error: errorMessage });
}
