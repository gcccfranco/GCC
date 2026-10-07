"use client";

// Back-Office › Évènements (lot U6, B3, table Q2) : Évènements (ceux qu'on gère) · Scène
// (coordination, écran de U1) ; les réunions ont leur entrée depuis l'agencement v18 (B15).
// Agencement v18 (B3, docs/spec-agencement-v18.md ; planche `v18-bo-evenements-a`) : l'en-tête est celui
// de toute la section, onglets compris (même titre, même sous-titre : le rail ne saute pas d'un onglet à
// l'autre) ; « + Nouvel évènement » sauf sur la scène. Sous l'en-tête, la liste et la fiche de gestion en
// deux volets (`VoletsGestion`) ; la scène, sous `/scene`, n'a pas la liste des évènements. Le menu règle
// l'affichage seulement : evenements/{id} et programmes gardent leurs règles.
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { sousPartiesEvenements } from "@/lib/access";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail } from "@/components/layout/Onglets";
import { peutCreerDans, VoletsGestion } from "./ListeGestion";

const BASE = "/back-office/evenements";
const ADRESSES = { evenements: BASE, scene: `${BASE}/scene` } as const;

export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const chemin = (usePathname() || "").replace(/\/$/, "");
  const { user, profile } = useProfile();
  const parties = sousPartiesEvenements(user, profile);
  const scene = chemin === ADRESSES.scene || chemin.startsWith(`${ADRESSES.scene}/`);

  const enTete = (
    <EnTetePage
      titre={t("backOffice.entrees.evenements")}
      sousTitre={t("backOffice.gestion.sousTitreEvenements")}
      action={!scene && peutCreerDans(user, profile, false) && <BoutonNouveau label={t("evenements.nouveau")} href={`${BASE}/nouveau`} />}
      onglets={parties.length > 1 && (
        <OngletsRail
          etiquette={t("backOffice.sousParties")}
          onglets={parties.map((p) => ({ id: p, label: t(`backOffice.parties.${p}`), href: ADRESSES[p] }))}
        />
      )}
    />
  );

  if (scene) {
    return (
      <div className="pb-16">
        {enTete}
        <div className="px-[var(--marge-page)]">{children}</div>
      </div>
    );
  }
  return <VoletsGestion reunions={false} enTete={enTete}>{children}</VoletsGestion>;
}
