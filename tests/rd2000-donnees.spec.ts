import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Sons du RD-2000, tranche S0 (docs/spec-sons-rd2000.md) : `public/rd2000.json`
// est produit par `scripts/rd2000/convertir.py` à partir du classeur de
// Timothée (copie corrigée d'après la documentation Roland, détail dans
// `../RD2000 corrections.md`). Ces tests relisent le fichier commité : un
// classeur reconverti qui perdrait des sons, un moment qui citerait un son
// inconnu ou une fiche sans son ★★★ se voient ici, avant la page des pianistes.

interface Son {
  n: string; nom: string; categorie: string; sousCategorie: string; louange: number;
  commentaire: string; edition: string; msb: number; lsb: number; pc: number; premier?: boolean;
}
interface Moment {
  groupe: string; moment: string; son: string; sonNom: string;
  layer: string | null; layerNom: string | null; conseil: string;
}
interface Reglage { ecran: string; parametre: string; valeur: string; pourquoi?: string }
interface Recette { n: string; nom: string; intention: string; pourquoi: string; exemples: string[]; reglages: Reglage[] }
interface Fiche { n: string; intention: string; pourquoi: string; reglages: Reglage[] }
interface Parametre {
  partie: string; groupe: string; nom: string; plage: string; effet: string; conseil: string; priorite: number;
}
interface Legende { section: string; element: string; texte: string; tableur: boolean }
interface Rd2000 {
  source: string; sons: Son[]; moments: Moment[]; regleMoments: string;
  recettes: Recette[]; fiches: Fiche[]; parametres: Parametre[]; legende: Legende[];
}

const data: Rd2000 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "rd2000.json"), "utf-8"));
const parN = new Map(data.sons.map((s) => [s.n, s]));

test("les 1 155 sons : 17 pianos premium, 1 113 internes, 25 d'extension, sans doublon", () => {
  expect(data.sons).toHaveLength(1155);
  expect(parN.size).toBe(1155);
  const premium = data.sons.filter((s) => /^S\d\d$/.test(s.n));
  const internes = data.sons.filter((s) => /^\d{4}$/.test(s.n) && Number(s.n) <= 1113);
  const extension = data.sons.filter((s) => /^20\d\d$/.test(s.n));
  expect(premium).toHaveLength(17);
  expect(internes).toHaveLength(1113);
  expect(extension).toHaveLength(25);
  expect(extension.map((s) => s.n)[0]).toBe("2001");
  expect(extension.map((s) => s.n).at(-1)).toBe("2025");
});

// Points tranchés par Timothée le 02/10/2026 (« RD2000 corrections.md », À confirmer).
test("décisions du 02/10 : 18 premiers choix, plus de réglage « Indisponible », 0019 sans « dépannage »", () => {
  const premiers = data.sons.filter((s) => s.premier);
  expect(premiers.map((s) => s.n)).toEqual([
    "S01", "0028", "0032", "0069", "0138", "0146", "0270", "0328", "0340",
    "0344", "0360", "0385", "0387", "0401", "0468", "0491", "0496", "0499",
  ]);
  expect(premiers.every((s) => s.louange === 3), "tous ★★★").toBe(true);
  expect(data.sons.filter((s) => s.commentaire.startsWith("★")), "l'étoile de tête est devenue le badge").toEqual([]);
  expect(data.fiches.flatMap((f) => f.reglages).filter((r) => r.valeur === "Indisponible"), "lignes retirées des fiches").toEqual([]);
  expect(JSON.stringify(data)).not.toContain("dépannage");
});

test("notes Louange : 53 ★★★, 344 ★★, 359 ★, 399 —", () => {
  const compte = (n: number) => data.sons.filter((s) => s.louange === n).length;
  expect([compte(3), compte(2), compte(1), compte(0)]).toEqual([53, 344, 359, 399]);
});

test("catégories : les dix boutons TONE du clavier, guitares sous BASS comme dans la Sound List", () => {
  const compte = (c: string) => data.sons.filter((s) => s.categorie === c).length;
  expect({
    CONCERT: compte("CONCERT"), STUDIO: compte("STUDIO"), VINTAGE: compte("VINTAGE"), MODERN: compte("MODERN"),
    CLAV: compte("CLAV"), ORGAN: compte("ORGAN"), STRINGS: compte("STRINGS"), "PAD/CHOIR": compte("PAD/CHOIR"),
    BASS: compte("BASS"), OTHER: compte("OTHER"),
  }).toEqual({
    CONCERT: 44, STUDIO: 41, VINTAGE: 83, MODERN: 42, CLAV: 86, ORGAN: 85, STRINGS: 45, "PAD/CHOIR": 137,
    BASS: 170, OTHER: 422,
  });
  expect(parN.get("0627")?.categorie).toBe("BASS"); // Nylon Gtr 1
  expect(parN.get("0692")?.categorie).toBe("OTHER"); // Brass 1
});

test("MSB / LSB / PC : ceux de la Sound List Roland, extension comprise", () => {
  // Relevés dans la Sound List officielle (RD-2000_Sound_List_eng02_W.pdf).
  const midi = (n: string) => {
    const s = parN.get(n);
    return s && [s.msb, s.lsb, s.pc];
  };
  expect(midi("S01")).toEqual([84, 16, 1]);
  expect(midi("S17")).toEqual([84, 16, 17]);
  expect(midi("0001")).toEqual([84, 0, 1]);
  expect(midi("0129")).toEqual([84, 1, 1]);
  expect(midi("1113")).toEqual([84, 8, 89]);
  expect(midi("2001")).toEqual([84, 8, 90]);
  expect(midi("2025")).toEqual([84, 8, 114]);
});

test("écrans d'édition : ceux des notes *1 à *4 de la Sound List", () => {
  const compte = (e: string) => data.sons.filter((s) => s.edition === e).length;
  expect(compte("Piano Designer + Individual Voicing")).toBe(17);
  expect(compte("Piano Designer + Individual Voicing + Sym. Resonance")).toBe(34);
  expect(compte("Réglages détaillés E.Piano dans le Tone Designer")).toBe(64);
  expect(compte("Réglages détaillés CLAV dans le Tone Designer")).toBe(20);
  expect(compte("Tone Wheel (9 tirettes) + Tone Designer « autres sons » + Mod FX + Tremolo/Amp")).toBe(10);
  expect(compte("Tone Designer « autres sons » + Mod FX + Tremolo/Amp")).toBe(1010);
  // Sym. Resonance n'existe que sur les pianos SuperNATURAL (note *2).
  expect(data.sons.filter((s) => s.edition.includes("Sym. Resonance"))).toHaveLength(34);
  expect(parN.get("0111")?.edition).toBe("Tone Designer « autres sons » + Mod FX + Tremolo/Amp"); // St.Soft EP
});

test("23 moments en 7 groupes, chaque son cité existe sous le même nom", () => {
  expect(data.moments).toHaveLength(23);
  expect([...new Set(data.moments.map((m) => m.groupe))]).toEqual([
    "ACCUEIL / PRÉLUDE", "LOUANGE — MORCEAUX RAPIDES", "LOUANGE — MORCEAUX LENTS",
    "ADORATION / TEMPS DE PRIÈRE", "CANTIQUES / RÉPERTOIRE CLASSIQUE", "GOSPEL", "INTROS ET TRANSITIONS",
  ]);
  expect(data.moments.filter((m) => m.layer)).toHaveLength(10);
  for (const m of data.moments) {
    expect(parN.get(m.son)?.nom, `${m.moment} : son ${m.son}`).toBe(m.sonNom);
    if (m.layer) expect(parN.get(m.layer)?.nom, `${m.moment} : layer ${m.layer}`).toBe(m.layerNom);
    else expect(m.layerNom, `${m.moment} : pas de layer`).toBeNull();
  }
  const refrain = data.moments.find((m) => m.groupe === "LOUANGE — MORCEAUX RAPIDES" && m.moment === "Refrain");
  expect([refrain?.son, refrain?.layer]).toEqual(["0017", "0340"]);
  expect(data.regleMoments).toMatch(/^Règle valable partout/);
});

test("7 recettes R1 à R7, chaque son d'exemple existe", () => {
  expect(data.recettes.map((r) => r.n)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7"]);
  for (const r of data.recettes) {
    expect(r.exemples.length, `${r.n} : des exemples`).toBeGreaterThan(0);
    for (const n of r.exemples) expect(parN.has(n), `${r.n} : exemple ${n}`).toBe(true);
    expect(r.reglages.length, `${r.n} : des réglages`).toBeGreaterThan(0);
  }
  expect(data.recettes.find((r) => r.n === "R4")?.exemples).toEqual(["0075", "0111", "2003", "0090"]);
});

test("53 fiches de réglages, exactement les 53 sons ★★★", () => {
  const trois = data.sons.filter((s) => s.louange === 3).map((s) => s.n).sort();
  expect(data.fiches.map((f) => f.n).sort()).toEqual(trois);
  for (const f of data.fiches) {
    expect(f.intention, `${f.n} : une intention`).toBeTruthy();
    expect(f.reglages.length, `${f.n} : 7 à 13 réglages`).toBeGreaterThanOrEqual(7);
    expect(f.reglages.length, `${f.n} : 7 à 13 réglages`).toBeLessThanOrEqual(13);
  }
  expect(data.fiches.find((f) => f.n === "S01")?.reglages).toHaveLength(13);
});

test("99 paramètres en 2 parties et 15 groupes, priorité de 1 à 3", () => {
  expect(data.parametres).toHaveLength(99);
  expect([...new Set(data.parametres.map((p) => p.partie))]).toEqual([
    "RÉGLAGES DU SON — TONE DESIGNER ET EFFETS", "RÉGLAGES DE ZONE ET DE PROGRAMME",
  ]);
  expect(new Set(data.parametres.map((p) => p.groupe)).size).toBe(15);
  const compte = (n: number) => data.parametres.filter((p) => p.priorite === n).length;
  expect([compte(3), compte(2), compte(1)]).toEqual([41, 34, 24]);
});

test("légende : 32 lignes, les 9 qui ne parlent que du tableur sont marquées", () => {
  expect(data.legende).toHaveLength(32);
  const tableur = data.legende.filter((l) => l.tableur);
  expect(tableur).toHaveLength(9);
  for (const l of data.legende.filter((x) => x.section === "LES 5 ONGLETS" || x.section === "MÉTHODE EN TROIS TEMPS")) {
    expect(l.tableur, `${l.section} › ${l.element}`).toBe(true);
  }
  expect(data.legende.find((l) => l.element === "Valeurs PC")?.tableur).toBe(false);
});
