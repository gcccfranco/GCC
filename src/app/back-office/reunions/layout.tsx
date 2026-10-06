"use client";

// Back-Office › Réunions (agencement v18, B15) : une entrée à part, les réunions de ses pôles
// et de ses équipes (toutes pour un admin). Pas de sous-parties, donc pas de rail. La liste,
// la fiche, « nouvelle » et « modifier » montent les composants d'Évènements, disposition
// inchangée (T2b les met en deux volets). Affichage seulement : evenements/{id} garde ses règles.
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EnTeteEntree } from "@/components/backOffice/EnTeteEntree";

const BASE = "/back-office/reunions";

export default function ReunionsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const chemin = (usePathname() || "").replace(/\/$/, "");

  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      {chemin === BASE && <EnTeteEntree titre={t("backOffice.entrees.reunions")} />}
      {children}
    </div>
  );
}
