"use client";

// 404 maison (FR/ZH, avec la navigation du site) — remplace la page
// par défaut de Next.js, en anglais et sans issue.

import { useTranslation } from "react-i18next";
import { SearchX } from "lucide-react";
import { Impasse } from "@/components/layout/Impasse";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="bg-background">
      <Impasse
        pleinEcran
        icone={SearchX}
        titre={t("common.notFound.title")}
        aide={t("common.notFound.body")}
        sortie={{ href: "/songs", label: t("common.notFound.cta") }}
      />
    </div>
  );
}
