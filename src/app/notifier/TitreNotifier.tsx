"use client";

import { useTranslation } from "react-i18next";
import { Megaphone } from "lucide-react";

/** L'en-tête de l'ancienne page /notifier (page serveur : le titre se traduit côté client). */
export function TitreNotifier() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Megaphone className="h-5 w-5 text-muted-foreground" />
      <h1 className="text-lg font-bold text-foreground">{t("notifier.titrePage")}</h1>
    </div>
  );
}
