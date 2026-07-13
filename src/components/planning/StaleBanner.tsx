"use client";

import { CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Bandeau affiché quand un planning n'a pas pu être rafraîchi en ligne : les
 * données affichées viennent du fallback compilé et peuvent être périmées.
 */
export function StaleBanner({ show }: { show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 text-xs">
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      {t("planning.staleData")}
    </div>
  );
}
