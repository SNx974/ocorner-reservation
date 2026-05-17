"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormulaCard } from "./FormulaCard";
import { PriceSummary } from "./PriceSummary";
import { PaymentSection } from "./PaymentSection";
import { ConfirmationPage } from "./ConfirmationPage";
import { MonthCalendar } from "./MonthCalendar";
import {
  ChevronLeft, ChevronRight, Users, User, Mail, Phone, AlertCircle, Tag, X,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Formula {
  id: string; name: string; category: string;
  includes: string; pricePerChild: number; minChildren: number;
}

const STEPS = ["Formule", "Planning", "Contact", "Paiement"];

const INITIAL = {
  formulaId: "",
  date: "",
  timeSlotId: "",
  childrenCount: 6,
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  notes: "",
  paymentType: "online_full" as "online_full" | "onsite_deposit",
  depositPaymentMethod: undefined as "online" | "onsite" | undefined,
};

export function BookingForm() {
  const [step, setStep] = useState(0);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reservationResult, setReservationResult] = useState<Record<string, unknown> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{
    valid: boolean; promoCodeId: string; code: string; label: string;
    discountType: string; discountValue: number; discountAmount: number; finalTotal: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/formulas").then(r => r.json()).then(setFormulas);
  }, []);

  const set = (key: keyof typeof INITIAL, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const selectedFormula = formulas.find(f => f.id === form.formulaId);
  const baseTotal = selectedFormula ? selectedFormula.pricePerChild * form.childrenCount : 0;
  const total = promoResult ? promoResult.finalTotal : baseTotal;

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), total: baseTotal }),
      });
      const json = await res.json();
      if (!res.ok) { setPromoError(json.error ?? "Code invalide"); }
      else { setPromoResult(json); }
    } catch { setPromoError("Erreur lors de la validation"); }
    finally { setPromoLoading(false); }
  }

  function removePromo() {
    setPromoResult(null);
    setPromoCode("");
    setPromoError(null);
  }
  const childrenError = selectedFormula && form.childrenCount < selectedFormula.minChildren
    ? `Minimum ${selectedFormula.minChildren} enfants requis`
    : null;

  const categories = [
    { key: "all", label: "Toutes" },
    { key: "marmaille", label: "🎡 Marmaille" },
    { key: "marmaille_foot", label: "⚽🎡 Marmaille + Foot" },
    { key: "foot", label: "⚽ Foot" },
  ];
  const filteredFormulas = categoryFilter === "all"
    ? formulas : formulas.filter(f => f.category === categoryFilter);

  function goNext() {
    const e: Record<string, string> = {};
    if (step === 0 && !form.formulaId) e.formulaId = "Veuillez choisir une formule";
    if (step === 1) {
      if (!form.date) e.date = "Veuillez choisir une date";
      if (!form.timeSlotId) e.timeSlotId = "Veuillez choisir un créneau";
    }
    if (step === 2) {
      if (form.childrenCount < (selectedFormula?.minChildren ?? 1))
        e.childrenCount = `Minimum ${selectedFormula?.minChildren} enfants`;
      if (form.clientName.trim().length < 2) e.clientName = "Nom requis (min. 2 caractères)";
      if (!form.clientEmail.includes("@")) e.clientEmail = "Email invalide";
      if (form.clientPhone.trim().length < 8) e.clientPhone = "Téléphone invalide";
    }
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitReservation() {
    setLoading(true);
    setApiError(null);
    try {
      const payload = {
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientPhone: form.clientPhone.trim(),
        formulaId: form.formulaId,
        timeSlotId: form.timeSlotId,
        date: form.date,
        childrenCount: Number(form.childrenCount),
        paymentType: form.paymentType,
        depositPaymentMethod: form.depositPaymentMethod,
        notes: form.notes.trim() || undefined,
        promoCodeId: promoResult?.promoCodeId,
        discountAmount: promoResult?.discountAmount,
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? `Erreur serveur (${res.status})`);

      setReservationResult(json.reservation);

      if (json.clientSecret) {
        setClientSecret(json.clientSecret);
      } else {
        // onsite_full or onsite_deposit+pay onsite → confirmation directe
        setConfirmed(true);
      }
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Erreur inattendue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmed && reservationResult) {
    return <ConfirmationPage reservation={reservationResult} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0",
                i < step ? "bg-emerald-500 text-white" :
                i === step ? "bg-emerald-600 text-white ring-4 ring-emerald-200" :
                "bg-gray-200 text-gray-500"
              )}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-1 flex-1 mx-1 rounded transition-all",
                  i < step ? "bg-emerald-500" : "bg-gray-200")} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          {STEPS.map((s, i) => (
            <span key={s} className={cn(i === step && "text-emerald-700 font-semibold")}
              style={{ width: `${100 / STEPS.length}%`, textAlign: "center" }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── STEP 0 : Formule ── */}
      {step === 0 && (
        <div className="animate-fade-in space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Choisissez votre formule</h2>
            <p className="text-gray-500 text-sm mt-1">Sélectionnez la formule adaptée à votre groupe</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c.key} type="button" onClick={() => setCategoryFilter(c.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  categoryFilter === c.key
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400"
                )}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredFormulas.map(f => (
              <FormulaCard key={f.id} formula={f}
                selected={form.formulaId === f.id}
                onSelect={f => {
                  set("formulaId", f.id);
                  set("childrenCount", Math.max(form.childrenCount, f.minChildren));
                }} />
            ))}
          </div>
          {errors.formulaId && (
            <p className="text-red-500 text-sm flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />{errors.formulaId}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" size="lg" onClick={goNext}>
              Choisir une date <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1 : Planning ── */}
      {step === 1 && (
        <div className="animate-fade-in space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Choisissez votre date</h2>
            <p className="text-gray-500 text-sm mt-1">
              Formule : <span className="text-emerald-700 font-semibold">{selectedFormula?.name}</span>
            </p>
          </div>

          <MonthCalendar
            selectedDate={form.date}
            selectedSlotId={form.timeSlotId}
            onSelectDate={d => { set("date", d); set("timeSlotId", ""); }}
            onSelectSlot={id => set("timeSlotId", id)}
          />

          {errors.date && (
            <p className="text-red-500 text-sm flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />{errors.date}
            </p>
          )}
          {errors.timeSlotId && (
            <p className="text-red-500 text-sm flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />{errors.timeSlotId}
            </p>
          )}

          {form.date && form.timeSlotId && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 font-medium">
              ✅ {format(new Date(form.date + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
            <Button type="button" size="lg" className="flex-1" onClick={goNext}>
              Mes informations <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2 : Contact ── */}
      {step === 2 && (
        <div className="animate-fade-in space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vos informations</h2>
            {form.date && (
              <p className="text-gray-500 text-sm mt-1">
                {selectedFormula?.name} —{" "}
                {format(new Date(form.date + "T12:00:00"), "d MMMM yyyy", { locale: fr })}
              </p>
            )}
          </div>

          {/* Children counter */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              <Users className="w-4 h-4 inline mr-1" />
              Nombre d'enfants
              {selectedFormula && <span className="text-gray-400 font-normal"> (min. {selectedFormula.minChildren})</span>}
            </label>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => set("childrenCount", Math.max(1, form.childrenCount - 1))}
                className="w-12 h-12 rounded-xl border-2 border-gray-300 flex items-center justify-center text-2xl font-bold hover:border-emerald-500 transition-colors bg-white">
                −
              </button>
              <div className="w-16 h-12 text-center text-2xl font-bold rounded-xl border-2 border-gray-300 flex items-center justify-center bg-white">
                {form.childrenCount}
              </div>
              <button type="button"
                onClick={() => set("childrenCount", form.childrenCount + 1)}
                className="w-12 h-12 rounded-xl border-2 border-gray-300 flex items-center justify-center text-2xl font-bold hover:border-emerald-500 transition-colors bg-white">
                +
              </button>
              {selectedFormula && (
                <div className="ml-1">
                  <p className="text-2xl font-extrabold text-emerald-600">{formatPrice(total)}</p>
                  <p className="text-xs text-gray-400">{formatPrice(selectedFormula.pricePerChild)} × {form.childrenCount}</p>
                </div>
              )}
            </div>
            {(childrenError || errors.childrenCount) && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />{childrenError ?? errors.childrenCount}
              </p>
            )}
          </div>

          {/* Contact fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" /> Coordonnées
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
                <Input placeholder="Jean Dupont" value={form.clientName}
                  onChange={e => set("clientName", e.target.value)} />
                {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />Téléphone *
                </label>
                <Input type="tel" placeholder="0692 XX XX XX" value={form.clientPhone}
                  onChange={e => set("clientPhone", e.target.value)} />
                {errors.clientPhone && <p className="text-red-500 text-xs mt-1">{errors.clientPhone}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />Email *
                </label>
                <Input type="email" placeholder="jean.dupont@email.com" value={form.clientEmail}
                  onChange={e => set("clientEmail", e.target.value)} />
                {errors.clientEmail && <p className="text-red-500 text-xs mt-1">{errors.clientEmail}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optionnel)</label>
                <textarea rows={2} placeholder="Allergie, demande spéciale..."
                  value={form.notes} onChange={e => set("notes", e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
              </div>
            </div>
          </div>

          {selectedFormula && !childrenError && (
            <PriceSummary formulaName={selectedFormula.name}
              pricePerChild={selectedFormula.pricePerChild}
              childrenCount={form.childrenCount}
              paymentType={form.paymentType} />
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
            <Button type="button" size="lg" className="flex-1" onClick={goNext}>
              Paiement <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Paiement ── */}
      {step === 3 && selectedFormula && (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mode de paiement</h2>

          {/* Promo code */}
          {!reservationResult && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" /> Code promo
              </label>
              {promoResult ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-800 text-sm">{promoResult.code} — {promoResult.label}</p>
                    <p className="text-xs text-emerald-600">
                      -{promoResult.discountType === "percent"
                        ? `${promoResult.discountValue}%`
                        : formatPrice(promoResult.discountValue)} appliqué
                    </p>
                  </div>
                  <button type="button" onClick={removePromo} className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Code promo" value={promoCode}
                    onChange={e => { setPromoCode(e.target.value); setPromoError(null); }}
                    onKeyDown={e => e.key === "Enter" && validatePromo()}
                    className="flex-1" />
                  <button type="button" onClick={validatePromo} disabled={promoLoading || !promoCode.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {promoLoading ? "..." : "Appliquer"}
                  </button>
                </div>
              )}
              {promoError && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{promoError}
                </p>
              )}
            </div>
          )}

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{apiError}</p>
            </div>
          )}

          <PaymentSection
            formula={selectedFormula}
            childrenCount={form.childrenCount}
            paymentType={form.paymentType}
            depositPaymentMethod={form.depositPaymentMethod}
            onPaymentTypeChange={(v: "online_full" | "onsite_deposit") => set("paymentType", v)}
            onDepositMethodChange={v => set("depositPaymentMethod", v)}
            clientSecret={clientSecret}
            onPaymentSuccess={() => setConfirmed(true)}
            reservation={reservationResult}
            loading={loading}
            onSubmit={submitReservation}
          />

          {!reservationResult && (
            <div className="mt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
