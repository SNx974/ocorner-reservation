import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const formulas = await prisma.formula.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { pricePerChild: "asc" }],
  });
  return NextResponse.json(formulas);
}
