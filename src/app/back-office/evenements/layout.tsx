"use client";

// Back-Office › Évènements (lot U6, B3, table Q2) : Évènements (ceux qu'on gère) · Pâques · Noël
// (la scène, coordination ; docs/spec-scene-paques-noel.md, P7 : un onglet par fête à la place de
// « Scène ») ; les réunions ont leur entrée depuis l'agencement v18 (B15).
// Agencement v18 (B3, docs/spec-agencement-v18.md ; planche `v18-bo-evenements-a`) : l'en-tête est celui
// de toute la section, onglets compris (même titre, même sous-titre : le rail ne saute pas d'un onglet à
// l'autre) ; « + Nouvel évènement » sauf sur la scène. Sous l'en-tête, la liste et la fiche de gestion en
// deux volets (`VoletsGestion`) ; la scène, sous `/scene`, n'a pas la liste des évènements : ses deux
// volets sont ceux de la fête (`FeteGestion`), sous le halo de la scène. Le menu règle l'affichage
// seulement : evenements/{id} et programmes gardent leurs règles.
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { sousPartiesEvenements } from "@/lib/access";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail, type OngletRail } from "@/components/layout/Onglets";
import { Halo } from "@/components/layout/Halo";
import { FETES } from "@/lib/scene/fetes";
import { PLANNING_COLORS } from "@/lib/serviceColors";
import { peutCreerDans, VoletsGestion } from "./ListeGestion";

const BASE = "/back-office/evenements";
const SCENE = `${BASE}/scene`;

export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const chemin = (usePathname() || "").replace(/\/$/, "");
  const { user, profile } = useProfile();
  // La sous-partie « scene » donne les deux onglets des fêtes (P7), après « Évènements ».
  const onglets = sousPartiesEvenements(user, profile).flatMap((p): OngletRail[] => p === "scene"
    ? FETES.map((f) => ({ id: f, label: t(`evenements.tabs.${f}`), href: `${SCENE}/${f}` }))
    : [{ id: p, label: t(`backOffice.parties.${p}`), href: BASE }]);
  const scene = chemin === SCENE || chemin.startsWith(`${SCENE}/`);

  const enTete = (
    <EnTetePage
      titre={t("backOffice.entrees.evenements")}
      sousTitre={t("backOffice.gestion.sousTitreEvenements")}
      action={!scene && peutCreerDans(user, profile, false) && <BoutonNouveau label={t("evenements.nouveau")} href={`${BASE}/nouveau`} />}
      onglets={onglets.length > 1 && <OngletsRail etiquette={t("backOffice.sousParties")} onglets={onglets} />}
    />
  );

  if (scene) {
    return (
      <>
        <Halo color={PLANNING_COLORS.scene} />
        <div className="relative pb-16">
          {enTete}
          {children}
        </div>
      </>
    );
  }
  return <VoletsGestion reunions={false} enTete={enTete}>{children}</VoletsGestion>;
}
