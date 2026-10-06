"use client";

// Back-Office › Planning (lot U6, B2, tables Q2 et Q3) : les plannings qu'on remplit ou
// publie, en modification directe (Q14) ; Sans compte pour les admins (Import retiré le
// 06/10/2026 : les plannings se tiennent à la main, le Sheet ne sert plus qu'à lire 2026). Les pages
// des plannings sont celles de l'App (`src/app/planning/*`), en gestion (`GestionPlanning`).
// Le menu règle l'affichage seulement : plannings/{key} et planningReleases gardent leurs
// règles. Pleine largeur, comme la grille de la planche bo-planning-2027 (U4, Q10).
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { GestionPlanning } from "@/lib/planning/gestion";
import { EnTeteEntree, type SousPartie } from "@/components/backOffice/EnTeteEntree";

const SANS_COMPTE = "/back-office/planning/sans-compte";

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useProfile();
  const parties: SousPartie[] = isAdminUser(user)
    ? [
        { href: "/back-office/planning", label: t("backOffice.parties.plannings"), actif: (c) => c !== SANS_COMPTE },
        { href: SANS_COMPTE, label: t("backOffice.parties.sansCompte") },
      ]
    : [];

  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      <EnTeteEntree titre={t("backOffice.entrees.planning")} sousParties={parties} />
      <GestionPlanning.Provider value={true}>{children}</GestionPlanning.Provider>
    </div>
  );
}
