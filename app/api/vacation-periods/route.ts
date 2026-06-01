export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const periods = await prisma.vacationPeriod.findMany({ orderBy: { startDate: "asc" } });
  return NextResponse.json(periods.map(p => ({
    id: p.id,
    label: p.label,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate.toISOString().slice(0, 10),
  })));
}
