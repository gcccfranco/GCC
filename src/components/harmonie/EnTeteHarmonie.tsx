"use client";

// L'en-tête de toute la section Harmonie (agencement v18, A16 de docs/spec-agencement-v18.md ;
// planche `v18-app-harmonie`) : « Harmonie » et son sous-titre, posé par `app/harmonie/layout.tsx`
// au-dessus des trois listes (qui n'ont plus de titre). Le rail Fiches · Cours · Sons du RD-2000 est
// parti (EM-2, spec-espace-musiciens.md) : la barre de l'espace Musiciens porte ces entrées.
// Une fiche, une leçon ou un son ouvert seul (un volet : téléphone, tablette portrait) a son propre
// titre et son « ‹ » : l'en-tête de la section s'efface alors. Sans accès (ni piano ni guitare), pas
// d'en-tête : la page dit seulement qu'elle est réservée aux musiciens.

import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";

const LISTES = ["/harmonie", "/harmonie/cours", "/harmonie/rd2000"];

export function EnTeteHarmonie() {
  const { t } = useTranslation();
  const acces = useAccesHarmonie();
  const deuxVolets = useDeuxVolets();
  const chemin = (usePathname() ?? "/harmonie").replace(/\/+$/, "");

  if (!deuxVolets && !LISTES.includes(chemin)) return null;
  if (!acces.chargement && !acces.peut) return null;

  return (
    <EnTetePage
      titre={t("harmonie.titre")}
      sousTitre={t("harmonie.sousTitre")}
    />
  );
}
