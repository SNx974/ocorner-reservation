"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { formatPrice, getStatusLabel, getStatusColor } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Users, Loader2,
  RefreshCw, Trophy, Phone, Mail, X, Plus, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  format, addDays, subDays, startOfWeek, eachDayOfInterval, isToday,
} from "date-fns";
import { fr } from "date-fns/locale";

interface FutsalRes {
  id: string; reference: string; clientName: string; clientPhone: string;
  clientEmail: string; date: string; status: string; totalPrice: number;
  playerCount: number; courtNumber: number; paymentType: string;
  depositPaid: boolean; fullPaymentPaid: boolean; type?: string;
  formula?: { name: string; category: string } | null;
  futsalTimeSlot: { hour: number };
  timeSlot?: { time: string } | null;
  participants: Array<{ id: string; name: string; amountDue: number; isPaid: boolean }>;
}

const badgeVariantMap: Record<string, "success" | "warning" | "destructive" | "secondary" | "info"> = {
  green: "success", yellow: "warning", orange: "warning",
  red: "destructive", gray: "secondary",
};

function statusColorVariant(s: string): "success" | "warning" | "destructive" | "secondary" | "info" {
  const c = s === "confirmed" ? "green" : s === "cancelled" || s === "expired" ? "red" : "yellow";
  return badgeVariantMap[c] ?? "secondary";
}

const courtColors = [
  "", "border-l-blue-500 bg-blue-50", "border-l-purple-500 bg-purple-50", "border-l-emerald-500 bg-emerald-50",
];
const bdayFootColor = "border-l-orange-500 bg-orange-50";

// ── Detail modal ────────────────────────────────────────────────────
function FutsalModal({ r, onClose }: { r: FutsalRes; onClose: () => void }) {
  const isBdayFoot = r.type === "birthday";
  const paidCount = r.participants?.filter(p => p.isPaid).length ?? 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              {isBdayFoot ? "🎂⚽" : <Trophy className="w-4 h-4 text-blue-600" />}
              {r.clientName}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-xs text-gray-400 font-mono">{r.reference}</code>
              {isBdayFoot && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Anniversaire Foot</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className={cn("rounded-xl p-3", isBdayFoot ? "bg-orange-50" : "bg-blue-50")}>
              <p className="text-xs text-gray-400">{isBdayFoot ? "Créneau" : "Terrain"}</p>
              <p className="font-bold text-lg">{isBdayFoot ? r.timeSlot?.time : `N°${r.courtNumber}`}</p>
            </div>
            <div className={cn("rounded-xl p-3", isBdayFoot ? "bg-orange-50" : "bg-blue-50")}>
              <p className="text-xs text-gray-400">{isBdayFoot ? "Formule" : "Créneau"}</p>
              <p className="font-semibold text-gray-900">{isBdayFoot ? r.formula?.name : `${r.futsalTimeSlot.hour}:00`}</p>
            </div>
            <div className={cn("rounded-xl p-3", isBdayFoot ? "bg-orange-50" : "bg-blue-50")}>
              <p className="text-xs text-gray-400">{isBdayFoot ? "Enfants" : "Joueurs"}</p>
              <p className="font-semibold text-gray-900">{isBdayFoot ? `${r.playerCount ?? "—"} enfants` : r.playerCount}</p>
            </div>
            <div className={cn("rounded-xl p-3", isBdayFoot ? "bg-orange-50" : "bg-blue-50")}>
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-bold text-emerald-700">{formatPrice(r.totalPrice)}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <a href={`tel:${r.clientPhone}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <Phone className="w-4 h-4 text-gray-400" />{r.clientPhone}
            </a>
            <a href={`mailto:${r.clientEmail}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 truncate">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />{r.clientEmail}
            </a>
          </div>
          {!isBdayFoot && r.participants?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Participants ({paidCount}/{r.participants.length} payés)</p>
              <div className="space-y-1.5">
                {r.participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">{formatPrice(p.amountDue)}</span>
                      {p.isPaid
                        ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Payé</span>
                        : <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">En attente</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <Badge variant={statusColorVariant(r.status)}>{getStatusLabel(r.status)}</Badge>
            {r.fullPaymentPaid && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">💶 Payé</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Quick add modal ──────────────────────────────────────────────────
function QuickAddModal({
  token, date, hour, onClose, onCreated,
}: { token: string; date: string; hour: number; onClose: () => void; onCreated: () => void }) {
  const [futsalSlots, setFutsalSlots] = useState<{ id: string; hour: number }[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [court, setCourt] = useState(1);
  const [playerCount, setPlayerCount] = useState(10);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/timeslots").then(r => r.json()).then(() => {});
    fetch("/api/futsal/availability?date=" + date)
      .then(r => r.json()).then((slots: { id: string; hour: number }[]) => {
        setFutsalSlots(slots);
        const found = slots.find(s => s.hour === hour);
        if (found) setSelectedSlotId(found.id);
      });
  }, [date, hour]);

  async function submit() {
    if (!clientName.trim()) { setError("Nom du client requis"); return; }
    if (!selectedSlotId) { setError("Créneau requis"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/admin/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        type: "futsal", clientName, clientEmail, clientPhone,
        futsalTimeSlotId: selectedSlotId, courtNumber: court,
        date, playerCount, notes,
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
            <Plus className="w-5 h-5 text-blue-600" /> Réservation futsal — {format(new Date(date + "T12:00:00"), "d MMM", { locale: fr })} {hour}:00
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Créneau</label>
              <select value={selectedSlotId} onChange={e => setSelectedSlotId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                {futsalSlots.map(s => <option key={s.id} value={s.id}>{s.hour}:00</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Terrain</label>
              <select value={court} onChange={e => setCourt(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                {[1, 2, 3].map(c => <option key={c} value={c}>Terrain {c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Joueurs</label>
            <Input type="number" min={1} value={playerCount} onChange={e => setPlayerCount(parseInt(e.target.value))} />
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
          <Button onClick={submit} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
            {loading ? "Création..." : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function FutsalPlanningPage() {
  const { token } = useAdmin();
  const [reservations, setReservations] = useState<FutsalRes[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<FutsalRes | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; hour: number } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    // Load both futsal and birthday+foot reservations
    const [futsalRes, bdayRes] = await Promise.all([
      fetch("/api/admin/reservations?limit=500&type=futsal", { headers: { "x-admin-token": token } }).then(r => r.json()),
      fetch("/api/admin/reservations?limit=500&type=birthday", { headers: { "x-admin-token": token } }).then(r => r.json()),
    ]);

    const futsalList: FutsalRes[] = (futsalRes.reservations ?? []).filter((r: FutsalRes) => r.futsalTimeSlot);

    // Birthday foot reservations — map to futsal hours
    const bdayFootList: FutsalRes[] = (bdayRes.reservations ?? [])
      .filter((r: FutsalRes & { formula?: { category: string } | null }) =>
        r.formula && ["marmaille_foot", "foot"].includes(r.formula.category) && r.timeSlot
      )
      .flatMap((r: FutsalRes & { timeSlot: { time: string } }) => {
        // Parse time slot to hours
        const match = r.timeSlot.time.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
        if (!match) return [];
        const startH = parseInt(match[1]);
        const endH = parseInt(match[3]);
        const endM = parseInt(match[4]);
        const hours: number[] = [];
        for (let h = startH; h < endH + (endM > 0 ? 1 : 0); h++) hours.push(h);
        if (endM === 0 && hours[hours.length - 1] === endH) hours.pop();
        // Create one "virtual" futsal entry per hour
        return hours.map(h => ({
          ...r,
          futsalTimeSlot: { hour: h },
          courtNumber: 1, // birthday foot uses court 1
          playerCount: r.playerCount ?? 0,
        }));
      });

    setReservations([...futsalList, ...bdayFootList]);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  // Group by day + hour + court
  const grouped: Record<string, Record<number, Record<number, FutsalRes[]>>> = {};
  for (const r of reservations) {
    const day = r.date.slice(0, 10);
    const hour = r.futsalTimeSlot.hour;
    const court = r.courtNumber;
    if (!grouped[day]) grouped[day] = {};
    if (!grouped[day][hour]) grouped[day][hour] = {};
    if (!grouped[day][hour][court]) grouped[day][hour][court] = [];
    grouped[day][hour][court].push(r);
  }

  const HOURS = Array.from({ length: 13 }, (_, i) => 10 + i); // 10 to 22

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {selected && <FutsalModal r={selected} onClose={() => setSelected(null)} />}
      {quickAdd && token && (
        <QuickAddModal
          token={token} date={quickAdd.date} hour={quickAdd.hour}
          onClose={() => setQuickAdd(null)} onCreated={load}
        />
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" /> Planning Futsal
          </h1>
          <p className="text-gray-500 text-sm">Vue par semaine — 3 terrains</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex gap-3 text-xs text-gray-500 bg-white border border-gray-100 rounded-xl px-3 py-2">
            {[1, 2, 3].map(c => (
              <span key={c} className="flex items-center gap-1">
                <span className={cn("w-3 h-3 rounded border-l-4 inline-block", courtColors[c])} />T{c}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border-l-4 inline-block border-l-orange-500 bg-orange-50" />
              Anniv. foot
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Actualiser
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Week nav */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <button onClick={() => setWeekStart(d => subDays(d, 7))}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-600 min-w-[150px] text-center">
            {format(weekStart, "d MMM", { locale: fr })} – {format(addDays(weekStart, 6), "d MMM yyyy", { locale: fr })}
          </span>
          <button onClick={() => setWeekStart(d => addDays(d, 7))}
            className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium">
            Aujourd'hui
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-16 px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase">H</th>
                  {days.map(day => (
                    <th key={day.toISOString()} className={cn("px-2 py-3 text-center text-sm font-semibold", isToday(day) ? "text-blue-700" : "text-gray-700")}>
                      <div className={cn("rounded-lg px-2 py-1 inline-block", isToday(day) && "bg-blue-100")}>
                        <div className="text-xs font-normal text-gray-400 capitalize">{format(day, "EEE", { locale: fr })}</div>
                        <div>{format(day, "d")}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour, hi) => (
                  <tr key={hour} className={cn("border-b border-gray-50", hi % 2 === 0 ? "bg-white" : "bg-gray-50/40")}>
                    <td className="px-3 py-2 text-xs font-bold text-gray-400">{hour}h</td>
                    {days.map(day => {
                      const dayStr = format(day, "yyyy-MM-dd");
                      const courtsAtHour = grouped[dayStr]?.[hour] ?? {};

                      return (
                        <td key={day.toISOString()} className="px-1.5 py-1.5 align-top min-w-[100px]">
                          <div className="space-y-1 min-h-[36px]">
                            {/* Court 1, 2, 3 */}
                            {[1, 2, 3].map(court => {
                              const entries = (courtsAtHour[court] ?? []).filter(r => r.status !== "cancelled" && r.status !== "expired");
                              return entries.map(r => {
                                const isBday = r.type === "birthday";
                                return (
                                  <button key={r.id} type="button" onClick={() => setSelected(r)}
                                    className={cn(
                                      "w-full text-left rounded-lg border-l-4 px-2 py-1 text-xs transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer",
                                      isBday ? bdayFootColor : (courtColors[court] ?? "border-l-gray-400 bg-gray-50"),
                                    )}>
                                    <p className="font-semibold text-gray-900 truncate leading-tight">
                                      {isBday ? "🎂⚽" : `T${court}`} {r.clientName.split(" ")[0]}
                                    </p>
                                    <p className="text-gray-500 flex items-center gap-0.5 mt-0.5 leading-tight">
                                      <Users className="w-2.5 h-2.5" />
                                      {isBday ? `Anniv. foot` : `${r.playerCount}j`}
                                    </p>
                                  </button>
                                );
                              });
                            })}
                            {/* Quick add button */}
                            <button
                              onClick={() => setQuickAdd({ date: dayStr, hour })}
                              className="w-full h-6 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-blue-300 hover:text-blue-400 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100">
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
        )}
      </div>
    </div>
  );
}
