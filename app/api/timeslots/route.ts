import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const slots = await prisma.timeSlot.findMany({
    where: { isActive: true },
    orderBy: { time: "asc" },
  });
  return NextResponse.json(slots);
}
