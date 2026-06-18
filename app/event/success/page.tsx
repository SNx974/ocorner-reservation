"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface EventRes {
  reference: string; status: string; totalPrice: number; playerCount: number | null;
  fullPaymentPaid: boolean; date: string;
  event?: { title: string; priceNote: string | null } | null;
}

function SuccessContent() {
  const sp = useSearchParams();
  const reference = sp.get("reference");
  const sessionId = sp.get("session_id");
  const [res, setRes] = useState<EventRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) { setError("Référence manquante"); setLoading(false); return; }
    if (sessionId) {
      fetch("/api/reservations/verify-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, reference }),
      }).catch(() => {});
    }
    let tries = 0;
    async function poll() {
      try {
        const r = await fetch(`/api/reservations?reference=${reference}`);
        const data = await r.json();
        if (!r.ok) { setError(data.error ?? "Introuvable"); setLoading(false); return; }
        setRes(data);
        if (data.fullPaymentPaid || tries >= 8) setLoading(false);
        else { tries++; setTimeout(poll, 1500); }
      } catch { setError("Erreur réseau"); setLoading(false); }
    }
    poll();
  }, [reference, sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">Confirmation du paiement…</p>
        </div>
      </div>
    );
  }

  if (error || !res) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">{error ?? "Réservation introuvable"}</p>
          <Link href="/" className="mt-4 inline-block"><Button variant="outline">Accueil</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a1628] px-4 py-10">
      <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          {res.fullPaymentPaid ? "Place réservée !" : "Réservation enregistrée"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Référence : <code className="font-mono font-bold text-blue-600">{res.reference}</code></p>

        <div className="bg-blue-50 rounded-2xl p-4 text-left space-y-2 text-sm mt-5">
          {res.event && <div className="flex justify-between"><span className="text-gray-500">Événement</span><span className="font-semibold text-right">{res.event.title}</span></div>}
          <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold">{format(new Date(res.date), "d MMMM yyyy", { locale: fr })}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Places</span><span className="font-semibold">{res.playerCount ?? 1}</span></div>
          <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Total</span><span className="font-bold text-blue-700">{formatPrice(res.totalPrice)}</span></div>
        </div>

        {res.event?.priceNote && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 mt-3">💡 {res.event.priceNote}</p>
        )}

        <Link href="/" className="mt-6 inline-block w-full">
          <Button className="w-full">Retour à l'accueil</Button>
        </Link>
      </div>
    </main>
  );
}

export default function EventSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1628] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
