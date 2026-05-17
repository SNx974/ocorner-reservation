export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.findMany({
    where: { key: { in: ["futsal_price_per_player", "futsal_min_players", "futsal_max_courts", "futsal_deposit_percentage", "futsal_deposit_min_amount"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return NextResponse.json(map);
}
