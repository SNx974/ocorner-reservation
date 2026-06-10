export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ConfirmationPage } from "@/components/booking/ConfirmationPage";

interface Props {
  params: { ref: string };
}

export default async function MaReservationPage({ params }: Props) {
  const reservation = await prisma.reservation.findUnique({
    where: { reference: params.ref },
    include: { formula: true, timeSlot: true },
  });

  if (!reservation) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#1a2a4a] py-10 px-4">
      <ConfirmationPage reservation={reservation as unknown as Record<string, unknown>} />
    </main>
  );
}
