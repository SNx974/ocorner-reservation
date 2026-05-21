"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Loader2, RefreshCw, Trash2, ToggleLeft, ToggleRight, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PromoCode {
  id: string; code: string; label: string;
  discountType: "percent" | "fixed"; discountValue: number;
  isActive: boolean; usageLimit: number | null; usageCount: number;
  expiresAt: string | null; createdAt: string;
}

const EMPTY_FORM = {
  code: "", label: "", discountType: "percent" as "percent" | "fixed",
  discountValue: "", usageLimit: "", expiresAt: "",
};

export default function PromoPage() {
  const { token } = useAdmin();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const headers = { "Content-Type": "application/json", "x-admin-token": token ?? "" };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch("/api/admin/promo", { headers: { "x-admin-token": token } });
    if (res.ok) setPromos(await res.json());
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Code requis";
    if (!form.label.trim()) e.label = "Libellé requis";
    if (!form.discountValue || isNaN(Number(form.discountValue)) || Number(form.discountValue) <= 0)
      e.discountValue = "Valeur invalide";
    if (form.discountType === "percent" && Number(form.discountValue) > 100)
      e.discountValue = "Max 100%";
    return e;
  }

  async function createPromo() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    await fetch("/api/admin/promo", {
      method: "POST", headers,
      body: JSON.stringify({
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        discountType: form.discountType,
        discountValue: form.discountValue,
        usageLimit: form.usageLimit || null,
        expiresAt: form.expiresAt || null,
      }),
    });
    setSaving(false);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setErrors({});
    load();
  }

  async function toggleActive(p: PromoCode) {
    await fetch("/api/admin/promo", {
      method: "PATCH", headers,
      body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
    });
    load();
  }

  async function deletePromo(p: PromoCode) {
    if (!confirm(`Supprimer le code "${p.code}" ?`)) return;
    await fetch("/api/admin/promo", {
      method: "DELETE", headers,
      body: JSON.stringify({ id: p.id }),
    });
    load();
  }

  const setF = (k: keyof typeof EMPTY_FORM, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-600" /> Codes promo
          </h1>
          <p className="text-gray-500 text-sm">{promos.length} code{promos.length > 1 ? "s" : ""} au total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> Nouveau code
          </Button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Créer un code promo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code *</label>
              <Input placeholder="EX: YOHAN100" value={form.code}
                onChange={e => setF("code", e.target.value.toUpperCase())} />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Libellé *</label>
              <Input placeholder="Remise partenaire" value={form.label}
                onChange={e => setF("label", e.target.value)} />
              {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type de remise *</label>
              <select value={form.discountType} onChange={e => setF("discountType", e.target.value as "percent" | "fixed")}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring outline-none">
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Valeur * {form.discountType === "percent" ? "(ex: 100 = 100%)" : "(ex: 50 = 50€)"}
              </label>
              <Input type="number" min="0" max={form.discountType === "percent" ? "100" : undefined}
                placeholder={form.discountType === "percent" ? "100" : "50"}
                value={form.discountValue} onChange={e => setF("discountValue", e.target.value)} />
              {errors.discountValue && <p className="text-red-500 text-xs mt-1">{errors.discountValue}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Limite d'utilisations (vide = illimité)</label>
              <Input type="number" min="1" placeholder="ex: 10"
                value={form.usageLimit} onChange={e => setF("usageLimit", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date d'expiration (optionnel)</label>
              <Input type="date" value={form.expiresAt}
                onChange={e => setF("expiresAt", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }}>
              Annuler
            </Button>
            <Button onClick={createPromo} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-1" />}
              Créer le code
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {!loading && promos.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun code promo créé</p>
        </div>
      )}

      <div className="space-y-3">
        {promos.map(p => (
          <div key={p.id} className={cn(
            "bg-white rounded-2xl border overflow-hidden shadow-sm transition-all",
            p.isActive ? "border-gray-200" : "border-gray-100 opacity-60"
          )}>
            <div className="flex items-center justify-between p-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  p.isActive ? "bg-emerald-100" : "bg-gray-100"
                )}>
                  <Tag className={cn("w-5 h-5", p.isActive ? "text-emerald-600" : "text-gray-400")} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="font-bold text-gray-900 text-sm">{p.code}</code>
                    <Badge variant={p.isActive ? "success" : "secondary"} className="text-[10px]">
                      {p.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{p.label}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="font-bold text-emerald-700 text-sm">
                    {p.discountType === "percent" ? `-${p.discountValue}%` : `-${formatPrice(p.discountValue)}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.usageCount} utilisé{p.usageCount > 1 ? "s" : ""}
                    {p.usageLimit ? ` / ${p.usageLimit}` : ""}
                  </p>
                </div>

                {p.expiresAt && (
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400">Expire le</p>
                    <p className="text-xs font-medium text-gray-700">
                      {format(new Date(p.expiresAt), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}

                <button onClick={() => toggleActive(p)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  title={p.isActive ? "Désactiver" : "Activer"}>
                  {p.isActive
                    ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                    : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                </button>

                <button onClick={() => deletePromo(p)}
                  className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile extras */}
            <div className="px-4 pb-3 sm:hidden flex gap-4 text-xs text-gray-500 border-t border-gray-50 pt-2">
              <span className="font-bold text-emerald-700">
                {p.discountType === "percent" ? `-${p.discountValue}%` : `-${formatPrice(p.discountValue)}`}
              </span>
              <span>{p.usageCount} utilisé{p.usageCount > 1 ? "s" : ""}{p.usageLimit ? ` / ${p.usageLimit}` : ""}</span>
              {p.expiresAt && <span>Expire {format(new Date(p.expiresAt), "d MMM yyyy", { locale: fr })}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
