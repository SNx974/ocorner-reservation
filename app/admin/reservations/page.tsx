"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "../layout";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatPrice, formatDate, formatDateTime, getStatusLabel, getStatusColor } from "@/lib/utils";
import {
  Search, CheckCircle, XCircle, Banknote, Phone, Mail,
  CreditCard, Loader2, ChevronDown, RefreshCw, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Reservation {
  id: string; reference: string; clientName: string; clientEmail: string;
  clientPhone: string; date: string; status: string; totalPrice: number;
  childrenCount: number; paymentType: string; depositAmount: number;
  depositPaid: boolean; fullPaymentPaid: boolean; notes?: string; adminNotes?: string; qrCode?: string;
  discountAmount?: number; basePrice?: number;
  formula: { name: string; category: string };
  timeSlot: { time: string };
}

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "deposit_pending", label: "Acompte en attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "cancelled", label: "Annulée" },
  { value: "expired", label: "Expirée" },
];

const badgeVariantMap: Record<string, "success" | "warning" | "destructive" | "secondary" | "info"> = {
  green: "success", yellow: "warning", orange: "warning",
  red: "destructive", gray: "secondary",
};

// ── Modal paiement manuel ──────────────────────────────────────────
function PaymentModal({
  r, token, onClose, onRefresh,
}: { r: Reservation; token: string; onClose: () => void; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  async function act(action: string) {
    setLoading(true);
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id: r.id, action, notes: note || undefined }),
    });
    setLoading(false);
    onRefresh();
    onClose();
  }

  const total = r.totalPrice;
  const deposit = r.depositAmount;
  const remaining = total - deposit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">💶 Règlement manuel</h2>
          <p className="text-sm text-gray-500 mt-0.5">{r.clientName} — {r.reference}</p>
        </div>

        <div className="p-5 space-y-3">
          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total dû</span>
              <span className="font-bold text-gray-900">{formatPrice(total)}</span>
            </div>
            {r.paymentType === "onsite_deposit" && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Acompte</span>
                  <span className={cn("font-semibold", r.depositPaid ? "text-green-600" : "text-amber-600")}>
                    {formatPrice(deposit)} {r.depositPaid ? "✅ reçu" : "⏳ en attente"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reste à payer</span>
                  <span className="font-bold text-gray-900">
                    {formatPrice(r.depositPaid ? remaining : total)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Statut paiement</span>
              <span className={cn("font-semibold text-xs px-2 py-0.5 rounded-full",
                r.fullPaymentPaid ? "bg-green-100 text-green-700" :
                r.depositPaid ? "bg-blue-100 text-blue-700" :
                "bg-amber-100 text-amber-700")}>
                {r.fullPaymentPaid ? "Payé intégralement" :
                  r.depositPaid ? "Acompte reçu" : "Non payé"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {!r.depositPaid && r.paymentType === "onsite_deposit" && (
              <button onClick={() => act("mark_deposit_paid")} disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all text-left">
                <Banknote className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900 text-sm">Marquer l'acompte reçu</p>
                  <p className="text-xs text-amber-700">{formatPrice(deposit)} encaissé sur place</p>
                </div>
              </button>
            )}
            {!r.fullPaymentPaid && (
              <button onClick={() => act("mark_fully_paid")} disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all text-left">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900 text-sm">Payé intégralement</p>
                  <p className="text-xs text-green-700">
                    {formatPrice(r.depositPaid ? remaining : total)} encaissé — règlement complet
                  </p>
                </div>
              </button>
            )}
            {r.fullPaymentPaid && (
              <div className="w-full flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50 text-left">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <p className="font-semibold text-green-800 text-sm">Paiement complet enregistré ✓</p>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Note interne (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Ex: payé en espèces, CB…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}

// ── Carte réservation ──────────────────────────────────────────────
function ReservationCard({ r, token, onRefresh }: { r: Reservation; token: string; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  async function action(act: string) {
    setLoading(true);
    await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ id: r.id, action: act }),
    });
    setLoading(false);
    onRefresh();
  }

  const statusColor = getStatusColor(r.status);
  const isCancelled = r.status === "cancelled" || r.status === "expired";
  const isConfirmed = r.status === "confirmed";

  const paymentLabel = r.paymentType === "online_full" ? "En ligne (complet)"
    : r.paymentType === "onsite_deposit" ? "Sur place + acompte"
    : "Tout sur place";

  return (
    <>
      {showPayModal && (
        <PaymentModal r={r} token={token}
          onClose={() => setShowPayModal(false)} onRefresh={onRefresh} />
      )}

      <div className={cn(
        "bg-white rounded-2xl border overflow-hidden mb-3 transition-all",
        isCancelled ? "border-gray-200 opacity-70" : "border-gray-200 shadow-sm"
      )}>
        {/* Header row */}
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(!expanded)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900">{r.clientName}</p>
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono hidden sm:inline">{r.reference}</code>
              <Badge variant={badgeVariantMap[statusColor] ?? "secondary"}>
                {getStatusLabel(r.status)}
              </Badge>
              {r.fullPaymentPaid && (
                <Badge variant="success" className="text-[10px]">💶 Payé</Badge>
              )}
              {r.depositPaid && !r.fullPaymentPaid && (
                <Badge variant="info" className="text-[10px]">Acompte ✓</Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {r.formula.name} · {formatDate(r.date)} {r.timeSlot.time} · {r.childrenCount} enfants
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <span className="font-bold text-emerald-600">{formatPrice(r.totalPrice)}</span>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", expanded && "rotate-180")} />
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-gray-100 p-4 space-y-4">
            {/* Contact row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <a href={`tel:${r.clientPhone}`}
                className="flex items-center gap-2 text-gray-700 hover:text-emerald-600">
                <Phone className="w-4 h-4 text-gray-400" />{r.clientPhone}
              </a>
              <a href={`mailto:${r.clientEmail}`}
                className="flex items-center gap-2 text-gray-700 hover:text-emerald-600 truncate">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />{r.clientEmail}
              </a>
              <div className="flex items-center gap-2 text-gray-700">
                <CreditCard className="w-4 h-4 text-gray-400" />{paymentLabel}
              </div>
            </div>

            {/* Payment status */}
            {r.paymentType === "onsite_deposit" && (
              <div className={cn("rounded-xl p-3 text-sm border",
                r.depositPaid ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-amber-50 border-amber-200 text-amber-800")}>
                {r.depositPaid
                  ? `✅ Acompte de ${formatPrice(r.depositAmount)} reçu`
                  : `⏳ Acompte de ${formatPrice(r.depositAmount)} en attente`}
                {r.fullPaymentPaid && " · 💶 Solde réglé"}
              </div>
            )}

            {r.discountAmount && r.discountAmount > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
                🎟️ Remise appliquée : -{formatPrice(r.discountAmount)}
                {r.basePrice && r.basePrice !== r.totalPrice && (
                  <span className="text-emerald-600 ml-1">(base {formatPrice(r.basePrice)})</span>
                )}
              </div>
            )}

            {r.notes && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">💬 <span className="font-medium">Note client :</span> {r.notes}</p>
            )}

            {r.adminNotes && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">🔒 <span className="font-medium">Note interne :</span> {r.adminNotes}</p>
            )}

            {r.qrCode && (
              <div className="flex items-center gap-3">
                <img src={r.qrCode} alt="QR" className="w-14 h-14 rounded-lg border" />
                <p className="text-xs text-gray-400">QR Code de réservation</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {/* Confirm */}
              {!isConfirmed && !isCancelled && (
                <Button size="sm" variant="success" onClick={() => action("confirm")} disabled={loading}>
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                  Confirmer
                </Button>
              )}

              {/* Payment button — always show if not fully paid */}
              {!r.fullPaymentPaid && (
                <Button size="sm" variant="warning" onClick={() => setShowPayModal(true)} disabled={loading}>
                  <Banknote className="w-3.5 h-3.5 mr-1" />
                  Règlement
                </Button>
              )}
              {r.fullPaymentPaid && (
                <Button size="sm" variant="outline" onClick={() => setShowPayModal(true)} disabled={loading}>
                  <Banknote className="w-3.5 h-3.5 mr-1" />
                  Paiement ✓
                </Button>
              )}

              {/* Cancel */}
              {!isCancelled && (
                <Button size="sm" variant="destructive" onClick={() => action("cancel")} disabled={loading}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Annuler
                </Button>
              )}

              {/* Reactivate */}
              {isCancelled && (
                <Button size="sm" variant="outline" onClick={() => action("reactivate")} disabled={loading}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Réactiver
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Page principale ────────────────────────────────────────────────
function ReservationsContent() {
  const { token } = useAdmin();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get("status") ?? "",
    date: "",
    search: "",
  });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.date) params.set("date", filters.date);
    params.set("page", page.toString());
    const res = await fetch(`/api/admin/reservations?${params}`, {
      headers: { "x-admin-token": token },
    });
    if (res.ok) {
      const data = await res.json();
      setReservations(data.reservations);
      setTotal(data.total);
    }
    setLoading(false);
  }, [token, filters, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = filters.search
    ? reservations.filter(r =>
        r.clientName.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.reference.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.clientPhone.includes(filters.search)
      )
    : reservations;

  if (!token) return <p className="p-6 text-gray-500">Veuillez vous connecter.</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-500 text-sm">{total} au total</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Nom, référence, téléphone..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-9" />
          </div>
          <select value={filters.status}
            onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring outline-none">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Input type="date" value={filters.date}
            onChange={e => { setFilters(f => ({ ...f, date: e.target.value })); setPage(1); }} />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>Aucune réservation trouvée</p>
        </div>
      )}

      <div>
        {filtered.map(r => (
          <ReservationCard key={r.id} r={r} token={token} onRefresh={load} />
        ))}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-3 mt-6">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
          <span className="flex items-center text-sm text-gray-600">Page {page} / {Math.ceil(total / 20)}</span>
          <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="animate-spin" /></div>}>
      <ReservationsContent />
    </Suspense>
  );
}
