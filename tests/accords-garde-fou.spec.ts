import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { accordsDeLEtiquette, analyserAccord } from "../src/lib/accords/analyse";
import { formesMobiles, positionsGuitare } from "../src/lib/accords/guitare";
import { voicingPiano } from "../src/lib/accords/notes";
import { MOBILES, OUVERTES, QUALITES } from "../src/lib/accords/table";
import { CHORD_TOKEN, LABEL_SPLIT, getTransposedKey, noteToIndex, transposeChord } from "../src/lib/transpose";

// Lot DA / DA-1 — le garde-fou de la spec : chaque doigté de la table sonne l'accord qu'il annonce, et chaque
// accord des chants (et ses 11 transpositions) trouve un piano et une guitare, ou un « Pas encore de doigté »
// assumé et listé ci-dessous.

const CORDES_A_VIDE = [4, 9, 2, 7, 11, 4];
const NOMS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Qualités sans doigté de guitare assumé (la table n'en écrit pas) : le piano s'affiche, la guitare dit « Pas encore ». */
const SANS_DOIGTE = new Set(["dim9", "7#11"]);

/** Ce que sonne un doigté, face à l'accord : notes en trop, notes manquantes, basse. Liste vide = juste. */
function erreurs(cases: (number | null)[], qualite: string, racine: number, basse: number | null): string[] {
  const { intervalles, facultatifs } = QUALITES[qualite];
  const notes = new Set(intervalles.map((i) => (racine + i) % 12));
  const requises = new Set(intervalles.filter((i) => !facultatifs.includes(i)).map((i) => (racine + i) % 12));
  if (basse !== null) notes.add(basse);
  const jouees = cases.map((c, i) => (c === null ? null : (CORDES_A_VIDE[i] + c) % 12));
  const classes = new Set(jouees.filter((c): c is number => c !== null));
  const sortie: string[] = [];
  const enTrop = [...classes].filter((c) => !notes.has(c)).map((c) => NOMS[c]);
  if (enTrop.length) sortie.push(`notes en trop : ${enTrop.join(" ")}`);
  const manque = [...requises].filter((c) => !classes.has(c)).map((c) => NOMS[c]);
  if (manque.length) sortie.push(`manque : ${manque.join(" ")}`);
  const grave = jouees.find((c) => c !== null);
  const voulue = basse ?? racine;
  if (grave !== voulue) sortie.push(`basse ${grave === undefined || grave === null ? "aucune" : NOMS[grave]} au lieu de ${NOMS[voulue]}`);
  return sortie;
}

test("chaque forme ouverte de la table sonne l'accord de son étiquette", () => {
  const fautes: string[] = [];
  for (const [etiquette, formes] of Object.entries(OUVERTES)) {
    const a = analyserAccord(etiquette);
    if (!a) {
      fautes.push(`${etiquette} : étiquette illisible`);
      continue;
    }
    for (const [cases] of formes) {
      const lues = cases.split("").map((c) => (c === "x" ? null : Number(c)));
      const e = erreurs(lues, a.qualite, noteToIndex(a.fondamentale), a.basse ? noteToIndex(a.basse) : null);
      if (e.length) fautes.push(`${etiquette} ${cases} : ${e.join(" ; ")}`);
    }
  }
  expect(fautes, fautes.join("\n")).toEqual([]);
});

test("chaque forme mobile de la table, posée sur les douze fondamentales, sonne l'accord", () => {
  const fautes: string[] = [];
  let posees = 0;
  for (const cle of Object.keys(MOBILES)) {
    const [qualite, intervalle] = cle.split("/");
    for (let racine = 0; racine < 12; racine++) {
      const basse = intervalle === undefined ? null : (racine + Number(intervalle)) % 12;
      for (const d of formesMobiles(racine, cle)) {
        posees++;
        const e = erreurs(d.cases, qualite, racine, basse);
        if (e.length) fautes.push(`${NOMS[racine]}${qualite}${basse === null ? "" : "/" + NOMS[basse]} (forme ${cle}) ${d.cases.map((c) => c ?? "x").join(",")} : ${e.join(" ; ")}`);
      }
    }
  }
  console.log(`formes mobiles posées : ${posees}`);
  expect(fautes, fautes.join("\n")).toEqual([]);
});

test("chaque doigté tient dans la grille : cinq cases sous la case de départ", () => {
  const fautes: string[] = [];
  const verifier = (etiquette: string, cases: (number | null)[], depart: number) => {
    const pressees = cases.filter((c): c is number => c !== null && c > 0);
    if (pressees.length && (Math.min(...pressees) < depart || Math.max(...pressees) > depart + 4)) fautes.push(`${etiquette} ${cases.map((c) => c ?? "x").join(",")} (départ ${depart})`);
  };
  for (const etiquette of Object.keys(OUVERTES)) for (const d of positionsGuitare(analyserAccord(etiquette)!).doigtes) verifier(etiquette, d.cases, d.depart);
  for (const q of Object.keys(QUALITES)) for (let r = 0; r < 12; r++) for (const d of positionsGuitare(analyserAccord(NOMS[r] + q)!).doigtes) verifier(NOMS[r] + q, d.cases, d.depart);
  expect(fautes, fautes.join("\n")).toEqual([]);
});

const DOSSIER = join(__dirname, "..", "content", "songs");

/** Étiquettes d'accords `[…]` d'un chant et sa tonalité (C à défaut). */
function lire(fichier: string): { cle: string; etiquettes: string[] } {
  const texte = readFileSync(join(DOSSIER, fichier), "utf8");
  const cle = texte.match(/^\{key:\s*([^}\s]+)\s*\}/m)?.[1] ?? "C";
  const etiquettes: string[] = [];
  for (const ligne of texte.split("\n")) {
    if (ligne.trimStart().startsWith("{")) continue;
    for (const m of ligne.matchAll(/\[([^\]]*)\]/g)) if (m[1]) etiquettes.push(m[1]);
  }
  return { cle, etiquettes };
}

test("chaque accord des chants, et ses 11 transpositions, a un piano et une guitare (ou un « pas de doigté » assumé)", () => {
  const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith(".cho"));
  const refuses = new Set<string>();
  const distincts = new Set<string>();
  const sansPiano = new Set<string>();
  const sansDoigte = new Set<string>();
  const sansDoigteInattendu = new Set<string>();
  const basseAPart = new Set<string>();
  const vraiesFormes = new Set<string>();
  const verifier = (jeton: string) => {
    if (distincts.has(jeton)) return;
    distincts.add(jeton);
    const a = analyserAccord(jeton);
    if (!a) {
      refuses.add(jeton);
      return;
    }
    if (!voicingPiano(a).droite.length) sansPiano.add(jeton);
    const g = positionsGuitare(a);
    if (!g.doigtes.length) {
      sansDoigte.add(jeton);
      if (!SANS_DOIGTE.has(a.qualite)) sansDoigteInattendu.add(jeton);
    } else if (g.basseAJouer) basseAPart.add(jeton);
    else vraiesFormes.add(jeton);
  };

  for (const fichier of fichiers) {
    const { cle, etiquettes } = lire(fichier);
    for (const etiquette of etiquettes) {
      // Un jeton que la grammaire du site reconnaît comme accord doit être lu (la basse seule « /F » est refusée à dessein).
      etiquette.split(LABEL_SPLIT).forEach((part, i) => {
        if (i % 2 === 0 && part && !part.startsWith("/") && CHORD_TOKEN.test(part) && !analyserAccord(part)) refuses.add(part);
      });
      for (const jeton of accordsDeLEtiquette(etiquette)) {
        verifier(jeton);
        for (let t = 1; t < 12; t++) verifier(transposeChord(jeton, t, getTransposedKey(cle, t)));
      }
    }
  }

  console.log(
    [
      `chants lus : ${fichiers.length}`,
      `accords distincts (avec transpositions) : ${distincts.size}`,
      `avec une vraie forme : ${vraiesFormes.size}`,
      `avec « basse à part » : ${basseAPart.size}`,
      `sans doigté : ${sansDoigte.size} → ${[...sansDoigte].sort().join(" ")}`,
    ].join("\n"),
  );
  expect([...refuses].sort(), "jetons que CHORD_TOKEN accepte et que analyserAccord refuse").toEqual([]);
  expect([...sansPiano], "accords sans main droite").toEqual([]);
  expect([...sansDoigteInattendu].sort(), "accords sans doigté hors des qualités assumées (SANS_DOIGTE)").toEqual([]);
});
