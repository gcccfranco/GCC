"use client";

// 404 maison (FR/ZH, avec la navigation du site) — remplace la page
// par défaut de Next.js, en anglais et sans issue.

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Music } from "lucide-react";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-4xl font-bold text-muted-foreground/40">404</p>
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{t("common.notFound.title")}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{t("common.notFound.body")}</p>
      </div>
      <Link
        href="/songs"
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        <Music className="h-4 w-4" />
        {t("common.notFound.cta")}
      </Link>
    </div>
  );
}
