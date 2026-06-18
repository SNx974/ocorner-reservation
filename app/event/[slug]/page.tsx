export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { EventBookingForm } from "./EventBookingForm";

interface Props { params: { slug: string }; }

export default async function EventPage({ params }: Props) {
  const event = await prisma.event.findUnique({ where: { slug: params.slug } });
  if (!event) notFound();

  const booked = event.capacity != null
    ? (await prisma.reservation.findMany({
        where: { eventId: event.id, status: { notIn: ["cancelled", "expired"] } },
        select: { playerCount: true },
      })).reduce((s, r) => s + (r.playerCount ?? 1), 0)
    : 0;
  const seatsLeft = event.capacity != null ? Math.max(0, event.capacity - booked) : null;
  const isFull = seatsLeft != null && seatsLeft <= 0;
  const accent = event.accentColor || "#c8f135";

  return (
    <main className="min-h-screen bg-[#0a1628] text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link href="/" className="text-white/60 hover:text-white text-sm">← Accueil</Link>

        {event.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={event.imageUrl} alt={event.title} className="w-full rounded-2xl mt-4 mb-2 object-cover max-h-56" />
        )}

        <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="p-6" style={{ borderTop: `4px solid ${accent}` }}>
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: accent }}>Événement</p>
            <h1 className="text-2xl font-extrabold mt-1">{event.title}</h1>
            <p className="text-white/60 text-sm mt-1 capitalize">
              {format(new Date(event.eventDate), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </p>

            {event.description && (
              <p className="text-white/80 text-sm mt-4 whitespace-pre-line leading-relaxed">{event.description}</p>
            )}

            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold" style={{ color: accent }}>{formatPrice(event.price)}</span>
              <span className="text-white/50 text-sm">/ personne</span>
            </div>
            {event.priceNote && <p className="text-white/50 text-xs mt-1">{event.priceNote}</p>}

            {seatsLeft != null && (
              <p className={`text-xs mt-2 font-semibold ${isFull ? "text-red-400" : "text-emerald-400"}`}>
                {isFull ? "Complet" : `${seatsLeft} place(s) restante(s)`}
              </p>
            )}
          </div>

          <div className="border-t border-white/10 p-6">
            {!event.isActive ? (
              <p className="text-center text-white/60 text-sm">Les réservations pour cet événement sont fermées.</p>
            ) : isFull ? (
              <p className="text-center text-red-400 font-semibold">Cet événement est complet.</p>
            ) : (
              <EventBookingForm
                slug={event.slug}
                unitPrice={event.price}
                maxSeats={seatsLeft ?? 20}
                accent={accent}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
