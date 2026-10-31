"use client";

// Lot U9 (docs/spec-evenements-2027.md, Q7 b) : la ligne d'annonce en tête du calendrier
// du Back-Office. Avant la bascule, le Sheet garde 2026 ; à partir du 1er janvier 2027, plus rien
// (BO10, docs/spec-back-office-piste-a.md : la note n'apparaît qu'une fois, dans le Calendrier).
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { annonceBascule, jourDeParis } from "@/lib/evenements/bascule";
import { cn } from "@/lib/utils";

export function AnnonceBascule({ className }: { className?: string }) {
  const { t } = useTranslation();
  // Le jour de Paris : la ligne change à minuit de Paris, même sur un appareil loin.
  if (annonceBascule(jourDeParis()) !== "avant") return null;
  return (
    <p
      role="note"
      aria-label={t("backOffice.annonceBascule.aria")}
      className={cn("flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground", className)}
    >
      <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{t("backOffice.annonceBascule.avant")}</span>
    </p>
  );
}
