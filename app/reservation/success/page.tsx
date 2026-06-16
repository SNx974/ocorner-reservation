"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationPage } from "@/components/booking/ConfirmationPage";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const sessionId = searchParams.get("session_id");

  const [reservation, setReservation] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) { setError("Référence manquante"); setLoading(false); return; }

    let tries = 0;
    const maxTries = 10;

    async function poll() {
      try {
        const res = await fetch(`/api/reservations?reference=${reference}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Introuvable"); setLoading(false); return; }

        setReservation(data);

        if (data.status === "confirmed" || tries >= maxTries) {
          setLoading(false);
        } else {
          tries++;
          setTimeout(poll, 1500);
        }
      } catch {
        setError("Erreur réseau"); setLoading(false);
      }
    }

    poll();
  }, [reference]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#1a2a4a] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">Confirmation du paiement…</p>
          <p className="text-sm text-gray-500 mt-1">Veuillez patienter quelques instants</p>
          {sessionId && <p className="text-xs text-gray-300 mt-2 font-mono truncate">{sessionId.slice(0, 24)}…</p>}
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#1a2a4a] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">{error ?? "Réservation introuvable"}</p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#1a2a4a] py-10 px-4">
      <ConfirmationPage reservation={reservation} />
    </main>
  );
}

export default function ReservationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
