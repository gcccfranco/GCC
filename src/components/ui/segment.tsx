"use client";

// `Segment` : CHOISIR UNE VUE (rail gris, pastille blanche). Le réglage on/off, lui, est `Bascule` (fond noir) : B11 de docs/spec-corrections-interface.md.
// Les classes de la piste et de l'option sont exportées pour les rangées qui ne peuvent pas prendre le composant (SectionTabs).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFonduLateral } from "@/hooks/useFonduLateral";
import { TOUCHER_RANGEE } from "@/lib/toucher44";

export type OngletRail = {
  /** Identifiant de l'onglet (rendu par `choisir`, comparé à `actif`). */
  id: string;
  label: ReactNode;
  /** Un lien : le rail est une navigation (`aria-current="page"`) ; sinon un bouton (`role="tab"`).
   *  Dans un rail de liens, chaque onglet a le sien (sans lui, l'onglet mènerait à `#`). */
  href?: string;
  /** Un nombre après le libellé (« DA · 4 »). */
  compte?: number;
  /** Une pastille de couleur devant le libellé (Paix · Fidélité · Bonté). */
  couleur?: string;
};

/** L'onglet d'une adresse : celui dont le `href` est le plus long préfixe du chemin (par segments). */
function ongletDuChemin(onglets: OngletRail[], chemin: string): string | undefined {
  const c = chemin.replace(/\/$/, "") || "/";
  let meilleur: { id: string; longueur: number } | undefined;
  for (const o of onglets) {
    if (!o.href) continue;
    const h = o.href.split("?")[0].replace(/\/$/, "") || "/";
    if ((c === h || c.startsWith(`${h}/`)) && (!meilleur || h.length > meilleur.longueur)) meilleur = { id: o.id, longueur: h.length };
  }
  return meilleur?.id;
}

/** La piste du Segment (sans la disposition : `inline-flex min-w-max` pour le composant, `flex` défilant pour une rangée de liens). */
export const segmentPiste = (surGris = false) =>
  cn("gap-0.5 rounded-full p-[3px]", surGris ? "bg-secondary-fond dark:bg-secondary" : "bg-secondary");

/** Une option du Segment : l'active en pastille blanche. */
export const segmentOption = (on: boolean, surGris = false) =>
  cn(
    "flex h-[30px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-[background-color,color] duration-150 [@media(pointer:coarse)]:h-[34px]",
    TOUCHER_RANGEE,
    on ? "bg-pose text-foreground shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : (surGris ? "text-foreground/70 dark:text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"),
  );

/**
 * Le rail gris. Liens (sous-parties, une adresse par onglet) :
 *   <Segment etiquette="Équipes" onglets={[{ id: "orga", label: "Organigramme", href: "/back-office/equipes" },
 *                                              { id: "personnes", label: "Personnes", href: "/back-office/equipes/personnes" }]} />
 * (l'onglet actif se lit dans le CHEMIN de l'adresse ; `actif` le force). Des liens qui ne diffèrent que
 * par la query (`?vue=a`, `?vue=b`) ont le même chemin : `actif` est alors obligatoire, sans quoi le
 * premier resterait choisi. Boutons (vues dans la page) :
 *   <Segment etiquette="Période" onglets={[{ id: "avenir", label: "À venir" }, { id: "passes", label: "Passés" }]}
 *                actif={vue} choisir={setVue} />
 * En boutons, le motif ARIA des onglets à activation manuelle : un seul arrêt de tabulation (l'onglet
 * choisi), ← et → (en boucle), Début et Fin déplacent le focus, Entrée ou Espace choisit. Pas de
 * `aria-controls` : la vue choisie est la page sous l'en-tête, pas un panneau à part.
 * Il défile en largeur quand il ne tient pas (téléphone).
 */
export function Segment({
  etiquette,
  onglets,
  actif,
  choisir,
  className,
  pleineLargeur = false,
  surGris = false,
}: {
  /** Nom du groupe d'onglets, lu par les lecteurs d'écran. */
  etiquette: string;
  onglets: OngletRail[];
  /** L'onglet choisi ; pour des liens, déduit de l'adresse s'il manque. */
  actif?: string;
  /** Pour des boutons : appelé avec l'`id` de l'onglet touché. */
  choisir?: (id: string) => void;
  className?: string;
  /** Les onglets se partagent toute la largeur (la vue principale d'une page au téléphone) ; sinon le rail prend celle de son contenu. */
  pleineLargeur?: boolean;
  /** Recette de surface (C) : le rail posé sur le fond de groupe est une piste `--secondary-fond` (curseur blanc), libellés inactifs à 70 % d'encre (≥ 4,5:1). */
  surGris?: boolean;
}) {
  const chemin = usePathname() ?? "";
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const liens = onglets.some((o) => o.href);
  const courant = actif ?? (liens ? ongletDuChemin(onglets, chemin) : undefined);
  // Lot CD, T3a (jeu B) : 36 px au pointeur fin, 40 au toucher (piste) ; l'onglet fait 30 / 34 px dedans (marge de 3 px) et sa
  // zone de toucher 44 px (`::after`, TOUCHER_RANGEE).
  const classe = (on: boolean) => cn(segmentOption(on, surGris), pleineLargeur && "flex-1");
  const contenu = (o: OngletRail) => (
    <>
      {o.couleur && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.couleur }} />}
      {o.label}
      {o.compte !== undefined && <span className="tabular-nums opacity-70">· {o.compte}</span>}
    </>
  );
  // plannings-2 : le rail serré s'estompe du côté où il reste des onglets et ramène l'actif en vue. Le défilant (`railRef`) est
  // transparent et porte 2 px de rembourrage vertical au toucher (compensés par une marge négative) : il garde ainsi la zone
  // de 44 px des onglets, que son `overflow` rognerait sur la piste seule. La piste (`data-onglets="rail"`) est dedans.
  const railRef = useFonduLateral<HTMLDivElement>(onglets.length);
  const defilant = "fondu-lateral flex max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [@media(pointer:coarse)]:-my-0.5 [@media(pointer:coarse)]:py-0.5";
  const rail = cn("inline-flex min-w-max", segmentPiste(surGris), pleineLargeur && "w-full", className);
  // Centre la pastille active dans le rail : sans animation au montage, en douceur ensuite (instantané sous `prefers-reduced-motion`).
  const premierPassage = useRef(true);
  useEffect(() => {
    const el = railRef.current;
    const on = el?.querySelector<HTMLElement>('[aria-selected="true"], [aria-current="page"]');
    if (!el || !on) return;
    // (le rail n'est pas positionné : `offsetLeft` serait relatif à un ancêtre, d'où les rectangles)
    const left = el.scrollLeft + on.getBoundingClientRect().left - el.getBoundingClientRect().left - (el.clientWidth - on.offsetWidth) / 2;
    const doux = !premierPassage.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    premierPassage.current = false;
    if (doux) el.scrollTo({ left, behavior: "smooth" });
    else el.scrollLeft = left;
  }, [courant, railRef]);

  if (liens) {
    return (
      <div ref={railRef} className={defilant}>
        <nav aria-label={etiquette} data-onglets="rail" className={rail}>
          {onglets.map((o) => (
            <Link key={o.id} href={o.href ?? "#"} aria-current={courant === o.id ? "page" : undefined} className={classe(courant === o.id)}>
              {contenu(o)}
            </Link>
          ))}
        </nav>
      </div>
    );
  }
  // Le seul arrêt de tabulation : l'onglet choisi, ou le premier.
  const arret = Math.max(0, onglets.findIndex((o) => o.id === courant));
  const auClavier = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = boutons.current.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const n = onglets.length;
    const cible = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number | undefined>)[e.key];
    if (cible === undefined) return;
    e.preventDefault();
    boutons.current[cible]?.focus();
  };
  return (
    <div ref={railRef} className={defilant}>
      <div role="tablist" aria-label={etiquette} data-onglets="rail" className={rail} onKeyDown={auClavier}>
        {onglets.map((o, i) => (
          <button
            key={o.id}
            ref={(b) => { boutons.current[i] = b; }}
            type="button"
            role="tab"
            aria-selected={courant === o.id}
            tabIndex={i === arret ? 0 : -1}
            onClick={() => choisir?.(o.id)}
            className={classe(courant === o.id)}
          >
            {contenu(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
