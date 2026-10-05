"use client";

// Back-Office › Tâches (lot U6, B3, table Q2) : un onglet par pôle de la personne (Louange
// compris ; tous pour un admin), la page d'un pôle dessous. Dans l'App, `/taches` garde
// « À faire pour moi » (question 3). Le menu règle l'affichage seulement : poles/{pôle}/taches
// garde sa règle (isTachePole).
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { tachesDuBackOffice } from "@/lib/access";
import { EnTeteEntree, type SousPartie } from "@/components/backOffice/EnTeteEntree";

export default function TachesLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const parties: SousPartie[] = tachesDuBackOffice(user, profile).map((p) => ({
    href: `/back-office/taches/${p}`,
    label: t(`taches.pole.${p}`),
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
      <EnTeteEntree titre={t("backOffice.entrees.taches")} sousParties={parties} />
      {children}
    </div>
  );
}
