"use client";

import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { disposerVolets, estSurLaListe } from "@/lib/deuxVolets";

// Deux volets des pages de liste (lot U4 bis, docs/spec-pages-en-grand.md, Q1 à Q3).
// Posé dans le layout de route d'une section (Q2) : la liste y reste montée d'un élément à
// l'autre (recherche, filtres, position), le détail est la page de l'adresse, qui ne change
// pas. En grand (règle de U5 Q1, `useDeuxVolets`) : la liste à gauche, collante et qui défile
// seule ; à droite la page, ou, sur l'adresse de la liste, le premier élément (Q3). Sinon un
// volet : la liste, puis la page, comme aujourd'hui. La règle elle-même : `disposerVolets`.

export function DeuxVolets({
  racine,
  liste,
  premier = null,
  largeurListe = 380,
  children,
}: {
  /** Adresse de la liste (`/mes-services`) : sur elle, aucun élément n'est choisi. */
  racine: string;
  /** Le volet de gauche. */
  liste: ReactNode;
  /** En grand sur l'adresse de la liste : le premier élément de la liste telle qu'elle est
   *  filtrée (Q3), ou son état vide ; l'adresse ne change qu'au premier toucher. */
  premier?: ReactNode;
  /** Largeur du volet de gauche en grand, en px (380 à 420 sur la planche). */
  largeurListe?: number;
  /** La page de l'adresse : la fiche choisie. */
  children: ReactNode;
}) {
  const deuxVolets = useDeuxVolets();
  const chemin = usePathname() ?? racine;
  const volets = disposerVolets(deuxVolets, estSurLaListe(chemin, racine));
  // Les deux emplacements restent à la même place quel que soit le cas : la page n'est pas
  // remontée quand la fenêtre passe d'un volet à deux (rien n'est relu ni refait). La section
  // n'est pas remontée d'une adresse à l'autre (`SECTIONS_EN_DEUX_VOLETS`, PageTransition) :
  // le fondu se fait ici, sur le volet qui change (`.page-fade`, opacité seule).
  return (
    <div
      data-deux-volets={deuxVolets ? "" : undefined}
      className={deuxVolets ? "mx-auto flex max-w-[var(--largeur-lecture)] items-start" : undefined}
      style={deuxVolets ? ({ "--largeur-liste": `${largeurListe}px` } as CSSProperties) : undefined}
    >
      {volets.liste && (
        <div
          data-volet="liste"
          className={
            deuxVolets
              ? "page-fade sticky top-[var(--nav-h)] h-[calc(100dvh-var(--nav-h))] w-[var(--largeur-liste)] shrink-0 overflow-y-auto overscroll-contain border-r border-border bg-card"
              : "page-fade"
          }
        >
          {liste}
        </div>
      )}
      {volets.droite && (
        <div key={chemin} data-volet="detail" className={deuxVolets ? "page-fade min-w-0 flex-1" : "page-fade"}>
          {volets.droite === "page" ? children : premier}
        </div>
      )}
    </div>
  );
}
