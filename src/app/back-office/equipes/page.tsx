"use client";

// Équipes › Organigramme (agencement v18, B8) : l'en-tête commun, « Recalculer depuis
// l'organigramme » dans ses outils (admins, retours du 06/10/2026) et son résultat dessous ;
// les 13 équipes en bandeau, modifiables par qui a le droit Équipes.
// Lot 2 du chantier « équipes et groupes » (docs/spec-organigrammes-groupes.md, OG-C, OG26) : le
// sélecteur Église · Paix · … sous l'en-tête (`?groupe=`, sans entrée d'historique) ; la page s'ouvre
// aussi au président et aux VP d'un groupe, qui voient tous les organigrammes et tiennent le leur.
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { canEditerEquipes, canTenirGroupe, isAdminUser, tientUnGroupe } from "@/lib/access";
import { EquipesClient } from "@/app/equipes/EquipesClient";
import { useRecalculOrganigramme } from "@/components/equipes/RecalculerOrganigramme";
import { ReserveAuxAdmins } from "@/components/admin/commun";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OrganigrammeGroupe, useOrganigrammes } from "@/components/groupes/OrganigrammeGroupe";
import { SelecteurGroupes } from "@/components/groupes/SelecteurGroupes";
import { TABLE_GROUPES, estGroupeId, type GroupeId } from "@/lib/groupes/table";
import { RailEquipes } from "./RailEquipes";

export default function Page() {
  // `?groupe=` se lit par `useSearchParams` : sous une frontière Suspense.
  return (
    <Suspense>
      <OrganigrammePage />
    </Suspense>
  );
}

function OrganigrammePage() {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const recalcul = useRecalculOrganigramme();
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const organigrammes = useOrganigrammes();
  const eglise = canEditerEquipes(user, profile);
  if (!eglise && !tientUnGroupe(user, profile)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes" />;
  const admin = isAdminUser(user, profile);

  // Ouverture : `?groupe=` ; sinon le groupe que tient un président ou un VP sans le droit Équipes ; sinon Église.
  const demande = params.get("groupe") ?? "";
  const sien = TABLE_GROUPES.find((g) => canTenirGroupe(user, profile, g.id))?.id ?? null;
  // Église choisie à la main : `?groupe=eglise`, pour qu'un président ne soit pas renvoyé à son groupe.
  const groupe: GroupeId | null = estGroupeId(demande) ? demande : eglise || demande === "eglise" ? null : sien;
  const choisir = (g: GroupeId | null) => router.replace(`${chemin}?groupe=${g ?? "eglise"}`, { scroll: false });
  const selecteur = <SelecteurGroupes valeur={groupe} choisir={choisir} />;
  const rail = admin ? <RailEquipes /> : undefined;

  if (groupe) {
    const lu = organigrammes.lus?.find((l) => l.groupe.id === groupe);
    // Lecture en cours ou refusée (règles pas encore publiées) : l'en-tête et le sélecteur restent.
    if (!lu) {
      return (
        <EnTetePage
          titre={t("backOffice.entrees.equipes")}
          onglets={rail}
          apres={
            <>
              {selecteur}
              {organigrammes.erreur && (
                <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
                  {t("groupes.lectureImpossible")}
                  <button type="button" onClick={organigrammes.relire} className="font-semibold underline">{t("groupes.recharger")}</button>
                </p>
              )}
            </>
          }
        />
      );
    }
    return (
      <OrganigrammeGroupe
        key={groupe}
        lu={lu}
        profils={organigrammes.profils}
        selecteur={selecteur}
        onglets={rail}
        onLu={organigrammes.remplacer}
        onRelire={organigrammes.relire}
      />
    );
  }
  return (
    <EquipesClient
      gestion
      selecteur={selecteur}
      enTete={{
        titre: t("backOffice.entrees.equipes"),
        sousTitre: t("equipes.sousTitreGestion", { annee: new Date().getFullYear() }),
        outils: admin ? recalcul.bouton : undefined,
        onglets: rail,
        sousEnTete: admin ? recalcul.resultat : undefined,
      }}
    />
  );
}
