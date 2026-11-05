"use client";

// Les deux sortes d'onglets du site (agencement v18, R4 et R5 de docs/spec-agencement-v18.md).
// Une exception se discute, elle ne s'invente pas (planche `v18-bo-regles-communes`) :
// - `OngletsRail`, le rail gris à pastille blanche : CHOISIR UNE VUE. Les sous-parties d'une entrée
//   (Organigramme · Personnes, Réception · Notifier · Questionnaire, Calendrier · Pâques · Noël…) et
//   les vues d'une page (À venir · Passés, T1 à T4, Paix · Fidélité · Bonté, Équipes · Musiciens…). Sous le titre.
// - `Pilules` : filtres (catégories, périodes, audiences, Tout · Mes équipes du Back-office…) et
//   les plannings, l'actif à la couleur de son service.
// Ont remplacé `EnTeteEntree`, `FilterButtons`, `SectionTabs` en grand (il reste la barre collante des
// plannings sur téléphone et tablette, R6) et les boutons de groupes (tranche Z).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFonduLateral } from "@/hooks/useFonduLateral";
import { TOUCHER_PILULE, TOUCHER_RANGEE } from "@/lib/toucher44";

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

/**
 * Le rail gris. Liens (sous-parties, une adresse par onglet) :
 *   <OngletsRail etiquette="Équipes" onglets={[{ id: "orga", label: "Organigramme", href: "/back-office/equipes" },
 *                                              { id: "personnes", label: "Personnes", href: "/back-office/equipes/personnes" }]} />
 * (l'onglet actif se lit dans le CHEMIN de l'adresse ; `actif` le force). Des liens qui ne diffèrent que
 * par la query (`?vue=a`, `?vue=b`) ont le même chemin : `actif` est alors obligatoire, sans quoi le
 * premier resterait choisi. Boutons (vues dans la page) :
 *   <OngletsRail etiquette="Période" onglets={[{ id: "avenir", label: "À venir" }, { id: "passes", label: "Passés" }]}
 *                actif={vue} choisir={setVue} />
 * En boutons, le motif ARIA des onglets à activation manuelle : un seul arrêt de tabulation (l'onglet
 * choisi), ← et → (en boucle), Début et Fin déplacent le focus, Entrée ou Espace choisit. Pas de
 * `aria-controls` : la vue choisie est la page sous l'en-tête, pas un panneau à part.
 * Il défile en largeur quand il ne tient pas (téléphone).
 */
export function OngletsRail({
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
  const classe = (on: boolean) =>
    cn(
      "flex h-[30px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-[background-color,color] duration-150 [@media(pointer:coarse)]:h-[34px]",
      TOUCHER_RANGEE,
      pleineLargeur && "flex-1",
      on ? "bg-pose text-foreground shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : (surGris ? "text-foreground/70 dark:text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground"),
    );
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
  const rail = cn("inline-flex min-w-max gap-0.5 rounded-full p-[3px]", surGris ? "bg-secondary-fond dark:bg-secondary" : "bg-secondary", pleineLargeur && "w-full", className);
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

/**
 * Les pilules : un choix dans une rangée (sous-onglet, filtre, planning). Retoucher la pilule
 * active retire le filtre, sauf `obligatoire`. L'active est en encre, ou à sa `couleur` :
 *   <Pilules etiquette="Plannings" valeur={cle} choisir={setCle} obligatoire
 *            options={[{ cle: "culte", nom: "Culte Franco", couleur: PLANNING_COLORS.culte }, …]} />
 * Avec un `href` par option, les pilules sont des liens (une navigation, `aria-current="page"` sur
 * l'active : les plannings, T4a).
 * Taille (lot CD, T3a, jeu B) : une règle pour toutes, selon l'appareil et jamais selon la page — 28 px de haut et 13 px
 * en semi-gras au pointeur fin, 32 px et 14 px au toucher, portés à 44 px par un `::after` (TOUCHER_PILULE). Marge de
 * 12 px, 6 px entre deux, rayon plein. Au pointeur fin la rangée passe à la ligne ; au toucher elle défile avec un fondu
 * (douze sensations sur un téléphone). Inactive : `--secondary` ; active : `--primary`, ou sa `couleur`.
 * `pastille` (organigrammes des groupes, lot 2, OG-C) : un point de la couleur devant le nom, sur
 * toutes les pilules, active comprise (blanc sur la couleur).
 */
export function Pilules<T extends string>({
  etiquette,
  options,
  valeur,
  choisir,
  obligatoire,
  aLaLigne,
}: {
  /** Nom du groupe de filtres, lu par les lecteurs d'écran. */
  etiquette: string;
  /** `couleur` : celle de la pilule active (le service d'un planning) ; l'encre sinon. `href` : un lien. */
  options: { cle: T; nom: string; couleur?: string; href?: string; pastille?: string }[];
  valeur: T | null;
  /** `null` = filtre retiré (retoucher la pilule active l'enlève). */
  choisir: (v: T | null) => void;
  /** Un choix est toujours actif (instrument) : on ne peut pas le retirer. */
  obligatoire?: boolean;
  /** La rangée passe à la ligne même au toucher, au lieu de défiler (peu de choix dans une carte étroite : « À qui »). */
  aLaLigne?: boolean;
}) {
  const liens = options.some((o) => o.href);
  const Rangee = liens ? "nav" : "div";
  // La rangée s'estompe du côté où il reste des pastilles, au lieu d'en trancher une (musiciens-4).
  const rangee = useFonduLateral<HTMLDivElement>(options.length);
  // Au toucher la rangée défile : une valeur posée ne doit pas rester cachée hors écran. Au montage, sans animation.
  useEffect(() => {
    const el = rangee.current;
    const on = el?.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]');
    if (!el || !on || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: el.scrollLeft + on.getBoundingClientRect().left - el.getBoundingClientRect().left - (el.clientWidth - on.offsetWidth) / 2, behavior: "instant" });
  }, [rangee]);
  return (
    <Rangee
      ref={rangee}
      role={liens ? undefined : "group"}
      aria-label={etiquette}
      data-onglets="pilules"
      className={cn(
        "flex flex-wrap gap-1.5",
        // À la ligne : la zone de toucher des pilules déborde de 3 px de chaque côté ; le rembourrage la garde dans la rangée (pas de défilement latéral).
        aLaLigne && "[@media(pointer:coarse)]:-mx-[3px] [@media(pointer:coarse)]:px-[3px]",
        // Au toucher : une rangée qui défile ; 6 px de rembourrage vertical (compensés) gardent la zone de 44 px des pilules de 32 px.
        !aLaLigne && "[@media(pointer:coarse)]:fondu-lateral [@media(pointer:coarse)]:-mx-4 [@media(pointer:coarse)]:-my-1.5 [@media(pointer:coarse)]:flex-nowrap [@media(pointer:coarse)]:overflow-x-auto [@media(pointer:coarse)]:px-4 [@media(pointer:coarse)]:py-1.5 [@media(pointer:coarse)]:[scrollbar-width:none] [@media(pointer:coarse)]:[&::-webkit-scrollbar]:hidden",
      )}
    >
      {options.map((o) => {
        const actif = valeur === o.cle;
        const style = actif && o.couleur ? { backgroundColor: o.couleur, color: "#fff" } : undefined;
        const classe = cn(
          "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition-colors duration-150 [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:text-[14px]",
          TOUCHER_PILULE,
          actif ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground active:bg-secondary/70",
        );
        const point = o.pastille && (
          <span aria-hidden className="mr-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: actif && o.couleur ? "#fff" : o.pastille }} />
        );
        if (o.href) {
          return (
            <Link key={o.cle} href={o.href} aria-current={actif ? "page" : undefined} style={style} className={classe}>
              {point}{o.nom}
            </Link>
          );
        }
        return (
          <button
            key={o.cle}
            type="button"
            aria-pressed={actif}
            onClick={() => choisir(actif && !obligatoire ? null : o.cle)}
            style={style}
            className={classe}
          >
            {point}{o.nom}
          </button>
        );
      })}
    </Rangee>
  );
}
