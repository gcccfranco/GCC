"use client";

// App › Équipes (lot 2 du chantier « équipes et groupes », docs/spec-organigrammes-groupes.md, OG-E) :
// le sélecteur Église · Paix · Fidélité · Bonté · Amour · Joie, ouvert sur le groupe de la personne
// (« Toi » en tête), sinon sur l'église ; tout se lit, même pour un admin. `?groupe=` s'écrit sans
// entrée d'historique ; la page se lit sous `Suspense`.
import { Suspense, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { EquipesClient } from "./EquipesClient";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Halo } from "@/components/layout/Halo";
import { OrganigrammeGroupe, useOrganigrammes } from "@/components/groupes/OrganigrammeGroupe";
import { SelecteurGroupes } from "@/components/groupes/SelecteurGroupes";
import { groupeDe } from "@/lib/groupes/organigramme";
import { estGroupeId, type GroupeId } from "@/lib/groupes/table";

export function EquipesApp() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}

function Page() {
  const { t } = useTranslation();
  const { profile, loading } = useProfile();
  const params = useSearchParams();
  const router = useRouter();
  const chemin = usePathname();
  const organigrammes = useOrganigrammes();

  // Ouverture : `?groupe=` s'il est donné (`eglise` = l'église) ; sinon le groupe de la personne, sinon l'église.
  const demande = params.get("groupe") ?? "";
  const sien = profile ? groupeDe(profile) : null;
  const groupe: GroupeId | null = estGroupeId(demande) ? demande : demande === "eglise" ? null : sien;
  const choisir = (g: GroupeId | null) => router.replace(`${chemin}?groupe=${g ?? "eglise"}`, { scroll: false });
  const selecteur = <SelecteurGroupes valeur={groupe} choisir={choisir} />;

  // Le profil arrive après le premier rendu : sans `?groupe=`, on attend de savoir de quel groupe est la personne.
  if (!groupe && !demande && loading) return <Attente selecteur={selecteur} />;
  if (!groupe) return <EquipesClient selecteur={selecteur} />;
  const lu = organigrammes.lus?.find((l) => l.groupe.id === groupe);
  // Lecture en cours ou refusée : l'en-tête et le sélecteur restent.
  if (!lu) return <Attente selecteur={selecteur} erreur={organigrammes.erreur} relire={organigrammes.relire} />;
  return (
    <OrganigrammeGroupe
      key={groupe}
      app
      lu={lu}
      profils={organigrammes.profils}
      selecteur={selecteur}
      onLu={organigrammes.remplacer}
      onRelire={organigrammes.relire}
    />
  );
}

/** L'en-tête et le sélecteur, pendant qu'on attend le profil ou les organigrammes (ou qu'une lecture a échoué). */
function Attente({ selecteur, erreur = false, relire }: { selecteur: ReactNode; erreur?: boolean; relire?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="relative" aria-busy={!erreur}>
      <Halo variant="moi" color="hsl(var(--foreground))" />
      <div className="relative">
        <EnTetePage
          titre={t("equipes.title")}
          sousTitre={t("groupes.app.sousTitre")}
          apres={
            <>
              {selecteur}
              {erreur && (
                <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
                  {t("groupes.lectureImpossible")}
                  <button type="button" onClick={relire} className="font-semibold underline">{t("groupes.recharger")}</button>
                </p>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
