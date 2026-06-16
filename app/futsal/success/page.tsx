"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Share2, Copy, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Reservation {
  id: string; reference: string; clientName: string; status: string;
  date: string; totalPrice: number; playerCount: number; courtNumber: number;
  paymentType: string; depositPaid: boolean; fullPaymentPaid: boolean;
  depositAmount: number; shareToken: string;
  futsalTimeSlot: { hour: number; minute: number };
  futsalSlots?: Array<{ courtNumber: number; futsalTimeSlot: { hour: number; minute: number } }>;
}

function fmtSlot(hour: number, minute: number) {
  return `${hour}h${minute > 0 ? String(minute).padStart(2, "0") : "00"}`;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const sessionId = searchParams.get("session_id");

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!reference) { setError("Référence manquante"); setLoading(false); return; }

    // Poll until confirmed (webhook may take a few seconds)
    let tries = 0;
    const maxTries = 10;

    async function poll() {
      try {
        const res = await fetch(`/api/futsal/reservations?reference=${reference}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Introuvable"); setLoading(false); return; }

        setReservation(data);
        setAttempts(tries);

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
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">Confirmation du paiement…</p>
          <p className="text-sm text-gray-500 mt-1">Veuillez patienter quelques instants</p>
          {sessionId && <p className="text-xs text-gray-300 mt-2 font-mono truncate">{sessionId.slice(0, 24)}…</p>}
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <p className="font-semibold text-gray-900">{error ?? "Réservation introuvable"}</p>
          <Link href="/futsal" className="mt-4 inline-block">
            <Button variant="outline">Retour Foot à 5</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cartSlots = reservation.futsalSlots && reservation.futsalSlots.length > 0
    ? [...reservation.futsalSlots].sort((a, b) => a.futsalTimeSlot.hour - b.futsalTimeSlot.hour || a.futsalTimeSlot.minute - b.futsalTimeSlot.minute || a.courtNumber - b.courtNumber)
    : [{ courtNumber: reservation.courtNumber, futsalTimeSlot: reservation.futsalTimeSlot }];
  const slotsLabel = cartSlots.map(s => `${fmtSlot(s.futsalTimeSlot.hour, s.futsalTimeSlot.minute)} T${s.courtNumber}`).join(", ");
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/partage/${reservation.shareToken}`;
  const isDeposit = reservation.paymentType === "onsite_deposit";
  const remaining = reservation.totalPrice - reservation.depositAmount;

  function copyShareLink() {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0a1628] px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Success header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {reservation.status === "confirmed" ? "Paiement confirmé !" : "Réservation enregistrée"}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Référence : <code className="font-mono font-bold text-blue-600">{reservation.reference}</code>
            </p>
          </div>

          {/* Booking details */}
          <div className="bg-blue-50 rounded-2xl p-4 space-y-2 text-sm mb-5">
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold capitalize">{format(new Date(reservation.date), "EEEE d MMMM yyyy", { locale: fr })}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500 shrink-0">Créneaux</span>
              <span className="font-semibold text-right">{slotsLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Joueurs</span>
              <span className="font-semibold">{reservation.playerCount}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-blue-700">{formatPrice(reservation.totalPrice)}</span>
            </div>
            {isDeposit && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Acompte payé</span>
                  <span className="text-green-600 font-semibold">{formatPrice(reservation.depositAmount)} ✓</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Reste à régler sur place</span>
                  <span className="text-amber-600 font-semibold">{formatPrice(remaining)}</span>
                </div>
              </>
            )}
            {!isDeposit && reservation.fullPaymentPaid && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Statut paiement</span>
                <span className="text-green-600 font-semibold">💶 Intégralement payé</span>
              </div>
            )}
          </div>

          {/* Share link — only for deposit bookings */}
          {isDeposit && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <p className="font-semibold text-emerald-800 text-sm">Lien de partage équipe</p>
              </div>
              <p className="text-xs text-emerald-700 mb-3">Envoyez ce lien à vos coéquipiers pour qu'ils paient leur part</p>
              <div className="flex gap-2">
                <input readOnly value={shareLink}
                  className="flex-1 text-xs bg-white border border-emerald-200 rounded-lg px-3 py-2 text-gray-700 truncate" />
                <button type="button" onClick={copyShareLink}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1 whitespace-nowrap">
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/futsal" className={isDeposit ? "flex-1" : "w-full"}>
              <Button variant="outline" className="w-full">Retour Foot à 5</Button>
            </Link>
            {isDeposit && (
              <Link href={`/partage/${reservation.shareToken}`} className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Voir mon groupe</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FutsalSuccessPage() {
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
