"use client";

import { useState } from "react";
import { CgvModal } from "./CgvModal";
import { cn } from "@/lib/utils";

export function ConsentCheckbox({
  checked, onChange, error, dark = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string | null;
  dark?: boolean;
}) {
  const [showCgv, setShowCgv] = useState(false);

  return (
    <div className="space-y-2">
      <p className={cn("text-xs leading-relaxed", dark ? "text-white/50" : "text-gray-500")}>
        Vos données personnelles seront utilisées pour traiter votre commande, faciliter votre expérience sur ce site web et à d&apos;autres fins décrites dans notre politique de confidentialité.
      </p>

      <label className={cn(
        "flex items-start gap-2.5 cursor-pointer rounded-xl p-3 border transition-colors",
        error
          ? "border-red-400 bg-red-50/10"
          : dark ? "border-white/20 hover:border-white/40" : "border-gray-200 hover:border-gray-300"
      )}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-emerald-600 cursor-pointer"
        />
        <span className={cn("text-sm", dark ? "text-white/80" : "text-gray-700")}>
          J&apos;ai lu et accepté les conditions générales de ventes{" "}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowCgv(true); }}
            className="underline font-semibold text-emerald-500 hover:text-emerald-400"
          >
            Conditions générales de vente *
          </button>
        </span>
      </label>

      {error && <p className="text-red-500 text-xs flex items-center gap-1">{error}</p>}

      {showCgv && <CgvModal onClose={() => setShowCgv(false)} />}
    </div>
  );
}
