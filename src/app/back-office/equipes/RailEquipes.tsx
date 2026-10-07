"use client";

// Back-Office › Équipes (lot U6, B2, table Q3) : l'organigramme pour qui a le droit Équipes,
// Personnes pour les admins (Inscriptions y est fusionné et Import retiré, retours du
// 06/10/2026 : « on va tout faire manuellement »). Le menu règle l'affichage seulement :
// equipes/{id} (isEquipier), users/{uid} et config/app (admins) gardent leurs règles.
// Agencement v18 (B8, B9 de docs/spec-agencement-v18.md) : chaque page pose l'en-tête commun
// (`EnTetePage`, même titre, même rail) avec son sous-titre et sa rangée ; ce rail en est la
// part commune. Admins seuls : la page ne le pose pas sinon (une seule sous-partie, pas de rail,
// et pas sa place vide dans l'en-tête).
import { useTranslation } from "react-i18next";
import { OngletsRail } from "@/components/layout/Onglets";

export function RailEquipes() {
  const { t } = useTranslation();
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
