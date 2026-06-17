"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Trophy, RefreshCw, Loader2, CalendarX, BanIcon, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BdaySlot { id: string; time: string; isActive: boolean; }
interface FutsalSlot { id: string; hour: number; minute: number; isActive: boolean; }
interface ClosedDate { id: string; date: string; label: string | null; type: string; }
interface VacationPeriod { id: string; label: string; startDate: string; endDate: string; }

const TYPE_LABELS: Record<string, string> = {
  all: "Tout (anniv + futsal)",
  birthday: "Anniversaire seulement",
  futsal: "Foot à 5 seulement",
};

const TYPE_COLORS: Record<string, string> = {
  all: "bg-red-100 text-red-700 border-red-200",
  birthday: "bg-emerald-100 text-emerald-700 border-emerald-200",
  futsal: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function CreneauxPage() {
  const { token } = useAdmin();
  const [bdaySlots, setBdaySlots] = useState<BdaySlot[]>([]);
  const [futsalSlots, setFutsalSlots] = useState<FutsalSlot[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTime, setNewTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [peakHour, setPeakHour] = useState(17);
  const [offpeakPrice, setOffpeakPrice] = useState(90);
  const [peakPrice, setPeakPrice] = useState(110);
  const [slotMode, setSlotMode] = useState<"hour" | "half">("hour");

  // Vacation periods
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [newVacLabel, setNewVacLabel] = useState("");
  const [newVacStart, setNewVacStart] = useState("");
  const [newVacEnd, setNewVacEnd] = useState("");
  const [addingVac, setAddingVac] = useState(false);

  // Closed date form
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedLabel, setNewClosedLabel] = useState("");
  const [newClosedType, setNewClosedType] = useState("all");
  const [addingClosed, setAddingClosed] = useState(false);

  const headers = { "Content-Type": "application/json", "x-admin-token": token ?? "" };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const [bRes, fRes, sRes, cRes, vRes] = await Promise.all([
      fetch("/api/admin/timeslots", { headers: { "x-admin-token": token } }),
      fetch("/api/admin/futsal-slots", { headers: { "x-admin-token": token } }),
      fetch("/api/admin/settings", { headers: { "x-admin-token": token } }),
      fetch("/api/admin/closed-dates", { headers: { "x-admin-token": token } }),
      fetch("/api/admin/vacation-periods", { headers: { "x-admin-token": token } }),
    ]);
    if (bRes.ok) setBdaySlots(await bRes.json());
    if (fRes.ok) setFutsalSlots(await fRes.json());
    if (sRes.ok) {
      const s = await sRes.json();
      if (s.futsal_price_peak_from) setPeakHour(parseInt(s.futsal_price_peak_from));
      if (s.futsal_price_offpeak) setOffpeakPrice(parseFloat(s.futsal_price_offpeak));
      if (s.futsal_price_peak) setPeakPrice(parseFloat(s.futsal_price_peak));
    }
    if (cRes.ok) {
      const raw: Array<{ id: string; date: string; label: string | null; type: string }> = await cRes.json();
      setClosedDates(raw.map(d => ({ ...d, date: d.date.slice(0, 10) })));
    }
    if (vRes.ok) {
      const raw: VacationPeriod[] = await vRes.json();
      setVacationPeriods(raw.map(v => ({
        ...v,
        startDate: v.startDate.slice(0, 10),
        endDate: v.endDate.slice(0, 10),
      })));
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function addBdaySlot() {
    if (!newTime.trim()) return;
    setAdding(true);
    await fetch("/api/admin/timeslots", { method: "POST", headers, body: JSON.stringify({ time: newTime }) });
    setNewTime("");
    setAdding(false);
    load();
  }

  async function toggleBday(s: BdaySlot) {
    await fetch("/api/admin/timeslots", { method: "PATCH", headers, body: JSON.stringify({ id: s.id, isActive: !s.isActive }) });
    load();
  }

  async function deleteBday(s: BdaySlot) {
    if (!confirm(`Supprimer le créneau "${s.time}" ?`)) return;
    await fetch("/api/admin/timeslots", { method: "DELETE", headers, body: JSON.stringify({ id: s.id }) });
    load();
  }

  async function toggleFutsal(s: FutsalSlot) {
    await fetch("/api/admin/futsal-slots", { method: "PATCH", headers, body: JSON.stringify({ id: s.id, isActive: !s.isActive }) });
    load();
  }

  async function regenerateFutsal(mode?: "hour" | "half") {
    const m = mode ?? slotMode;
    const label = m === "hour" ? "heures pleines (10h00 → 22h00)" : "demi-heures (10h30 → 22h30)";
    if (!confirm(`Régénérer les créneaux futsal en mode ${label} ?\nLes créneaux non liés à une réservation seront supprimés.`)) return;
    setRegenerating(true);
    const res = await fetch("/api/admin/futsal-slots", { method: "POST", headers, body: JSON.stringify({ mode: m }) });
    if (res.ok) setFutsalSlots(await res.json());
    setRegenerating(false);
  }

  async function addClosedDate() {
    if (!newClosedDate) return;
    setAddingClosed(true);
    await fetch("/api/admin/closed-dates", {
      method: "POST", headers,
      body: JSON.stringify({ date: newClosedDate, label: newClosedLabel || null, type: newClosedType }),
    });
    setNewClosedDate("");
    setNewClosedLabel("");
    setNewClosedType("all");
    setAddingClosed(false);
    load();
  }

  async function addVacationPeriod() {
    if (!newVacLabel.trim() || !newVacStart || !newVacEnd) return;
    setAddingVac(true);
    await fetch("/api/admin/vacation-periods", {
      method: "POST", headers,
      body: JSON.stringify({ label: newVacLabel, startDate: newVacStart, endDate: newVacEnd }),
    });
    setNewVacLabel(""); setNewVacStart(""); setNewVacEnd("");
    setAddingVac(false);
    load();
  }

  async function deleteVacationPeriod(id: string) {
    if (!confirm("Supprimer cette période ?")) return;
    await fetch("/api/admin/vacation-periods", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    load();
  }

  async function deleteClosedDate(id: string) {
    if (!confirm("Retirer ce jour fermé ?")) return;
    await fetch("/api/admin/closed-dates", { method: "DELETE", headers, body: JSON.stringify({ id }) });
    load();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des créneaux</h1>
          <p className="text-gray-500 text-sm">Anniversaire, Foot à 5 et jours fermés</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="space-y-6">

          {/* ── Périodes de vacances scolaires ── */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
              <GraduationCap className="w-5 h-5 text-emerald-600" /> 🏖️ Périodes de vacances scolaires
            </h2>
            <p className="text-gray-400 text-xs mb-4">
              Durant ces périodes, les horaires &quot;vacances&quot; s&apos;appliquent pour la réservation futsal côté client.
              <br/>Configurez les heures dans <strong>Paramètres → Horaires Foot à 5 selon période</strong>.
            </p>

            {/* Add form */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                placeholder="Nom — ex: Vacances d'été 2025"
                value={newVacLabel}
                onChange={e => setNewVacLabel(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-1.5">
                <input type="date" value={newVacStart} onChange={e => setNewVacStart(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <span className="text-gray-400 text-xs">→</span>
                <input type="date" value={newVacEnd} onChange={e => setNewVacEnd(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <Button
                onClick={addVacationPeriod}
                disabled={addingVac || !newVacLabel.trim() || !newVacStart || !newVacEnd}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {addingVac ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {vacationPeriods.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-emerald-100 bg-emerald-50">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{v.label}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(v.startDate)} → {formatDate(v.endDate)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteVacationPeriod(v.id)}
                    className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-400 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {vacationPeriods.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">Aucune période configurée</p>
              )}
            </div>
          </div>

          {/* ── Jours fermés ── */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
              <CalendarX className="w-5 h-5 text-red-500" /> 🚫 Jours fermés
            </h2>
            <p className="text-gray-400 text-xs mb-4">
              Ces dates seront indisponibles à la réservation côté client.
            </p>

            {/* Add form */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="date"
                value={newClosedDate}
                onChange={e => setNewClosedDate(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <Input
                placeholder="Motif (optionnel) — ex: Événement privé"
                value={newClosedLabel}
                onChange={e => setNewClosedLabel(e.target.value)}
                className="flex-1"
              />
              <select
                value={newClosedType}
                onChange={e => setNewClosedType(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
              >
                <option value="all">Tout fermer</option>
                <option value="birthday">Anniversaire only</option>
                <option value="futsal">Foot à 5 only</option>
              </select>
              <Button
                onClick={addClosedDate}
                disabled={addingClosed || !newClosedDate}
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {addingClosed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {closedDates.map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-red-100 bg-red-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <BanIcon className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm capitalize">{formatDate(d.date)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", TYPE_COLORS[d.type])}>
                          {TYPE_LABELS[d.type]}
                        </span>
                        {d.label && <span className="text-xs text-gray-500 truncate">{d.label}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteClosedDate(d.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {closedDates.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">Aucun jour fermé configuré</p>
              )}
            </div>
          </div>

          {/* ── Anniversaire ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-emerald-600" /> 🎡 Créneaux Anniversaire
            </h2>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="ex: 09:00-12:00 ou 14:00-17:00"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addBdaySlot()}
                className="flex-1"
              />
              <Button onClick={addBdaySlot} disabled={adding || !newTime.trim()} size="sm">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {bdaySlots.map(s => (
                <div key={s.id} className={cn(
                  "flex items-center justify-between p-3 rounded-xl border transition-all",
                  s.isActive ? "border-emerald-200 bg-emerald-50" : "border-gray-100 bg-gray-50 opacity-60"
                )}>
                  <div className="flex items-center gap-2">
                    <Clock className={cn("w-4 h-4", s.isActive ? "text-emerald-600" : "text-gray-400")} />
                    <span className={cn("font-semibold", s.isActive ? "text-gray-900" : "text-gray-500 line-through")}>{s.time}</span>
                    {!s.isActive && <span className="text-xs text-gray-400">(désactivé)</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleBday(s)} className="p-1.5 rounded-lg hover:bg-white transition-colors" title={s.isActive ? "Désactiver" : "Activer"}>
                      {s.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button onClick={() => deleteBday(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {bdaySlots.length === 0 && <p className="text-center text-gray-400 py-4">Aucun créneau</p>}
            </div>
          </div>

          {/* ── Futsal ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-600" /> ⚽ Créneaux Foot à 5
              </h2>
              <button
                type="button"
                onClick={() => regenerateFutsal()}
                disabled={regenerating}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
                title="Réinitialiser les créneaux"
              >
                {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Réinitialiser
              </button>
            </div>

            {/* Mode switch */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-4 w-fit">
              <button
                type="button"
                onClick={() => setSlotMode("hour")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  slotMode === "hour" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                🕐 Heures pleines
              </button>
              <button
                type="button"
                onClick={() => setSlotMode("half")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  slotMode === "half" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                🕠 Demi-heures
              </button>
            </div>

            <p className="text-gray-400 text-xs mb-3">Cliquez sur un créneau pour l&apos;activer / désactiver.</p>

            {/* Pricing legend */}
            <div className="flex flex-wrap gap-2 mb-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                Heures creuses (&lt;{peakHour}h) — <strong>{offpeakPrice}€</strong>
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                Heures de pointe (≥{peakHour}h) — <strong>{peakPrice}€</strong>
              </span>
            </div>

            {/* Slots list */}
            {(() => {
              const targetMinute = slotMode === "hour" ? 0 : 30;
              const visible = futsalSlots.filter(s => s.minute === targetMinute);
              if (futsalSlots.length === 0 || visible.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <p>Aucun créneau {slotMode === "hour" ? "heure pleine" : "demi-heure"} configuré.</p>
                    <button
                      type="button"
                      onClick={() => regenerateFutsal(slotMode)}
                      disabled={regenerating}
                      className="mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      {regenerating ? "Génération..." : `Générer les ${slotMode === "hour" ? "heures pleines" : "demi-heures"}`}
                    </button>
                  </div>
                );
              }
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {visible.map(s => {
                      const isPeak = s.hour >= peakHour;
                      const label = slotMode === "hour" ? `${s.hour}h00` : `${s.hour}h30`;
                      return (
                        <button key={s.id} type="button" onClick={() => toggleFutsal(s)}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                            s.isActive
                              ? isPeak
                                ? "border-orange-500 bg-orange-500 text-white"
                                : "border-blue-500 bg-blue-500 text-white"
                              : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
                          )}>
                          <span>{label}</span>
                          <span className="text-xs font-normal opacity-80">
                            {s.isActive ? `${isPeak ? peakPrice : offpeakPrice}€` : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Pour modifier les prix → <strong>Paramètres → Tarification Foot à 5</strong>
                  </p>
                </>
              );
            })()}
          </div>

        </div>
      )}
    </div>
  );
}
