"use client";

// Les deux sortes d'onglets du site (agencement v18, R4 et R5 de docs/spec-agencement-v18.md).
// Une exception se discute, elle ne s'invente pas (planche `v18-bo-regles-communes`) :
// - `OngletsRail`, le rail gris à pastille blanche : CHOISIR UNE VUE. Les sous-parties d'une entrée
//   (Organigramme · Personnes, Réception · Notifier · Questionnaire, Calendrier · Pâques · Noël…) et
//   les vues d'une page (À venir · Passés, T1 à T4, Paix · Fidélité · Bonté…). Sous le titre.
// - `Pilules` : sous-onglets (Équipes · Musiciens), filtres (catégories, périodes, audiences…) et
//   les plannings, l'actif à la couleur de son service.
// Remplacent à mesure `EnTeteEntree`, `SectionTabs` (en grand), `FilterButtons` et les boutons de groupes.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type OngletRail = {
  /** Identifiant de l'onglet (rendu par `choisir`, comparé à `actif`). */
  id: string;
  label: ReactNode;
  /** Un lien : le rail est une navigation (`aria-current="page"`) ; sinon un bouton (`role="tab"`). */
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
 * (l'onglet actif se lit dans l'adresse ; `actif` le force). Boutons (vues dans la page) :
 *   <OngletsRail etiquette="Période" onglets={[{ id: "avenir", label: "À venir" }, { id: "passes", label: "Passés" }]}
 *                actif={vue} choisir={setVue} />
 * Il défile en largeur quand il ne tient pas (téléphone).
 */
export function OngletsRail({
  etiquette,
  onglets,
  actif,
  choisir,
  className,
}: {
  /** Nom du groupe d'onglets, lu par les lecteurs d'écran. */
  etiquette: string;
  onglets: OngletRail[];
  /** L'onglet choisi ; pour des liens, déduit de l'adresse s'il manque. */
  actif?: string;
  /** Pour des boutons : appelé avec l'`id` de l'onglet touché. */
  choisir?: (id: string) => void;
  className?: string;
}) {
  const chemin = usePathname() ?? "";
  const liens = onglets.some((o) => o.href);
  const courant = actif ?? (liens ? ongletDuChemin(onglets, chemin) : undefined);
  const classe = (on: boolean) =>
    cn(
      "flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold transition-[background-color,color] duration-150",
      on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );
  const contenu = (o: OngletRail) => (
    <>
      {o.couleur && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.couleur }} />}
      {o.label}
      {o.compte !== undefined && <span className="tabular-nums opacity-70">· {o.compte}</span>}
    </>
  );
  const rail = cn("inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-secondary p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className);

  if (liens) {
    return (
      <nav aria-label={etiquette} data-onglets="rail" className={rail}>
        {onglets.map((o) => (
          <Link key={o.id} href={o.href ?? "#"} aria-current={courant === o.id ? "page" : undefined} className={classe(courant === o.id)}>
            {contenu(o)}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <div role="tablist" aria-label={etiquette} data-onglets="rail" className={rail}>
      {onglets.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={courant === o.id}
          onClick={() => choisir?.(o.id)}
          className={classe(courant === o.id)}
        >
          {contenu(o)}
        </button>
      ))}
    </div>
  );
}

/**
 * Les pilules : un choix dans une rangée (sous-onglet, filtre, planning). Retoucher la pilule
 * active retire le filtre, sauf `obligatoire`. L'active est en encre, ou à sa `couleur` :
 *   <Pilules etiquette="Plannings" valeur={cle} choisir={setCle} obligatoire
 *            options={[{ cle: "culte", nom: "Culte Franco", couleur: PLANNING_COLORS.culte }, …]} />
 * Avec un `href` par option, les pilules sont des liens (une navigation, `aria-current="page"` sur
 * l'active : les plannings, T4a) ; `compact` les resserre (13 px, 32 px de haut) dans une rangée
 * déjà chargée (la rangée de la grille du Back-Office).
 * La rangée défile horizontalement quand elle ne tient pas (douze sensations sur un téléphone).
 */
export function Pilules<T extends string>({
  etiquette,
  options,
  valeur,
  choisir,
  obligatoire,
  compact,
}: {
  /** Nom du groupe de filtres, lu par les lecteurs d'écran. */
  etiquette: string;
  /** `couleur` : celle de la pilule active (le service d'un planning) ; l'encre sinon. `href` : un lien. */
  options: { cle: T; nom: string; couleur?: string; href?: string }[];
  valeur: T | null;
  /** `null` = filtre retiré (retoucher la pilule active l'enlève). */
  choisir: (v: T | null) => void;
  /** Un choix est toujours actif (instrument) : on ne peut pas le retirer. */
  obligatoire?: boolean;
  compact?: boolean;
}) {
  const liens = options.some((o) => o.href);
  const Rangee = liens ? "nav" : "div";
  return (
    <Rangee
      role={liens ? undefined : "group"}
      aria-label={etiquette}
      data-onglets="pilules"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const actif = valeur === o.cle;
        const style = actif && o.couleur ? { backgroundColor: o.couleur, color: "#fff" } : undefined;
        const classe = cn(
          "inline-flex shrink-0 items-center whitespace-nowrap rounded-full transition-colors duration-150",
          compact ? "h-8 px-2.5 text-[13px] font-semibold" : "h-10 px-3.5 text-[15px]",
          actif ? "bg-foreground text-background font-semibold" : "bg-secondary text-foreground/80 active:bg-secondary/70",
        );
        if (o.href) {
          return (
            <Link key={o.cle} href={o.href} aria-current={actif ? "page" : undefined} style={style} className={classe}>
              {o.nom}
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
            {o.nom}
          </button>
        );
      })}
    </Rangee>
  );
}
