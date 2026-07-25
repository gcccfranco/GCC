"use client";

// Filet de sécurité global : toute exception non rattrapée dans une page
// affiche ce message au lieu d'une page blanche.

import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
      <TriangleAlert className="h-8 w-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{t("common.errorPage.title")}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{t("common.errorPage.body")}</p>
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        {t("common.errorPage.reload")}
      </button>
    </div>
  );
}
