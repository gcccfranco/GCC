"use client";

// Back-Office › Planning (lot U6, B2, tables Q2 et Q3) : les plannings qu'on remplit ou
// publie, en modification directe (Q14) ; Sans compte pour les admins (Import retiré le
// 06/10/2026 : les plannings se tiennent à la main, le Sheet ne sert plus qu'à lire 2026). Les pages
// des plannings sont celles de l'App (`src/app/planning/*`), en gestion (`GestionPlanning`).
// Le menu règle l'affichage seulement : plannings/{key} et planningReleases gardent leurs
// règles. Agencement v18 (B6, piste A) : l'en-tête commun, « Planning », dont la page ouverte
// remplit le sous-titre (le planning, son horaire, ses cases vides) et les outils (« Exporter ») ;
// le rail Plannings · Sans compte (admins) ; puis la rangée de la grille et la grille, pleine zone.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { GestionPlanning } from "@/lib/planning/gestion";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail } from "@/components/layout/Onglets";
import { EmplacementsEnTete } from "@/components/planning/BarreDeGrille";
import { PlanningHalo } from "@/components/planning/PlanningHalo";

const SANS_COMPTE = "/back-office/planning/sans-compte";

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useProfile();
  const [sousTitre, setSousTitre] = useState<HTMLElement | null>(null);
  const [outils, setOutils] = useState<HTMLElement | null>(null);

  return (
    <div className="pb-16">
      <PlanningHalo />
      <EnTetePage
        titre={t("backOffice.entrees.planning")}
        sousTitre={<span ref={setSousTitre} />}
        outils={<span ref={setOutils} className="flex items-center gap-2" />}
        onglets={
          isAdminUser(user) ? (
            <OngletsRail
              etiquette={t("backOffice.sousParties")}
              onglets={[
                { id: "plannings", label: t("backOffice.parties.plannings"), href: "/back-office/planning" },
                { id: "sans-compte", label: t("backOffice.parties.sansCompte"), href: SANS_COMPTE },
              ]}
            />
          ) : undefined
        }
      />
      <EmplacementsEnTete.Provider value={{ sousTitre, outils }}>
        <div className="relative px-[var(--marge-page)]">
          <GestionPlanning.Provider value={true}>{children}</GestionPlanning.Provider>
        </div>
      </EmplacementsEnTete.Provider>
    </div>
  );
}
