"use client";

import { cn, formatPrice, getCategoryLabel } from "@/lib/utils";
import { Users, ChevronRight, Info } from "lucide-react";

interface Formula {
  id: string;
  name: string;
  category: string;
  includes: string;
  description?: string;
  pricePerChild: number;
  minChildren: number;
}

interface FormulaCardProps {
  formula: Formula;
  selected: boolean;
  /** Called when user clicks to preview the formula (opens modal) */
  onPreview: (f: Formula) => void;
}

const categoryStyles: Record<string, { border: string; bg: string; badge: string; icon: string; accent: string }> = {
  marmaille: {
    border: "border-[#1bbfa8]/40 hover:border-[#1bbfa8]",
    bg: "bg-white/5",
    badge: "bg-[#1bbfa8]/20 text-[#1bbfa8]",
    icon: "🎡",
    accent: "text-[#1bbfa8]",
  },
  marmaille_foot: {
    border: "border-purple-400/40 hover:border-purple-400",
    bg: "bg-white/5",
    badge: "bg-purple-400/20 text-purple-300",
    icon: "⚽🎡",
    accent: "text-purple-300",
  },
  foot: {
    border: "border-blue-400/40 hover:border-blue-400",
    bg: "bg-white/5",
    badge: "bg-blue-400/20 text-blue-300",
    icon: "⚽",
    accent: "text-blue-300",
  },
};

const selectedStyles: Record<string, string> = {
  marmaille: "border-[#1bbfa8] ring-4 ring-[#1bbfa8]/20",
  marmaille_foot: "border-purple-400 ring-4 ring-purple-400/20",
  foot: "border-blue-400 ring-4 ring-blue-400/20",
};

export function FormulaCard({ formula, selected, onPreview }: FormulaCardProps) {
  const style = categoryStyles[formula.category] ?? categoryStyles.marmaille;

  return (
    <button
      type="button"
      onClick={() => onPreview(formula)}
      className={cn(
        "relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group",
        style.bg,
        selected ? selectedStyles[formula.category] : style.border
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", style.badge)}>
            {getCategoryLabel(formula.category)}
          </span>
          <h3 className="mt-1.5 font-bold text-white text-base leading-tight">{formula.name}</h3>
          {formula.includes && (
            <p className="text-sm text-white/60 mt-1 line-clamp-2">{formula.includes}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <p className="text-2xl font-extrabold text-white">
              {formatPrice(formula.pricePerChild)}
              <span className="text-sm font-normal text-white/50">/enfant</span>
            </p>
            <div className="flex items-center gap-1 text-xs text-white/50">
              <Users className="w-3.5 h-3.5" />
              <span>min. {formula.minChildren}</span>
            </div>
          </div>
        </div>
      </div>

      {/* "Voir les détails" hint */}
      <div className={cn(
        "mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-medium transition-all",
        style.accent
      )}>
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          {selected ? "Formule sélectionnée · Voir les détails" : "Cliquez pour voir les détails"}
        </span>
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}
