"use client";

// Sons du RD-2000 (docs/spec-sons-rd2000.md) : le catalogue du clavier de
// l'église, tiré du classeur de Timothée par `scripts/rd2000/convertir.py` dans
// `public/rd2000.json`. Des noms, des numéros et des réglages : rien n'est joué
// (« aucun son », décision du 17/09/2026).

import { useEffect, useState } from "react";

export type Son = {
  /** « S01 », « 0017 », « 2005 » : le numéro à taper au clavier. */
  n: string;
  nom: string;
  categorie: string;
  sousCategorie: string;
  /** 3 ★★★ essentiel · 2 ★★ · 1 ★ · 0 — */
  louange: number;
  commentaire: string;
  edition: string;
  msb: number;
  lsb: number;
  /** 1 à 128, comme à l'écran ; en MIDI, retirer 1. */
  pc: number;
  /** Premier choix de sa famille (« ★ » en tête du commentaire dans le classeur). */
  premier?: boolean;
};

export type Reglage = { ecran: string; parametre: string; valeur: string; pourquoi?: string };
export type Fiche = { n: string; intention: string; pourquoi: string; reglages: Reglage[] };
export type Recette = Fiche & { nom: string; exemples: string[] };
export type Moment = { groupe: string; moment: string; son: string; layer: string | null; conseil: string };
export type Parametre = { partie: string; groupe: string; nom: string; plage: string; effet: string; conseil: string; priorite: number };
export type LigneLegende = { section: string; element: string; texte: string; tableur?: boolean };

export type Rd2000 = {
  sons: Son[];
  moments: Moment[];
  regleMoments: string;
  recettes: Recette[];
  fiches: Fiche[];
  parametres: Parametre[];
  legende: LigneLegende[];
};

/** `actif` faux : rien n'est chargé (la ligne d'Harmonie, pour qui n'est pas pianiste). */
export function useRd2000(actif = true): { donnees: Rd2000 | null; chargement: boolean } {
  const [donnees, setDonnees] = useState<Rd2000 | null>(null);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    fetch("/rd2000.json")
      .then((r) => r.json())
      .then((d: Rd2000) => { if (vivant) setDonnees(d); })
      .catch(() => { /* catalogue absent : la page le dit */ })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [actif]);
  return { donnees, chargement };
}

export const etoiles = (n: number) => (n > 0 ? "★".repeat(n) : "—");

/** Recherche : casse, accents et espaces ignorés (« stage grand » trouve « Stage Grand »). */
export const pourChercher = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();

/** Les réglages, dans l'ordre du classeur, regroupés par écran du clavier. */
export function parEcran(reglages: Reglage[]): { ecran: string; reglages: Reglage[] }[] {
  const groupes: { ecran: string; reglages: Reglage[] }[] = [];
  for (const r of reglages) {
    const dernier = groupes[groupes.length - 1];
    if (dernier?.ecran === r.ecran) dernier.reglages.push(r);
    else groupes.push({ ecran: r.ecran, reglages: [r] });
  }
  return groupes;
}

export type GroupeEcran = { ecran: string; reglages: Reglage[] };

/** Les réglages d'un son sur deux colonnes (lot U4 bis, B3 : la fiche du son en grand).
 *  La première prend la moitié des réglages, arrondie au-dessus ; l'ordre est gardé. Un écran
 *  qui tient entre dans la première ; un écran plus long que la moitié s'y coupe, et sa fin
 *  ouvre la seconde avec `suite` (« Piano Designer (suite) ») ; un écran plus court s'y
 *  reporte entier. Jamais un morceau d'un seul réglage : l'écran reste alors entier. */
export function couperEnDeuxColonnes(groupes: GroupeEcran[]): (GroupeEcran & { suite: boolean })[][] {
  const moitie = Math.ceil(groupes.reduce((n, g) => n + g.reglages.length, 0) / 2);
  const gauche: (GroupeEcran & { suite: boolean })[] = [];
  const droite: (GroupeEcran & { suite: boolean })[] = [];
  let pris = 0;
  for (const g of groupes) {
    const place = moitie - pris;
    if (droite.length || place <= 0) droite.push({ ...g, suite: false });
    else if (g.reglages.length <= place) {
      gauche.push({ ...g, suite: false });
      pris += g.reglages.length;
    } else if (g.reglages.length > moitie && g.reglages.length - place < 2) {
      // Couper laisserait un réglage seul dans la suite : l'écran reste entier à gauche.
      gauche.push({ ...g, suite: false });
      pris = moitie;
    } else if (g.reglages.length > moitie && place >= 2) {
      gauche.push({ ecran: g.ecran, reglages: g.reglages.slice(0, place), suite: false });
      droite.push({ ecran: g.ecran, reglages: g.reglages.slice(place), suite: true });
      pris = moitie;
    } else droite.push({ ...g, suite: false });
  }
  return [gauche, droite];
}
