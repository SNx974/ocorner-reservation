"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { formatPrice, getStatusLabel, getStatusColor } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Users, Clock, Loader2, RefreshCw,
  Phone, Mail, CreditCard, X, Plus, Edit2, CheckCircle, AlertTriangle,
  Calendar, PartyPopper, Euro, Save, CalendarDays, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  format, addDays, subDays, startOfWeek, eachDayOfInterval, isToday, parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ──────────────────────────────────────────────────────────
interface Reservation {
  id: string; reference: string; clientName: string; clientPhone: string;
  clientEmail: string; date: string; status: string;
  totalPrice: number; basePrice: number; discountAmount: number;
  depositAmount: number; depositPaid: boolean; fullPaymentPaid: boolean;
  childrenCount: number; paymentType: string; notes?: string; adminNotes?: string;
  formula: { id: string; name: string; category: string; pricePerChild: number } | null;
  timeSlot: { id: string; time: string } | null;
  promoCode?: { code: string; label: string; discountType: string; discountValue: number } | null;
}

interface Formula { id: string; name: string; category: string; pricePerChild: number; minChildren: number; }
interface TimeSlotOpt { id: string; time: string; }

const catColor: Record<string, { card: string; badge: string; dot: string }> = {
  marmaille:      { card: "border-l-emerald-500 bg-emerald-50",  badge: "bg-emerald-100 text-emerald-800",  dot: "bg-emerald-500" },
  marmaille_foot: { card: "border-l-purple-500  bg-purple-50",   badge: "bg-purple-100  text-purple-800",   dot: "bg-purple-500" },
  foot:           { card: "border-l-blue-500    bg-blue-50",     badge: "bg-blue-100    text-blue-800",     dot: "bg-blue-500" },
  default:        { card: "border-l-gray-400    bg-gray-50",     badge: "bg-gray-100    text-gray-700",     dot: "bg-gray-400" },
};
const getCat = (cat?: string) => catColor[cat ?? ""] ?? catColor.default;

const catLabel: Record<string, string> = {
  marmaille: "🎡 Marmaille Parc",
  marmaille_foot: "⚽🎡 Marmaille + Foot",
  foot: "⚽ Foot",
};

const SLOTS = ["09:00-12:00", "12:30-15:30", "16:00-19:00"];
const slotEmoji: Record<string, string> = {
  "09:00-12:00": "🌅",
  "12:30-15:30": "☀️",
  "16:00-19:00": "🌇",
};

function statusVariant(s: string): "success" | "warning" | "destructive" | "secondary" | "info" {
  if (s === "confirmed") return "success";
  if (s === "cancelled" || s === "expired") return "destructive";
  if (s === "deposit_pending" || s === "pending") return "warning";
  return "secondary";
}

// ─── Detail / Edit Modal ─────────────────────────────────────────────
function ReservationModal({
  r, token, onClose, onUpdated,
}: { r: Reservation; token: string; onClose: () => void; onUpdated: () => void }) {
  const cat = getCat(r.formula?.category);
  const remaining = r.totalPrice - (r.depositPaid ? r.depositAmount : 0) - (r.fullPaymentPaid ? r.totalPrice : 0);
  const actualRemaining = r.fullPaymentPaid ? 0 : r.depositPaid ? (r.totalPrice - r.depositAmount) : r.totalPrice;

  const [editMode, setEditMode] = useState(false);
  const [adminNotes, setAdminNotes] = useState(r.adminNotes ?? "");
  const [amountPaid, setAmountPaid] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(r.date.slice(0, 10));
  const [rescheduleSlotId, setRescheduleSlotId] = useState("");
  const [timeSlotsOpts, setTimeSlotsOpts] = useState<TimeSlotOpt[]>([]);
  const [rescheduling, setRescheduling] = useState(false);

  async function loadTimeSlots() {
    if (timeSlotsOpts.length > 0) return;
    const res = await fetch("/api/timeslots");
    if (res.ok) setTimeSlotsOpts(await res.json());
  }

  async function doReschedule() {
    if (!rescheduleDate) return;
    setRescheduling(true);
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        id: r.id, action: "reschedule",
        newDate: rescheduleDate,
        newTimeSlotId: rescheduleSlotId || undefined,
      }),
    });
    setRescheduling(false);
    setShowReschedule(false);
    onUpdated(); onClose();
  }

  async function doAction(action: string, extra?: Record<string, unknown>) {
    setActionLoading(action);
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id: r.id, action, ...extra }),
    });
    setActionLoading("");
    onUpdated();
    onClose();
  }

  async function saveNotes() {
    setSaving(true);
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id: r.id, action: "update_notes", notes: adminNotes }),
    });
    setSaving(false);
    setEditMode(false);
    onUpdated();
  }

  async function markCustomPaid() {
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) return;
    setActionLoading("custom_paid");
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id: r.id, action: amount >= r.totalPrice ? "mark_fully_paid" : "mark_deposit_paid" }),
    });
    setActionLoading("");
    onUpdated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={cn("p-5 border-l-4 rounded-tl-2xl rounded-tr-2xl flex items-start justify-between", cat.card)}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", cat.badge)}>
                {catLabel[r.formula?.category ?? ""] ?? r.formula?.name ?? "Anniversaire"}
              </span>
              <Badge variant={statusVariant(r.status)}>{getStatusLabel(r.status)}</Badge>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-1.5">{r.clientName}</h2>
            <code className="text-xs text-gray-400 font-mono">{r.reference}</code>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/60 flex items-center justify-center ml-3 shrink-0">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</p>
              <p className="font-bold text-gray-900">{format(parseISO(r.date.slice(0, 10)), "d MMMM yyyy", { locale: fr })}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Créneau</p>
              <p className="font-bold text-gray-900">{r.timeSlot?.time ?? "—"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Users className="w-3 h-3" /> Enfants</p>
              <p className="font-bold text-gray-900">{r.childrenCount} enfants</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Formule</p>
              <p className="font-semibold text-gray-900 text-xs leading-tight">{r.formula?.name ?? "—"}</p>
            </div>
          </div>

          {/* 💰 Payment section */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-900 px-4 py-2.5">
              <p className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Euro className="w-3.5 h-3.5" /> Paiement
              </p>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prix de base</span>
                <span className="font-medium">{formatPrice(r.basePrice || r.totalPrice)}</span>
              </div>
              {r.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-700">
                  <span>Remise appliquée</span>
                  <span>− {formatPrice(r.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span>Total à régler</span>
                <span className="text-gray-900">{formatPrice(r.totalPrice)}</span>
              </div>

              {/* Payment status bars */}
              <div className="mt-3 space-y-2">
                {r.fullPaymentPaid ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-green-800 text-sm font-semibold">Paiement intégral reçu — {formatPrice(r.totalPrice)}</span>
                  </div>
                ) : r.depositPaid ? (
                  <>
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-blue-800 text-sm font-semibold">Acompte reçu — {formatPrice(r.depositAmount)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-amber-800 text-sm font-semibold">Reste à payer sur place — {formatPrice(r.totalPrice - r.depositAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-red-800 text-sm font-semibold">Aucun paiement reçu — {formatPrice(r.totalPrice)} dû</span>
                  </div>
                )}
              </div>

              {/* Quick payment actions */}
              {!r.fullPaymentPaid && r.status !== "cancelled" && (
                <div className="border-t pt-3 mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Enregistrer un paiement</p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type="number" min="0" placeholder={`Montant (ex: ${actualRemaining})`}
                        value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                    </div>
                    <Button size="sm" onClick={markCustomPaid} disabled={!amountPaid || actionLoading === "custom_paid"}
                      className="shrink-0">
                      {actionLoading === "custom_paid" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {!r.depositPaid && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs"
                        disabled={!!actionLoading}
                        onClick={() => doAction("mark_deposit_paid")}>
                        {actionLoading === "mark_deposit_paid" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        ✓ Acompte {formatPrice(r.depositAmount)}
                      </Button>
                    )}
                    <Button size="sm" className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                      disabled={!!actionLoading}
                      onClick={() => doAction("mark_fully_paid")}>
                      {actionLoading === "mark_fully_paid" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      ✓ Tout payé {formatPrice(r.totalPrice)}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

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
                {r.discountAmount > 0 && (
                  <span className="ml-1 text-emerald-500 text-xs">(−{formatPrice(r.discountAmount)})</span>
                )}
              </div>
            </div>
          )}

          {/* Contact */}
          <div className="space-y-2 text-sm">
            <a href={`tel:${r.clientPhone}`} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" /> {r.clientPhone}
            </a>
            <a href={`mailto:${r.clientEmail}`} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors truncate">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" /> {r.clientEmail}
            </a>
          </div>

          {/* Notes */}
          {r.notes && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-900">
              <p className="font-semibold text-xs mb-1 text-yellow-700">Note client :</p>
              {r.notes}
            </div>
          )}

          {/* Admin notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase">Notes admin</p>
              <button onClick={() => setEditMode(!editMode)}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> {editMode ? "Annuler" : "Modifier"}
              </button>
            </div>
            {editMode ? (
              <div className="space-y-2">
                <textarea rows={3} value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Notes internes..." />
                <Button size="sm" onClick={saveNotes} disabled={saving} className="gap-1">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Sauvegarder
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 min-h-[40px]">
                {adminNotes || <span className="text-gray-400 italic">Aucune note</span>}
              </p>
            )}
          </div>

          {/* Reschedule */}
          {r.status === "confirmed" && (
            <div className="pt-2 border-t border-gray-100">
              {!showReschedule ? (
                <button onClick={() => { setShowReschedule(true); loadTimeSlots(); }}
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
                      <Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nouveau créneau</label>
                      <select value={rescheduleSlotId} onChange={e => setRescheduleSlotId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="">— même horaire —</option>
                        {timeSlotsOpts.map(s => (
                          <option key={s.id} value={s.id}>{s.time}</option>
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

          {/* Status actions */}
          {r.status !== "cancelled" && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {r.status !== "confirmed" && (
                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1"
                  disabled={!!actionLoading} onClick={() => doAction("confirm")}>
                  <CheckCircle className="w-3.5 h-3.5" /> Confirmer
                </Button>
              )}
              <Button size="sm" variant="destructive" className="flex-1 gap-1"
                disabled={!!actionLoading} onClick={() => doAction("cancel")}>
                <X className="w-3.5 h-3.5" /> Annuler
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quick add modal ─────────────────────────────────────────────────
function QuickAddModal({
  token, defaultDate, defaultSlot, onClose, onCreated,
}: { token: string; defaultDate: string; defaultSlot: string; onClose: () => void; onCreated: () => void }) {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotOpt[]>([]);
  const [form, setForm] = useState({
    date: defaultDate,
    formulaId: "",
    timeSlotId: "",
    childrenCount: "6",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    notes: "",
    customPrice: "",     // override price
    amountPaid: "",      // how much paid at time of booking
    paymentNote: "",
    customStart: "",     // custom time range start "HH:MM"
    customEnd: "",       // custom time range end "HH:MM"
  });
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    Promise.all([
      fetch("/api/formulas").then(r => r.json()),
      fetch("/api/timeslots").then(r => r.json()),
    ]).then(([f, s]) => {
      setFormulas(f); setTimeSlots(s);
      if (f.length) set("formulaId", f[0].id);
      const found = s.find((sl: TimeSlotOpt) => sl.time === defaultSlot);
      set("timeSlotId", found?.id ?? (s[0]?.id ?? ""));
    });
  }, [defaultSlot]);

  const selectedFormula = formulas.find(f => f.id === form.formulaId);
  const autoPrice = selectedFormula ? selectedFormula.pricePerChild * parseInt(form.childrenCount || "0") : 0;
  const totalPrice = form.customPrice ? parseFloat(form.customPrice) : autoPrice;
  const amountPaid = parseFloat(form.amountPaid || "0");
  const remaining = Math.max(0, totalPrice - amountPaid);

  const customTime = useCustomTime && form.customStart && form.customEnd
    ? `${form.customStart}-${form.customEnd}`
    : undefined;

  async function submit() {
    if (!form.clientName.trim()) { setError("Nom du client requis"); return; }
    if (!form.formulaId) { setError("Formule requise"); return; }
    if (!customTime && !form.timeSlotId) { setError("Créneau requis (ou horaire personnalisé)"); return; }
    if (useCustomTime && (!form.customStart || !form.customEnd)) { setError("Heure de début et de fin requises"); return; }
    if (!form.date) { setError("Date requise"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/admin/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        type: "birthday",
        clientName: form.clientName, clientEmail: form.clientEmail, clientPhone: form.clientPhone,
        formulaId: form.formulaId, timeSlotId: form.timeSlotId,
        customTime,
        date: form.date, childrenCount: form.childrenCount,
        notes: [form.notes, form.paymentNote ? `Paiement: ${form.paymentNote}` : ""].filter(Boolean).join(" | "),
        customPrice: form.customPrice ? parseFloat(form.customPrice) : undefined,
        amountPaid: amountPaid > 0 ? amountPaid : undefined,
      }),
    });
    if (res.ok) { onCreated(); onClose(); }
    else { const j = await res.json(); setError(j.error ?? "Erreur"); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <PartyPopper className="w-5 h-5 text-emerald-600" /> Nouvelle réservation anniversaire
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          {/* Date + slot */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">📅 Date *</label>
              <Input type="date" value={form.date} onChange={e => set("date", e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-500">⏰ Créneau *</label>
                <button type="button" onClick={() => setUseCustomTime(v => !v)}
                  className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all",
                    useCustomTime ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                  {useCustomTime ? "Personnalisé ✓" : "Personnaliser"}
                </button>
              </div>
              {useCustomTime ? (
                <div className="flex items-center gap-1.5">
                  <Input type="time" value={form.customStart} onChange={e => set("customStart", e.target.value)} className="h-10" />
                  <span className="text-gray-400 text-sm">→</span>
                  <Input type="time" value={form.customEnd} onChange={e => set("customEnd", e.target.value)} className="h-10" />
                </div>
              ) : (
                <select value={form.timeSlotId} onChange={e => set("timeSlotId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-10">
                  {timeSlots.map(s => <option key={s.id} value={s.id}>{s.time}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Formula + children */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">🎉 Formule *</label>
            <select value={form.formulaId} onChange={e => set("formulaId", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none h-10">
              {formulas.map(f => (
                <option key={f.id} value={f.id}>{f.name} — {f.pricePerChild}€/enfant (min {f.minChildren})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">👶 Nombre d'enfants *</label>
              <Input type="number" min={1} value={form.childrenCount} onChange={e => set("childrenCount", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Prix auto-calculé</label>
              <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-sm font-semibold text-emerald-700">
                {formatPrice(autoPrice)}
              </div>
            </div>
          </div>

          {/* Client info */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">👤 Client</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nom complet *</label>
                <Input placeholder="Jean Dupont" value={form.clientName} onChange={e => set("clientName", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">📞 Téléphone</label>
                  <Input placeholder="0692 XX XX XX" value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">✉️ Email</label>
                  <Input type="email" placeholder="jean@email.com" value={form.clientEmail} onChange={e => set("clientEmail", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">💰 Paiement</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Prix personnalisé (€)</label>
                <Input type="number" min={0} placeholder={`Auto: ${autoPrice}`}
                  value={form.customPrice} onChange={e => set("customPrice", e.target.value)} />
                <p className="text-xs text-gray-400 mt-0.5">Laisser vide = prix auto</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Montant déjà payé (€)</label>
                <Input type="number" min={0} placeholder="0"
                  value={form.amountPaid} onChange={e => set("amountPaid", e.target.value)} />
              </div>
            </div>

            {/* Price summary */}
            {(totalPrice > 0 || amountPaid > 0) && (
              <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-semibold">{formatPrice(totalPrice)}</span>
                </div>
                {amountPaid > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Déjà payé</span>
                    <span className="font-semibold">− {formatPrice(amountPaid)}</span>
                  </div>
                )}
                <div className={cn("flex justify-between font-bold border-t pt-1", remaining > 0 ? "text-amber-700" : "text-emerald-700")}>
                  <span>Reste à payer</span>
                  <span>{formatPrice(remaining)}</span>
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Note de paiement</label>
              <Input placeholder="ex: acompte espèces, CB sur place..." value={form.paymentNote} onChange={e => set("paymentNote", e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">📝 Notes</label>
            <Input placeholder="Remarques, demandes particulières..." value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={submit} disabled={loading} className="flex-1 gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Créer la réservation
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────
export default function PlanningAnniversairePage() {
  const { token } = useAdmin();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; slot: string } | null>(null);
  const [view, setView] = useState<"week" | "list">("week");
  const [filterStatus, setFilterStatus] = useState("active");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch("/api/admin/reservations?limit=500&type=birthday", {
      headers: { "x-admin-token": token },
    });
    if (res.ok) {
      const data = await res.json();
      setReservations(data.reservations ?? []);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  // Group by day + slot
  const grouped: Record<string, Record<string, Reservation[]>> = {};
  for (const r of reservations) {
    if (!r.timeSlot) continue;
    const day = r.date.slice(0, 10);
    const slot = r.timeSlot.time;
    if (!grouped[day]) grouped[day] = {};
    if (!grouped[day][slot]) grouped[day][slot] = [];
    grouped[day][slot].push(r);
  }

  // Stats for week
  const weekDayStrs = days.map(d => format(d, "yyyy-MM-dd"));
  const weekRes = reservations.filter(r => weekDayStrs.includes(r.date.slice(0, 10)));
  const weekConfirmed = weekRes.filter(r => r.status === "confirmed");
  const weekRevenue = weekConfirmed.reduce((s, r) => s + r.totalPrice, 0);
  const weekPaid = weekConfirmed.reduce((s, r) => s + (r.fullPaymentPaid ? r.totalPrice : r.depositPaid ? r.depositAmount : 0), 0);
  const weekPending = weekRevenue - weekPaid;

  // List view with filter
  const filteredList = reservations
    .filter(r => {
      if (filterStatus === "all") return true;
      if (filterStatus === "active") return r.status !== "cancelled" && r.status !== "expired";
      return r.status === filterStatus;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {selected && (
        <ReservationModal r={selected} token={token} onClose={() => setSelected(null)} onUpdated={load} />
      )}
      {quickAdd && (
        <QuickAddModal
          token={token} defaultDate={quickAdd.date} defaultSlot={quickAdd.slot}
          onClose={() => setQuickAdd(null)} onCreated={() => { setQuickAdd(null); load(); }}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PartyPopper className="w-6 h-6 text-emerald-600" /> Planning Anniversaires
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestion des réservations anniversaire</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setView("week")}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                view === "week" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>
              📅 Semaine
            </button>
            <button onClick={() => setView("list")}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                view === "list" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}>
              📋 Liste
            </button>
          </div>
          <Button onClick={() => setQuickAdd({ date: format(new Date(), "yyyy-MM-dd"), slot: "09:00-12:00" })}
            className="gap-2">
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Week stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Réservations semaine", value: weekRes.length, sub: `${weekConfirmed.length} confirmées`, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Chiffre d'affaires", value: formatPrice(weekRevenue), sub: "semaine en cours", color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Encaissé", value: formatPrice(weekPaid), sub: "sur " + formatPrice(weekRevenue), color: "bg-green-50 border-green-200 text-green-700" },
          { label: "À encaisser", value: formatPrice(weekPending), sub: "reste à percevoir", color: "bg-amber-50 border-amber-200 text-amber-700" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border p-3", s.color)}>
            <p className="text-xs font-medium opacity-70 mb-0.5">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs opacity-60">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {Object.entries(catLabel).map(([k, v]) => (
          <span key={k} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium", getCat(k).badge)}>
            <span className={cn("w-2 h-2 rounded-full", getCat(k).dot)} />{v}
          </span>
        ))}
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800">
          <span className="w-2 h-2 rounded-full bg-amber-400" />En attente
        </span>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {/* ─── WEEK VIEW ─── */}
      {!loading && view === "week" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Nav */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
            <button onClick={() => setWeekStart(d => subDays(d, 7))}
              className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[160px] text-center">
              {format(weekStart, "d MMM", { locale: fr })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}
            </span>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-medium">
              Cette semaine
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-36 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Créneau</th>
                  {days.map(day => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const dayResCount = Object.values(grouped[dayStr] ?? {}).flat().filter(r => r.status !== "cancelled" && r.status !== "expired").length;
                    return (
                      <th key={day.toISOString()} className={cn("px-3 py-3 text-center", isToday(day) ? "text-emerald-700" : "text-gray-700")}>
                        <div className={cn("rounded-xl px-2 py-1.5 inline-block", isToday(day) && "bg-emerald-100")}>
                          <div className="text-xs font-normal text-gray-400 capitalize">{format(day, "EEE", { locale: fr })}</div>
                          <div className="font-bold text-base">{format(day, "d")}</div>
                          {dayResCount > 0 && (
                            <div className="text-[10px] font-medium text-emerald-600">{dayResCount} rés.</div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot, si) => (
                  <tr key={slot} className={cn("border-b border-gray-50 hover:bg-gray-50/50 transition-colors", si % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{slotEmoji[slot]}</span>
                        <div>
                          <p className="text-xs font-bold text-gray-700">{slot}</p>
                          <p className="text-[10px] text-gray-400">3h</p>
                        </div>
                      </div>
                    </td>
                    {days.map(day => {
                      const dayStr = format(day, "yyyy-MM-dd");
                      const cell = grouped[dayStr]?.[slot] ?? [];
                      const activeCell = cell.filter(r => r.status !== "cancelled" && r.status !== "expired");

                      return (
                        <td key={day.toISOString()} className="px-2 py-2 align-top">
                          <div className="space-y-1.5 min-h-[52px]">
                            {activeCell.map(r => {
                              const c = getCat(r.formula?.category);
                              const paid = r.fullPaymentPaid ? "full" : r.depositPaid ? "deposit" : "none";
                              return (
                                <button key={r.id} type="button" onClick={() => setSelected(r)}
                                  className={cn(
                                    "w-full text-left rounded-xl border-l-4 px-2.5 py-2 text-xs transition-all hover:shadow-md hover:scale-[1.02] active:scale-100 cursor-pointer",
                                    c.card
                                  )}>
                                  <p className="font-bold text-gray-900 truncate leading-tight">
                                    {r.clientName.split(" ")[0]}
                                  </p>
                                  <p className="text-gray-600 truncate text-[11px] leading-tight mt-0.5">
                                    {r.formula?.name?.split(" + ").slice(1).join(" + ") || r.formula?.name}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="flex items-center gap-0.5 text-gray-500">
                                      <Users className="w-2.5 h-2.5" /> {r.childrenCount}
                                    </span>
                                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", {
                                      full: "bg-green-100 text-green-700",
                                      deposit: "bg-blue-100 text-blue-700",
                                      none: "bg-red-100 text-red-600",
                                    }[paid])}>
                                      {paid === "full" ? "💶 Payé" : paid === "deposit" ? "✓ Acpte" : "⚠️ Dû"}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-bold text-gray-700 mt-0.5">{formatPrice(r.totalPrice)}</p>
                                </button>
                              );
                            })}
                            {/* Add button */}
                            <button
                              onClick={() => setQuickAdd({ date: dayStr, slot })}
                              className="w-full h-8 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── LIST VIEW ─── */}
      {!loading && view === "list" && (
        <div className="space-y-3">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "active", l: "📅 Actives" },
              { v: "confirmed", l: "✅ Confirmées" },
              { v: "pending", l: "⏳ En attente" },
              { v: "deposit_pending", l: "💳 Acompte" },
              { v: "cancelled", l: "❌ Annulées" },
              { v: "all", l: "Toutes" },
            ].map(f => (
              <button key={f.v} onClick={() => setFilterStatus(f.v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  filterStatus === f.v ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                )}>
                {f.l}
              </button>
            ))}
          </div>

          {filteredList.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <PartyPopper className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Aucune réservation
            </div>
          )}

          {filteredList.map(r => {
            const c = getCat(r.formula?.category);
            const paid = r.fullPaymentPaid ? "full" : r.depositPaid ? "deposit" : "none";
            const remaining = r.fullPaymentPaid ? 0 : r.depositPaid ? r.totalPrice - r.depositAmount : r.totalPrice;
            return (
              <button key={r.id} type="button" onClick={() => setSelected(r)}
                className={cn(
                  "w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4 border-l-4",
                  c.card.split(" ").find(cl => cl.startsWith("border-l-")) ?? "border-l-gray-300"
                )}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", c.badge)}>
                        {catLabel[r.formula?.category ?? ""] ?? "Anniversaire"}
                      </span>
                      <Badge variant={statusVariant(r.status)}>{getStatusLabel(r.status)}</Badge>
                      <code className="text-xs text-gray-400 font-mono">{r.reference}</code>
                    </div>
                    <p className="font-bold text-gray-900 text-base">{r.clientName}</p>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(r.date.slice(0, 10)), "EEEE d MMMM yyyy", { locale: fr })} · {r.timeSlot?.time}
                    </p>
                    <p className="text-sm text-gray-500">{r.formula?.name} · {r.childrenCount} enfants</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-900">{formatPrice(r.totalPrice)}</p>
                    <p className={cn("text-xs font-semibold mt-0.5", {
                      full: "text-green-600", deposit: "text-blue-600", none: "text-red-500"
                    }[paid])}>
                      {paid === "full" ? "💶 Tout payé" : paid === "deposit" ? `✓ Acpte · ${formatPrice(remaining)} restant` : `⚠️ ${formatPrice(remaining)} dû`}
                    </p>
                    {r.clientPhone && (
                      <p className="text-xs text-gray-400 mt-1">{r.clientPhone}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
