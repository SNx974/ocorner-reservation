"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { PriceSummary } from "./PriceSummary";
import { calculateDeposit, formatPrice } from "@/lib/utils";
import { CreditCard, Clock, Shield, Loader2, CheckCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const IS_DEMO = !STRIPE_KEY || STRIPE_KEY.includes("placeholder") || STRIPE_KEY === "pk_test_placeholder";

const stripePromise = IS_DEMO ? null : loadStripe(STRIPE_KEY);

interface Formula { id: string; name: string; pricePerChild: number; minChildren: number; }

interface PaymentSectionProps {
  formula: Formula;
  childrenCount: number;
  paymentType: string;
  depositPaymentMethod?: string;
  onPaymentTypeChange: (v: "online_full" | "onsite_deposit") => void;
  onDepositMethodChange: (v: "online" | "onsite") => void;
  clientSecret: string | null;
  onPaymentSuccess: () => void;
  reservation: Record<string, unknown> | null;
  loading: boolean;
  onSubmit: () => void;
}

// Real Stripe checkout form
function StripeCheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + "/booking/success" },
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message ?? "Erreur de paiement");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={processing}>
        {processing
          ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Traitement...</>
          : <><Shield className="w-5 h-5 mr-2" />Payer maintenant</>}
      </Button>
      <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
        <Shield className="w-3 h-3" /> Paiement sécurisé via Stripe
      </p>
    </form>
  );
}

// Demo / simulation checkout form (when Stripe not configured)
function DemoCheckoutForm({ amount, label, onSuccess, reference }: {
  amount: number; label: string; onSuccess: () => void; reference?: string;
}) {
  const [processing, setProcessing] = useState(false);
  const [cardNum, setCardNum] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/34");
  const [cvc, setCvc] = useState("123");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    // Simulate payment delay
    await new Promise(r => setTimeout(r, 2000));
    // Confirm reservation in DB
    if (reference) {
      await fetch("/api/reservations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
    }
    setProcessing(false);
    onSuccess();
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      {/* Demo banner */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <div>
          <p className="font-semibold">Mode démonstration</p>
          <p className="text-xs">Configurez vos clés Stripe dans <code>.env</code> pour activer le vrai paiement.</p>
        </div>
      </div>

      {/* Fake card form */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Carte bancaire (simulation)</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Numéro de carte</label>
          <input value={cardNum} onChange={e => setCardNum(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Expiration</label>
            <input value={expiry} onChange={e => setExpiry(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CVC</label>
            <input value={cvc} onChange={e => setCvc(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={processing}>
        {processing ? (
          <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Traitement du paiement...</>
        ) : (
          <><CreditCard className="w-5 h-5 mr-2" />{label} — {formatPrice(amount)}</>
        )}
      </Button>
    </form>
  );
}

export function PaymentSection({
  formula, childrenCount, paymentType, depositPaymentMethod,
  onPaymentTypeChange, onDepositMethodChange,
  clientSecret, onPaymentSuccess, reservation, loading, onSubmit,
}: PaymentSectionProps) {
  const total = formula.pricePerChild * childrenCount;
  const deposit = calculateDeposit(total, 30, 50);

  const options = [
    {
      id: "online_full",
      icon: <CreditCard className="w-6 h-6" />,
      title: "💳 Paiement intégral en ligne",
      description: "Paiement complet maintenant par carte",
      price: formatPrice(total),
      badge: "✅ Confirmation immédiate",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      id: "onsite_deposit",
      icon: <Clock className="w-6 h-6" />,
      title: "📋 Acompte + solde sur place",
      description: `Acompte de ${formatPrice(deposit)} à verser maintenant`,
      price: `Reste ${formatPrice(total - deposit)} sur place`,
      badge: "⚠️ Acompte sous 72h",
      badgeColor: "bg-amber-100 text-amber-700",
    },
  ];

  // Detect demo mode also from the clientSecret value itself
  const isDemoSecret = clientSecret?.startsWith("demo_secret_");
  const showStripeForm = clientSecret && !IS_DEMO && !isDemoSecret;
  const showDemoForm = clientSecret && (IS_DEMO || isDemoSecret);

  return (
    <div className="space-y-5">
      <PriceSummary
        formulaName={formula.name}
        pricePerChild={formula.pricePerChild}
        childrenCount={childrenCount}
        paymentType={paymentType}
      />

      {/* Payment type selector — only show if no reservation yet */}
      {!reservation && (
        <div className="space-y-3">
          {options.map(opt => (
            <button key={opt.id} type="button"
              onClick={() => onPaymentTypeChange(opt.id as "online_full" | "onsite_deposit")}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all",
                paymentType === opt.id
                  ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  paymentType === opt.id ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{opt.title}</p>
                    {opt.badge && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", opt.badgeColor)}>
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{opt.description}</p>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5">{opt.price}</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                  paymentType === opt.id ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                )}>
                  {paymentType === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Info acompte en ligne (automatique) */}
      {paymentType === "onsite_deposit" && !reservation && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 text-sm">Acompte de {formatPrice(deposit)} par carte</p>
            <p className="text-xs text-amber-700 mt-0.5">Le solde de {formatPrice(total - deposit)} sera réglé sur place le jour J.</p>
          </div>
        </div>
      )}

      {/* Real Stripe Elements */}
      {showStripeForm && stripePromise && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            {paymentType === "online_full" ? `Payer ${formatPrice(total)}` : `Payer l'acompte ${formatPrice(deposit)}`}
          </h3>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeCheckoutForm onSuccess={onPaymentSuccess} />
          </Elements>
        </div>
      )}

      {/* Demo form */}
      {showDemoForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            {paymentType === "online_full" ? "Paiement complet" : "Paiement de l'acompte"}
          </h3>
          <DemoCheckoutForm
            amount={paymentType === "online_full" ? total : deposit}
            label={paymentType === "online_full" ? "Payer" : "Payer l'acompte"}
            onSuccess={onPaymentSuccess}
            reference={reservation?.reference as string | undefined}
          />
        </div>
      )}

      {/* Submit button (before reservation created) */}
      {!reservation && (
        <Button type="button" size="lg" className="w-full" onClick={onSubmit} disabled={loading}>
          {loading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enregistrement...</>
          ) : (
            <><CreditCard className="w-5 h-5 mr-2" />Procéder au paiement</>
          )}
        </Button>
      )}
    </div>
  );
}
