"use client";

// Back-Office › Réunions (agencement v18, B4 et B15 ; planche `v18-bo-reunions`) : une entrée à part,
// les réunions de ses pôles et de ses équipes (toutes pour un admin). En-tête « Réunions », sans rail
// (pas de sous-parties), « + Nouvelle réunion » ; dessous, deux volets : « À venir » puis « Passées »,
// la prochaine ouverte d'office ; la fiche, « nouvelle » et « modifier » dans le volet de droite.
// Affichage seulement : evenements/{id} garde ses règles.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { peutCreerDans, VoletsGestion } from "../evenements/ListeGestion";

export default function ReunionsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();

  const enTete = (
    <EnTetePage
      titre={t("backOffice.entrees.reunions")}
      sousTitre={t("backOffice.gestion.sousTitreReunions")}
      action={peutCreerDans(user, profile, true) && <BoutonNouveau label={t("backOffice.nouvelleReunion")} href="/back-office/reunions/nouvelle" />}
    />
  );
  return <VoletsGestion reunions enTete={enTete}>{children}</VoletsGestion>;
}
