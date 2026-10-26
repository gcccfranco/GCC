"use client";

// Back-Office › Planning (lot U6, B2, tables Q2 et Q3) : les plannings qu'on remplit ou
// publie, en modification directe (Q14) (Import retiré le 06/10/2026 : les plannings se tiennent
// à la main, le Sheet ne sert plus qu'à lire 2026). Les pages
// des plannings sont celles de l'App (`src/app/planning/*`), en gestion (`GestionPlanning`).
// Le menu règle l'affichage seulement : plannings/{key} et planningReleases gardent leurs
// règles. Agencement v18 (B6, piste A) : l'en-tête commun, « Planning », dont la page ouverte
// remplit le sous-titre (le planning, son horaire, ses cases vides) et les outils (« Exporter ») ;
// puis la rangée de la grille et la grille, pleine zone. BO7 : « Sans compte » est passé dans
// Équipes › Personnes, il ne reste aucun onglet, donc aucun rail.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GestionPlanning } from "@/lib/planning/gestion";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { EmplacementsEnTete } from "@/components/planning/BarreDeGrille";
import { PlanningHalo } from "@/components/planning/PlanningHalo";

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [sousTitre, setSousTitre] = useState<HTMLElement | null>(null);
  const [outils, setOutils] = useState<HTMLElement | null>(null);

  return (
    <div className="pb-16">
      <PlanningHalo />
      <EnTetePage
        titre={t("backOffice.entrees.planning")}
        // Le sous-titre passe à la ligne plutôt que d'être coupé (téléphone) : le nombre de cases vides reste lisible.
        sousTitre={<span ref={setSousTitre} className="whitespace-normal" />}
        outils={<span ref={setOutils} className="flex items-center gap-2" />}
      />
      <EmplacementsEnTete.Provider value={{ sousTitre, outils }}>
        <div className="relative px-[var(--marge-page)]">
          <GestionPlanning.Provider value={true}>{children}</GestionPlanning.Provider>
        </div>
      </EmplacementsEnTete.Provider>
    </div>
  );
}
