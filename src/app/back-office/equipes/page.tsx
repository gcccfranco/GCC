"use client";

// Équipes › Organigramme (agencement v18, B8) : l'en-tête commun, « Recalculer depuis
// l'organigramme » dans ses outils (admins, retours du 06/10/2026) et son résultat dessous ;
// les 13 équipes en bandeau, modifiables par qui a le droit Équipes.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { canEditerEquipes, isAdminUser } from "@/lib/access";
import { EquipesClient } from "@/app/equipes/EquipesClient";
import { useRecalculOrganigramme } from "@/components/equipes/RecalculerOrganigramme";
import { ReserveAuxAdmins } from "@/components/admin/commun";
import { RailEquipes } from "./RailEquipes";

export default function OrganigrammePage() {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const recalcul = useRecalculOrganigramme();
  if (!canEditerEquipes(user, profile)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes" />;
  const admin = isAdminUser(user);
  return (
    <EquipesClient
      gestion
      enTete={{
        titre: t("backOffice.entrees.equipes"),
        sousTitre: t("equipes.sousTitreGestion", { annee: new Date().getFullYear() }),
        outils: admin ? recalcul.bouton : undefined,
        onglets: admin ? <RailEquipes /> : undefined,
        sousEnTete: admin ? recalcul.resultat : undefined,
      }}
    />
  );
}
