"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users, CheckCircle, Clock, AlertCircle, Trophy,
  Loader2, PartyPopper,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Participant {
  id: string; name: string; email?: string; amountDue: number;
  isPaid: boolean; paidAt?: string;
}

interface FutsalTimeSlot {
  hour: number; minute: number;
}

interface Reservation {
  id: string; reference: string; clientName: string; clientEmail: string;
  playerCount: number; totalPrice: number; date: string;
  courtNumber: number; status: string;
  depositPaid: boolean; fullPaymentPaid: boolean; depositAmount: number;
  futsalTimeSlot: FutsalTimeSlot;
  participants: Participant[];
  shareToken: string;
}

function slotLabel(slot: FutsalTimeSlot) {
  return `${slot.hour}h${slot.minute > 0 ? String(slot.minute).padStart(2, "0") : "00"}`;
}

export default function PartagePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Join form
  const [joinName, setJoinName] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Result states
  const [confirmed, setConfirmed] = useState(false);
  const [myAmount, setMyAmount] = useState(0);
  const [myName, setMyName] = useState("");

  async function load() {
    try {
      const res = await fetch(`/api/partage?token=${token}`);
      if (!res.ok) { setError("Lien invalide ou expiré"); return; }
      setReservation(await res.json());
    } catch { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [token]);

  async function joinAndConfirm() {
    if (joinName.trim().length < 2) { setJoinError("Prénom requis (min. 2 caractères)"); return; }
    setJoining(true); setJoinError(null);

    try {
      // 1. Create participant
      const joinRes = await fetch("/api/futsal/participants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken: token,
          name: joinName.trim(),
          email: joinEmail.trim() || undefined,
        }),
      });
      const joinData = await joinRes.json();
      if (!joinRes.ok) { setJoinError(joinData.error ?? "Erreur lors de l'inscription"); return; }

      const participantId = joinData.participant.id;
      const amount = joinData.participant.amountDue;

      // 2. Confirm payment immediately (demo mode — Stripe non configuré)
      await fetch("/api/futsal/pay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });

      // 3. Show success
      setMyAmount(amount);
      setMyName(joinName.trim());
      setConfirmed(true);
      await load();
    } catch {
      setJoinError("Erreur inattendue, veuillez réessayer.");
    } finally {
      setJoining(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Lien invalide</h2>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <Link href="/futsal"><Button className="mt-4">Retour Futsal</Button></Link>
        </div>
      </div>
    );
  }

  const r = reservation;
  const takenSlots = r.participants.length;
  const totalSlots = r.playerCount;
  const freeSlots = Math.max(0, totalSlots - takenSlots - 1); // -1 for organizer
  const totalParticipants = takenSlots + 1; // +1 organizer
  const amountPerPlayer = Math.round((r.totalPrice / totalSlots) * 100) / 100;
  // Include organizer's share in collected if they paid deposit or full amount
  const organizerShare = (r.depositPaid || r.fullPaymentPaid) ? amountPerPlayer : 0;
  const totalCollected = organizerShare + r.participants.filter(p => p.isPaid).reduce((s, p) => s + p.amountDue, 0);
  const isFull = takenSlots >= totalSlots - 1; // -1 for organizer

  // ── Confirmed success ─────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Bienvenue {myName} !</h2>
          <p className="text-gray-500 text-sm mt-2 mb-5">
            Tu es inscrit(e) sur la réservation <span className="font-mono font-bold text-blue-600">{r.reference}</span>
          </p>
          <div className="bg-blue-50 rounded-2xl p-4 mb-5">
            <p className="text-sm text-gray-500 mb-1">Ta place est réservée !</p>
            <p className="text-3xl font-extrabold text-blue-700">{formatPrice(myAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">À régler sur place le jour J</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-left space-y-1 mb-5">
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="font-semibold capitalize">
                {format(new Date(r.date.slice(0, 10) + "T12:00:00"), "d MMMM yyyy", { locale: fr })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Créneau</span>
              <span className="font-semibold">{slotLabel(r.futsalTimeSlot)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Terrain</span>
              <span className="font-semibold">N°{r.courtNumber}</span>
            </div>
          </div>
          {joinEmail && (
            <p className="text-xs text-emerald-600 mb-4">
              📧 Un email de confirmation a été envoyé à <strong>{joinEmail}</strong>
            </p>
          )}
          <Link href="/futsal">
            <Button variant="outline" className="w-full">Retour Futsal</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a1628] px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="text-center text-white mb-2">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-2xl font-extrabold">Espace de groupe</h1>
          <p className="text-blue-300 text-sm mt-1">Réservation <span className="font-mono">{r.reference}</span></p>
        </div>

        {/* Reservation card */}
        <div className="bg-white rounded-2xl p-5 shadow-xl">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-600" /> Détails du terrain
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Date</p>
              <p className="font-semibold text-gray-900 capitalize">
                {format(new Date(r.date.slice(0, 10) + "T12:00:00"), "d MMM yyyy", { locale: fr })}
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Créneau</p>
              <p className="font-semibold text-gray-900">{slotLabel(r.futsalTimeSlot)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Terrain</p>
              <p className="font-semibold text-gray-900">N°{r.courtNumber}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Organisateur</p>
              <p className="font-semibold text-gray-900 truncate">{r.clientName.split(" ")[0]}</p>
            </div>
          </div>

        </div>

        {/* Participants list */}
        <div className="bg-white rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Joueurs
            </h2>
            <span className="text-sm text-gray-500">{totalParticipants} / {totalSlots} inscrits</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalParticipants / totalSlots) * 100)}%` }}
            />
          </div>

          <div className="space-y-2">
            {/* Organizer */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {r.clientName[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {r.clientName}
                  <span className="text-xs text-blue-600 ml-2 font-normal">Organisateur</span>
                </p>
                <p className="text-xs text-gray-400">A réservé le terrain</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            </div>

            {/* Participants */}
            {r.participants.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0">
                  {p.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{formatPrice(p.amountDue)} — à régler sur place</p>
                </div>
                {p.isPaid
                  ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  : <Clock className="w-5 h-5 text-amber-400 shrink-0" />}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: freeSlots }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-sm shrink-0">?</div>
                <p className="text-gray-400 text-sm">Place disponible</p>
              </div>
            ))}
          </div>
        </div>

        {/* Join section */}
        {isFull ? (
          <div className="bg-white rounded-2xl p-5 shadow-xl text-center">
            <div className="text-3xl mb-2">🏟️</div>
            <p className="font-semibold text-gray-700">Toutes les places sont prises !</p>
            <p className="text-sm text-gray-400 mt-1">Le terrain est complet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Payer ma place
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ton prénom *</label>
                <Input
                  placeholder="Jean"
                  value={joinName}
                  onChange={e => { setJoinName(e.target.value); setJoinError(null); }}
                  onKeyDown={e => e.key === "Enter" && joinAndConfirm()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email <span className="text-gray-400">(optionnel)</span>
                </label>
                <Input
                  type="email"
                  placeholder="jean@email.com"
                  value={joinEmail}
                  onChange={e => setJoinEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && joinAndConfirm()}
                />
              </div>

              {joinError && (
                <p className="text-red-500 text-sm flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />{joinError}
                </p>
              )}

              <Button
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-bold"
                onClick={joinAndConfirm}
                disabled={joining || joinName.trim().length < 2}
              >
                {joining
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Inscription en cours...</>
                  : <>Payer — {formatPrice(amountPerPlayer)}</>
                }
              </Button>
              <p className="text-xs text-center text-gray-400">À régler sur place le jour J</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
