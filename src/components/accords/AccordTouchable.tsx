"use client";

// Dictionnaire d'accords (lot DA, DA-3) — un accord de partition qui s'ouvre au toucher.
//
// Hors d'un `AccordsProvider` actif (édition, mode louange, pages sans fournisseur) il rend le texte nu :
// aucun élément de plus, aucune classe de plus. Actif, chaque accord de l'étiquette devient un bouton en
// ligne, sans rien de visible au repos (Q16) : souligné au survol de la souris, léger fond à l'appui.
// L'étiquette « G (G/B) » donne deux boutons ; ce qui n'est pas un accord (parenthèses, séparateurs) reste texte.

import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { accordsDeLEtiquette } from "@/lib/accords/analyse";
import { useOuvrirAccord } from "./AccordsProvider";

type Morceau = { texte: string; accord: boolean };

/** Découpe l'étiquette affichée en accords et en texte, sans rien perdre ni ajouter. */
function decouper(etiquette: string): Morceau[] {
  const sortie: Morceau[] = [];
  let curseur = 0;
  for (const accord of accordsDeLEtiquette(etiquette)) {
    const i = etiquette.indexOf(accord, curseur);
    if (i < 0) continue;
    if (i > curseur) sortie.push({ texte: etiquette.slice(curseur, i), accord: false });
    sortie.push({ texte: accord, accord: true });
    curseur = i + accord.length;
  }
  if (curseur < etiquette.length) sortie.push({ texte: etiquette.slice(curseur), accord: false });
  return sortie;
}

const REPOS =
  "relative cursor-pointer rounded-[3px] px-[2px] -mx-[2px] outline-none [-webkit-tap-highlight-color:transparent] " +
  "before:absolute before:left-1/2 before:top-1/2 before:h-10 before:min-h-full before:w-full before:min-w-8 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] " +
  "focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:underline " +
  "active:bg-[color-mix(in_srgb,currentColor_16%,transparent)]";

// Dans « Idées d'harmonie » le bouton se voit : fond de la couleur d'accord (~12 %), gras, rayon 6.
const VISIBLE =
  "cursor-pointer rounded-md bg-[color-mix(in_srgb,currentColor_12%,transparent)] px-1.5 py-0.5 font-bold outline-none " +
  "[-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-ring " +
  "[@media(hover:hover)]:hover:underline active:bg-[color-mix(in_srgb,currentColor_20%,transparent)]";

export function AccordTouchable({
  etiquette,
  capo,
  visible = false,
}: {
  /** L'accord ou l'étiquette tels qu'affichés (transposés). */
  etiquette: string;
  /** Capo : l'étiquette est déjà en positions, le panneau le rappelle. */
  capo?: number;
  /** Bouton visible au repos (feuille d'idées) ; la bulle d'aide l'ignore alors. */
  visible?: boolean;
}) {
  const { actif } = useOuvrirAccord();
  if (!actif) return <>{etiquette}</>;
  return <Actifs etiquette={etiquette} capo={capo} visible={visible} />;
}

function Actifs({ etiquette, capo, visible }: { etiquette: string; capo?: number; visible: boolean }) {
  const { t } = useTranslation();
  const { ouvrir, enregistrer } = useOuvrirAccord();
  const premier = useRef<HTMLSpanElement>(null);

  // Le premier accord de l'étiquette s'annonce à la bulle d'aide.
  useEffect(() => {
    const el = premier.current;
    return el && !visible ? enregistrer(el) : undefined;
  }, [enregistrer, visible]);

  const morceaux = decouper(etiquette);
  const indexPremier = morceaux.findIndex((m) => m.accord);
  return (
    <span>
      {morceaux.map((m, i) => {
        if (!m.accord) return m.texte;
        const ref = i === indexPremier ? premier : undefined;
        const ouvrirCelui = (el: HTMLElement) => ouvrir({ accord: m.texte, ancre: el, capo });
        return (
          <span
            key={i}
            ref={ref}
            role="button"
            tabIndex={0}
            data-accord-touchable={m.texte}
            aria-label={t("accords.voirComment", { accord: m.texte })}
            className={visible ? VISIBLE : REPOS}
            onClick={(e) => ouvrirCelui(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              ouvrirCelui(e.currentTarget);
            }}
          >
            {m.texte}
          </span>
        );
      })}
    </span>
  );
}
