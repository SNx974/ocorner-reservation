import { Resend } from "resend";
import { formatDate, formatPrice } from "./utils";

// Lazy init — Resend throws at construction if key is missing/empty
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

interface ReservationEmailData {
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
}

export async function sendConfirmationEmail(data: ReservationEmailData) {
  const resend = getResend();
  if (!resend) return; // email désactivé si pas de clé

  const isOnsite = data.paymentType.startsWith("onsite");
  const depositInfo = isOnsite
    ? `<p style="background:#fff3cd;padding:12px;border-radius:8px;border-left:4px solid #ffc107;">
        ⚠️ <strong>Acompte requis :</strong> ${formatPrice(data.depositAmount)}<br/>
        Vous devez verser cet acompte dans les 72h pour confirmer votre réservation.
      </p>`
    : `<p style="background:#d4edda;padding:12px;border-radius:8px;border-left:4px solid #28a745;">
        ✅ <strong>Paiement complet reçu.</strong> Votre réservation est confirmée !
      </p>`;

  await resend.emails.send({
    from: `Marmaille Parc <${process.env.FROM_EMAIL ?? "noreply@marmailleparc.re"}>`,
    to: data.clientEmail,
    subject: `🎉 Réservation ${data.reference} - Marmaille Parc`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
      <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f8f9fa;">
        <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);">
          <div style="background:linear-gradient(135deg,#10b981,#3b82f6);padding:30px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:28px;">🎡 Marmaille Parc</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">Confirmation de réservation</p>
          </div>
          <div style="padding:30px;">
            <p>Bonjour <strong>${data.clientName}</strong>,</p>
            <p>Votre réservation a bien été enregistrée !</p>
            <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:20px 0;">
              <h3 style="margin:0 0 15px;color:#1f2937;">📋 Détails de votre réservation</h3>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#6b7280;">Référence</td><td style="padding:6px 0;font-weight:bold;">${data.reference}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Formule</td><td style="padding:6px 0;">${data.formulaName}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;">${formatDate(data.date)}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Heure</td><td style="padding:6px 0;">${data.time}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Enfants</td><td style="padding:6px 0;">${data.childrenCount} enfants</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Total</td><td style="padding:6px 0;font-size:18px;font-weight:bold;color:#10b981;">${formatPrice(data.totalPrice)}</td></tr>
              </table>
            </div>
            ${depositInfo}
            ${data.qrCode ? `
            <div style="text-align:center;margin:20px 0;">
              <p style="color:#6b7280;font-size:14px;">Présentez ce QR code à l'entrée :</p>
              <img src="${data.qrCode}" alt="QR Code" style="width:180px;height:180px;border:4px solid #e5e7eb;border-radius:12px;"/>
            </div>` : ""}
            <p style="color:#6b7280;font-size:14px;margin-top:30px;text-align:center;">
              Pour toute question : <a href="tel:${process.env.PARK_PHONE ?? "0692000000"}" style="color:#10b981;">${process.env.PARK_PHONE ?? "0692 XX XX XX"}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendDepositReminderEmail(data: ReservationEmailData) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: `Marmaille Parc <${process.env.FROM_EMAIL ?? "noreply@marmailleparc.re"}>`,
    to: data.clientEmail,
    subject: `⚠️ Rappel acompte - Réservation ${data.reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>⚠️ Rappel : Acompte en attente</h2>
        <p>Bonjour <strong>${data.clientName}</strong>,</p>
        <p>Votre réservation <strong>${data.reference}</strong> du <strong>${formatDate(data.date)}</strong>
           est en attente de votre acompte de <strong>${formatPrice(data.depositAmount)}</strong>.</p>
        <p style="color:red;">⏰ Si l'acompte n'est pas reçu dans les 24h, votre réservation sera automatiquement annulée.</p>
        <p>Contactez-nous : ${process.env.PARK_PHONE ?? "0692 XX XX XX"}</p>
      </div>
    `,
  });
}

export async function sendCancellationEmail(data: ReservationEmailData) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: `Marmaille Parc <${process.env.FROM_EMAIL ?? "noreply@marmailleparc.re"}>`,
    to: data.clientEmail,
    subject: `❌ Annulation réservation ${data.reference}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>❌ Réservation annulée</h2>
        <p>Bonjour <strong>${data.clientName}</strong>,</p>
        <p>Votre réservation <strong>${data.reference}</strong> a été annulée.</p>
        <p>Pour faire une nouvelle réservation, visitez notre site.</p>
        <p>Contactez-nous : ${process.env.PARK_PHONE ?? "0692 XX XX XX"}</p>
      </div>
    `,
  });
}
