import { prisma } from "@/lib/prisma";
import { sendBirthdayChildrenConfirmEmail } from "@/lib/email";

// Send the J-3 "confirm number of children" email for birthdays happening in 3 days.
// Deduplicated via SentEmail (type "birthday_jm3") so each reservation is emailed once.
export async function runBirthdayJm3Reminders(): Promise<{ sent: number; skipped: number }> {
  const target = new Date();
  target.setDate(target.getDate() + 3);
  const start = new Date(target); start.setHours(0, 0, 0, 0);
  const end = new Date(target); end.setHours(23, 59, 59, 999);

  const reservations = await prisma.reservation.findMany({
    where: {
      type: "birthday",
      date: { gte: start, lte: end },
      status: { notIn: ["cancelled", "expired"] },
    },
    include: { formula: true, timeSlot: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const r of reservations) {
    if (!r.clientEmail || !r.clientEmail.includes("@") || r.clientEmail.startsWith("admin+")) { skipped++; continue; }

    const already = await prisma.sentEmail.findFirst({
      where: { reference: r.reference, type: "birthday_jm3", status: "sent" },
    });
    if (already) { skipped++; continue; }

    try {
      const res = await sendBirthdayChildrenConfirmEmail({
        clientName: r.clientName,
        clientEmail: r.clientEmail,
        reference: r.reference,
        formulaName: r.formula?.name ?? "Anniversaire",
        date: r.date,
        time: r.timeSlot?.time ?? "—",
        childrenCount: r.childrenCount,
        totalPrice: r.totalPrice,
        depositAmount: r.depositAmount,
        paymentType: r.paymentType,
        status: r.status,
        reservationId: r.id,
        isBirthday: true,
      });
      if (res.status === "sent") sent++; else skipped++;
    } catch (e) {
      console.error("[jm3] send error", r.reference, e);
      skipped++;
    }
  }

  return { sent, skipped };
}
