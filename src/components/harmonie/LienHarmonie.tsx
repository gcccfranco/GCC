"use client";

// Porte d'entrée du catalogue « Harmonie » (lot 9) dans l'onglet Chants.
// Invisible pour qui n'est ni pianiste, ni guitariste, ni admin : la ligne
// n'apparaît pas du tout plutôt que de mener à une page fermée.

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";

export function LienHarmonie() {
  const { t } = useTranslation();
  const acces = useAccesHarmonie();
  if (acces.chargement || !acces.peut) return null;

  return (
    <Link
      href="/harmonie"
      data-lien-harmonie
      className="mt-4 flex items-center gap-3 rounded-xl bg-card px-4 py-3 transition-colors duration-150 active:bg-secondary/70"
    >
      <Sparkles className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-foreground">{t("harmonie.titre")}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{t("harmonie.sousTitre")}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </Link>
  );
}
