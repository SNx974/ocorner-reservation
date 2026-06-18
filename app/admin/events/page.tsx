"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../admin-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Ticket, Plus, Copy, Check, Trash2, Users, Loader2, ChevronDown, ChevronUp, Power } from "lucide-react";

interface Booking {
  id: string; reference: string; clientName: string; clientEmail: string; clientPhone: string;
  playerCount: number | null; totalPrice: number; fullPaymentPaid: boolean; status: string;
}
interface EventItem {
  id: string; slug: string; title: string; description: string; price: number; priceNote: string | null;
  eventDate: string; capacity: number | null; imageUrl: string | null; accentColor: string | null;
  isActive: boolean; bookedSeats: number; bookingCount: number; reservations: Booking[];
}

const empty = { title: "", description: "", price: "", priceNote: "Déduit de la consommation à l'arrivée", eventDate: "", capacity: "", imageUrl: "", accentColor: "#c8f135" };

export default function AdminEventsPage() {
  const { token } = useAdmin();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await fetch("/api/admin/events", { headers: { "x-admin-token": token } });
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form.title || !form.eventDate || !form.price) { setError("Titre, date et prix requis"); return; }
    setCreating(true); setError("");
    const res = await fetch("/api/admin/events", {
      method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify(form),
    });
    setCreating(false);
    if (res.ok) { setForm(empty); load(); }
    else { const j = await res.json(); setError(j.error ?? "Erreur"); }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch("/api/admin/events", {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id, ...data }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    const res = await fetch("/api/admin/events", {
      method: "DELETE", headers: { "Content-Type": "application/json", "x-admin-token": token! },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { const j = await res.json(); alert(j.error ?? "Erreur"); return; }
    load();
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/event/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug); setTimeout(() => setCopied(""), 1800);
  }

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-5">
        <Ticket className="w-6 h-6 text-blue-600" /> Événements
      </h1>

      {/* Create form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <p className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Nouvel événement</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Titre *</label>
            <Input placeholder="Soirée CDM : France – Iran" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <textarea rows={2} placeholder="Réserve ta place pour avoir une table à coup sûr !" value={form.description}
              onChange={e => set("description", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Date & heure *</label>
            <Input type="datetime-local" value={form.eventDate} onChange={e => set("eventDate", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Prix / personne (€) *</label>
            <Input type="number" min="0" step="1" placeholder="20" value={form.price} onChange={e => set("price", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Places (vide = illimité)</label>
            <Input type="number" min="1" placeholder="ex: 4" value={form.capacity} onChange={e => set("capacity", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Couleur accent</label>
            <Input type="text" placeholder="#c8f135" value={form.accentColor} onChange={e => set("accentColor", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Note prix</label>
            <Input placeholder="Déduit de la consommation à l'arrivée" value={form.priceNote} onChange={e => set("priceNote", e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Image (URL, optionnel)</label>
            <Input placeholder="https://…" value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <Button onClick={create} disabled={creating} className="mt-3 gap-2 bg-blue-600 hover:bg-blue-700">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Créer l'événement
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">Aucun événement.</p>
      ) : (
        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-gray-900">{ev.title}</h2>
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold", ev.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                      {ev.isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 capitalize">{format(new Date(ev.eventDate), "EEEE d MMM yyyy 'à' HH'h'mm", { locale: fr })}</p>
                  <p className="text-sm text-gray-700 mt-1">
                    {formatPrice(ev.price)} / pers · <span className="font-semibold text-blue-700">{ev.bookedSeats} place(s) réservée(s)</span>
                    {ev.capacity != null && <span className="text-gray-400"> / {ev.capacity}</span>}
                    {" "}· {ev.bookingCount} résa
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs bg-gray-100 rounded px-2 py-1 text-gray-600 truncate max-w-[200px]">/event/{ev.slug}</code>
                    <button onClick={() => copyLink(ev.slug)} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                      {copied === ev.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === ev.slug ? "Copié" : "Copier le lien"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => patch(ev.id, { isActive: !ev.isActive })}
                    title={ev.isActive ? "Désactiver" : "Activer"}
                    className={cn("p-2 rounded-lg border", ev.isActive ? "border-amber-200 text-amber-600 hover:bg-amber-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50")}>
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(ev.id)} title="Supprimer"
                    className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Attendees */}
              <button onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-500 border-t border-gray-100 hover:bg-gray-50">
                <Users className="w-3.5 h-3.5" /> {ev.bookingCount} inscrit(s)
                {expanded === ev.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {expanded === ev.id && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {ev.reservations.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">Aucune inscription.</p>
                  ) : ev.reservations.map(b => (
                    <div key={b.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{b.clientName} · {b.playerCount ?? 1} pl.</p>
                        <p className="text-xs text-gray-500 truncate">{b.clientEmail} · {b.clientPhone} · {b.reference}</p>
                      </div>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", b.fullPaymentPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                        {b.fullPaymentPaid ? `${formatPrice(b.totalPrice)} ✓` : "En attente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
