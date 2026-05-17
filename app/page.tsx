import { BookingForm } from "@/components/booking/BookingForm";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-blue-50">
      {/* Hero */}
      <div className="gradient-hero text-white py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-3">🎡⚽</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Marmaille Parc + Foot
          </h1>
          <p className="mt-2 text-white/85 text-lg">
            Réservez en ligne en moins de 1 minute !
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
            {["🎡 Parc de jeux", "⚽ Foot à 5", "🥞 Crêpes & Déjeuner", "👶 Dès 6 enfants"].map(t => (
              <span key={t} className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
        <Suspense fallback={<div className="text-center py-10 text-gray-500">Chargement...</div>}>
          <BookingForm />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-sm text-gray-500">
        <p>📍 Marmaille Parc + Foot — Réunion</p>
        <p className="mt-1">📞 Contact : 0692 XX XX XX</p>
      </footer>
    </main>
  );
}
