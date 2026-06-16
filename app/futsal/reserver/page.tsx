"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, ChevronRight, Users, Mail, Phone, AlertCircle,
  Calendar, Clock, Tag, X, Share2, Copy, CheckCircle,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

const STEPS = ["Créneau", "Contact", "Paiement"];

interface FutsalSlot {
  id: string; hour: number; minute: number; label: string;
  totalCourts: number; availableCourts: number[]; available: boolean;
}

interface CartItem {
  slotId: string; court: number; hour: number; minute: number; label: string; price: number;
}

interface ScheduleInfo {
  isVacation: boolean;
  vacationLabel: string | null;
  startHour: number;
  endHour: number;
  closed?: boolean;
}

interface PromoResult {
  valid: boolean; promoCodeId: string; code: string; label: string;
  discountType: string; discountValue: number; discountAmount: number; finalTotal: number;
}

// Simple month calendar for futsal
function FutsalCalendar({ selected, onSelect, closedDates }: { selected: string; onSelect: (d: string) => void; closedDates: string[] }) {
  const [month, setMonth] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1);
  const lastDay = new Date(year, mo + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();

  function fmt(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setMonth(new Date(year, mo - 1))}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-gray-900 capitalize">
          {format(month, "MMMM yyyy", { locale: fr })}
        </span>
        <button type="button" onClick={() => setMonth(new Date(year, mo + 1))}
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Lu","Ma","Me","Je","Ve","Sa","Di"].map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const d = new Date(year, mo, day);
          d.setHours(0, 0, 0, 0);
          const dateStr = fmt(d);
          const isPast = d < today;
          const isClosed = closedDates.includes(dateStr);
          const isDisabled = isPast || isClosed;
          const isSelected = dateStr === selected;
          return (
            <button type="button" key={i} disabled={isDisabled}
              onClick={() => onSelect(dateStr)}
              title={isClosed ? "Jour fermé" : undefined}
              className={cn(
                "h-9 w-full rounded-lg text-sm font-medium transition-all",
                isPast ? "text-gray-200 cursor-not-allowed" :
                isClosed ? "bg-red-50 text-red-300 cursor-not-allowed line-through" :
                isSelected ? "bg-blue-600 text-white" :
                "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              )}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FutsalReserverPage() {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<FutsalSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [playerCount, setPlayerCount] = useState(10);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentType, setPaymentType] = useState<"online_full" | "onsite_deposit">("online_full");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reservation: Record<string, unknown>; clientSecret?: string; demoMode?: boolean; checkoutUrl?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [courtPrice, setCourtPrice] = useState(110);
  const [offpeakPrice, setOffpeakPrice] = useState(90);
  const [peakPrice, setPeakPrice] = useState(110);
  const [peakHour, setPeakHour] = useState(17);
  const [minPlayers, setMinPlayers] = useState(10);
  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);

  useEffect(() => {
    fetch("/api/closed-dates?type=futsal").then(r => r.json()).then((data: Array<{ date: string }>) => {
      setClosedDates(data.map(d => d.date));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/futsal/settings").then(r => r.json()).then((data: Record<string, string>) => {
      const cp = data.futsal_court_price ?? data.futsal_price_per_player;
      if (cp) setCourtPrice(parseFloat(cp));
      if (data.futsal_price_offpeak) setOffpeakPrice(parseFloat(data.futsal_price_offpeak));
      if (data.futsal_price_peak) {
        setPeakPrice(parseFloat(data.futsal_price_peak));
        setCourtPrice(parseFloat(data.futsal_price_peak)); // default to peak
      }
      if (data.futsal_price_peak_from) setPeakHour(parseInt(data.futsal_price_peak_from));
      if (data.futsal_min_players) setMinPlayers(parseInt(data.futsal_min_players));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!date) { setSlots([]); setScheduleInfo(null); return; }
    setSlotsLoading(true);
    fetch(`/api/futsal/availability?date=${date}`)
      .then(r => r.json())
      .then(data => {
        if (data.slots) {
          setSlots(data.slots);
          setScheduleInfo(data.schedule ?? null);
        } else {
          // backward compat if array
          setSlots(Array.isArray(data) ? data : []);
        }
      })
      .finally(() => setSlotsLoading(false));
  }, [date]);

  // Time-based pricing per slot
  const slotUnitPrice = (hour: number) => (hour >= peakHour ? peakPrice : offpeakPrice);
  const baseTotal = cart.reduce((sum, it) => sum + it.price, 0);
  const total = promoResult ? promoResult.finalTotal : baseTotal;
  const pricePerPlayer = playerCount > 0 ? total / playerCount : 0;
  const depositAmount = Math.max(30, total * 0.3);
  const sortedCart = [...cart].sort((a, b) => a.hour - b.hour || a.minute - b.minute || a.court - b.court);
  const inCart = (slotId: string, court: number) => cart.some(i => i.slotId === slotId && i.court === court);

  function toggleCartItem(slot: FutsalSlot, court: number) {
    setCart(prev => {
      const exists = prev.some(i => i.slotId === slot.id && i.court === court);
      if (exists) return prev.filter(i => !(i.slotId === slot.id && i.court === court));
      return [...prev, { slotId: slot.id, court, hour: slot.hour, minute: slot.minute, label: slot.label, price: slotUnitPrice(slot.hour) }];
    });
  }
  function removeCartItem(slotId: string, court: number) {
    setCart(prev => prev.filter(i => !(i.slotId === slotId && i.court === court)));
  }

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true); setPromoError(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim(), total: baseTotal }),
      });
      const json = await res.json();
      if (!res.ok) setPromoError(json.error ?? "Code invalide");
      else setPromoResult(json);
    } catch { setPromoError("Erreur validation"); }
    finally { setPromoLoading(false); }
  }

  function removePromo() { setPromoResult(null); setPromoCode(""); setPromoError(null); }

  function goNext() {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!date) e.date = "Choisissez une date";
      if (cart.length === 0) e.slot = "Ajoutez au moins un créneau au panier";
      if (playerCount < minPlayers) e.players = `Minimum ${minPlayers} joueurs`;
    }
    if (step === 1) {
      if (clientName.trim().length < 2) e.clientName = "Nom requis";
      if (!clientEmail.includes("@")) e.clientEmail = "Email invalide";
      if (clientPhone.trim().length < 8) e.clientPhone = "Téléphone invalide";
    }
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitReservation() {
    setLoading(true); setApiError(null);
    try {
      const res = await fetch("/api/futsal/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(), clientEmail: clientEmail.trim(),
          clientPhone: clientPhone.trim(),
          slots: cart.map(i => ({ futsalTimeSlotId: i.slotId, courtNumber: i.court })),
          date, playerCount: Number(playerCount),
          paymentType, notes: notes.trim() || undefined,
          promoCodeId: promoResult?.promoCodeId,
          discountAmount: promoResult?.discountAmount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur serveur");

      if (json.checkoutUrl) {
        // Real Stripe: redirect to hosted Checkout page
        window.location.href = json.checkoutUrl;
        return; // page will redirect
      }

      // Free (promo 100%) or demo mode
      setResult(json);
      if (!json.clientSecret) {
        // Free — already confirmed
        setConfirmed(true);
      }
      // If demo_secret — wait for user to click simulate button
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Erreur inattendue");
      setLoading(false);
    }
    setLoading(false);
  }

  async function simulateDemoPayment() {
    if (!result?.reservation) return;
    setLoading(true);
    await fetch("/api/reservations/confirm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: result.reservation.reference }),
    });
    setLoading(false);
    setConfirmed(true);
  }

  function copyShareLink() {
    if (!result?.reservation?.shareToken) return;
    const link = `${window.location.origin}/partage/${result.reservation.shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Confirmation screen ──
  if (confirmed && result) {
    const r = result.reservation;
    const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/partage/${r.shareToken}`;
    return (
      <div className="min-h-screen bg-[#0a1628] px-4 py-10">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
            <div className="text-6xl mb-4">⚽🎉</div>
            <h1 className="text-2xl font-extrabold text-gray-900">Terrain réservé !</h1>
            <p className="text-gray-500 mt-1 mb-4">Référence : <code className="font-mono font-bold text-blue-600">{r.reference as string}</code></p>

            <div className="bg-blue-50 rounded-2xl p-4 text-left space-y-2 text-sm mb-6">
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold">{date && format(new Date(date + "T12:00:00"), "d MMMM yyyy", { locale: fr })}</span></div>
              <div className="flex justify-between gap-3"><span className="text-gray-500 shrink-0">Créneaux</span><span className="font-semibold text-right">{sortedCart.map(i => `${i.label} · T${i.court}`).join(" — ")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Joueurs</span><span className="font-semibold">{playerCount}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-blue-700">{formatPrice(total)}</span></div>
            </div>

            {/* Share link */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <p className="font-semibold text-emerald-800 text-sm">Lien de partage pour votre équipe</p>
              </div>
              <p className="text-xs text-emerald-700 mb-3">Envoyez ce lien à vos coéquipiers pour qu'ils paient leur part</p>
              <div className="flex gap-2">
                <input readOnly value={shareLink}
                  className="flex-1 text-xs bg-white border border-emerald-200 rounded-lg px-3 py-2 text-gray-700 truncate" />
                <button type="button" onClick={copyShareLink}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1 whitespace-nowrap">
                  {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copié !" : "Copier"}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/futsal" className="flex-1">
                <Button variant="outline" className="w-full">Retour Foot à 5</Button>
              </Link>
              <Link href={`/partage/${r.shareToken}`} className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Voir mon groupe</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/futsal" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-white font-bold text-xl">Réserver un terrain</h1>
            <p className="text-blue-300 text-sm">Étape {step + 1} / {STEPS.length}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all",
              i <= step ? "bg-blue-400" : "bg-white/20")} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* ── STEP 0 : Créneau ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" /> Date & Créneau
              </h2>

              <FutsalCalendar selected={date} onSelect={d => { setDate(d); setCart([]); }} closedDates={closedDates} />
              {errors.date && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.date}</p>}

              {date && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Choisissez un créneau — {format(new Date(date + "T12:00:00"), "d MMMM", { locale: fr })}
                  </p>
                  {/* Schedule info badge */}
                  {!slotsLoading && scheduleInfo && (
                    scheduleInfo.closed ? (
                      <div className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-700 mb-3">
                        <span>🚫</span>
                        <span>
                          Le futsal est <strong>fermé</strong> ce jour
                          {scheduleInfo.isVacation ? " (vacances scolaires)" : " (hors vacances scolaires)"}.
                        </span>
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border mb-3",
                        scheduleInfo.isVacation
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      )}>
                        <span>{scheduleInfo.isVacation ? "🏖️" : "📚"}</span>
                        <span>
                          {scheduleInfo.isVacation ? "Vacances scolaires" : "Hors vacances scolaires"}
                          {" "}— ouvert de <strong>{scheduleInfo.startHour}h</strong> à <strong>{scheduleInfo.endHour}h</strong>
                        </span>
                      </div>
                    )
                  )}

                  <p className="text-xs text-gray-400 mb-2">Cliquez sur un terrain pour l'ajouter au panier. Vous pouvez en sélectionner plusieurs.</p>
                  {slotsLoading ? (
                    <p className="text-center text-gray-400 py-4">Chargement...</p>
                  ) : (
                    <div className="space-y-1.5">
                      {slots.map(slot => {
                        const isPeak = slot.hour >= peakHour;
                        const slotPrice = isPeak ? peakPrice : offpeakPrice;
                        return (
                          <div key={slot.id}
                            className={cn(
                              "flex items-center gap-2 rounded-xl border-2 px-3 py-2",
                              !slot.available ? "border-gray-100 bg-gray-50 opacity-60" :
                              isPeak ? "border-orange-100" : "border-gray-100"
                            )}>
                            <div className="w-16 shrink-0">
                              <p className={cn("text-sm font-bold", isPeak ? "text-orange-600" : "text-gray-800")}>{slot.label}</p>
                              <p className="text-[10px] text-gray-400 font-semibold">{formatPrice(slotPrice)}</p>
                            </div>
                            {!slot.available ? (
                              <span className="text-xs text-gray-400 font-medium">Complet</span>
                            ) : (
                              <div className="flex gap-1.5 flex-wrap">
                                {[1, 2, 3].map(c => {
                                  const courtAvailable = slot.availableCourts.includes(c);
                                  const selected = inCart(slot.id, c);
                                  if (!courtAvailable && !selected) return (
                                    <span key={c} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 border-gray-100 text-gray-300 line-through">T{c}</span>
                                  );
                                  return (
                                    <button type="button" key={c} onClick={() => toggleCartItem(slot, c)}
                                      className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all",
                                        selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-300"
                                      )}>
                                      {selected ? "✓ " : ""}T{c}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {errors.slot && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.slot}</p>}
                </div>
              )}

              {/* 🛒 Cart */}
              {cart.length > 0 && (
                <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-1.5">
                    🛒 Votre panier <span className="text-xs font-normal text-blue-500">({cart.length} créneau{cart.length > 1 ? "x" : ""})</span>
                  </p>
                  <div className="space-y-1.5">
                    {sortedCart.map(it => (
                      <div key={`${it.slotId}-${it.court}`} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                        <span className="font-semibold text-gray-800">{it.label} · Terrain {it.court}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-blue-700">{formatPrice(it.price)}</span>
                          <button type="button" onClick={() => removeCartItem(it.slotId, it.court)}
                            className="p-1 rounded-full hover:bg-red-50 text-red-400 hover:text-red-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center border-t border-blue-200 mt-2 pt-2">
                    <span className="text-sm font-bold text-gray-700">Total</span>
                    <span className="text-lg font-extrabold text-blue-700">{formatPrice(baseTotal)}</span>
                  </div>
                </div>
              )}

              {/* Players */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" /> Nombre de joueurs <span className="text-gray-400 font-normal">(min. {minPlayers})</span>
                </label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setPlayerCount(p => Math.max(minPlayers, p - 1))}
                    className="w-11 h-11 rounded-xl border-2 border-gray-200 text-xl font-bold hover:border-blue-400 transition-colors flex items-center justify-center">
                    −
                  </button>
                  <div className="w-16 h-11 flex items-center justify-center text-2xl font-bold border-2 border-gray-200 rounded-xl">{playerCount}</div>
                  <button type="button" onClick={() => setPlayerCount(p => p + 1)}
                    className="w-11 h-11 rounded-xl border-2 border-gray-200 text-xl font-bold hover:border-blue-400 transition-colors flex items-center justify-center">
                    +
                  </button>
                  <div>
                    <p className="text-2xl font-extrabold text-blue-600">{formatPrice(total)}</p>
                    <p className="text-xs text-gray-400">
                      {cart.length > 0 ? `${cart.length} créneau${cart.length > 1 ? "x" : ""} · ${formatPrice(pricePerPlayer)}/joueur` : "Ajoutez un créneau"}
                    </p>
                  </div>
                </div>
                {errors.players && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.players}</p>}
              </div>

              <Button type="button" size="lg" className="w-full bg-blue-600 hover:bg-blue-700" onClick={goNext}>
                Mes informations <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP 1 : Contact ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Vos informations</h2>
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
                ⚽ {date && format(new Date(date + "T12:00:00"), "d MMMM yyyy", { locale: fr })} — {sortedCart.map(i => `${i.label} T${i.court}`).join(", ")} — {playerCount} joueurs
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet *</label>
                <Input placeholder="Jean Dupont" value={clientName} onChange={e => setClientName(e.target.value)} />
                {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />Téléphone *
                </label>
                <Input type="tel" placeholder="0692 XX XX XX" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                {errors.clientPhone && <p className="text-red-500 text-xs mt-1">{errors.clientPhone}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Mail className="w-3.5 h-3.5 inline mr-1" />Email *
                </label>
                <Input type="email" placeholder="jean@email.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
                {errors.clientEmail && <p className="text-red-500 text-xs mt-1">{errors.clientEmail}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optionnel)</label>
                <textarea rows={2} placeholder="Demande particulière..."
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Retour
                </Button>
                <Button type="button" size="lg" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={goNext}>
                  Paiement <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Paiement ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Paiement</h2>

              {/* Promo code */}
              {!result && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-blue-600" /> Code promo
                  </label>
                  {promoResult ? (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <Tag className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-800 text-sm">{promoResult.code} — {promoResult.label}</p>
                        <p className="text-xs text-blue-600">-{promoResult.discountType === "percent" ? `${promoResult.discountValue}%` : formatPrice(promoResult.discountValue)} appliqué</p>
                      </div>
                      <button type="button" onClick={removePromo} className="p-1 rounded-full hover:bg-blue-100 text-blue-600">
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
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {promoLoading ? "..." : "Appliquer"}
                      </button>
                    </div>
                  )}
                  {promoError && <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{promoError}</p>}
                </div>
              )}

              {/* Price summary */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
                {sortedCart.map(it => (
                  <div key={`${it.slotId}-${it.court}`} className="flex justify-between">
                    <span className="text-gray-500">{it.label} · Terrain {it.court}</span>
                    <span className="font-semibold">{formatPrice(it.price)}</span>
                  </div>
                ))}
                {promoResult && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Remise ({promoResult.code})</span>
                    <span>-{formatPrice(promoResult.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                  <span>Total terrain</span>
                  <span className="text-blue-700">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-600 font-medium">
                  <span>Part par joueur</span>
                  <span>{formatPrice(pricePerPlayer)}</span>
                </div>
              </div>

              {/* 100% promo bypass */}
              {total === 0 && promoResult && !result && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                  <div className="text-4xl">🎉</div>
                  <p className="font-bold text-emerald-800">Terrain gratuit avec le code <span className="text-emerald-600">{promoResult.code}</span></p>
                  <p className="text-2xl font-extrabold text-emerald-700">0 €</p>
                  <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={submitReservation} disabled={loading}>
                    {loading ? "Confirmation..." : "✅ Confirmer gratuitement"}
                  </Button>
                </div>
              )}

              {/* Payment options */}
              {!result && total > 0 && (
                <div className="space-y-2">
                  {[
                    { value: "online_full", label: "💳 Payer la totalité maintenant", sub: `${formatPrice(total)} via Stripe` },
                    { value: "onsite_deposit", label: "📋 Payer un acompte maintenant", sub: `${formatPrice(depositAmount)} (solde sur place)` },
                  ].map(opt => (
                    <button type="button" key={opt.value}
                      onClick={() => setPaymentType(opt.value as typeof paymentType)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-2 transition-all",
                        paymentType === opt.value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                      )}>
                      <p className="font-semibold text-sm text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              )}

              {apiError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{apiError}</p>
                </div>
              )}

              {result?.demoMode && result?.clientSecret?.startsWith("demo_secret_") && !confirmed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="text-center">
                    <p className="text-amber-800 font-semibold text-sm">⚠️ Mode démonstration</p>
                    <p className="text-amber-700 text-xs mt-0.5">Stripe non configuré — simulez le paiement</p>
                  </div>
                  <button type="button" onClick={simulateDemoPayment} disabled={loading}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors disabled:opacity-50">
                    {loading ? "Simulation..." : "✓ Simuler le paiement réussi"}
                  </button>
                </div>
              )}

              {!result && total > 0 && (
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Retour
                  </Button>
                  <Button type="button" size="lg" className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={submitReservation} disabled={loading}>
                    {loading ? "Traitement..." : "Confirmer la réservation"}
                  </Button>
                </div>
              )}
              {!result && total === 0 && promoResult && (
                <div className="mt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Retour
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
