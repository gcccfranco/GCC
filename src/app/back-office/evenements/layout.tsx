"use client";

// Back-Office › Évènements (lot U6, B3, table Q2) : Évènements (ceux qu'on gère) · Scène
// (coordination, écran de U1) ; les réunions ont leur entrée depuis l'agencement v18 (B15).
// Le titre et les sous-parties coiffent les listes ; une fiche, « nouveau » et « modifier »
// prennent la page. Le menu règle l'affichage seulement : evenements/{id} et programmes gardent
// leurs règles.
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { sousPartiesEvenements } from "@/lib/access";
import { EnTeteEntree, type SousPartie } from "@/components/backOffice/EnTeteEntree";

const BASE = "/back-office/evenements";
const ADRESSES = { evenements: BASE, scene: `${BASE}/scene` } as const;

export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const chemin = (usePathname() || "").replace(/\/$/, "");
  const { user, profile } = useProfile();
  const parties: SousPartie[] = sousPartiesEvenements(user, profile).map((p) => ({
    href: ADRESSES[p],
    label: t(`backOffice.parties.${p}`),
  }));
  const liste = (Object.values(ADRESSES) as string[]).includes(chemin);

  return (
    <div className="px-4 pt-6 pb-16 sm:px-6 lg:px-8">
      {liste && <EnTeteEntree titre={t("backOffice.entrees.evenements")} sousParties={parties} />}
      {children}
    </div>
  );
}
