"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, cn } from "@/lib/utils";
import { Save, Loader2, CheckCircle, Package, Clock, Settings, AlertTriangle } from "lucide-react";

interface Formula {
  id: string; name: string; category: string; includes: string;
  pricePerChild: number; minChildren: number; isActive: boolean;
}

interface TimeSlot { id: string; time: string; isActive: boolean; }

function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
        <Icon className="w-5 h-5 text-emerald-600" />
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { token } = useAdmin();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savingFormula, setSavingFormula] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [s, f, t] = await Promise.all([
      fetch("/api/admin/settings", { headers: { "x-admin-token": token } }).then(r => r.json()),
      fetch("/api/formulas").then(r => r.json()),
      fetch("/api/timeslots").then(r => r.json()),
    ]);
    setSettings(s);
    setFormulas(f);
    setSlots(t);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    setLoading(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify(settings),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function updateFormula(id: string, field: string, value: unknown) {
    setSavingFormula(id);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id, action: "update_formula", [field]: value }),
    });
    setSavingFormula(null);
    load();
  }

  async function toggleSlot(id: string) {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id, action: "toggle_timeslot" }),
    });
    load();
  }

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  const catLabels: Record<string, string> = {
    marmaille: "🎡 Marmaille Parc",
    marmaille_foot: "⚽🎡 Marmaille + Foot",
    foot: "⚽ Foot",
  };

  const grouped = formulas.reduce<Record<string, Formula[]>>((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 text-sm">Configuration du parc</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
            <CheckCircle className="w-4 h-4" /> Sauvegardé !
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {!loading && (
        <>
          {/* General settings */}
          <Section title="Paramètres généraux" icon={Settings}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du parc</label>
                <Input value={settings.park_name ?? ""} onChange={e => setSettings(s => ({ ...s, park_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <Input value={settings.park_phone ?? ""} onChange={e => setSettings(s => ({ ...s, park_phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de contact</label>
                <Input type="email" value={settings.park_email ?? ""} onChange={e => setSettings(s => ({ ...s, park_email: e.target.value }))} />
              </div>
            </div>

            <div className="border-t border-gray-100 mt-5 pt-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Acompte & Délais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Acompte (%)
                  </label>
                  <Input type="number" min="0" max="100"
                    value={settings.deposit_percentage ?? "30"}
                    onChange={e => setSettings(s => ({ ...s, deposit_percentage: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">% du total</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Acompte minimum (€)
                  </label>
                  <Input type="number" min="0"
                    value={settings.deposit_min_amount ?? "50"}
                    onChange={e => setSettings(s => ({ ...s, deposit_min_amount: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">Montant plancher</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Délai réservation (h)
                  </label>
                  <Input type="number" min="1"
                    value={settings.booking_expiry_hours ?? "72"}
                    onChange={e => setSettings(s => ({ ...s, booking_expiry_hours: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">Avant annulation auto</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Max. réservations / créneau
                  </label>
                  <Input type="number" min="1" max="50"
                    value={settings.max_per_slot ?? "5"}
                    onChange={e => setSettings(s => ({ ...s, max_per_slot: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">Places par tranche horaire</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 mt-5 pt-5">
              <h3 className="font-semibold text-gray-900 mb-4">Sécurité</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe admin</label>
                <Input type="password"
                  value={settings.admin_password ?? ""}
                  onChange={e => setSettings(s => ({ ...s, admin_password: e.target.value }))} />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button onClick={saveSettings} disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> Sauvegarder
              </Button>
            </div>
          </Section>

          {/* Formulas */}
          <Section title="Tarifs & Formules" icon={Package}>
            {Object.entries(grouped).map(([cat, fList]) => (
              <div key={cat} className="mb-6 last:mb-0">
                <h3 className="font-bold text-gray-800 mb-3">{catLabels[cat] ?? cat}</h3>
                <div className="space-y-3">
                  {fList.map(f => (
                    <div key={f.id} className={`border rounded-xl p-4 transition-all ${f.isActive ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className="font-medium text-gray-900">{f.name}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Prix/enfant</label>
                            <input type="number" defaultValue={f.pricePerChild}
                              onBlur={e => updateFormula(f.id, "pricePerChild", parseFloat(e.target.value))}
                              className="w-20 h-8 rounded-lg border border-gray-300 px-2 text-sm text-center focus:ring-2 focus:ring-emerald-500 outline-none" />
                            <span className="text-sm text-gray-500">€</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500">Min.</label>
                            <input type="number" defaultValue={f.minChildren}
                              onBlur={e => updateFormula(f.id, "minChildren", parseInt(e.target.value))}
                              className="w-16 h-8 rounded-lg border border-gray-300 px-2 text-sm text-center focus:ring-2 focus:ring-emerald-500 outline-none" />
                          </div>
                          <button
                            onClick={() => updateFormula(f.id, "isActive", !f.isActive)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              f.isActive ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700" :
                              "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                            }`}>
                            {savingFormula === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> :
                              f.isActive ? "Actif" : "Inactif"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Section>

          {/* Futsal pricing */}
          <Section title="Tarification Futsal" icon={Clock}>
            <p className="text-sm text-gray-500 mb-4">
              Définissez deux niveaux de prix selon l'heure du créneau (heures creuses vs heures de pointe).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prix heures creuses (€) <span className="text-gray-400 font-normal">avant l'heure de pointe</span>
                </label>
                <Input type="number" min="0"
                  value={settings.futsal_price_offpeak ?? "90"}
                  onChange={e => setSettings(s => ({ ...s, futsal_price_offpeak: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prix heures de pointe (€)
                </label>
                <Input type="number" min="0"
                  value={settings.futsal_price_peak ?? "110"}
                  onChange={e => setSettings(s => ({ ...s, futsal_price_peak: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Heure de début pointe <span className="text-gray-400 font-normal">(ex: 17 = à partir de 17h)</span>
                </label>
                <Input type="number" min="10" max="22"
                  value={settings.futsal_price_peak_from ?? "17"}
                  onChange={e => setSettings(s => ({ ...s, futsal_price_peak_from: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              <strong>Exemple :</strong> heures creuses 90€ / pointe 110€ à partir de 17h<br/>
              → 10h–16h30 : <strong>90€</strong> · 17h–22h : <strong>110€</strong>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveSettings} disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> Sauvegarder
              </Button>
            </div>
          </Section>

          {/* Time slots */}
          <Section title="Créneaux horaires" icon={Clock}>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map(slot => (
                <button key={slot.id} onClick={() => toggleSlot(slot.id)}
                  className={cn(
                    "py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all",
                    slot.isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50 text-gray-400 line-through"
                  )}>
                  {slot.time}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Cliquez sur un créneau pour l'activer/désactiver</p>
          </Section>
        </>
      )}
    </div>
  );
}
