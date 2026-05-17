import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { code, total } = await req.json();
  if (!code) return NextResponse.json({ error: "Code manquant" }, { status: 400 });

  const promo = await prisma.promoCode.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!promo || !promo.isActive)
    return NextResponse.json({ error: "Code promo invalide ou désactivé" }, { status: 404 });

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date())
    return NextResponse.json({ error: "Ce code promo a expiré" }, { status: 400 });

  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit)
    return NextResponse.json({ error: "Ce code promo a atteint sa limite d'utilisation" }, { status: 400 });

  const discount =
    promo.discountType === "percent"
      ? Math.min((total * promo.discountValue) / 100, total)
      : Math.min(promo.discountValue, total);

  return NextResponse.json({
    valid: true,
    promoCodeId: promo.id,
    code: promo.code,
    label: promo.label,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount: discount,
    finalTotal: Math.max(0, total - discount),
  });
}
