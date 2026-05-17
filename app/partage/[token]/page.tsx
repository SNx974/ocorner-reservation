"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, CheckCircle, Clock, AlertCircle, Trophy, Calendar,
  CreditCard, Loader2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Participant {
  id: string; name: string; email?: string; amountDue: number;
  isPaid: boolean; paidAt?: string; shareToken: string;
}

interface Reservation {
  id: string; reference: string; clientName: string; clientEmail: string;
  playerCount: number; totalPrice: number; date: string;
  courtNumber: number; status: string;
  futsalTimeSlot: { hour: number };
  participants: Participant[];
  shareToken: string;
}

export default function PartagePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState<{ id: string; clientSecret?: string; amountDue: number } | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/partage?token=${token}`);
      if (!res.ok) { setError("Lien invalide ou expiré"); return; }
      setReservation(await res.json());
    } catch { setError("Erreur de chargement"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [token]);

  async function joinGroup() {
    if (joinName.trim().length < 2) { setJoinError("Nom requis"); return; }
    setJoining(true); setJoinError(null);
    try {
      const res = await fetch("/api/futsal/participants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken: token, name: joinName.trim(), email: joinEmail.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { setJoinError(json.error ?? "Erreur"); return; }
      setNewParticipant({ id: json.participant.id, clientSecret: json.clientSecret, amountDue: json.participant.amountDue });
      await load();
    } catch { setJoinError("Erreur inattendue"); }
    finally { setJoining(false); }
  }

  async function payMySpot() {
    if (!newParticipant) return;
    setPayLoading(true);
    try {
      // Demo mode: confirm directly
      await fetch("/api/futsal/pay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: newParticipant.id }),
      });
      setPaid(true);
      await load();
    } catch { /* */ }
    finally { setPayLoading(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900">Lien invalide</h2>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <Link href="/futsal"><Button className="mt-4">Retour Futsal</Button></Link>
        </div>
      </div>
    );
  }

  const r = reservation;
  const paidCount = r.participants.filter(p => p.isPaid).length;
  const totalSlots = r.playerCount;
  const takenSlots = r.participants.length;
  const freeSlots = totalSlots - takenSlots;
  const amountPerPlayer = r.totalPrice / totalSlots;
  const totalCollected = r.participants.filter(p => p.isPaid).reduce((s, p) => s + p.amountDue, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="text-center text-white mb-2">
          <div className="text-5xl mb-2">⚽</div>
          <h1 className="text-2xl font-extrabold">Espace de groupe</h1>
          <p className="text-blue-300 text-sm">Réservation {r.reference}</p>
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
              <p className="font-semibold text-gray-900">{r.futsalTimeSlot.hour}:00</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Terrain</p>
              <p className="font-semibold text-gray-900">N°{r.courtNumber}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Organisé par</p>
              <p className="font-semibold text-gray-900 truncate">{r.clientName.split(" ")[0]}</p>
            </div>
          </div>

          {/* Finance summary */}
          <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total du terrain</span>
              <span className="font-bold text-gray-900">{formatPrice(r.totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Part par joueur ({totalSlots} joueurs)</span>
              <span className="font-semibold text-blue-700">{formatPrice(amountPerPlayer)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Collecté</span>
              <span className={cn("font-bold", totalCollected >= r.totalPrice ? "text-green-600" : "text-amber-600")}>
                {formatPrice(totalCollected)} / {formatPrice(r.totalPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Joueurs
            </h2>
            <span className="text-sm text-gray-500">{takenSlots} / {totalSlots} inscrits</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${(takenSlots / totalSlots) * 100}%` }}
            />
          </div>

          <div className="space-y-2">
            {/* Organizer */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                {r.clientName[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{r.clientName} <span className="text-xs text-blue-600 ml-1">Organisateur</span></p>
              </div>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>

            {/* Participants */}
            {r.participants.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                  {p.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400">{formatPrice(p.amountDue)}</p>
                </div>
                {p.isPaid
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <Clock className="w-4 h-4 text-amber-400" />}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: freeSlots }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-xl">
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-sm">?</div>
                <p className="text-gray-400 text-sm">Place disponible</p>
              </div>
            ))}
          </div>
        </div>

        {/* Join / Pay section */}
        {paid ? (
          <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <h3 className="font-bold text-gray-900 text-lg">Paiement confirmé !</h3>
            <p className="text-gray-500 text-sm mt-1">Votre place est réservée. À bientôt sur le terrain !</p>
          </div>
        ) : newParticipant ? (
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" /> Payer ma part
            </h3>
            <div className="bg-blue-50 rounded-xl p-4 text-center mb-4">
              <p className="text-2xl font-extrabold text-blue-700">{formatPrice(newParticipant.amountDue)}</p>
              <p className="text-blue-600 text-sm">Votre part ({totalSlots} joueurs)</p>
            </div>
            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={payMySpot} disabled={payLoading}>
              {payLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Payer {formatPrice(newParticipant.amountDue)}
            </Button>
            <p className="text-center text-xs text-gray-400 mt-2">Paiement sécurisé via Stripe</p>
          </div>
        ) : freeSlots > 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" /> Rejoindre le groupe
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Votre prénom *</label>
                <Input placeholder="Jean" value={joinName} onChange={e => { setJoinName(e.target.value); setJoinError(null); }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email (optionnel)</label>
                <Input type="email" placeholder="jean@email.com" value={joinEmail} onChange={e => setJoinEmail(e.target.value)} />
              </div>
              {joinError && (
                <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{joinError}</p>
              )}
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={joinGroup} disabled={joining}>
                {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Rejoindre & payer ma part ({formatPrice(amountPerPlayer)})
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-xl text-center">
            <p className="text-gray-500">Toutes les places sont prises.</p>
          </div>
        )}
      </div>
    </div>
  );
}
