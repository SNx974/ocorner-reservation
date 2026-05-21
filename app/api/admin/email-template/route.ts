export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function checkAdminAuth(req: NextRequest): boolean {
  return req.headers.get("x-admin-token") === process.env.ADMIN_SECRET;
}

// Default values
export const EMAIL_TEMPLATE_DEFAULTS = {
  email_park_name: "Ocorner",
  email_park_emoji: "🎡⚽",
  email_park_location: "La Réunion",
  email_phone: "0692 XX XX XX",
  email_from_name: "Ocorner",

  // Birthday template
  email_birthday_header_subtitle: "Votre anniversaire est confirmé 🎉",
  email_birthday_intro: "Merci pour votre réservation ! Nous avons bien enregistré votre anniversaire et nous avons hâte de vous accueillir. Voici le récapitulatif complet de votre réservation.",
  email_birthday_info_blocks: JSON.stringify([
    { emoji: "🚫", title: "Boissons extérieures non admises", desc: "Pour le confort de tous, merci de ne pas apporter de boissons de l'extérieur. Des boissons sont disponibles sur place." },
    { emoji: "🎂", title: "Gâteau d'anniversaire bienvenu !", desc: "Vous pouvez apporter votre gâteau. Nous disposons d'un espace réfrigéré pour le conserver jusqu'au moment du dessert." },
    { emoji: "🥤", title: "Gobelets fournis", desc: "Des gobelets sont mis à disposition pour tous les enfants." },
    { emoji: "⏰", title: "Arrivée recommandée 10 min avant le début", desc: "Présentez ce mail ou votre QR code à l'accueil pour valider votre entrée." },
  ]),
  email_birthday_contact_text: "Une question ? Contactez-nous :",

  // Futsal template
  email_futsal_header_subtitle: "Votre terrain est réservé !",
  email_futsal_intro: "Votre session de futsal a bien été enregistrée. Voici les informations de votre réservation.",
  email_futsal_tip: "Partagez le lien de réservation à vos coéquipiers pour qu'ils puissent payer leur part individuellement.",

  // Cancellation
  email_cancel_message: "Votre réservation a été annulée. Vous souhaitez refaire une réservation ? Rendez-vous sur notre site.",

  // Reminder
  email_reminder_message: "Votre réservation est toujours en attente de votre acompte. Sans paiement dans les 24h, votre créneau sera libéré automatiquement.",
};

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATE_DEFAULTS;

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
