"use client";

// Les deux sortes d'onglets du site (agencement v18, R4 et R5 de docs/spec-agencement-v18.md).
// Une exception se discute, elle ne s'invente pas (planche `v18-bo-regles-communes`) :
// - `OngletsRail` (alias de `Segment`, src/components/ui/segment.tsx), le rail gris à pastille blanche : CHOISIR UNE VUE. Les sous-parties d'une entrée
//   (Organigramme · Personnes, Réception · Notifier · Questionnaire, Calendrier · Pâques · Noël…) et
//   les vues d'une page (À venir · Passés, T1 à T4, Paix · Fidélité · Bonté, Équipes · Musiciens…). Sous le titre.
// - `Pilules` : filtres (catégories, périodes, audiences, Tout · Mes équipes du Back-office…) et
//   les plannings, l'actif à la couleur de son service.
// Ont remplacé `EnTeteEntree`, `FilterButtons`, `SectionTabs` en grand (il reste la barre collante des
// plannings sur téléphone et tablette, R6) et les boutons de groupes (tranche Z).

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFonduLateral } from "@/hooks/useFonduLateral";
import { TOUCHER_PILULE } from "@/lib/toucher44";
import { BASCULE_ACTIVE } from "@/components/ui/bascule";

// B11 : le composant vit dans ui/segment.tsx ; les noms publics restent ceux d'ici.
export { Segment as OngletsRail, type OngletRail } from "@/components/ui/segment";

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
          "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors duration-150 [@media(pointer:coarse)]:h-8",
          TOUCHER_PILULE,
          actif ? BASCULE_ACTIVE : "bg-secondary text-foreground active:bg-secondary/70",
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
