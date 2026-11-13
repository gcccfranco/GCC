// Annuler / Rétablir des traits, par chant (docs/spec-mode-louange-forscore-2.md, AN-3a). Module pur : l'appelant
// garde l'Historique (immuable) et applique les états rendus. Un état = la liste de mes traits d'un chant.

import type { ElementTrait } from "@/types/partition";

/** Une action qui touche plusieurs chants (Tout effacer, trait à cheval) porte le même `groupe` dans chacun. */
type Entree = { etats: ElementTrait[]; groupe: number };
export type Historique = { annuler: Record<string, Entree[]>; retablir: Record<string, Entree[]>; suivant: number };

export const MAX_ETATS = 50;

export const historiqueVide = (): Historique => ({ annuler: {}, retablir: {}, suivant: 0 });

export const peutAnnuler = (h: Historique, slug: string) => (h.annuler[slug]?.length ?? 0) > 0;
export const peutRetablir = (h: Historique, slug: string) => (h.retablir[slug]?.length ?? 0) > 0;

/** Note une action : `changements` donne l'état AVANT de chaque chant touché (un seul groupe pour tous). Vide Rétablir. */
export function noter(h: Historique, changements: Record<string, ElementTrait[]>): Historique {
  const annuler = { ...h.annuler };
  for (const [slug, etats] of Object.entries(changements)) {
    annuler[slug] = [...(annuler[slug] ?? []), { etats, groupe: h.suivant }].slice(-MAX_ETATS);
  }
  return { annuler, retablir: {}, suivant: h.suivant + 1 };
}

/** Dépile le sommet de `de` pour `slug` et, avec lui, les entrées du même groupe en tête des autres chants ; elles
 *  passent dans `vers` avec l'état actuel du chant. Rend les états à appliquer, ou null s'il n'y a rien à défaire. */
function defaire(h: Historique, de: "annuler" | "retablir", slug: string, actuels: Record<string, ElementTrait[]>) {
  const sommet = h[de][slug]?.at(-1);
  if (!sommet) return null;
  const vers = de === "annuler" ? "retablir" : "annuler";
  const piles = { annuler: { ...h.annuler }, retablir: { ...h.retablir } };
  const rendus: Record<string, ElementTrait[]> = {};
  for (const s of Object.keys(h[de])) {
    const tete = h[de][s].at(-1);
    if (!tete || tete.groupe !== sommet.groupe) continue;
    piles[de][s] = h[de][s].slice(0, -1);
    piles[vers][s] = [...(piles[vers][s] ?? []), { etats: actuels[s] ?? [], groupe: sommet.groupe }].slice(-MAX_ETATS);
    rendus[s] = tete.etats;
  }
  return { h: { ...h, ...piles }, rendus };
}

export const annuler = (h: Historique, slug: string, actuels: Record<string, ElementTrait[]>) => defaire(h, "annuler", slug, actuels);
export const retablir = (h: Historique, slug: string, actuels: Record<string, ElementTrait[]>) => defaire(h, "retablir", slug, actuels);
