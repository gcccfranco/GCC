"use client";

import { CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Bandeau } from "@/components/layout/Bandeau";

/**
 * Bandeau affiché quand un planning n'a pas pu être rafraîchi en ligne : les
 * données affichées viennent du fallback compilé et peuvent être périmées.
 */
export function StaleBanner({ show }: { show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <Bandeau ton="alerte" icone={<CloudOff className="h-3.5 w-3.5" aria-hidden />} testId="planning-stale">
      {t("planning.staleData")}
    </Bandeau>
  );
}
