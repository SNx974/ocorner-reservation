"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { formatPrice, getStatusLabel, birthdayTimeToHours } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Users, Loader2, RefreshCw,
  Trophy, Phone, Mail, X, Plus, Trash2, CreditCard, Banknote,
  CheckCircle, Clock, Calendar, CalendarDays, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isToday } from "date-fns";
import { fr } from "date-fns/locale";

interface FutsalSlot { id: string; hour: number; minute: number; isActive: boolean }
interface FutsalRes {
  id: string; reference: string; clientName: string; clientPhone: string;
  clientEmail: string; date: string; status: string; totalPrice: number;
  playerCount: number; courtNumber: number; paymentType: string;
  depositAmount: number; depositPaid: boolean; fullPaymentPaid: boolean;
  discountAmount?: number; basePrice?: number;
  notes?: string; adminNotes?: string; type?: string;
  formula?: { name: string; category: string } | null;
  futsalTimeSlot: { hour: number; minute: number };
  futsalSlots?: Array<{ courtNumber: number; futsalTimeSlot: { hour: number; minute: number } }>;
  timeSlot?: { time: string } | null;
  promoCode?: { code: string; label: string; discountType: string; discountValue: number } | null;
  participants: Array<{ id: string; name: string; amountDue: number; isPaid: boolean }>;
}

const COURTS = [1, 2, 3];

const courtConfig = [
  { id: 1, color: "border-blue-400", bg: "bg-blue-50", text: "text-blue-700", headerBg: "bg-blue-500", light: "bg-blue-100" },
  { id: 2, color: "border-violet-400", bg: "bg-violet-50", text: "text-violet-700", headerBg: "bg-violet-500", light: "bg-violet-100" },
  { id: 3, color: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", headerBg: "bg-emerald-500", light: "bg-emerald-100" },
];

function slotLabel(hour: number, minute: number) {
  return `${hour}h${minute > 0 ? minute.toString().padStart(2, "0") : "00"}`;
}

// ── Detail modal ────────────────────────────────────────────────────
function FutsalModal({
  r, token, onClose, onRefresh,
}: { r: FutsalRes; token: string; onClose: () => void; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [payAction, setPayAction] = useState<"deposit" | "full" | null>(null);
  const [payMethod, setPayMethod] = useState<"cb" | "especes">("especes");
  const [saving, setSaving] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(r.date.slice(0, 10));
  const [rescheduleFutsalSlotId, setRescheduleFutsalSlotId] = useState("");
  const [futsalSlotsForReschedule, setFutsalSlotsForReschedule] = useState<FutsalSlot[]>([]);
  const [rescheduling, setRescheduling] = useState(false);

  const isBdayFoot = r.type === "birthday";
  const cfg = courtConfig[(r.courtNumber ?? 1) - 1] ?? courtConfig[0];
  const remaining = r.totalPrice - (r.depositPaid ? r.depositAmount : 0);

  async function patch(action: string, extra?: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id: r.id, action, notes: `Paiement: ${payMethod === "cb" ? "CB" : "Espèces"}`, ...extra }),
    });
    setSaving(false);
    onRefresh();
    onClose();
  }

  async function deleteRes() {
    if (!confirm(`Supprimer définitivement la réservation de ${r.clientName} ?`)) return;
    setDeleting(true);
    await fetch("/api/admin/reservations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id: r.id }),
    });
    onRefresh();
    onClose();
  }

  const isCancellable = r.status === "cancelled" || r.status === "expired";

  async function doReschedule() {
    if (!rescheduleDate) return;
    setRescheduling(true);
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        id: r.id, action: "reschedule",
        newDate: rescheduleDate,
        newFutsalTimeSlotId: rescheduleFutsalSlotId || undefined,
      }),
    });
    setRescheduling(false);
    setShowReschedule(false);
    onRefresh(); onClose();
  }

  async function loadSlotsForDate(date: string) {
    const res = await fetch(`/api/admin/futsal-slots`, { headers: { "x-admin-token": token } });
    if (res.ok) setFutsalSlotsForReschedule(await res.json());
    setRescheduleDate(date);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={cn("flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white")}>
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              {isBdayFoot ? "🎂⚽" : <Trophy className="w-4 h-4 text-blue-600" />}
              {r.clientName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <code className="text-xs text-gray-400 font-mono">{r.reference}</code>
              {!isBdayFoot && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold text-white", cfg.headerBg)}>
                  Terrain {r.courtNumber}
                </span>
              )}
              <Badge variant={r.status === "confirmed" ? "success" : r.status === "cancelled" ? "destructive" : "warning"}>
                {getStatusLabel(r.status)}
              </Badge>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={cn("rounded-xl p-3", isBdayFoot ? "bg-orange-50" : cfg.bg)}>
              <p className="text-xs text-gray-400">Créneau</p>
              <p className="font-bold text-lg">{slotLabel(r.futsalTimeSlot.hour, r.futsalTimeSlot.minute)}</p>
            </div>
            <div className={cn("rounded-xl p-3", isBdayFoot ? "bg-orange-50" : cfg.bg)}>
              <p className="text-xs text-gray-400">Joueurs</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {r.playerCount}
              </p>
            </div>
            <div className="rounded-xl p-3 bg-gray-50">
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-bold text-emerald-700">{formatPrice(r.totalPrice)}</p>
            </div>
            <div className="rounded-xl p-3 bg-gray-50">
              <p className="text-xs text-gray-400">Reste à payer</p>
              <p className={cn("font-bold", r.fullPaymentPaid ? "text-green-600" : "text-amber-600")}>
                {r.fullPaymentPaid ? "Soldé ✓" : formatPrice(remaining)}
              </p>
            </div>
          </div>

          {/* Payment status */}
          <div className="rounded-xl border border-gray-100 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Acompte</span>
              <span className={r.depositPaid ? "text-green-600 font-semibold" : "text-amber-600"}>
                {r.depositAmount > 0 ? formatPrice(r.depositAmount) : "—"} {r.depositPaid ? "✓ reçu" : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Paiement complet</span>
              <span className={r.fullPaymentPaid ? "text-green-600 font-semibold" : "text-gray-400"}>
                {r.fullPaymentPaid ? "✓ Payé" : "En attente"}
              </span>
            </div>
            {r.adminNotes && (
              <p className="text-xs text-gray-400 italic pt-1 border-t">{r.adminNotes}</p>
            )}
          </div>

          {/* Participants / Groupe */}
          {r.participants && r.participants.length > 0 && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Groupe ({r.participants.length + 1} / {r.playerCount} joueurs)
                </p>
                {(() => {
                  const amountPerPlayer = r.totalPrice / (r.playerCount || 1);
                  const organizerShare = (r.depositPaid || r.fullPaymentPaid) ? amountPerPlayer : 0;
                  const collected = organizerShare + r.participants.filter(p => p.isPaid).reduce((s, p) => s + p.amountDue, 0);
                  return (
                    <span className={cn("text-xs font-bold", collected >= r.totalPrice ? "text-green-600" : "text-amber-600")}>
                      {formatPrice(collected)} / {formatPrice(r.totalPrice)}
                    </span>
                  );
                })()}
              </div>
              <div className="divide-y divide-gray-50">
                {/* Organizer row */}
                <div className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {r.clientName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-xs">{r.clientName} <span className="text-blue-500 font-normal">Organisateur</span></p>
                    <p className="text-xs text-gray-400">{formatPrice(r.totalPrice / (r.playerCount || 1))} — {r.depositPaid || r.fullPaymentPaid ? "payé ✓" : "en attente"}</p>
                  </div>
                  {(r.depositPaid || r.fullPaymentPaid)
                    ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    : <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
                </div>
                {/* Participant rows */}
                {r.participants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-xs">{p.name}</p>
                      <p className="text-xs text-gray-400">{formatPrice(p.amountDue)} — {p.isPaid ? "payé ✓" : "à régler"}</p>
                    </div>
                    {p.isPaid
                      ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      : <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promo code */}
          {r.promoCode && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
              <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-800">{r.promoCode.code}</span>
                <span className="text-emerald-700"> — {r.promoCode.label}</span>
                <span className="ml-2 text-emerald-600 font-semibold">
                  -{r.promoCode.discountType === "percent" ? `${r.promoCode.discountValue}%` : formatPrice(r.promoCode.discountValue)}
                </span>
                {(r.discountAmount ?? 0) > 0 && (
                  <span className="ml-1 text-emerald-500 text-xs">(−{formatPrice(r.discountAmount ?? 0)})</span>
                )}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-2 text-sm">
            <a href={`tel:${r.clientPhone}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <Phone className="w-4 h-4 text-gray-400" />{r.clientPhone}
            </a>
            <a href={`mailto:${r.clientEmail}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 truncate">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />{r.clientEmail}
            </a>
          </div>

          {/* Payment actions */}
          {!r.fullPaymentPaid && r.status === "confirmed" && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase">Enregistrer un paiement</p>
              {/* Method selector */}
              <div className="flex gap-2">
                <button onClick={() => setPayMethod("cb")}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-medium transition-all",
                    payMethod === "cb" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                  <CreditCard className="w-4 h-4" /> CB
                </button>
                <button onClick={() => setPayMethod("especes")}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border-2 text-sm font-medium transition-all",
                    payMethod === "especes" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                  <Banknote className="w-4 h-4" /> Espèces
                </button>
              </div>
              <div className="flex gap-2">
                {!r.depositPaid && r.depositAmount > 0 && (
                  <button onClick={() => patch("mark_deposit_paid")} disabled={saving}
                    className="flex-1 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-all">
                    Acompte {formatPrice(r.depositAmount)}
                  </button>
                )}
                <button onClick={() => patch("mark_fully_paid")} disabled={saving}
                  className="flex-1 p-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold hover:bg-green-100 transition-all flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Soldé {formatPrice(remaining)}
                </button>
              </div>
            </div>
          )}
          {r.fullPaymentPaid && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" /> Paiement complet enregistré
            </div>
          )}

          {/* Reschedule */}
          {r.status === "confirmed" && !isBdayFoot && (
            <div className="pt-2 border-t border-gray-100">
              {!showReschedule ? (
                <button onClick={() => { setShowReschedule(true); loadSlotsForDate(r.date.slice(0, 10)); }}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <CalendarDays className="w-4 h-4" /> Décaler ce créneau
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Nouveau créneau
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nouvelle date</label>
                      <Input type="date" value={rescheduleDate}
                        onChange={e => loadSlotsForDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nouveau créneau</label>
                      <select value={rescheduleFutsalSlotId} onChange={e => setRescheduleFutsalSlotId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">— même heure —</option>
                        {futsalSlotsForReschedule.filter(s => s.isActive).map(s => (
                          <option key={s.id} value={s.id}>
                            {s.hour}h{s.minute > 0 ? String(s.minute).padStart(2,"0") : "00"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowReschedule(false)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
                      Annuler
                    </button>
                    <button onClick={doReschedule} disabled={rescheduling}
                      className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {rescheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                      {rescheduling ? "Envoi..." : "Valider + Email"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {r.status === "confirmed" && (
              <button onClick={() => patch("cancel")} disabled={saving}
                className="flex-1 py-2 rounded-xl border-2 border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-all">
                Annuler
              </button>
            )}
            {isCancellable && (
              <button onClick={deleteRes} disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-all">
                <Trash2 className="w-4 h-4" />
                {deleting ? "..." : "Supprimer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick add modal ──────────────────────────────────────────────────
function QuickAddModal({
  token, date, hour, minute, court: defaultCourt, onClose, onCreated,
}: { token: string; date: string; hour: number; minute: number; court: number; onClose: () => void; onCreated: () => void }) {
  const [futsalSlots, setFutsalSlots] = useState<FutsalSlot[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [court, setCourt] = useState(defaultCourt);
  const [playerCount, setPlayerCount] = useState(10);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cb" | "especes" | "none">("none");
  const [amountPaid, setAmountPaid] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [prices, setPrices] = useState({ offpeak: 90, peak: 110, peakHour: 17 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/futsal-slots", { headers: { "x-admin-token": token } }).then(r => r.json()),
      fetch("/api/admin/settings", { headers: { "x-admin-token": token } }).then(r => r.json()),
    ]).then(([slotsRaw, settings]) => {
      const slots: FutsalSlot[] = (Array.isArray(slotsRaw) ? slotsRaw : [])
        .filter((s: FutsalSlot) => s.isActive)
        .sort((a: FutsalSlot, b: FutsalSlot) => a.hour - b.hour || a.minute - b.minute);
      setFutsalSlots(slots);
      const found = slots.find(s => s.hour === hour && s.minute === minute);
      setSelectedSlotIds(found ? [found.id] : slots.length ? [slots[0].id] : []);
      setPrices({
        offpeak: parseFloat(settings?.futsal_price_offpeak ?? settings?.futsal_court_price ?? "90"),
        peak: parseFloat(settings?.futsal_price_peak ?? settings?.futsal_court_price ?? "110"),
        peakHour: parseInt(settings?.futsal_price_peak_from ?? "17"),
      });
    });
  }, [date, hour, minute, token]);

  const slotPrice = (h: number) => (h >= prices.peakHour ? prices.peak : prices.offpeak);
  const total = selectedSlotIds.reduce((sum, id) => {
    const s = futsalSlots.find(fs => fs.id === id);
    return sum + (s ? slotPrice(s.hour) : 0);
  }, 0);

  // Default the encashed amount to the running total until the admin edits it
  useEffect(() => {
    if (!amountTouched) setAmountPaid(total ? String(total) : "");
  }, [total, amountTouched]);

  function toggleSlot(id: string) {
    setSelectedSlotIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function submit() {
    if (!clientName.trim()) { setError("Nom du client requis"); return; }
    if (selectedSlotIds.length === 0) { setError("Sélectionnez au moins un créneau"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/admin/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        type: "futsal", clientName, clientEmail, clientPhone,
        slots: selectedSlotIds.map(id => ({ futsalTimeSlotId: id, courtNumber: court })),
        date, playerCount,
        notes,
        paymentMethod: paymentMethod !== "none" ? paymentMethod : undefined,
        amountPaid: paymentMethod !== "none" ? parseFloat(amountPaid) || total : total,
      }),
    });
    if (res.ok) { onCreated(); onClose(); }
    else { const j = await res.json(); setError(j.error ?? "Erreur"); }
    setLoading(false);
  }

  const paid = parseFloat(amountPaid) || 0;
  const remaining = total - paid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Réservation futsal — {format(new Date(date + "T12:00:00"), "d MMM", { locale: fr })}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {/* Terrain */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Terrain</label>
            <div className="flex gap-1.5">
              {COURTS.map(c => {
                const cfg = courtConfig[c - 1];
                return (
                  <button key={c} type="button" onClick={() => setCourt(c)}
                    className={cn(
                      "flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-all",
                      court === c
                        ? cn(cfg.light, cfg.text, cfg.color)
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}>
                    T{c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Créneaux (multi-sélection) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Créneaux <span className="font-normal text-gray-400">— cliquez pour en sélectionner plusieurs</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {futsalSlots.map(s => {
                const selected = selectedSlotIds.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleSlot(s.id)}
                    className={cn(
                      "py-1.5 rounded-lg border-2 text-xs font-bold transition-all",
                      selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-300"
                    )}>
                    {selected ? "✓ " : ""}{slotLabel(s.hour, s.minute)}
                  </button>
                );
              })}
            </div>
            {selectedSlotIds.length > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                {selectedSlotIds.length} créneau{selectedSlotIds.length > 1 ? "x" : ""} · Terrain {court} · <span className="font-bold text-blue-700">{formatPrice(total)}</span>
              </p>
            )}
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nom du client *</label>
            <Input placeholder="Jean Dupont" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Téléphone</label>
              <Input placeholder="0692..." value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Joueurs</label>
              <Input type="number" min={1} value={playerCount} onChange={e => setPlayerCount(parseInt(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <Input type="email" placeholder="jean@..." value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
          </div>

          {/* Paiement */}
          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Paiement sur place</p>
            <div className="flex gap-2 mb-2">
              {([["none", "Non payé", "gray"], ["cb", "CB", "blue"], ["especes", "Espèces", "amber"]] as const).map(([val, label, color]) => (
                <button key={val} type="button" onClick={() => setPaymentMethod(val as typeof paymentMethod)}
                  className={cn(
                    "flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all",
                    paymentMethod === val
                      ? color === "gray" ? "border-gray-400 bg-gray-100 text-gray-700"
                        : color === "blue" ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  )}>
                  {label}
                </button>
              ))}
            </div>
            {paymentMethod !== "none" && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Montant encaissé (€)</label>
                  <Input type="number" min={0} max={total} step={5}
                    value={amountPaid} onChange={e => { setAmountTouched(true); setAmountPaid(e.target.value); }} />
                </div>
                <div className="text-right pb-2">
                  <p className="text-xs text-gray-400">Total: {formatPrice(total)}</p>
                  <p className={cn("text-xs font-bold", remaining <= 0 ? "text-green-600" : "text-amber-600")}>
                    {remaining <= 0 ? "Soldé ✓" : `Reste: ${formatPrice(remaining)}`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
            <Input placeholder="Remarques..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={submit} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Création..." : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function FutsalPlanningPage() {
  const { token, role } = useAdmin();
  const isAdmin = role === "admin";
  const [reservations, setReservations] = useState<FutsalRes[]>([]);
  const [futsalSlots, setFutsalSlots] = useState<FutsalSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selected, setSelected] = useState<FutsalRes | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; hour: number; minute: number; court: number } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const [futsalRes, slotsRes, bdayRes] = await Promise.all([
      fetch(`/api/admin/reservations?limit=500&type=futsal`, { headers: { "x-admin-token": token } }).then(r => r.json()),
      fetch("/api/admin/futsal-slots", { headers: { "x-admin-token": token } }).then(r => r.json()),
      fetch(`/api/admin/reservations?limit=500&type=birthday`, { headers: { "x-admin-token": token } }).then(r => r.json()),
    ]);

    // Birthday+foot reservations: show across ALL their occupied hours.
    // New ones have an allocated court (futsalSlots); legacy ones fall back to court 1.
    const FOOT_CATEGORIES = ["marmaille_foot", "foot"];
    const bdayFoot: FutsalRes[] = [];
    for (const r of (bdayRes.reservations ?? []) as FutsalRes[]) {
      const isFoot = FOOT_CATEGORIES.includes(r.formula?.category ?? "") || !!r.formula?.name?.toLowerCase().includes("foot");
      if (!isFoot) continue;
      const players = r.playerCount ?? (r as unknown as { childrenCount?: number }).childrenCount ?? 0;
      if (r.futsalSlots && r.futsalSlots.length > 0) {
        for (const s of r.futsalSlots) {
          bdayFoot.push({ ...r, courtNumber: s.courtNumber, playerCount: players, futsalTimeSlot: { hour: s.futsalTimeSlot.hour, minute: s.futsalTimeSlot.minute } });
        }
      } else if (r.timeSlot) {
        for (const h of birthdayTimeToHours(r.timeSlot.time)) {
          bdayFoot.push({ ...r, courtNumber: 1, playerCount: players, futsalTimeSlot: { hour: h, minute: 0 } });
        }
      }
    }

    // Expand cart reservations: one grid entry per (slot + court) line
    const expandedFutsal: FutsalRes[] = [];
    for (const r of (futsalRes.reservations ?? []) as FutsalRes[]) {
      if (r.futsalSlots && r.futsalSlots.length > 0) {
        for (const s of r.futsalSlots) {
          expandedFutsal.push({ ...r, courtNumber: s.courtNumber, futsalTimeSlot: { hour: s.futsalTimeSlot.hour, minute: s.futsalTimeSlot.minute } });
        }
      } else {
        expandedFutsal.push(r);
      }
    }

    setReservations([...expandedFutsal, ...bdayFoot]);
    setFutsalSlots(slotsRes.filter((s: FutsalSlot) => s.isActive));
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  // Get active hours (slots active in DB)
  const activeSlotKeys = futsalSlots.map(s => `${s.hour}:${s.minute}`);

  // Filter reservations for selected date
  const dayReservations = reservations.filter(r =>
    r.date.slice(0, 10) === selectedDate &&
    r.status !== "cancelled" && r.status !== "expired"
  );

  // Build map: hour:minute -> court -> reservation
  const grid: Record<string, Record<number, FutsalRes>> = {};
  for (const r of dayReservations) {
    const key = `${r.futsalTimeSlot.hour}:${r.futsalTimeSlot.minute ?? 0}`;
    if (!grid[key]) grid[key] = {};
    grid[key][r.courtNumber] = r;
  }

  // Week strip: 7 days centered on selected
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(selectedDate + "T12:00:00"), i - 3);
    return format(d, "yyyy-MM-dd");
  });

  // Count reservations per day for week strip (dedupe expanded cart entries by reference)
  const dayCount: Record<string, number> = {};
  const countedPerDay: Record<string, Set<string>> = {};
  for (const r of reservations) {
    if (r.status === "cancelled" || r.status === "expired") continue;
    const d = r.date.slice(0, 10);
    if (!countedPerDay[d]) countedPerDay[d] = new Set();
    if (countedPerDay[d].has(r.reference)) continue;
    countedPerDay[d].add(r.reference);
    dayCount[d] = (dayCount[d] ?? 0) + 1;
  }

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {selected && token && (
        <FutsalModal r={selected} token={token} onClose={() => setSelected(null)} onRefresh={load} />
      )}
      {quickAdd && token && (
        <QuickAddModal
          token={token} date={quickAdd.date} hour={quickAdd.hour}
          minute={quickAdd.minute} court={quickAdd.court}
          onClose={() => setQuickAdd(null)} onCreated={() => { setQuickAdd(null); load(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-blue-600" /> Planning Foot à 5
          </h1>
          <p className="text-gray-500 text-xs md:text-sm">Vue journalière — 3 terrains</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} /> Actualiser
          </Button>
        </div>
      </div>

      {/* Day selector strip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-gray-100">
          <button onClick={() => setSelectedDate(d => format(subDays(new Date(d + "T12:00:00"), 1), "yyyy-MM-dd"))}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 flex gap-1 overflow-x-auto pb-1">
            {weekDays.map(d => {
              const date = new Date(d + "T12:00:00");
              const isSel = d === selectedDate;
              const isTod = d === today;
              const count = dayCount[d] ?? 0;
              return (
                <button key={d} onClick={() => setSelectedDate(d)}
                  className={cn(
                    "flex-1 min-w-[70px] flex flex-col items-center py-2 px-1 rounded-xl transition-all border-2",
                    isSel ? "border-blue-500 bg-blue-600 text-white" :
                    isTod ? "border-blue-200 bg-blue-50 text-blue-700" :
                    "border-transparent hover:bg-gray-50 text-gray-700"
                  )}>
                  <span className={cn("text-[10px] uppercase font-semibold", isSel ? "text-blue-200" : "text-gray-400")}>
                    {format(date, "EEE", { locale: fr })}
                  </span>
                  <span className="text-base font-bold">{format(date, "d")}</span>
                  {count > 0 && (
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-bold mt-0.5",
                      isSel ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => setSelectedDate(d => format(addDays(new Date(d + "T12:00:00"), 1), "yyyy-MM-dd"))}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setSelectedDate(today)}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium whitespace-nowrap">
            Aujourd'hui
          </button>
        </div>

        {/* Date display */}
        <div className="px-4 py-2 flex items-center gap-2 bg-gray-50 border-b border-gray-100">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700 capitalize">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })}
          </span>
          {isToday(new Date(selectedDate + "T12:00:00")) && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Aujourd'hui</span>
          )}
        </div>

        {/* Terrain legend */}
        <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-500">
          {COURTS.map(c => {
            const cfg = courtConfig[c - 1];
            return (
              <span key={c} className="flex items-center gap-1.5">
                <span className={cn("w-3 h-3 rounded border-l-4 inline-block", cfg.color, cfg.bg)} />
                <span className={cn("font-semibold", cfg.text)}>Terrain {c}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Main grid: hours × terrains */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="min-w-[420px]">
          {/* Header row */}
          <div className="grid grid-cols-4 border-b border-gray-200 bg-gray-50">
            <div className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Heure</div>
            {COURTS.map(c => {
              const cfg = courtConfig[c - 1];
              return (
                <div key={c} className={cn("px-3 py-3 flex items-center justify-center gap-2 text-sm font-bold text-white rounded-none", cfg.headerBg)}>
                  <Trophy className="w-4 h-4" /> Terrain {c}
                </div>
              );
            })}
          </div>

          {futsalSlots.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Aucun créneau actif configuré</p>
          ) : (
            futsalSlots.map((slot, idx) => {
              const key = `${slot.hour}:${slot.minute}`;
              const slotGrid = grid[key] ?? {};
              const isEven = idx % 2 === 0;
              const isPast = isToday(new Date(selectedDate + "T12:00:00")) &&
                new Date() > new Date(new Date().toDateString() + ` ${slot.hour}:${String(slot.minute).padStart(2,"0")}:00`);

              return (
                <div key={slot.id}
                  className={cn("grid grid-cols-4 border-b border-gray-50 transition-colors",
                    isEven ? "bg-white" : "bg-gray-50/40",
                    isPast && "opacity-60"
                  )}>
                  {/* Hour label */}
                  <div className="px-4 py-3 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-300" />
                    <span className={cn("text-sm font-bold", isPast ? "text-gray-400" : "text-gray-700")}>
                      {slotLabel(slot.hour, slot.minute)}
                    </span>
                    {isPast && <span className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded">passé</span>}
                  </div>

                  {/* Terrain cells */}
                  {COURTS.map(court => {
                    const r = slotGrid[court];
                    const cfg = courtConfig[court - 1];
                    return (
                      <div key={court} className="px-2 py-2">
                        {r ? (
                          <button type="button" onClick={() => setSelected(r)}
                            className={cn(
                              "w-full text-left rounded-xl border-l-4 px-3 py-2.5 text-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer",
                              cfg.color, cfg.bg
                            )}>
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-bold text-gray-900 truncate leading-tight">{r.clientName.split(" ")[0]}</p>
                              <span className={cn("shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white mt-0.5", cfg.headerBg)}>
                                T{court}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {r.playerCount}j
                              {r.fullPaymentPaid && <span className="ml-1 text-green-600 font-bold">✓</span>}
                              {r.depositPaid && !r.fullPaymentPaid && <span className="ml-1 text-amber-500">~</span>}
                              {!r.depositPaid && !r.fullPaymentPaid && <span className="ml-1 text-red-400">!</span>}
                            </p>
                            {!r.fullPaymentPaid && (
                              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                Reste: {formatPrice(r.totalPrice - r.depositAmount)}
                              </p>
                            )}
                          </button>
                        ) : isAdmin ? (
                          <button
                            onClick={() => setQuickAdd({ date: selectedDate, hour: slot.hour, minute: slot.minute, court })}
                            className={cn(
                              "w-full h-[72px] rounded-xl border-2 border-dashed flex items-center justify-center transition-all",
                              cfg.color.replace("border-", "border-") + " opacity-30",
                              "hover:opacity-100 hover:bg-gray-50 group"
                            )}>
                            <Plus className={cn("w-5 h-5 text-gray-300 group-hover:text-gray-500")} />
                          </button>
                        ) : (
                          <div className="w-full h-[72px]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
          </div>{/* end min-w wrapper */}
        </div>
      )}

      {/* Summary bar */}
      {dayReservations.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COURTS.map(c => {
            const cfg = courtConfig[c - 1];
            const courtRes = dayReservations.filter(r => r.courtNumber === c);
            const totalRevenue = courtRes.reduce((s, r) => s + r.totalPrice, 0);
            const paid = courtRes.filter(r => r.fullPaymentPaid).length;
            return (
              <div key={c} className={cn("rounded-xl border-l-4 p-3 bg-white shadow-sm", cfg.color)}>
                <p className={cn("text-xs font-bold uppercase", cfg.text)}>Terrain {c}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{courtRes.length} rés.</p>
                <p className="text-xs text-gray-500">{formatPrice(totalRevenue)} · {paid}/{courtRes.length} soldés</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
