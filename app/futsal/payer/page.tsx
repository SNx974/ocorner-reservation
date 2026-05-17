"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Search, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FutsalPayerPage() {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function search() {
    if (!reference.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/futsal/reservations?reference=${reference.trim().toUpperCase()}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Réservation introuvable"); return; }
      if (json.type !== "futsal") { setError("Cette référence n'est pas une réservation futsal"); return; }
      // Redirect to share page
      router.push(`/partage/${json.shareToken}`);
    } catch {
      setError("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/futsal" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-white font-bold text-xl">Je paye ma place</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">💳</div>
            <h2 className="text-xl font-bold text-gray-900">Rejoindre un groupe</h2>
            <p className="text-gray-500 text-sm mt-1">
              Entrez la référence que votre capitaine vous a communiquée
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Référence de réservation</label>
              <Input
                placeholder="ex: FUT-2024-ABCD"
                value={reference}
                onChange={e => { setReference(e.target.value.toUpperCase()); setError(null); }}
                onKeyDown={e => e.key === "Enter" && search()}
                className="text-center font-mono text-lg uppercase tracking-wider"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={search} disabled={loading || !reference.trim()}>
              {loading ? "Recherche..." : <><Search className="w-4 h-4 mr-2" />Accéder à la réservation</>}
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Vous pouvez aussi utiliser le lien que votre capitaine vous a envoyé directement
          </p>
        </div>
      </div>
    </div>
  );
}
