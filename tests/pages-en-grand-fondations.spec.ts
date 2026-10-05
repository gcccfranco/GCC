import { expect, test } from "@playwright/test";
import { SECTIONS_EN_DEUX_VOLETS, cleDeTransition, disposerVolets, estSurLaListe } from "../src/lib/deuxVolets";
import { rangerEnColonnes } from "../src/lib/equipes/rangerEnColonnes";

// Lot U4 bis, tranche B0 — fondations (docs/spec-pages-en-grand.md) : les deux règles
// que les tranches suivantes posent sur les pages. Fonctions pures, sans navigateur :
// aucune page ne change avec B0.

test.describe("DeuxVolets : quel volet se montre (Q1, Q2, Q3)", () => {
  test("en grand, sur une fiche : la liste à gauche, la page de la fiche à droite", () => {
    expect(disposerVolets(true, false)).toEqual({ liste: true, droite: "page" });
  });

  test("en grand, sur l'adresse de la liste : la liste et, à droite, son premier élément (jamais un volet vide)", () => {
    expect(disposerVolets(true, true)).toEqual({ liste: true, droite: "premier" });
  });

  test("un volet, sur l'adresse de la liste : la liste seule, comme aujourd'hui", () => {
    expect(disposerVolets(false, true)).toEqual({ liste: true, droite: null });
  });

  test("un volet, sur une fiche : la page seule, sans la liste, comme aujourd'hui", () => {
    expect(disposerVolets(false, false)).toEqual({ liste: false, droite: "page" });
  });

  test("l'adresse de la liste se reconnaît, barre finale comprise ; une fiche n'est pas la liste", () => {
    expect(estSurLaListe("/mes-services", "/mes-services")).toBe(true);
    expect(estSurLaListe("/mes-services/", "/mes-services")).toBe(true);
    expect(estSurLaListe("/mes-services/2026-10-18", "/mes-services")).toBe(false);
    expect(estSurLaListe("/harmonie/cours", "/harmonie")).toBe(false);
    // Une adresse voisine qui commence pareil n'est ni la liste ni une de ses fiches.
    expect(estSurLaListe("/mes-services-bis", "/mes-services")).toBe(false);
  });

  test("le fondu de page ne remonte pas une section en deux volets : sa liste reste montée d'un élément à l'autre (Q2)", () => {
    const sections = ["/mes-services", "/evenements"];
    // Toute adresse de la section garde la même clé : le layout (et sa liste) n'est pas remonté.
    expect(cleDeTransition("/mes-services", sections)).toBe("/mes-services");
    expect(cleDeTransition("/mes-services/2026-10-18", sections)).toBe("/mes-services");
    expect(cleDeTransition("/evenements/abc/", sections)).toBe("/evenements");
    // Ailleurs, la page se remonte à chaque adresse, comme aujourd'hui.
    expect(cleDeTransition("/setlists/abc", sections)).toBe("/setlists/abc");
    expect(cleDeTransition("/mes-services-bis", sections)).toBe("/mes-services-bis");
  });

  test("B0 ne change aucun écran : aucune section n'est encore en deux volets", () => {
    expect(SECTIONS_EN_DEUX_VOLETS).toEqual([]);
    expect(cleDeTransition("/evenements/abc")).toBe("/evenements/abc");
  });
});

test.describe("rangerEnColonnes : l'organigramme en bandeau (Q12)", () => {
  test("ordre gardé : les cartes se lisent colonne après colonne dans l'ordre donné", () => {
    const hauteurs = [300, 280, 160, 180, 170, 240, 150, 220, 100, 100, 130];
    const colonnes = rangerEnColonnes(hauteurs, 700);
    expect(colonnes.flatMap((c) => c.cartes)).toEqual(hauteurs.map((_, i) => i));
  });

  test("les petites l'une sous l'autre tant qu'elles tiennent, écart compris", () => {
    // 200 + 16 + 200 + 16 + 200 = 632 ≤ 650 ; la quatrième passe à la colonne suivante.
    expect(rangerEnColonnes([200, 200, 200, 200], 650, { ecart: 16 }).map((c) => c.cartes)).toEqual([[0, 1, 2], [3]]);
    // Sans l'écart, 200 × 3 = 600 ≤ 620 ; avec 16 px entre les cartes, 632 > 620.
    expect(rangerEnColonnes([200, 200, 200], 620).map((c) => c.cartes)).toEqual([[0, 1, 2]]);
    expect(rangerEnColonnes([200, 200, 200], 620, { ecart: 16 }).map((c) => c.cartes)).toEqual([[0, 1], [2]]);
  });

  test("aucune colonne au-dessus de la hauteur donnée, sauf une carte seule plus haute qu'elle", () => {
    const hauteurs = [120, 900, 300, 300, 250, 50, 640, 10];
    const max = 640;
    const ecart = 16;
    const colonnes = rangerEnColonnes(hauteurs, max, { ecart });
    for (const c of colonnes) {
      const total = c.cartes.reduce((s, i) => s + hauteurs[i], 0) + ecart * (c.cartes.length - 1);
      if (c.cartes.length > 1) expect(total).toBeLessThanOrEqual(max);
    }
    // La carte de 900 px est seule dans sa colonne.
    expect(colonnes.find((c) => c.cartes.includes(1))?.cartes).toEqual([1]);
  });

  test("colonnes larges en dernier, une par carte, dans leur ordre ; les autres gardent le leur", () => {
    // 13 équipes comme l'organigramme : Louange (11) et EDD (12) larges.
    const hauteurs = [300, 280, 160, 180, 170, 240, 150, 220, 100, 100, 130, 420, 450];
    const colonnes = rangerEnColonnes(hauteurs, 700, { larges: [11, 12], ecart: 16 });
    expect(colonnes.slice(-2)).toEqual([
      { cartes: [11], large: true },
      { cartes: [12], large: true },
    ]);
    expect(colonnes.slice(0, -2).every((c) => !c.large)).toBe(true);
    expect(colonnes.slice(0, -2).flatMap((c) => c.cartes)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test("une carte large placée au milieu passe quand même à la fin", () => {
    const colonnes = rangerEnColonnes([100, 500, 100], 400, { larges: [1] });
    expect(colonnes).toEqual([
      { cartes: [0, 2], large: false },
      { cartes: [1], large: true },
    ]);
  });

  test("rien à ranger : aucune colonne", () => {
    expect(rangerEnColonnes([], 700)).toEqual([]);
  });
});
