import { Resend } from "resend";
import { formatDate, formatPrice } from "./utils";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// Save email to DB (lazy import to avoid circular deps at build time)
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
  } catch { /* silent — email saving failure must not crash the app */ }
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
  // birthday-specific extras
  isBirthday?: boolean;
}

// ─── HTML template helpers ───────────────────────────────────────────
function baseLayout(content: string, title: string) {
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
      <a href="tel:${process.env.PARK_PHONE ?? '0692000000'}" style="color:#10b981;">${process.env.PARK_PHONE ?? '0692 XX XX XX'}</a>
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

// ─── Birthday confirmation email ──────────────────────────────────────
export function buildBirthdayEmailHtml(data: ReservationEmailData & { depositPaid?: boolean }) {
  const isPaid = data.paymentType === "online_full" || data.totalPrice === 0;
  const remainingAmount = data.totalPrice - data.depositAmount;

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

  const html = `
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#10b981 0%,#3b82f6 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">🎡⚽</div>
    <h1 style="margin:0;color:white;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Ocorner Réservation</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Votre anniversaire est confirmé 🎉</p>
  </div>

  <!-- Body -->
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1e293b;">Bonjour <strong>${data.clientName}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">
      Merci pour votre réservation ! Nous avons bien enregistré votre anniversaire et nous avons hâte de vous accueillir.
      Voici le récapitulatif complet de votre réservation.
    </p>

    <!-- Recap table -->
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

    <!-- Payment status -->
    ${paymentBlock}

    <!-- QR Code -->
    ${qrBlock}

    <!-- Practical info -->
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#15803d;">📌 Informations pratiques</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;vertical-align:top;width:28px;font-size:16px;">🚫</td>
          <td style="padding:6px 0;font-size:13px;color:#166534;line-height:1.5;">
            <strong>Boissons extérieures non admises</strong><br/>
            Pour le confort de tous, merci de ne pas apporter de boissons de l'extérieur.
            Des boissons sont disponibles sur place.
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;vertical-align:top;font-size:16px;">🎂</td>
          <td style="padding:6px 0;font-size:13px;color:#166534;line-height:1.5;">
            <strong>Gâteau d'anniversaire bienvenu !</strong><br/>
            Vous pouvez apporter votre gâteau. Nous disposons d'un espace réfrigéré
            pour le conserver jusqu'au moment du dessert.
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;vertical-align:top;font-size:16px;">🥤</td>
          <td style="padding:6px 0;font-size:13px;color:#166534;line-height:1.5;">
            <strong>Gobelets fournis</strong><br/>
            Des gobelets sont mis à disposition pour tous les enfants.
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;vertical-align:top;font-size:16px;">⏰</td>
          <td style="padding:6px 0;font-size:13px;color:#166534;line-height:1.5;">
            <strong>Arrivée recommandée 10 min avant le début</strong><br/>
            Présentez ce mail ou votre QR code à l'accueil pour valider votre entrée.
          </td>
        </tr>
      </table>
    </div>

    <!-- Contact -->
    <div style="text-align:center;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
      <p style="margin:0;font-size:14px;color:#475569;">Une question ? Contactez-nous :</p>
      <a href="tel:${process.env.PARK_PHONE ?? '0692000000'}"
         style="display:inline-block;margin-top:8px;font-size:18px;font-weight:700;color:#10b981;text-decoration:none;">
        📞 ${process.env.PARK_PHONE ?? '0692 XX XX XX'}
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Réf. <strong>${data.reference}</strong> · Ocorner, La Réunion · Ce mail a été envoyé automatiquement, merci de ne pas y répondre.
    </p>
  </div>

</div>`;

  return baseLayout(html, `Réservation ${data.reference} — Ocorner`);
}

// ─── Futsal confirmation email ────────────────────────────────────────
function buildFutsalEmailHtml(data: ReservationEmailData) {
  const isPaid = data.paymentType === "online_full" || data.totalPrice === 0;
  const html = `
<div style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:8px;">⚽🏟️</div>
    <h1 style="margin:0;color:white;font-size:26px;font-weight:800;">Ocorner Futsal</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Votre terrain est réservé !</p>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1e293b;">Bonjour <strong>${data.clientName}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;">Votre session de futsal a bien été enregistrée. Voici les informations de votre réservation.</p>
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
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#1d4ed8;font-weight:600;">💡 Bon à savoir</p>
      <p style="margin:8px 0 0;font-size:13px;color:#1e40af;">Partagez le lien de réservation à vos coéquipiers pour qu'ils puissent payer leur part individuellement.</p>
    </div>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;">Réf. <strong>${data.reference}</strong> · Ocorner Futsal, La Réunion</p>
  </div>
</div>`;
  return baseLayout(html, `Futsal ${data.reference} — Ocorner`);
}

// ─── Send + save ──────────────────────────────────────────────────────
async function sendAndSave(opts: {
  to: string; subject: string; html: string;
  type: string; reference?: string; reservationId?: string;
}) {
  const resend = getResend();
  let status = "sent";
  let errorMessage: string | undefined;

  if (resend) {
    try {
      await resend.emails.send({
        from: `Ocorner <${process.env.FROM_EMAIL ?? "noreply@ocorner.re"}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (e) {
      status = "failed";
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  } else {
    // No Resend key — still save the email for admin preview
    status = "no_key";
  }

  await saveEmail({ ...opts, status, errorMessage });
  return { status, errorMessage };
}

export async function sendConfirmationEmail(data: ReservationEmailData) {
  const isBirthday = data.isBirthday !== false && !data.formulaName.toLowerCase().includes("futsal");
  const html = isBirthday ? buildBirthdayEmailHtml(data) : buildFutsalEmailHtml(data);
  const subject = isBirthday
    ? `🎉 Réservation ${data.reference} — Anniversaire Ocorner`
    : `⚽ Réservation ${data.reference} — Futsal Ocorner`;

  return sendAndSave({
    to: data.clientEmail,
    subject,
    html,
    type: "confirmation",
    reference: data.reference,
    reservationId: data.reservationId,
  });
}

export async function sendDepositReminderEmail(data: ReservationEmailData) {
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
      <p style="margin:0;color:#92400e;font-weight:600;">⚠️ Sans paiement dans les 24h, votre créneau sera libéré automatiquement.</p>
    </div>
    <p style="font-size:14px;color:#475569;">Contactez-nous rapidement :</p>
    <a href="tel:${process.env.PARK_PHONE ?? '0692000000'}" style="display:inline-block;font-size:18px;font-weight:700;color:#f59e0b;text-decoration:none;">
      📞 ${process.env.PARK_PHONE ?? '0692 XX XX XX'}
    </a>
  </div>
</div>`, `Rappel acompte ${data.reference}`);

  return sendAndSave({
    to: data.clientEmail,
    subject: `⏰ Rappel acompte — Réservation ${data.reference}`,
    html,
    type: "reminder",
    reference: data.reference,
    reservationId: data.reservationId,
  });
}

export async function sendCancellationEmail(data: ReservationEmailData) {
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
    <p style="font-size:14px;color:#475569;">Vous souhaitez refaire une réservation ? Rendez-vous sur notre site.</p>
    <a href="tel:${process.env.PARK_PHONE ?? '0692000000'}" style="display:inline-block;font-size:18px;font-weight:700;color:#ef4444;text-decoration:none;">
      📞 ${process.env.PARK_PHONE ?? '0692 XX XX XX'}
    </a>
  </div>
</div>`, `Annulation ${data.reference}`);

  return sendAndSave({
    to: data.clientEmail,
    subject: `❌ Annulation réservation ${data.reference} — Ocorner`,
    html,
    type: "cancellation",
    reference: data.reference,
    reservationId: data.reservationId,
  });
}
