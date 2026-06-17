"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle, AlertCircle, Calendar, Clock, Users,
  Home, Phone, MapPin, Star, PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ConfirmationPageProps {
  reservation: Record<string, unknown>;
}

export function ConfirmationPage({ reservation: r }: ConfirmationPageProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const status = r.status as string;
  const isConfirmed = status === "confirmed";
  const isDepositPending = status === "deposit_pending";
  const formula = r.formula as Record<string, unknown> | undefined;
  const timeSlot = r.timeSlot as Record<string, unknown> | undefined;

  useEffect(() => {
    if (isConfirmed) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3500);
      return () => clearTimeout(t);
    }
  }, [isConfirmed]);

  const formattedDate = r.date
    ? format(new Date(r.date as string), "EEEE d MMMM yyyy", { locale: fr })
    : "";

  return (
    <div className="max-w-md mx-auto animate-fade-in relative">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                fontSize: "1.5rem",
              }}>
              {["🎉", "⭐", "🎊", "✨", "🎈"][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      {/* Hero banner */}
      <div className={cn(
        "rounded-3xl p-8 text-center mb-6 shadow-lg",
        isConfirmed
          ? "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 text-white"
          : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
      )}>
        {isConfirmed ? (
          <>
            <div className="text-6xl mb-3">🎉</div>
            <h1 className="text-2xl font-extrabold">C'est confirmé !</h1>
            <p className="text-white/90 mt-1 text-base">
              Votre réservation est garantie. À très bientôt !
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-3">📋</div>
            <h1 className="text-2xl font-extrabold">Réservation enregistrée</h1>
            <p className="text-white/90 mt-1">
              {isDepositPending ? "Versez l'acompte pour confirmer votre place" : "Votre réservation est provisoire"}
            </p>
          </>
        )}

        {/* Reference badge */}
        <div className="mt-5 inline-flex flex-col items-center bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3">
          <p className="text-xs text-white/70 uppercase tracking-wider">Référence</p>
          <p className="text-xl font-mono font-extrabold tracking-wide">{r.reference as string}</p>
        </div>
      </div>

      {/* Main details card */}
      <div className="bg-white/10 rounded-2xl border border-white/10 shadow-sm overflow-hidden mb-4">
        {/* Booking info */}
        <div className="p-5 space-y-4">
          <h2 className="font-bold text-white text-lg">Votre réservation</h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[#1bbfa8]/10 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-[#1bbfa8]/20 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-[#1bbfa8]" />
              </div>
              <div>
                <p className="text-xs text-white/50">Formule</p>
                <p className="font-semibold text-white">{formula?.name as string}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <Calendar className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Date</p>
                  <p className="font-semibold text-white capitalize text-sm">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <Clock className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Heure</p>
                  <p className="font-semibold text-white">{timeSlot?.time as string}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <Users className="w-4 h-4 text-white/40 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Enfants</p>
                  <p className="font-semibold text-white">{r.childrenCount as number} enfants</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                <div className="w-4 h-4 text-white/40 mt-0.5 shrink-0 text-lg leading-none">€</div>
                <div>
                  <p className="text-xs text-white/50">Total</p>
                  <p className="font-bold text-emerald-600">{formatPrice(r.totalPrice as number)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment status */}
        {isConfirmed && (
          <div className="border-t border-green-100 bg-green-50 p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Paiement confirmé</p>
              <p className="text-green-700 text-sm">
                {r.paymentType === "online_full"
                  ? "Paiement complet reçu — votre place est réservée !"
                  : "Acompte reçu — solde à régler sur place"}
              </p>
            </div>
          </div>
        )}

        {isDepositPending ? (
          <div className="border-t border-amber-100 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Acompte à verser</p>
                <p className="text-amber-800 text-sm mt-0.5">
                  Montant : <strong className="text-lg">{formatPrice(r.depositAmount as number)}</strong>
                </p>
                <p className="text-amber-700 text-xs mt-1.5 leading-relaxed">
                  ⏰ Vous avez <strong>72h</strong> pour verser cet acompte.
                  Passé ce délai, votre réservation sera automatiquement annulée.
                </p>
                <div className="mt-3 bg-amber-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-900 mb-1">Comment payer l'acompte ?</p>
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    Appelez-nous : <strong>0692 XX XX XX</strong>
                  </p>
                  <p className="text-xs text-amber-700 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    Ou payez directement sur place
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {status === "pending" && !isDepositPending && (
          r.paymentType === "online_full" ? (
            <div className="border-t border-amber-100 bg-amber-50 p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Paiement en ligne en cours de validation</p>
                <p className="text-amber-700 text-sm">
                  Votre paiement de {formatPrice(r.totalPrice as number)} est en cours de confirmation. Vous recevrez un email dès qu'il sera validé.
                </p>
              </div>
            </div>
          ) : (
            <div className="border-t border-blue-100 bg-blue-50 p-4 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">Paiement sur place</p>
                <p className="text-blue-700 text-sm">
                  Le paiement complet de {formatPrice(r.totalPrice as number)} sera encaissé à votre arrivée.
                </p>
              </div>
            </div>
          )
        )}

        {/* QR Code */}
        {r.qrCode ? (
          <div className="border-t border-white/10 p-5 text-center bg-white/5">
            <p className="text-sm font-semibold text-white mb-1">Votre QR Code d'entrée</p>
            <p className="text-xs text-white/50 mb-3">Présentez-le à l'accueil le jour J</p>
            <img
              src={r.qrCode as string}
              alt="QR Code réservation"
              className="w-40 h-40 mx-auto rounded-2xl border-4 border-white shadow-md"
            />
          </div>
        ) : null}
      </div>

      {/* Email notice */}
      <div className="bg-[#1bbfa8]/10 border border-[#1bbfa8]/30 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <span className="text-2xl">📧</span>
        <div>
          <p className="font-semibold text-white text-sm">Email de confirmation envoyé</p>
          <p className="text-white/60 text-xs mt-0.5">
            Vérifiez votre boîte <strong>{r.clientEmail as string}</strong>
          </p>
        </div>
      </div>

      {/* Info / next steps */}
      {isConfirmed && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-[#c8f135]" /> Préparez votre visite
          </h3>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#1bbfa8]" />Venez 10 min avant votre créneau</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#1bbfa8]" />Présentez ce QR code ou votre référence à l'accueil</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#1bbfa8]" />Chaussures de sport recommandées pour le foot</li>
            <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#1bbfa8]" />Questions ? Appelez le <strong>0692 XX XX XX</strong></li>
          </ul>
        </div>
      )}

      <Link href="/">
        <Button variant="outline" size="lg" className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
          <Home className="w-5 h-5 mr-2" /> Retour à l'accueil
        </Button>
      </Link>
    </div>
  );
}
