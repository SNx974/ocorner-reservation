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
  CheckCircle, Info, Loader2,
} from "lucide-react";
import { cn, formatPrice, getCategoryLabel, birthdayTimeToHours } from "@/lib/utils";
import { ConsentCheckbox } from "@/components/legal/ConsentCheckbox";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Formula {
  id: string; name: string; category: string;
  includes: string; description?: string; pricePerChild: number; minChildren: number;
}

const categoryAccent: Record<string, { bg: string; border: string; badge: string; icon: string; btn: string }> = {
  marmaille:      { bg: "from-emerald-500 to-green-600",  border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800", icon: "🎡",    btn: "bg-emerald-600 hover:bg-emerald-700" },
  marmaille_foot: { bg: "from-purple-500 to-violet-600",  border: "border-purple-200",  badge: "bg-purple-100 text-purple-800",  icon: "⚽🎡",  btn: "bg-purple-600 hover:bg-purple-700" },
  foot:           { bg: "from-blue-500 to-sky-600",       border: "border-blue-200",    badge: "bg-blue-100 text-blue-800",     icon: "⚽",    btn: "bg-blue-600 hover:bg-blue-700" },
};

function FormulaDetailModal({
  formula, isSelected, onSelect, onClose,
}: { formula: Formula; isSelected: boolean; onSelect: (f: Formula) => void; onClose: () => void }) {
  const style = categoryAccent[formula.category] ?? categoryAccent.marmaille;

  function handleSelect() {
    onSelect(formula);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Gradient header */}
        <div className={cn("bg-gradient-to-br p-6 text-white relative", style.bg)}>
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="text-4xl mb-2">{style.icon}</div>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", style.badge)}>
            {getCategoryLabel(formula.category)}
          </span>
          <h2 className="text-xl font-bold mt-2 leading-tight">{formula.name}</h2>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-extrabold">{formatPrice(formula.pricePerChild)}</span>
            <span className="text-white/80 text-sm">/ enfant</span>
          </div>
          <p className="text-white/70 text-xs mt-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Minimum {formula.minChildren} enfants
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Includes summary */}
          {formula.includes && (
            <div className={cn("rounded-xl border p-4", style.border, "bg-gray-50")}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">✨ Ce qui est inclus</p>
              <p className="text-sm text-gray-700 leading-relaxed">{formula.includes}</p>
            </div>
          )}

          {/* Full description */}
          {formula.description ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Description de la formule
              </p>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {formula.description}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm italic">
              Contactez-nous pour plus d'informations sur cette formule.
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {isSelected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm font-semibold py-2">
                <CheckCircle className="w-5 h-5" /> Formule déjà sélectionnée
              </div>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-100 transition-all text-sm">
                Fermer
              </button>
            </div>
          ) : (
            <button onClick={handleSelect}
              className={cn(
                "w-full py-3.5 rounded-xl text-white font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98]",
                style.btn
              )}>
              Choisir cette formule
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
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
  const [previewFormula, setPreviewFormula] = useState<Formula | null>(null);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<Array<{ id: string; time: string }>>([]);
  const [footAvail, setFootAvail] = useState<Array<{ id: string; hour: number; minute: number; availableCourts: number[] }>>([]);
  const [footSlotId, setFootSlotId] = useState("");
  const [footCourt, setFootCourt] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    fetch("/api/formulas").then(r => r.json()).then(setFormulas);
    fetch("/api/timeslots").then(r => r.json()).then(setTimeSlots).catch(() => {});
    fetch("/api/closed-dates?type=birthday").then(r => r.json()).then((data: Array<{ date: string }>) => {
      setClosedDates(data.map(d => d.date));
    }).catch(() => {});
  }, []);

  const set = (key: keyof typeof INITIAL, value: unknown) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const selectedFormula = formulas.find(f => f.id === form.formulaId);
  const baseTotal = selectedFormula ? selectedFormula.pricePerChild * form.childrenCount : 0;
  const total = promoResult ? promoResult.finalTotal : baseTotal;

  // Birthday-foot: the party includes 1h of foot the client must pick
  const isFoot = !!selectedFormula && (
    ["foot", "marmaille_foot"].includes(selectedFormula.category) ||
    selectedFormula.name.toLowerCase().includes("foot")
  );
  const partyTime = timeSlots.find(t => t.id === form.timeSlotId)?.time ?? "";
  const partyHours = birthdayTimeToHours(partyTime);

  useEffect(() => {
    if (!isFoot || !form.date || !form.timeSlotId) { setFootAvail([]); setFootSlotId(""); setFootCourt(null); return; }
    fetch(`/api/futsal/availability?date=${form.date}`)
      .then(r => r.json())
      .then(d => {
        const slots = Array.isArray(d?.slots) ? d.slots : [];
        setFootAvail(slots.filter((s: { hour: number; availableCourts: number[] }) => partyHours.includes(s.hour) && s.availableCourts.length > 0));
      })
      .catch(() => setFootAvail([]));
    setFootSlotId(""); setFootCourt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFoot, form.date, form.timeSlotId, partyTime]);

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
      // Foot formulas: require picking the 1h foot session when slots are available
      if (isFoot && form.timeSlotId && footAvail.length > 0 && (!footSlotId || !footCourt))
        e.footSlot = "Choisissez votre session foot (1h offerte)";
    }
    if (step === 2) {
      if (form.childrenCount < (selectedFormula?.minChildren ?? 1))
        e.childrenCount = `Minimum ${selectedFormula?.minChildren} enfants`;
      if (form.clientName.trim().length < 2) e.clientName = "Nom requis (min. 2 caractères)";
      if (!form.clientEmail.includes("@")) e.clientEmail = "Email invalide";
      if (form.clientPhone.trim().length < 8) e.clientPhone = "Téléphone invalide";
      if (!consent) e.consent = "Vous devez accepter les conditions générales de vente";
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
        footSlot: isFoot && footSlotId && footCourt
          ? { futsalTimeSlotId: footSlotId, courtNumber: footCourt }
          : undefined,
      };

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? `Erreur serveur (${res.status})`);

      if (json.checkoutUrl) {
        // Real Stripe: redirect to the hosted Checkout page
        window.location.href = json.checkoutUrl;
        return;
      }

      setReservationResult(json.reservation);

      if (json.clientSecret) {
        setClientSecret(json.clientSecret);
      } else {
        // confirmation directe (ne devrait pas arriver normalement)
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
      {/* Formula detail modal */}
      {previewFormula && (
        <FormulaDetailModal
          formula={previewFormula}
          isSelected={form.formulaId === previewFormula.id}
          onSelect={f => {
            set("formulaId", f.id);
            set("childrenCount", Math.max(form.childrenCount, f.minChildren));
          }}
          onClose={() => setPreviewFormula(null)}
        />
      )}

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0",
                i < step ? "bg-[#1bbfa8] text-white" :
                i === step ? "bg-[#1bbfa8] text-white ring-4 ring-[#1bbfa8]/30" :
                "bg-white/20 text-white/40"
              )}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-1 flex-1 mx-1 rounded transition-all",
                  i < step ? "bg-[#1bbfa8]" : "bg-white/20")} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-white/50 mt-1">
          {STEPS.map((s, i) => (
            <span key={s} className={cn(i === step && "text-[#1bbfa8] font-semibold")}
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
            <h2 className="text-2xl font-bold text-white">Choisissez votre formule</h2>
            <p className="text-white/60 text-sm mt-1">Sélectionnez la formule adaptée à votre groupe</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c.key} type="button" onClick={() => setCategoryFilter(c.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                  categoryFilter === c.key
                    ? "bg-[#1bbfa8] text-white border-[#1bbfa8]"
                    : "bg-white/10 text-white border-white/20 hover:border-[#1bbfa8]"
                )}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredFormulas.map(f => (
              <FormulaCard key={f.id} formula={f}
                selected={form.formulaId === f.id}
                onPreview={setPreviewFormula} />
            ))}
          </div>
          {errors.formulaId && (
            <p className="text-red-500 text-sm flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />{errors.formulaId}
            </p>
          )}

          {/* Spacer so sticky bar doesn't overlap last card */}
          {form.formulaId && <div className="h-24" />}
        </div>
      )}

      {/* ── Sticky formula CTA (step 0 only) ── */}
      {step === 0 && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out",
          form.formulaId
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
        )}>
          <div className="bg-[#0d1f3c] border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/50 leading-none mb-0.5">Formule sélectionnée</p>
              <p className="font-bold text-white truncate text-sm">{selectedFormula?.name}</p>
              <p className="text-xs text-[#1bbfa8] font-semibold">
                {selectedFormula ? formatPrice(selectedFormula.pricePerChild) + " / enfant" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={goNext}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-5 py-3.5 rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 text-sm">
              Choisir une date
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1 : Planning ── */}
      {step === 1 && (
        <div className="animate-fade-in space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Choisissez votre date</h2>
            <p className="text-white/60 text-sm mt-1">
              Formule : <span className="text-[#1bbfa8] font-semibold">{selectedFormula?.name}</span>
            </p>
          </div>

          <MonthCalendar
            selectedDate={form.date}
            selectedSlotId={form.timeSlotId}
            onSelectDate={d => { set("date", d); set("timeSlotId", ""); }}
            onSelectSlot={id => set("timeSlotId", id)}
            closedDates={closedDates}
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
            <div className="bg-[#1bbfa8]/20 border border-[#1bbfa8]/40 rounded-xl p-3 text-sm text-[#c8f135] font-medium">
              ✅ {format(new Date(form.date + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })}
            </div>
          )}

          {/* Foot session (1h offered) — client picks a free slot */}
          {isFoot && form.date && form.timeSlotId && (
            <div className="rounded-2xl border border-[#1bbfa8]/40 bg-[#1bbfa8]/10 p-4">
              <p className="text-sm font-bold text-[#1bbfa8] mb-1 flex items-center gap-1.5">🎁 Session foot — 1h offerte</p>
              <p className="text-[12px] text-white/60 mb-3">Votre formule inclut 1h de foot. Choisissez un créneau disponible pendant votre anniversaire.</p>
              {footAvail.length === 0 ? (
                <p className="text-[12px] text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">
                  ⚠️ Aucun terrain de foot disponible sur ce créneau. Choisissez une autre date/heure ou contactez-nous — l'anniversaire reste réservable.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {footAvail.flatMap(slot =>
                    slot.availableCourts.map(c => {
                      const selected = footSlotId === slot.id && footCourt === c;
                      return (
                        <button key={`${slot.id}-${c}`} type="button"
                          onClick={() => { setFootSlotId(slot.id); setFootCourt(c); }}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all",
                            selected ? "border-[#1bbfa8] bg-[#1bbfa8] text-white" : "border-white/20 text-white/80 hover:border-[#1bbfa8]/60")}>
                          {selected ? "✓ " : ""}{slot.hour}h · Terrain {c}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
              {errors.footSlot && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{errors.footSlot}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(0)} className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
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
            <h2 className="text-2xl font-bold text-white">Vos informations</h2>
            {form.date && (
              <p className="text-white/60 text-sm mt-1">
                {selectedFormula?.name} —{" "}
                {format(new Date(form.date + "T12:00:00"), "d MMMM yyyy", { locale: fr })}
              </p>
            )}
          </div>

          {/* Children counter */}
          <div className="bg-white/10 rounded-2xl p-4">
            <label className="block text-sm font-semibold text-white mb-3">
              <Users className="w-4 h-4 inline mr-1" />
              Nombre d'enfants
              {selectedFormula && <span className="text-white/50 font-normal"> (min. {selectedFormula.minChildren})</span>}
            </label>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => set("childrenCount", Math.max(1, form.childrenCount - 1))}
                className="w-12 h-12 rounded-xl border-2 border-white/30 flex items-center justify-center text-2xl font-bold hover:border-[#1bbfa8] transition-colors bg-white/10 text-white">
                −
              </button>
              <div className="w-16 h-12 text-center text-2xl font-bold rounded-xl border-2 border-white/30 flex items-center justify-center bg-white/10 text-white">
                {form.childrenCount}
              </div>
              <button type="button"
                onClick={() => set("childrenCount", form.childrenCount + 1)}
                className="w-12 h-12 rounded-xl border-2 border-white/30 flex items-center justify-center text-2xl font-bold hover:border-[#1bbfa8] transition-colors bg-white/10 text-white">
                +
              </button>
              {selectedFormula && (
                <div className="ml-1">
                  <p className="text-2xl font-extrabold text-[#c8f135]">{formatPrice(total)}</p>
                  <p className="text-xs text-white/50">{formatPrice(selectedFormula.pricePerChild)} × {form.childrenCount}</p>
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
            <h3 className="font-semibold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#1bbfa8]" /> Coordonnées
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Nom complet *</label>
                <Input placeholder="Jean Dupont" value={form.clientName}
                  onChange={e => set("clientName", e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#1bbfa8]" />
                {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />Téléphone *
                </label>
                <Input type="tel" placeholder="0692 XX XX XX" value={form.clientPhone}
                  onChange={e => set("clientPhone", e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#1bbfa8]" />
                {errors.clientPhone && <p className="text-red-500 text-xs mt-1">{errors.clientPhone}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />Email *
                </label>
                <Input type="email" placeholder="jean.dupont@email.com" value={form.clientEmail}
                  onChange={e => set("clientEmail", e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#1bbfa8]" />
                {errors.clientEmail && <p className="text-red-500 text-xs mt-1">{errors.clientEmail}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1.5">Notes (optionnel)</label>
                <textarea rows={2} placeholder="Allergie, demande spéciale..."
                  value={form.notes} onChange={e => set("notes", e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/40 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1bbfa8] resize-none" />
              </div>
            </div>
          </div>

          {selectedFormula && !childrenError && (
            <PriceSummary formulaName={selectedFormula.name}
              pricePerChild={selectedFormula.pricePerChild}
              childrenCount={form.childrenCount}
              paymentType={form.paymentType}
              discountAmount={promoResult?.discountAmount} />
          )}

          <ConsentCheckbox checked={consent} onChange={setConsent} error={errors.consent} dark />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
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
          <h2 className="text-2xl font-bold text-white mb-4">Mode de paiement</h2>

          {/* 🛒 Récapitulatif panier */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 mb-4">
            <p className="text-sm font-bold text-[#c8f135] mb-2 flex items-center gap-1.5">🛒 Votre panier</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-white/50 shrink-0">Formule</span>
                <span className="font-semibold text-white text-right">{selectedFormula.name}</span>
              </div>
              {form.date && (
                <div className="flex justify-between gap-3">
                  <span className="text-white/50 shrink-0">Date</span>
                  <span className="font-semibold text-white text-right capitalize">
                    {format(new Date(form.date + "T12:00:00"), "EEEE d MMMM yyyy", { locale: fr })}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-white/50 shrink-0">Enfants</span>
                <span className="font-semibold text-white">{form.childrenCount}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-white/10 pt-1.5">
                <span className="text-white/70 font-semibold">Total</span>
                <span className="text-lg font-extrabold text-[#c8f135]">{formatPrice(total)}</span>
              </div>
            </div>
            {selectedFormula && (["foot", "marmaille_foot"].includes(selectedFormula.category) || selectedFormula.name.toLowerCase().includes("foot")) && (
              <p className="mt-2 text-[12px] text-[#1bbfa8] bg-[#1bbfa8]/10 rounded-lg px-3 py-2">
                🎁 1h de foot incluse — un terrain vous est réservé automatiquement avec votre anniversaire.
              </p>
            )}
          </div>

          {/* Promo code */}
          {!reservationResult && (
            <div className="bg-white/10 rounded-2xl p-4 mb-4">
              <label className="block text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#1bbfa8]" /> Code promo
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
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-[#1bbfa8]" />
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

          {/* 100% promo — bypass payment entirely */}
          {total === 0 && promoResult ? (
            <div className="space-y-4">
              <div className="bg-white/10 rounded-2xl p-5 text-center">
                <div className="w-14 h-14 rounded-full bg-[#1bbfa8]/20 flex items-center justify-center mx-auto mb-3">
                  <Tag className="w-7 h-7 text-[#1bbfa8]" />
                </div>
                <p className="text-xl font-bold text-white mb-1">Réservation gratuite ! 🎉</p>
                <p className="text-white/60 text-sm">Le code <strong className="text-[#1bbfa8]">{promoResult.code}</strong> couvre 100% du montant.</p>
                <p className="text-2xl font-extrabold text-[#c8f135] mt-3">0 €</p>
              </div>
              {!reservationResult && (
                <Button size="lg" className="w-full bg-[#1bbfa8] hover:bg-[#1bbfa8]/90 text-white font-bold"
                  onClick={submitReservation} disabled={loading}>
                  {loading
                    ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Confirmation...</>
                    : <><CheckCircle className="w-5 h-5 mr-2" /> Confirmer gratuitement</>}
                </Button>
              )}
            </div>
          ) : (
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
              totalOverride={promoResult ? promoResult.finalTotal : undefined}
            />
          )}

          {!reservationResult && (
            <div className="mt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
