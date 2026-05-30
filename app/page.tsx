import { BookingForm } from "@/components/booking/BookingForm";
import { Suspense } from "react";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f1f5f9]">
      {/* Hero */}
      <div className="bg-[#0d1117] text-white py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo anniversaire */}
          <div className="flex justify-center mb-5">
            <Image src="/logo-anniversaire.png" alt="Ocorner Anniversaire" width={480} height={160} style={{ objectFit: "contain", maxWidth: "100%" }} />
          </div>
          <p className="text-white/60 text-base">
            Anniversaires & Foot à 5 — Réservez en ligne !
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
            {[
              { label: "Parc de jeux",     color: "#c8f135" },
              { label: "Foot à 5",         color: "#1bbfa8" },
              { label: "Crêpes & Déjeuner", color: "#c8f135" },
              { label: "Dès 6 enfants",    color: "#1bbfa8" },
            ].map(t => (
              <span key={t.label}
                style={{ border: `1px solid ${t.color}60`, color: t.color }}
                className="px-3 py-1 rounded-full text-sm font-semibold bg-white/5">
                {t.label}
              </span>
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
      <footer className="bg-[#0d1117] py-6 text-center text-sm">
        <p className="font-bold tracking-widest uppercase" style={{ color: "#1bbfa8" }}>Ocorner — La Réunion</p>
        <p className="mt-1" style={{ color: "#c8f135" }}>📞 Contact : 0692 XX XX XX</p>
      </footer>
    </main>
  );
}
