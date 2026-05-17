"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Pencil, Check, X, Loader2, Save, Euro, Users, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Formula {
  id: string;
  name: string;
  category: string;
  includes: string;
  pricePerChild: number;
  minChildren: number;
  isActive: boolean;
}

const CATEGORIES = [
  { value: "marmaille", label: "🎡 Marmaille Parc" },
  { value: "marmaille_foot", label: "⚽🎡 Marmaille + Foot" },
  { value: "foot", label: "⚽ Foot" },
];

const emptyForm = { name: "", category: "marmaille", includes: "", pricePerChild: "", minChildren: "6" };

export default function FormulesPage() {
  const { token } = useAdmin();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [futsalPrice, setFutsalPrice] = useState("");
  const [futsalSaved, setFutsalSaved] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const [f, s] = await Promise.all([
      fetch("/api/admin/formulas", { headers: { "x-admin-token": token } }).then(r => r.json()),
      fetch("/api/admin/settings", { headers: { "x-admin-token": token } }).then(r => r.json()),
    ]);
    setFormulas(f);
    setFutsalPrice(s.futsal_price_per_player ?? "8");
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function saveFutsalPrice() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ futsal_price_per_player: futsalPrice }),
    });
    setSaving(false);
    setFutsalSaved(true);
    setTimeout(() => setFutsalSaved(false), 2500);
  }

  async function addFormula() {
    if (!addForm.name || !addForm.pricePerChild) return;
    setSaving(true);
    await fetch("/api/admin/formulas", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify(addForm),
    });
    setSaving(false);
    setShowAdd(false);
    setAddForm({ ...emptyForm });
    load();
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    await fetch("/api/admin/formulas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id: editId, ...editData }),
    });
    setSaving(false);
    setEditId(null);
    load();
  }

  async function toggleActive(f: Formula) {
    await fetch("/api/admin/formulas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id: f.id, isActive: !f.isActive }),
    });
    load();
  }

  async function deleteFormula(id: string) {
    if (!confirm("Supprimer cette formule ?")) return;
    await fetch("/api/admin/formulas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: formulas.filter(f => f.category === cat.value),
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formules & Tarifs</h1>
          <p className="text-gray-500 text-sm">Gérez les offres anniversaire et le prix futsal</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nouvelle formule
        </Button>
      </div>

      {/* Futsal price card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Euro className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-blue-900">Prix Futsal par joueur</p>
              <p className="text-blue-600 text-sm">Appliqué à toutes les sessions futsal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="1"
              value={futsalPrice}
              onChange={e => setFutsalPrice(e.target.value)}
              className="w-24 text-center font-bold text-lg"
            />
            <span className="text-blue-700 font-semibold">€ / joueur</span>
            <Button onClick={saveFutsalPrice} disabled={saving} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
              {futsalSaved ? <><Check className="w-4 h-4" /> Sauvé</> : <><Save className="w-4 h-4" /> Sauvegarder</>}
            </Button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {/* Add formula modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Nouvelle formule</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <Input placeholder="ex: Marmaille + Boisson" value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenu (ex: Boisson incluse)</label>
                <Input placeholder="Boisson incluse, crêpe..." value={addForm.includes}
                  onChange={e => setAddForm(f => ({ ...f, includes: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix / enfant (€)</label>
                  <Input type="number" min="0" placeholder="13" value={addForm.pricePerChild}
                    onChange={e => setAddForm(f => ({ ...f, pricePerChild: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum enfants</label>
                  <Input type="number" min="1" placeholder="6" value={addForm.minChildren}
                    onChange={e => setAddForm(f => ({ ...f, minChildren: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
              <Button onClick={addFormula} disabled={saving || !addForm.name || !addForm.pricePerChild} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Créer
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && grouped.map(group => (
        <div key={group.value} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
            <Tag className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900">{group.label}</h2>
            <span className="text-xs text-gray-400 ml-auto">{group.items.length} formule{group.items.length !== 1 ? "s" : ""}</span>
          </div>

          {group.items.length === 0 && (
            <p className="px-6 py-4 text-sm text-gray-400 italic">Aucune formule dans cette catégorie.</p>
          )}

          <div className="divide-y divide-gray-50">
            {group.items.map(f => (
              <div key={f.id} className={cn("px-6 py-4 transition-all", !f.isActive && "opacity-50 bg-gray-50")}>
                {editId === f.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <Input defaultValue={f.name}
                      onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} />
                    <Input defaultValue={f.includes}
                      onChange={e => setEditData(d => ({ ...d, includes: e.target.value }))}
                      placeholder="Contenu inclus..." />
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-gray-400" />
                        <Input type="number" defaultValue={f.pricePerChild} className="w-24"
                          onChange={e => setEditData(d => ({ ...d, pricePerChild: e.target.value }))} />
                        <span className="text-sm text-gray-500">€/enfant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <Input type="number" defaultValue={f.minChildren} className="w-20"
                          onChange={e => setEditData(d => ({ ...d, minChildren: e.target.value }))} />
                        <span className="text-sm text-gray-500">min</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Sauvegarder
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{f.name}</p>
                      {f.includes && <p className="text-sm text-gray-500 mt-0.5">{f.includes}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-emerald-700 font-bold text-sm">{f.pricePerChild}€ / enfant</span>
                        <span className="text-gray-400 text-xs">• min {f.minChildren} enfants</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(f)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                          f.isActive
                            ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                            : "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700"
                        )}>
                        {f.isActive ? "Actif" : "Inactif"}
                      </button>
                      <button
                        onClick={() => { setEditId(f.id); setEditData({ name: f.name, includes: f.includes, pricePerChild: f.pricePerChild, minChildren: f.minChildren }); }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFormula(f.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
