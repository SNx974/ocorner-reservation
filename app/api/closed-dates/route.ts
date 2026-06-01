export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "birthday" | "futsal" | null (= all)

  const dates = await prisma.closedDate.findMany({
    where: type
      ? { OR: [{ type: "all" }, { type }] }
      : undefined,
    orderBy: { date: "asc" },
  });

  return NextResponse.json(dates.map(d => ({
    id: d.id,
    date: d.date.toISOString().slice(0, 10),
    label: d.label,
    type: d.type,
  })));
}
