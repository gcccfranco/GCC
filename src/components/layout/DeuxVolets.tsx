"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { disposerVolets, estSurLaListe } from "@/lib/deuxVolets";

// Deux volets des pages de liste (lot U4 bis, docs/spec-pages-en-grand.md, Q1 à Q3).
// Posé dans le layout de route d'une section (Q2) : la liste y reste montée d'un élément à
// l'autre (recherche, filtres, position), le détail est la page de l'adresse, qui ne change
// pas. En grand (règle de U5 Q1, `useDeuxVolets`) : la liste à gauche, collante et qui défile
// seule ; à droite la page, ou, sur l'adresse de la liste, le premier élément (Q3). Sinon un
// volet : la liste, puis la page, comme aujourd'hui. La règle elle-même : `disposerVolets`.
// Les deux volets prennent toute la zone de contenu, sans borne (retours du 06/10/2026 : bornés à
// `--largeur-lecture` et centrés, ils laissaient une bande vide à côté de la barre réduite).
// Agencement v18 (R10 de docs/spec-agencement-v18.md) : en grand, la liste est une CARTE en relief
// (rayon 16 px, sans filet), à `--marge-page` des bords, collante 20 px sous la barre du haut et qui
// défile seule ; la fiche prend le reste jusqu'à la marge de droite, sans fond, à `--ecart-volets`
// de la carte. Le titre de la page est au-dessus, dans `EnTetePage` (qui porte les 20 px d'écart) ;
// la fiche se titre en h2 de 24 px et ne pose plus de marge à gauche ni à droite.
// Retouches v18 (R3, D3, docs/spec-retouches-v18.md) : la carte tient dans la fenêtre. Son bas reste
// à 24 px du bas de la fenêtre : sous l'en-tête avant tout défilement, elle est plus courte, puis,
// collée sous la barre du haut, elle a la hauteur de la fenêtre moins cette barre. Sa hauteur suit
// son haut dans la fenêtre (`--haut-liste`), relu au défilement et quand la page change de taille.

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
  const carte = useRef<HTMLDivElement>(null);
  const avecListe = Boolean(volets.liste);

  useEffect(() => {
    const el = carte.current;
    if (!deuxVolets || !avecListe || !el) return;
    let image = 0;
    const relire = () => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => el.style.setProperty("--haut-liste", `${el.getBoundingClientRect().top}px`));
    };
    relire();
    window.addEventListener("scroll", relire, { passive: true });
    window.addEventListener("resize", relire);
    const taille = new ResizeObserver(relire);
    taille.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", relire);
      window.removeEventListener("resize", relire);
      taille.disconnect();
      el.style.removeProperty("--haut-liste");
    };
  }, [deuxVolets, avecListe]);
  // Les deux emplacements restent à la même place quel que soit le cas : la page n'est pas
  // remontée quand la fenêtre passe d'un volet à deux (rien n'est relu ni refait). La section
  // n'est pas remontée d'une adresse à l'autre (`SECTIONS_EN_DEUX_VOLETS`, PageTransition) :
  // le fondu se fait ici, sur le volet qui change (`.page-fade`, opacité seule).
  return (
    <div
      data-deux-volets={deuxVolets ? "" : undefined}
      className={deuxVolets ? "flex items-start gap-[var(--ecart-volets)] px-[var(--marge-page)] pb-6" : undefined}
      style={deuxVolets ? ({ "--largeur-liste": `${largeurListe}px` } as CSSProperties) : undefined}
    >
      {volets.liste && (
        <div
          ref={carte}
          data-volet="liste"
          className={
            deuxVolets
              ? "page-fade sticky top-[calc(var(--nav-h)+20px)] max-h-[calc(100dvh-var(--haut-liste,calc(var(--nav-h)+20px))-24px)] w-[var(--largeur-liste)] shrink-0 overflow-y-auto overscroll-contain raised rounded-2xl"
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
