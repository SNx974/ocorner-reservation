"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../layout";
import { formatPrice, getStatusLabel, getStatusColor } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Users, Clock, Loader2,
  RefreshCw, Trophy, Phone, Mail, CreditCard, X, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  format, addDays, subDays, startOfWeek, eachDayOfInterval, isToday,
} from "date-fns";
import { fr } from "date-fns/locale";

interface FutsalReservation {
  id: string; reference: string; clientName: string; clientPhone: string;
  clientEmail: string; date: string; status: string; totalPrice: number;
  playerCount: number; courtNumber: number; paymentType: string;
  depositPaid: boolean; fullPaymentPaid: boolean;
  futsalTimeSlot: { hour: number };
  participants: Array<{ id: string; name: string; amountDue: number; isPaid: boolean }>;
}

const badgeVariantMap: Record<string, "success" | "warning" | "destructive" | "secondary" | "info"> = {
  green: "success", yellow: "warning", orange: "warning",
  red: "destructive", gray: "secondary",
};

const courtColors = ["", "border-l-blue-500 bg-blue-50", "border-l-purple-500 bg-purple-50", "border-l-emerald-500 bg-emerald-50"];

// ── Reservation detail modal ────────────────────────────────────────
function FutsalModal({ r, onClose }: { r: FutsalReservation; onClose: () => void }) {
  const paidCount = r.participants.filter(p => p.isPaid).length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-blue-600" /> {r.clientName}
            </h2>
            <code className="text-xs text-gray-400 font-mono">{r.reference}</code>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Terrain</p>
              <p className="font-bold text-blue-700 text-lg">N°{r.courtNumber}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Créneau</p>
              <p className="font-semibold text-gray-900">{r.futsalTimeSlot.hour}:00</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">Joueurs</p>
              <p className="font-semibold text-gray-900">{r.playerCount}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
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
          {r.participants.length > 0 && (
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
            <Badge variant={badgeVariantMap[getStatusColor(r.status)] ?? "secondary"}>
              {getStatusLabel(r.status)}
            </Badge>
            {r.fullPaymentPaid && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">💶 Payé</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FutsalPlanningPage() {
  const { token } = useAdmin();
  const [reservations, setReservations] = useState<FutsalReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<FutsalReservation | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch("/api/admin/reservations?limit=500&type=futsal", {
      headers: { "x-admin-token": token },
    });
    if (res.ok) {
      const data = await res.json();
      setReservations((data.reservations ?? []).filter((r: FutsalReservation & { type?: string }) => r.futsalTimeSlot));
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  // Group by day + hour + court
  const grouped: Record<string, Record<number, Record<number, FutsalReservation[]>>> = {};
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-blue-600" /> Planning Futsal
          </h1>
          <p className="text-gray-500 text-sm">Vue par semaine — 3 terrains</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {/* Week nav */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
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
          {/* Legend */}
          <div className="hidden sm:flex gap-3 text-xs text-gray-500">
            {[1, 2, 3].map(c => (
              <span key={c} className="flex items-center gap-1">
                <span className={cn("w-3 h-3 rounded border-l-4 inline-block", courtColors[c])} />
                Terrain {c}
              </span>
            ))}
          </div>
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
                  <th className="w-20 px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Heure</th>
                  {days.map(day => (
                    <th key={day.toISOString()} className={cn(
                      "px-2 py-3 text-center text-sm font-semibold",
                      isToday(day) ? "text-blue-700" : "text-gray-700"
                    )}>
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
                  <tr key={hour} className={cn("border-b border-gray-50", hi % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                        <Clock className="w-3 h-3" />{hour}:00
                      </div>
                    </td>
                    {days.map(day => {
                      const dayStr = format(day, "yyyy-MM-dd");
                      const byHour = grouped[dayStr]?.[hour] ?? {};
                      const allRes = [1, 2, 3].flatMap(c => byHour[c] ?? []);

                      return (
                        <td key={day.toISOString()} className="px-1.5 py-1.5 align-top min-w-[100px]">
                          {allRes.length === 0 ? (
                            <div className="h-6" />
                          ) : (
                            <div className="space-y-1">
                              {[1, 2, 3].map(court => {
                                const courtRes = byHour[court] ?? [];
                                if (courtRes.length === 0) return null;
                                return courtRes.map(r => (
                                  <button key={r.id} type="button"
                                    onClick={() => setSelected(r)}
                                    className={cn(
                                      "w-full text-left rounded-lg border-l-4 px-2 py-1 text-xs transition-all hover:shadow-md hover:scale-[1.02]",
                                      r.status === "cancelled" ? "border-l-gray-300 bg-gray-50 opacity-40" : courtColors[court]
                                    )}>
                                    <p className="font-bold text-gray-800">T{court}</p>
                                    <p className="text-gray-600 truncate">{r.clientName.split(" ")[0]}</p>
                                    <p className="text-gray-400 flex items-center gap-0.5">
                                      <Users className="w-2.5 h-2.5" />{r.playerCount}
                                      {r.fullPaymentPaid && <span className="ml-1 text-green-600">💶</span>}
                                    </p>
                                  </button>
                                ));
                              })}
                            </div>
                          )}
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
