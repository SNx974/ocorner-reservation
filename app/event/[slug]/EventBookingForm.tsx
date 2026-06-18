"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { Loader2, AlertCircle } from "lucide-react";

export function EventBookingForm({ slug, unitPrice, maxSeats, accent }: {
  slug: string; unitPrice: number; maxSeats: number; accent: string;
}) {
  const [seats, setSeats] = useState(1);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = unitPrice * seats;
  const cap = Math.max(1, Math.min(maxSeats, 50));

  async function submit() {
    if (clientName.trim().length < 2) { setError("Nom complet requis"); return; }
    if (!clientEmail.includes("@")) { setError("Email invalide"); return; }
    if (clientPhone.trim().length < 6) { setError("Téléphone invalide"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/events/book", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, clientName: clientName.trim(), clientEmail: clientEmail.trim(), clientPhone: clientPhone.trim(), seats }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      window.location.href = json.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Seats */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Nombre de personnes</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSeats(s => Math.max(1, s - 1))}
            className="w-11 h-11 rounded-xl border-2 border-white/20 text-xl font-bold hover:border-white/40">−</button>
          <div className="w-14 h-11 flex items-center justify-center text-2xl font-bold border-2 border-white/20 rounded-xl">{seats}</div>
          <button type="button" onClick={() => setSeats(s => Math.min(cap, s + 1))}
            className="w-11 h-11 rounded-xl border-2 border-white/20 text-xl font-bold hover:border-white/40">+</button>
          <div className="ml-auto text-right">
            <p className="text-2xl font-extrabold" style={{ color: accent }}>{formatPrice(total)}</p>
            <p className="text-xs text-white/40">{seats} × {formatPrice(unitPrice)}</p>
          </div>
        </div>
      </div>

      <Input placeholder="Nom et prénom" value={clientName} onChange={e => setClientName(e.target.value)}
        className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
      <Input type="email" placeholder="Adresse email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
        className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
      <Input type="tel" placeholder="Numéro de téléphone" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
        className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />

      {error && (
        <p className="text-red-400 text-sm flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{error}</p>
      )}

      <Button type="button" size="lg" className="w-full font-bold" onClick={submit} disabled={loading}
        style={{ background: accent, color: "#0a1628" }}>
        {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Redirection…</> : <>Réserver ma place — {formatPrice(total)}</>}
      </Button>
      <p className="text-center text-white/40 text-xs">Paiement sécurisé via Stripe</p>
    </div>
  );
}
