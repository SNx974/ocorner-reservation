"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Plus, Trash2, ToggleLeft, ToggleRight, Trophy, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BdaySlot { id: string; time: string; isActive: boolean; }
interface FutsalSlot { id: string; hour: number; minute: number; isActive: boolean; }

export default function CreneauxPage() {
  const { token } = useAdmin();
  const [bdaySlots, setBdaySlots] = useState<BdaySlot[]>([]);
  const [futsalSlots, setFutsalSlots] = useState<FutsalSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTime, setNewTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [futsalMode, setFutsalMode] = useState<"hour" | "half" | "both">("hour");
  const [regenerating, setRegenerating] = useState(false);

  const headers = { "Content-Type": "application/json", "x-admin-token": token ?? "" };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const [bRes, fRes] = await Promise.all([
      fetch("/api/admin/timeslots", { headers: { "x-admin-token": token } }),
      fetch("/api/admin/futsal-slots", { headers: { "x-admin-token": token } }),
    ]);
    if (bRes.ok) setBdaySlots(await bRes.json());
    if (fRes.ok) setFutsalSlots(await fRes.json());
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

  async function regenerateFutsal() {
    if (!confirm(`Régénérer tous les créneaux futsal en mode "${futsalMode === "hour" ? "heures pleines" : futsalMode === "half" ? "demi-heures" : "les deux"}" ?\nLes créneaux non liés à une réservation seront supprimés.`)) return;
    setRegenerating(true);
    const res = await fetch("/api/admin/futsal-slots", { method: "POST", headers, body: JSON.stringify({ mode: futsalMode }) });
    if (res.ok) setFutsalSlots(await res.json());
    setRegenerating(false);
  }

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des créneaux</h1>
          <p className="text-gray-500 text-sm">Anniversaire et Futsal</p>
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
          {/* Anniversaire */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-emerald-600" /> 🎡 Créneaux Anniversaire
            </h2>

            {/* Add new */}
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

          {/* Futsal */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-blue-600" /> ⚽ Créneaux Futsal (10h – 22h)
            </h2>
            <p className="text-gray-500 text-sm mb-4">Activez/désactivez chaque créneau ou régénérez-les selon le mode choisi</p>

            {/* Mode selector + regenerate */}
            <div className="bg-blue-50 rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-blue-800 mb-3">Régénérer les créneaux</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {(["hour", "half", "both"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFutsalMode(m)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all",
                      futsalMode === m
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-blue-200 bg-white text-blue-700 hover:border-blue-400"
                    )}
                  >
                    {m === "hour" ? "🕐 Heures pleines" : m === "half" ? "🕠 Demi-heures (+30min)" : "🕐🕠 Les deux"}
                  </button>
                ))}
              </div>
              <div className="text-xs text-blue-600 mb-3">
                {futsalMode === "hour" && "→ 10h00, 11h00, 12h00 … 21h00"}
                {futsalMode === "half" && "→ 10h30, 11h30, 12h30 … 21h30"}
                {futsalMode === "both" && "→ 10h00, 10h30, 11h00, 11h30 … 21h00, 21h30"}
              </div>
              <Button
                onClick={regenerateFutsal}
                disabled={regenerating}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {regenerating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                Régénérer les créneaux
              </Button>
            </div>

            {/* Slot grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {futsalSlots.map(s => (
                <button key={s.id} type="button" onClick={() => toggleFutsal(s)}
                  className={cn(
                    "py-3 rounded-xl text-sm font-bold border-2 transition-all",
                    s.isActive
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-400"
                  )}>
                  {s.hour}h{s.minute > 0 ? String(s.minute).padStart(2, "0") : "00"}
                </button>
              ))}
              {futsalSlots.length === 0 && (
                <p className="col-span-6 text-center text-gray-400 py-4 text-sm">Aucun créneau — utilisez le bouton ci-dessus pour en générer</p>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Cliquez sur un créneau pour l&apos;activer / désactiver. Les créneaux désactivés n&apos;apparaissent pas sur le site.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
