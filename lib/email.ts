import { formatDate, formatPrice } from "./utils";
import { EMAIL_TEMPLATE_DEFAULTS } from "./email-template-defaults";

// ─── Brevo sender ─────────────────────────────────────────────────────
async function sendViaBrevo(opts: {
  from: { name: string; email: string };
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false, error: "BREVO_API_KEY manquant" };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: opts.from.name, email: opts.from.email },
        to: [{ email: opts.to }],
        subject: opts.subject,
        htmlContent: opts.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Brevo ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Load template settings from DB ──────────────────────────────────
async function getTemplateSettings(): Promise<Record<string, string>> {
  try {
    const { prisma } = await import("./prisma");
    const keys = Object.keys(EMAIL_TEMPLATE_DEFAULTS);
    const settings = await prisma.settings.findMany({ where: { key: { in: keys } } });
    const result: Record<string, string> = { ...EMAIL_TEMPLATE_DEFAULTS };
    for (const s of settings) result[s.key] = s.value;
    return result;
  } catch {
    return { ...EMAIL_TEMPLATE_DEFAULTS };
  }
}

// ─── Save email to DB ─────────────────────────────────────────────────
async function saveEmail(opts: {
  to: string; subject: string; html: string;
  type: string; reference?: string; reservationId?: string;
  status?: string; errorMessage?: string;
}) {
  try {
    const { prisma } = await import("./prisma");
    await prisma.sentEmail.create({
      data: {
        to: opts.to,
        subject: opts.subject,
        htmlContent: opts.html,
        type: opts.type,
        reference: opts.reference,
        reservationId: opts.reservationId,
        status: opts.status ?? "sent",
        errorMessage: opts.errorMessage,
      },
    });
  } catch { /* silent */ }
}

export interface ReservationEmailData {
  clientName: string;
  clientEmail: string;
  reference: string;
  formulaName: string;
  date: Date | string;
  time: string;
  childrenCount: number;
  totalPrice: number;
  depositAmount: number;
  paymentType: string;
  status: string;
  qrCode?: string;
  reservationId?: string;
  isBirthday?: boolean;
}

// ─── Base URL for public assets ──────────────────────────────────────
function getPublicUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://ocorner.re";
  // Force https for email image compatibility
  return url.replace(/^http:\/\//, "https://");
}

// ─── HTML helpers ────────────────────────────────────────────────────
function baseLayout(content: string, title: string, phone: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:620px;margin:32px auto;padding:0 16px;">
    ${content}
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
      Ocorner — Réservation en ligne · La Réunion<br/>
      <a href="tel:${phone.replace(/\s/g, '')}" style="color:#10b981;">${phone}</a>
    </p>
  </div>
</body>
</html>`;
}

function row(label: string, value: string, highlight = false) {
  return `<tr>
    <td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #f1f5f9;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;font-weight:${highlight ? 'bold' : '500'};color:${highlight ? '#10b981' : '#1e293b'};border-bottom:1px solid #f1f5f9;text-align:right;">${value}</td>
  </tr>`;
}

// ─── Birthday email ───────────────────────────────────────────────────
export function buildBirthdayEmailHtml(
  data: ReservationEmailData & { depositPaid?: boolean },
  tpl: Record<string, string> = EMAIL_TEMPLATE_DEFAULTS
) {
  const isPaid = data.paymentType === "online_full" || data.totalPrice === 0;
  const remainingAmount = data.totalPrice - data.depositAmount;
  const phone = tpl.email_phone ?? EMAIL_TEMPLATE_DEFAULTS.email_phone;
  const parkName = tpl.email_park_name ?? EMAIL_TEMPLATE_DEFAULTS.email_park_name;
  const parkEmoji = tpl.email_park_emoji ?? EMAIL_TEMPLATE_DEFAULTS.email_park_emoji;
  const subtitle = tpl.email_birthday_header_subtitle ?? EMAIL_TEMPLATE_DEFAULTS.email_birthday_header_subtitle;
  const intro = tpl.email_birthday_intro ?? EMAIL_TEMPLATE_DEFAULTS.email_birthday_intro;
  const contactText = tpl.email_birthday_contact_text ?? EMAIL_TEMPLATE_DEFAULTS.email_birthday_contact_text;

  let infoBlocks: Array<{ emoji: string; title: string; desc: string }> = [];
  try {
    infoBlocks = JSON.parse(tpl.email_birthday_info_blocks ?? EMAIL_TEMPLATE_DEFAULTS.email_birthday_info_blocks);
  } catch { infoBlocks = []; }

  const paymentBlock = isPaid
    ? `<div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#065f46;">✅ <strong>Paiement complet reçu — ${formatPrice(data.totalPrice)}</strong></p>
        <p style="margin:6px 0 0;font-size:13px;color:#047857;">Votre réservation est confirmée. À bientôt !</p>
      </div>`
    : `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:15px;color:#92400e;">⏳ <strong>Acompte de ${formatPrice(data.depositAmount)} à régler</strong></p>
        <p style="margin:6px 0 0;font-size:13px;color:#b45309;">Le solde de <strong>${formatPrice(remainingAmount)}</strong> sera réglé sur place le jour J.</p>
        <p style="margin:6px 0 0;font-size:12px;color:#d97706;">⚠️ L'acompte doit être versé dans les 72h pour valider votre créneau.</p>
      </div>`;

  const qrBlock = data.qrCode
    ? `<div style="text-align:center;margin:24px 0;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;font-size:13px;color:#64748b;font-weight:600;">🎟️ BILLET D'ENTRÉE — Présentez ce QR code à l'accueil</p>
        <img src="${data.qrCode}" alt="QR Code réservation" style="width:160px;height:160px;border:4px solid #e2e8f0;border-radius:10px;"/>
        <p style="margin:10px 0 0;font-family:monospace;font-size:16px;font-weight:bold;color:#1e293b;letter-spacing:2px;">${data.reference}</p>
      </div>`
    : "";

  const infoBlocksHtml = infoBlocks.length > 0
    ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#15803d;">📌 Informations pratiques</p>
        <table style="width:100%;border-collapse:collapse;">
          ${infoBlocks.map(b => `<tr>
            <td style="padding:6px 0;vertical-align:top;width:28px;font-size:16px;">${b.emoji}</td>
            <td style="padding:6px 0;font-size:13px;color:#166534;line-height:1.5;">
              <strong>${b.title}</strong><br/>${b.desc}
            </td>
          </tr>`).join("")}
        </table>
      </div>`
    : "";

  const baseUrl = getPublicUrl();
  const html = `
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#10b981 0%,#3b82f6 100%);text-align:center;line-height:0;">
    <img src="${baseUrl}/ANNIF.png" alt="${parkName} Anniversaire"
      style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;" />
  </div>
  <div style="padding:8px 32px 0;text-align:center;">
    <p style="margin:0;color:#475569;font-size:14px;">${subtitle}</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1e293b;">Bonjour <strong>${data.clientName}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">${intro}</p>
    <div style="background:#f8fafc;border-radius:12px;overflow:hidden;margin:20px 0;border:1px solid #e2e8f0;">
      <div style="background:#1e293b;padding:12px 16px;">
        <p style="margin:0;color:white;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📋 Détails de la réservation</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Référence", data.reference)}
        ${row("Formule", data.formulaName)}
        ${row("Date", formatDate(data.date))}
        ${row("Créneau", data.time)}
        ${row("Nombre d'enfants", `${data.childrenCount} enfants`)}
        ${row("Montant total", formatPrice(data.totalPrice), true)}
      </table>
    </div>
    ${paymentBlock}
    ${qrBlock}
    ${infoBlocksHtml}
    <div style="text-align:center;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
      <p style="margin:0;font-size:14px;color:#475569;">${contactText}</p>
      <a href="tel:${phone.replace(/\s/g, '')}"
         style="display:inline-block;margin-top:8px;font-size:18px;font-weight:700;color:#10b981;text-decoration:none;">
        📞 ${phone}
      </a>
    </div>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Réf. <strong>${data.reference}</strong> · ${parkName}, La Réunion · Ce mail a été envoyé automatiquement, merci de ne pas y répondre.
    </p>
  </div>
</div>`;

  return baseLayout(html, `Réservation ${data.reference} — ${parkName}`, phone);
}

// ─── Futsal email ─────────────────────────────────────────────────────
function buildFutsalEmailHtml(data: ReservationEmailData, tpl: Record<string, string> = EMAIL_TEMPLATE_DEFAULTS) {
  const isPaid = data.paymentType === "online_full" || data.totalPrice === 0;
  const phone = tpl.email_phone ?? EMAIL_TEMPLATE_DEFAULTS.email_phone;
  const parkName = tpl.email_park_name ?? EMAIL_TEMPLATE_DEFAULTS.email_park_name;
  const subtitle = tpl.email_futsal_header_subtitle ?? EMAIL_TEMPLATE_DEFAULTS.email_futsal_header_subtitle;
  const intro = tpl.email_futsal_intro ?? EMAIL_TEMPLATE_DEFAULTS.email_futsal_intro;
  const tip = tpl.email_futsal_tip ?? EMAIL_TEMPLATE_DEFAULTS.email_futsal_tip;

  const baseUrl = getPublicUrl();
  const html = `
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%);text-align:center;line-height:0;">
    <img src="${baseUrl}/FOOT%20A%205%20MAIL.png" alt="${parkName} Foot à 5"
      style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;" />
  </div>
  <div style="padding:8px 32px 0;text-align:center;">
    <p style="margin:0;color:#475569;font-size:14px;">${subtitle}</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1e293b;">Bonjour <strong>${data.clientName}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">${intro}</p>
    <div style="background:#f8fafc;border-radius:12px;overflow:hidden;margin:20px 0;border:1px solid #e2e8f0;">
      <div style="background:#1e293b;padding:12px 16px;">
        <p style="margin:0;color:white;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">⚽ Détails</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Référence", data.reference)}
        ${row("Session", data.formulaName)}
        ${row("Date", formatDate(data.date))}
        ${row("Créneau", data.time)}
        ${row("Total terrain", formatPrice(data.totalPrice), true)}
        ${row(isPaid ? "Statut paiement" : "Acompte versé", isPaid ? "✅ Payé" : formatPrice(data.depositAmount))}
      </table>
    </div>
    ${data.qrCode ? `<div style="text-align:center;margin:20px 0;">
      <p style="font-size:13px;color:#64748b;font-weight:600;">🎟️ Présentez ce QR code à l'accueil</p>
      <img src="${data.qrCode}" alt="QR" style="width:150px;height:150px;border:4px solid #e2e8f0;border-radius:10px;"/>
      <p style="font-family:monospace;font-size:16px;font-weight:bold;letter-spacing:2px;">${data.reference}</p>
    </div>` : ""}
    ${tip ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#1d4ed8;font-weight:600;">💡 Bon à savoir</p>
      <p style="margin:8px 0 0;font-size:13px;color:#1e40af;">${tip}</p>
    </div>` : ""}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Réf. <strong>${data.reference}</strong> · ${parkName} Foot à 5, La Réunion</p>
  </div>
</div>`;
  return baseLayout(html, `Foot à 5 ${data.reference} — ${parkName}`, phone);
}

// ─── Send + save ──────────────────────────────────────────────────────
async function sendAndSave(opts: {
  to: string; subject: string; html: string;
  type: string; reference?: string; reservationId?: string;
}) {
  let status = "sent";
  let errorMessage: string | undefined;

  const tpl = await getTemplateSettings();
  const fromName = tpl.email_from_name ?? EMAIL_TEMPLATE_DEFAULTS.email_from_name;
  const fromEmail = process.env.FROM_EMAIL ?? "noreply@ocorner.re";

  const result = await sendViaBrevo({
    from: { name: fromName, email: fromEmail },
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (!result.ok) {
    status = result.error === "BREVO_API_KEY manquant" ? "no_key" : "failed";
    errorMessage = result.error;
  }

  await saveEmail({ ...opts, status, errorMessage });
  return { status, errorMessage };
}

export async function sendConfirmationEmail(data: ReservationEmailData) {
  const tpl = await getTemplateSettings();
  const isBirthday = data.isBirthday !== false && !data.formulaName.toLowerCase().includes("futsal") && !data.formulaName.toLowerCase().includes("foot");
  const html = isBirthday ? buildBirthdayEmailHtml(data, tpl) : buildFutsalEmailHtml(data, tpl);
  const parkName = tpl.email_park_name ?? "Ocorner";
  const subject = isBirthday
    ? `🎉 Réservation ${data.reference} — Anniversaire ${parkName}`
    : `⚽ Réservation ${data.reference} — Foot à 5 ${parkName}`;

  return sendAndSave({ to: data.clientEmail, subject, html, type: "confirmation", reference: data.reference, reservationId: data.reservationId });
}

export async function sendDepositReminderEmail(data: ReservationEmailData) {
  const tpl = await getTemplateSettings();
  const phone = tpl.email_phone ?? EMAIL_TEMPLATE_DEFAULTS.email_phone;
  const message = tpl.email_reminder_message ?? EMAIL_TEMPLATE_DEFAULTS.email_reminder_message;
  const parkName = tpl.email_park_name ?? "Ocorner";

  const html = baseLayout(`
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <div style="background:#f59e0b;padding:28px 32px;text-align:center;">
    <div style="font-size:40px;">⏰</div>
    <h1 style="margin:8px 0 0;color:white;font-size:22px;">Rappel : Acompte en attente</h1>
  </div>
  <div style="padding:32px;">
    <p>Bonjour <strong>${data.clientName}</strong>,</p>
    <p style="font-size:14px;color:#475569;">
      Votre réservation <strong>${data.reference}</strong> du <strong>${formatDate(data.date)}</strong>
      est toujours en attente de votre acompte de <strong style="color:#d97706;">${formatPrice(data.depositAmount)}</strong>.
    </p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#92400e;font-weight:600;">⚠️ ${message}</p>
    </div>
    <p style="font-size:14px;color:#475569;">Contactez-nous rapidement :</p>
    <a href="tel:${phone.replace(/\s/g, '')}" style="display:inline-block;font-size:18px;font-weight:700;color:#f59e0b;text-decoration:none;">
      📞 ${phone}
    </a>
  </div>
</div>`, `Rappel acompte ${data.reference}`, phone);

  return sendAndSave({ to: data.clientEmail, subject: `⏰ Rappel acompte — Réservation ${data.reference}`, html, type: "reminder", reference: data.reference, reservationId: data.reservationId });
}

export async function sendCancellationEmail(data: ReservationEmailData) {
  const tpl = await getTemplateSettings();
  const phone = tpl.email_phone ?? EMAIL_TEMPLATE_DEFAULTS.email_phone;
  const message = tpl.email_cancel_message ?? EMAIL_TEMPLATE_DEFAULTS.email_cancel_message;
  const parkName = tpl.email_park_name ?? "Ocorner";

  const html = baseLayout(`
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <div style="background:#ef4444;padding:28px 32px;text-align:center;">
    <div style="font-size:40px;">❌</div>
    <h1 style="margin:8px 0 0;color:white;font-size:22px;">Réservation annulée</h1>
  </div>
  <div style="padding:32px;">
    <p>Bonjour <strong>${data.clientName}</strong>,</p>
    <p style="font-size:14px;color:#475569;">
      Votre réservation <strong>${data.reference}</strong> du <strong>${formatDate(data.date)}</strong> a été annulée.
    </p>
    <p style="font-size:14px;color:#475569;">${message}</p>
    <a href="tel:${phone.replace(/\s/g, '')}" style="display:inline-block;font-size:18px;font-weight:700;color:#ef4444;text-decoration:none;">
      📞 ${phone}
    </a>
  </div>
</div>`, `Annulation ${data.reference}`, phone);

  return sendAndSave({ to: data.clientEmail, subject: `❌ Annulation réservation ${data.reference} — ${parkName}`, html, type: "cancellation", reference: data.reference, reservationId: data.reservationId });
}

// ─── Test email ───────────────────────────────────────────────────────
export async function sendTestEmail(toEmail: string) {
  const tpl = await getTemplateSettings();
  const fromName = tpl.email_from_name ?? EMAIL_TEMPLATE_DEFAULTS.email_from_name;
  const fromEmail = process.env.FROM_EMAIL ?? "noreply@ocorner.re";
  const parkName = tpl.email_park_name ?? "Ocorner";
  const phone = tpl.email_phone ?? EMAIL_TEMPLATE_DEFAULTS.email_phone;

  const baseUrl = getPublicUrl();
  const html = baseLayout(`
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#10b981 0%,#3b82f6 100%);text-align:center;line-height:0;">
    <img src="${baseUrl}/ANNIF.png" alt="${parkName}"
      style="width:100%;max-width:600px;height:auto;display:block;margin:0 auto;" />
  </div>
  <div style="padding:8px 32px 0;text-align:center;">
    <p style="margin:0;color:#475569;font-size:14px;">Mail de test — Configuration Brevo</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1e293b;">✅ <strong>Félicitations !</strong></p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">
      Votre configuration email via <strong>Brevo</strong> fonctionne correctement.<br/>
      Les emails de confirmation, rappel et annulation seront envoyés depuis :<br/>
      <strong style="color:#10b981;">${fromName} &lt;${fromEmail}&gt;</strong>
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#15803d;">
        🕐 Envoyé le <strong>${new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" })}</strong>
      </p>
    </div>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Ceci est un email de test — ${parkName}, La Réunion</p>
  </div>
</div>`, `Test email — ${parkName}`, phone);

  const result = await sendViaBrevo({
    from: { name: fromName, email: fromEmail },
    to: toEmail,
    subject: `📧 Test email — ${parkName}`,
    html,
  });

  // Save to DB
  await saveEmail({
    to: toEmail,
    subject: `📧 Test email — ${parkName}`,
    html,
    type: "test",
    status: result.ok ? "sent" : "failed",
    errorMessage: result.error,
  });

  return result;
}

// Re-export for admin preview
export { getTemplateSettings };
