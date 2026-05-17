"use client";

import { formatPrice, calculateDeposit } from "@/lib/utils";
import { Users, CreditCard, MapPin, AlertCircle } from "lucide-react";

interface PriceSummaryProps {
  formulaName: string;
  pricePerChild: number;
  childrenCount: number;
  paymentType: string;
  depositPercentage?: number;
  depositMinAmount?: number;
}

export function PriceSummary({
  formulaName,
  pricePerChild,
  childrenCount,
  paymentType,
  depositPercentage = 30,
  depositMinAmount = 50,
}: PriceSummaryProps) {
  const total = pricePerChild * childrenCount;
  const deposit = calculateDeposit(total, depositPercentage, depositMinAmount);
  const isOnsite = paymentType.startsWith("onsite");

  return (
    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-emerald-600" />
        Récapitulatif
      </h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Formule</span>
          <span className="font-medium text-right max-w-[60%] text-gray-900">{formulaName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Enfants
          </span>
          <span className="font-medium">{childrenCount} × {formatPrice(pricePerChild)}</span>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-emerald-600 text-xl">{formatPrice(total)}</span>
          </div>
        </div>

        {isOnsite && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Acompte obligatoire</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  À verser dans les 72h pour confirmer
                </p>
                <p className="font-bold text-amber-900 text-lg mt-1">{formatPrice(deposit)}</p>
              </div>
            </div>
          </div>
        )}

        {paymentType === "online_full" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-600" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Paiement en ligne</p>
                <p className="text-green-700 text-xs">Confirmation immédiate après paiement</p>
              </div>
            </div>
          </div>
        )}

        {paymentType === "onsite_full" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800 text-sm">Paiement sur place</p>
                <p className="text-blue-700 text-xs">Total à régler à votre arrivée</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
