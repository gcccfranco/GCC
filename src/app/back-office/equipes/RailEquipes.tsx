"use client";

// Back-Office › Équipes (lot U6, B2, table Q3) : l'organigramme pour qui a le droit Équipes,
// Personnes pour les admins (Inscriptions y est fusionné et Import retiré, retours du
// 06/10/2026 : « on va tout faire manuellement »). Le menu règle l'affichage seulement :
// equipes/{id} (isEquipier), users/{uid} et config/app (admins) gardent leurs règles.
// Agencement v18 (B8, B9 de docs/spec-agencement-v18.md) : chaque page pose l'en-tête commun
// (`EnTetePage`, même titre, même rail) avec son sous-titre et sa rangée ; ce rail en est la
// part commune.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { OngletsRail } from "@/components/layout/Onglets";

export function RailEquipes() {
  const { t } = useTranslation();
  const { user } = useProfile();
  // Une seule sous-partie (droit Équipes sans être admin) : pas de rail, comme avant.
  if (!isAdminUser(user)) return null;
  return (
    <OngletsRail
      etiquette={t("backOffice.entrees.equipes")}
      onglets={[
        { id: "organigramme", label: t("backOffice.parties.organigramme"), href: "/back-office/equipes" },
        { id: "personnes", label: t("backOffice.parties.personnes"), href: "/back-office/equipes/personnes" },
      ]}
    />
  );
}
