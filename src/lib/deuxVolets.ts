// Deux volets des pages de liste (lot U4 bis, docs/spec-pages-en-grand.md, Q1 à Q3) : la
// règle que pose `DeuxVolets` (src/components/layout/DeuxVolets.tsx), sans React ni
// navigateur. Le « en grand » vient de `useDeuxVolets` (U5, Q1) ; l'adresse dit si un
// élément est choisi : l'adresse de la liste n'en choisit aucun, celle d'une fiche si.

/** Ce que montre chaque volet. `droite` : la page de l'adresse (une fiche), le premier
 *  élément de la liste (Q3, en grand sans élément choisi), ou rien (un volet, sur la liste). */
export interface Volets {
  liste: boolean;
  droite: "page" | "premier" | null;
}

export function disposerVolets(deuxVolets: boolean, surLaListe: boolean): Volets {
  if (deuxVolets) return { liste: true, droite: surLaListe ? "premier" : "page" };
  // Un volet (téléphone, tablette debout) : la liste, puis la page, comme aujourd'hui.
  return surLaListe ? { liste: true, droite: null } : { liste: false, droite: "page" };
}

/** Vrai sur l'adresse de la liste elle-même (`racine`, barre finale tolérée). */
export function estSurLaListe(chemin: string, racine: string): boolean {
  return chemin.replace(/\/+$/, "") === racine.replace(/\/+$/, "");
}

/** Sections dont le layout pose `DeuxVolets` : chaque tranche de U4 bis y ajoute la sienne
 *  (`/evenements`, `/mes-services`…) en même temps que son layout. */
export const SECTIONS_EN_DEUX_VOLETS: readonly string[] = [
  // B3 : le cours et les sons avant le catalogue, qui les contient (le premier préfixe gagne).
  "/harmonie/cours",
  "/harmonie/rd2000",
  "/harmonie",
  // Pâques · Noël (P4) : les onglets de la scène posent leurs deux volets à eux, avant l'agenda
  // qui les contient ; passer d'une fête à l'autre ne remonte pas la section.
  "/evenements/scene",
  // B2 : l'agenda des évènements.
  "/evenements",
  // B4 : Mes services (`/mes-services/[date]`) et Mes tâches (`/taches/[pole]/[id]`).
  "/mes-services",
  "/taches",
  // Agencement v18 (T2b, B3, B4) : Back-Office › Évènements (la scène, sous `/scene`, n'a pas de liste,
  // mais garde l'en-tête de la section) et Back-Office › Réunions.
  "/back-office/evenements",
  "/back-office/reunions",
  // Agencement v18 (T1, B1) : Back-Office › Tâches (`/back-office/taches/[pole]/[id]`).
  "/back-office/taches",
  // Lot U5 (Q15) : Chants, dont `songs/ChantsVolets` porte la liste et règle son fondu.
  "/songs",
];

/** Clé du fondu de page (`PageTransition`) : la page entière se remonte à chaque adresse,
 *  sauf dans une section en deux volets, remontée seulement quand on en sort ; sinon sa
 *  liste serait rechargée à chaque élément (Q2). `DeuxVolets` y fait son propre fondu. */
export function cleDeTransition(chemin: string, sections: readonly string[] = SECTIONS_EN_DEUX_VOLETS): string {
  const section = sections.find((s) => chemin === s || chemin.startsWith(s + "/"));
  return section ?? chemin;
}
