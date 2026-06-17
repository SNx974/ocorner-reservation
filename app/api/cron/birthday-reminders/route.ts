export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runBirthdayJm3Reminders } from "@/lib/birthday-reminders";

// Manual / external trigger for the J-3 birthday reminders.
// The in-process scheduler (instrumentation.ts) runs this automatically too.
// Protect with CRON_SECRET: pass it as header "x-cron-secret" or "?secret=".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
    if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runBirthdayJm3Reminders();
  return NextResponse.json({ ok: true, ...result });
}
