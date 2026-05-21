"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "./layout";
import { formatPrice, formatDate, getStatusLabel, getStatusColor } from "@/lib/utils";
import {
  TrendingUp, Calendar, AlertTriangle, CheckCircle,
  Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Users, Clock, Phone, Mail, CreditCard, X, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  format, addDays, subDays, startOfWeek, eachDayOfInterval,
  isSameDay, isToday, parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

interface Stats {
  todayCount: number; todayRevenue: number; weekRevenue: number;
  pendingCount: number; depositPendingCount: number;
  confirmedCount: number; cancelledCount: number;
}

interface Reservation {
  id: string; reference: string; clientName: string; clientPhone: string; clientEmail: string;
  date: string; status: string; totalPrice: number; childrenCount: number;
  type?: string; formula: { name: string; category: string } | null; timeSlot: { time: string } | null;
  futsalTimeSlot?: { hour: number } | null; courtNumber?: number | null; playerCount?: number | null;
  depositAmount: number; depositPaid: boolean; paymentType: string;
  fullPaymentPaid: boolean;
}

const badgeVariantMap: Record<string, "success" | "warning" | "destructive" | "secondary" | "info"> = {
  green: "success", yellow: "warning", orange: "warning",
  red: "destructive", gray: "secondary",
};

const categoryColor: Record<string, string> = {
  marmaille: "border-l-emerald-500 bg-emerald-50",
  marmaille_foot: "border-l-purple-500 bg-purple-50",
  foot: "border-l-blue-500 bg-blue-50",
};

// ── Login ──────────────────────────────────────────────────────────
function LoginForm() {
  const { setToken } = useAdmin();
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    const json = await res.json();
    if (res.ok) setToken(json.token);
    else { setError(json.error); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎡</div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm mt-1">Marmaille Parc + Foot</p>
        </div>
        <form onSubmit={login} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)}
              className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="••••••••" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Reservation detail modal ───────────────────────────────────────
function ReservationModal({ r, onClose }: { r: Reservation; onClose: () => void }) {
  const paymentLabel = r.paymentType === "online_full" ? "En ligne (complet)"
    : r.paymentType === "onsite_deposit" ? "Sur place + acompte"
    : "Tout sur place";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{r.clientName}</h2>
            <code className="text-xs text-gray-400 font-mono">{r.reference}</code>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Formule</p>
              <p className="font-semibold text-gray-800">{r.formula?.name ?? (r.type === "futsal" ? `Futsal — Terrain ${r.courtNumber}` : "—")}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Créneau</p>
              <p className="font-semibold text-gray-800">{r.timeSlot?.time ?? (r.futsalTimeSlot ? `${r.futsalTimeSlot.hour}:00` : "—")}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{r.type === "futsal" ? "Joueurs" : "Enfants"}</p>
              <p className="font-semibold text-gray-800">{r.type === "futsal" ? r.playerCount : r.childrenCount}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Total</p>
              <p className="font-semibold text-emerald-700">{formatPrice(r.totalPrice)}</p>
            </div>
          </div>
          <div className="space-y-2 pt-1">
            <a href={`tel:${r.clientPhone}`} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600">
              <Phone className="w-4 h-4 text-gray-400" />{r.clientPhone}
            </a>
            <a href={`mailto:${r.clientEmail}`} className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 truncate">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />{r.clientEmail}
            </a>
            <div className="flex items-center gap-2 text-gray-700">
              <CreditCard className="w-4 h-4 text-gray-400" />{paymentLabel}
              {r.fullPaymentPaid && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">💶 Payé</span>}
              {r.depositPaid && !r.fullPaymentPaid && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Acompte ✓</span>}
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <Badge variant={(badgeVariantMap[getStatusColor(r.status)] ?? "secondary")}>
              {getStatusLabel(r.status)}
            </Badge>
            <Link href={`/admin/reservations`}
              className="text-xs text-emerald-600 hover:underline font-medium">
              Voir toutes les réservations →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick add birthday modal ───────────────────────────────────────
function QuickAddBirthdayModal({
  token, date, slot, onClose, onCreated,
}: { token: string; date: string; slot: string; onClose: () => void; onCreated: () => void }) {
  const [formulas, setFormulas] = useState<{ id: string; name: string; pricePerChild: number; minChildren: number }[]>([]);
  const [slots, setSlots] = useState<{ id: string; time: string }[]>([]);
  const [selectedFormula, setSelectedFormula] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [childrenCount, setChildrenCount] = useState("6");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/formulas").then(r => r.json()),
      fetch("/api/timeslots").then(r => r.json()),
    ]).then(([f, s]) => {
      setFormulas(f); setSlots(s);
      if (f.length) setSelectedFormula(f[0].id);
      const found = s.find((sl: { time: string }) => sl.time === slot);
      if (found) setSelectedSlot(found.id);
      else if (s.length) setSelectedSlot(s[0].id);
    });
  }, [slot]);

  async function submit() {
    if (!clientName.trim()) { setError("Nom requis"); return; }
    if (!selectedFormula || !selectedSlot) { setError("Formule et créneau requis"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/admin/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        type: "birthday", clientName, clientEmail, clientPhone,
        formulaId: selectedFormula, timeSlotId: selectedSlot,
        date, childrenCount, notes,
      }),
    });
    if (res.ok) { onCreated(); onClose(); }
    else { const j = await res.json(); setError(j.error ?? "Erreur"); }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Anniversaire — {date ? format(new Date(date + "T12:00:00"), "d MMM", { locale: fr }) : ""}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Créneau</label>
              <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                {slots.map(s => <option key={s.id} value={s.id}>{s.time}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Enfants</label>
              <Input type="number" min={1} value={childrenCount} onChange={e => setChildrenCount(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Formule</label>
            <select value={selectedFormula} onChange={e => setSelectedFormula(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
              {formulas.map(f => <option key={f.id} value={f.id}>{f.name} — {f.pricePerChild}€</option>)}
            </select>
          </div>
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
              <Input type="email" placeholder="jean@..." value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
            <Input placeholder="Remarques..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? "Création..." : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Weekly planning ────────────────────────────────────────────────
function WeeklyPlanning({ reservations, token, onReload }: { reservations: Reservation[]; token: string | null; onReload?: () => void }) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; slot: string } | null>(null);

  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const SLOTS = ["09:00-12:00", "12:30-15:30", "16:00-19:00"];

  // Group reservations by day+slot (birthday only)
  const grouped: Record<string, Record<string, Reservation[]>> = {};
  for (const r of reservations) {
    if (!r.timeSlot) continue; // skip futsal
    const day = format(parseISO(r.date.slice(0, 10)), "yyyy-MM-dd");
    const slot = r.timeSlot.time;
    if (!grouped[day]) grouped[day] = {};
    if (!grouped[day][slot]) grouped[day][slot] = [];
    grouped[day][slot].push(r);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {selectedReservation && (
        <ReservationModal r={selectedReservation} onClose={() => setSelectedReservation(null)} />
      )}
      {quickAdd && token && (
        <QuickAddBirthdayModal
          token={token} date={quickAdd.date} slot={quickAdd.slot}
          onClose={() => setQuickAdd(null)}
          onCreated={() => { setQuickAdd(null); onReload?.(); }}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Planning de la semaine
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(d => subDays(d, 7))}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-600 min-w-[140px] text-center">
            {format(weekStart, "d MMM", { locale: fr })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}
          </span>
          <button onClick={() => setWeekStart(d => addDays(d, 7))}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-medium">
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Créneau</th>
              {days.map(day => (
                <th key={day.toISOString()} className={cn(
                  "px-3 py-3 text-center text-sm font-semibold",
                  isToday(day) ? "text-emerald-700" : "text-gray-700"
                )}>
                  <div className={cn(
                    "rounded-lg px-2 py-1 inline-block",
                    isToday(day) && "bg-emerald-100"
                  )}>
                    <div className="text-xs font-normal text-gray-400 capitalize">
                      {format(day, "EEE", { locale: fr })}
                    </div>
                    <div>{format(day, "d")}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot, si) => (
              <tr key={slot} className={cn("border-b border-gray-50", si % 2 === 0 ? "bg-white" : "bg-gray-50/50")}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {slot}
                  </div>
                </td>
                {days.map(day => {
                  const dayStr = format(day, "yyyy-MM-dd");
                  const cell = grouped[dayStr]?.[slot] ?? [];
                  const confirmedCount = cell.filter(r => r.status === "confirmed").length;
                  const pendingCount = cell.filter(r => ["pending", "deposit_pending"].includes(r.status)).length;

                  return (
                    <td key={day.toISOString()} className="px-2 py-2 align-top">
                      <div className="space-y-1 min-h-[36px]">
                        {cell.map(r => (
                          <button key={r.id} type="button"
                            onClick={() => setSelectedReservation(r)}
                            className={cn(
                              "w-full text-left rounded-lg border-l-4 px-2 py-1.5 text-xs transition-all hover:shadow-md hover:scale-[1.02] active:scale-100 cursor-pointer",
                              r.status === "confirmed"
                                ? categoryColor[r.formula?.category ?? ""] ?? "border-l-gray-400 bg-gray-50"
                                : r.status === "cancelled"
                                ? "border-l-gray-300 bg-gray-50 opacity-50"
                                : "border-l-amber-400 bg-amber-50"
                            )}>
                            <p className="font-semibold text-gray-900 truncate max-w-[90px]">
                              {r.clientName.split(" ")[0]}
                            </p>
                            <p className="text-gray-500 flex items-center gap-0.5 mt-0.5">
                              <Users className="w-2.5 h-2.5" />
                              {r.childrenCount}
                              {r.fullPaymentPaid && <span className="ml-1 text-green-600">💶</span>}
                              {r.depositPaid && !r.fullPaymentPaid && <span className="ml-1 text-blue-500">✓</span>}
                            </p>
                          </button>
                        ))}
                        {/* Quick add */}
                        <button
                          onClick={() => setQuickAdd({ date: dayStr, slot })}
                          className="w-full h-6 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-emerald-400 hover:text-emerald-500 transition-colors">
                          <Plus className="w-3 h-3" />
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

      {/* Legend */}
      <div className="px-5 py-3 border-t border-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-l-4 border-l-emerald-500 bg-emerald-50 inline-block" />Marmaille</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-l-4 border-l-purple-500 bg-purple-50 inline-block" />Marmaille+Foot</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-l-4 border-l-blue-500 bg-blue-50 inline-block" />Foot</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-l-4 border-l-amber-400 bg-amber-50 inline-block" />En attente</span>
      </div>
    </div>
  );
}

// ── Dashboard principal ────────────────────────────────────────────
export default function AdminDashboard() {
  const { token } = useAdmin();
  const [data, setData] = useState<{
    stats: Stats;
    todayReservations: Reservation[];
    recentReservations: Reservation[];
  } | null>(null);
  const [allWeekReservations, setAllWeekReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    const [dashRes, weekRes] = await Promise.all([
      fetch("/api/admin/dashboard", { headers: { "x-admin-token": token } }),
      fetch("/api/admin/reservations?limit=200", { headers: { "x-admin-token": token } }),
    ]);

    if (dashRes.ok) setData(await dashRes.json());
    if (weekRes.ok) {
      const wr = await weekRes.json();
      setAllWeekReservations(wr.reservations ?? []);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!token) return <LoginForm />;

  const statusColorVariant = (status: string) =>
    badgeVariantMap[getStatusColor(status)] ?? "secondary";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Vue d'ensemble en temps réel</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Réservations aujourd'hui" value={data.stats.todayCount}
              icon={Calendar} color="bg-emerald-500" />
            <StatCard label="CA du jour" value={formatPrice(data.stats.todayRevenue)}
              sub={`Semaine : ${formatPrice(data.stats.weekRevenue)}`}
              icon={TrendingUp} color="bg-blue-500" />
            <StatCard label="En attente" value={data.stats.pendingCount + data.stats.depositPendingCount}
              sub={`${data.stats.depositPendingCount} acompte(s) manquant(s)`}
              icon={AlertTriangle} color="bg-amber-500" />
            <StatCard label="Confirmées" value={data.stats.confirmedCount}
              sub={`${data.stats.cancelledCount} annulées`}
              icon={CheckCircle} color="bg-purple-500" />
          </div>

          {/* Alert acomptes */}
          {data.stats.depositPendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  {data.stats.depositPendingCount} acompte{data.stats.depositPendingCount > 1 ? "s" : ""} en attente
                </p>
                <p className="text-amber-700 text-sm">Ces réservations seront annulées sans acompte.</p>
              </div>
              <Link href="/admin/reservations?status=deposit_pending">
                <Button variant="warning" size="sm">Voir</Button>
              </Link>
            </div>
          )}

          {/* Today's reservations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Aujourd'hui ({data.todayReservations.length})
              </h2>
              <Link href="/admin/reservations">
                <Button variant="outline" size="sm">Tout voir</Button>
              </Link>
            </div>
            {data.todayReservations.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Aucune réservation aujourd'hui</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Client</th>
                      <th className="px-4 py-3 text-left">Formule</th>
                      <th className="px-4 py-3 text-left">Créneau</th>
                      <th className="px-4 py-3 text-left">Enfants</th>
                      <th className="px-4 py-3 text-left">Total</th>
                      <th className="px-4 py-3 text-left">Paiement</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.todayReservations.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{r.clientName}</p>
                          <p className="text-gray-400 text-xs">{r.reference}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">{r.formula?.name ?? (r.type === "futsal" ? `Futsal T${r.courtNumber}` : "—")}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs">{r.timeSlot?.time ?? (r.futsalTimeSlot ? `${r.futsalTimeSlot.hour}:00` : "—")}</td>
                        <td className="px-4 py-3 text-gray-700">{r.type === "futsal" ? r.playerCount : r.childrenCount}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{formatPrice(r.totalPrice)}</td>
                        <td className="px-4 py-3">
                          {r.fullPaymentPaid
                            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">💶 Payé</span>
                            : r.depositPaid
                            ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Acompte ✓</span>
                            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">En attente</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusColorVariant(r.status)}>
                            {getStatusLabel(r.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Weekly planning */}
          <WeeklyPlanning reservations={allWeekReservations} token={token} onReload={load} />
        </>
      )}
    </div>
  );
}
