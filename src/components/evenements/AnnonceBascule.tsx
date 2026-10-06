"use client";

// Lot U9 (docs/spec-evenements-2027.md, Q7 b) : la ligne d'annonce en tête du calendrier et
// de la gestion des évènements du Back-Office. Avant la bascule, le Sheet garde 2026 ; après,
// tout se crée ici ; plus rien après le 31/01/2027.
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { annonceBascule, jourDeParis } from "@/lib/evenements/bascule";
import { cn } from "@/lib/utils";

export function AnnonceBascule({ className }: { className?: string }) {
  const { t } = useTranslation();
  // Le jour de Paris : la ligne change à minuit de Paris, même sur un appareil loin.
  const quand = annonceBascule(jourDeParis());
  if (!quand) return null;
  return (
    <p
      role="note"
      aria-label={t("backOffice.annonceBascule.aria")}
      className={cn("flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground", className)}
    >
      <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{t(`backOffice.annonceBascule.${quand}`)}</span>
    </p>
  );
}
