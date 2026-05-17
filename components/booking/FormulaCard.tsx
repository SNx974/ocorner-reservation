"use client";

import { cn, formatPrice, getCategoryLabel, getIncludesLabel } from "@/lib/utils";
import { Check, Users } from "lucide-react";

interface Formula {
  id: string;
  name: string;
  category: string;
  includes: string;
  pricePerChild: number;
  minChildren: number;
}

interface FormulaCardProps {
  formula: Formula;
  selected: boolean;
  onSelect: (f: Formula) => void;
}

const categoryStyles: Record<string, { border: string; bg: string; badge: string; icon: string }> = {
  marmaille: {
    border: "border-emerald-300 hover:border-emerald-500",
    bg: "bg-gradient-to-br from-emerald-50 to-green-50",
    badge: "bg-emerald-100 text-emerald-800",
    icon: "🎡",
  },
  marmaille_foot: {
    border: "border-purple-300 hover:border-purple-500",
    bg: "bg-gradient-to-br from-purple-50 to-violet-50",
    badge: "bg-purple-100 text-purple-800",
    icon: "⚽🎡",
  },
  foot: {
    border: "border-blue-300 hover:border-blue-500",
    bg: "bg-gradient-to-br from-blue-50 to-sky-50",
    badge: "bg-blue-100 text-blue-800",
    icon: "⚽",
  },
};

const selectedStyles: Record<string, string> = {
  marmaille: "border-emerald-500 ring-4 ring-emerald-200 shadow-emerald-100",
  marmaille_foot: "border-purple-500 ring-4 ring-purple-200 shadow-purple-100",
  foot: "border-blue-500 ring-4 ring-blue-200 shadow-blue-100",
};

export function FormulaCard({ formula, selected, onSelect }: FormulaCardProps) {
  const style = categoryStyles[formula.category] ?? categoryStyles.marmaille;

  return (
    <button
      type="button"
      onClick={() => onSelect(formula)}
      className={cn(
        "relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md",
        style.bg,
        selected ? selectedStyles[formula.category] : style.border
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 bg-white rounded-full p-0.5 shadow">
          <Check className="w-4 h-4 text-emerald-600" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className="text-3xl">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", style.badge)}>
            {getCategoryLabel(formula.category)}
          </span>
          <h3 className="mt-1.5 font-bold text-gray-900 text-base leading-tight">{formula.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{getIncludesLabel(formula.includes)}</p>
          <div className="flex items-center justify-between mt-3">
            <p className="text-2xl font-extrabold text-gray-900">
              {formatPrice(formula.pricePerChild)}
              <span className="text-sm font-normal text-gray-500">/enfant</span>
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="w-3.5 h-3.5" />
              <span>min. {formula.minChildren}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
