"use client";

// Back-Office › Équipes (lot U6, B2, table Q3) : l'organigramme pour qui a le droit Équipes,
// Personnes pour les admins (Inscriptions y est fusionné et Import retiré, retours du
// 06/10/2026 : « on va tout faire manuellement »). Le menu règle l'affichage seulement :
// equipes/{id} (isEquipier), users/{uid} et config/app (admins) gardent leurs règles.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { EnTeteEntree, type SousPartie } from "@/components/backOffice/EnTeteEntree";

export default function EquipesLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useProfile();
  const parties: SousPartie[] = [
    { href: "/back-office/equipes", label: t("backOffice.parties.organigramme") },
    ...(isAdminUser(user)
      ? [{ href: "/back-office/equipes/personnes", label: t("backOffice.parties.personnes") }]
      : []),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-10">
      <EnTeteEntree titre={t("backOffice.entrees.equipes")} sousParties={parties} />
      {children}
    </div>
  );
}
