"use client";

// L'en-tête de toute la section Harmonie (agencement v18, A16 de docs/spec-agencement-v18.md ;
// planche `v18-app-harmonie`) : « Harmonie », son sous-titre et le rail Fiches · Cours · Sons du
// RD-2000, posé par `app/harmonie/layout.tsx` au-dessus des trois listes (qui n'ont plus de titre).
// L'onglet se lit dans l'adresse. Sons du RD-2000 : pour les pianistes seulement, comme la page.
// Une fiche, une leçon ou un son ouvert seul (un volet : téléphone, tablette portrait) a son propre
// titre et son « ‹ » : l'en-tête de la section s'efface alors.

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail, type OngletRail } from "@/components/layout/Onglets";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";

const LISTES = ["/harmonie", "/harmonie/cours", "/harmonie/rd2000"];

export function EnTeteHarmonie() {
  const { t } = useTranslation();
  const acces = useAccesHarmonie();
  const deuxVolets = useDeuxVolets();
  const chemin = (usePathname() ?? "/harmonie").replace(/\/+$/, "");

  if (!deuxVolets && !LISTES.includes(chemin)) return null;

  const onglets: OngletRail[] = [
    { id: "fiches", label: t("harmonie.fiches"), href: "/harmonie" },
    { id: "cours", label: t("harmonie.cours.titre"), href: "/harmonie/cours" },
    ...(acces.piano ? [{ id: "rd2000", label: t("harmonie.rd2000.titre"), href: "/harmonie/rd2000" }] : []),
  ];

  return (
    <EnTetePage
      titre={t("harmonie.titre")}
      sousTitre={t("harmonie.sousTitre")}
      onglets={acces.peut && <OngletsRail etiquette={t("harmonie.titre")} onglets={onglets} />}
    />
  );
}
