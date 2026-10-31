"use client";

import type { InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Le champ de recherche du site (dessin de la liste des chants) : pilule en relief (`raised`, fond
 * visible en clair comme en sombre), loupe à gauche, × d'effacement de 44 px de zone de toucher.
 * `inputProps` : id, data-testid, onKeyDown, autoFocus, autoCapitalize…
 */
export function ChampRecherche({
  value,
  onChange,
  placeholder,
  label,
  labelEffacer,
  className,
  inputProps,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  labelEffacer?: string;
  className?: string;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "placeholder" | "className">;
}) {
  const { t } = useTranslation();
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/70 pointer-events-none" aria-hidden />
      <input
        type="search"
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label={label}
        {...inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="raised w-full h-[46px] pl-[42px] pr-10 border border-transparent rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring/50 focus:ring-[3px] focus:ring-ring/10 text-[16px] transition-all duration-150 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={labelEffacer ?? t("common.buttons.clearSearch")}
          className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground rounded-full active:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
