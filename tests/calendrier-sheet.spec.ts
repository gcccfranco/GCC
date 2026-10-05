import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  ONGLETS_SHEET,
  chargerMoisSheet,
  heureDuSheet,
  lireCSV,
  lireMoisSheet,
  lireSheetEvenements,
  type EntreeSheet,
  type EnvSheet,
} from "../src/lib/evenements/sheet";

// Lot U8, tranche C1 (docs/spec-calendrier.md) : le lecteur du Sheet
// « [2026-2027] Calendrier des événements ». Un onglet par mois, une grille
// lundi → dimanche à quatre colonnes par jour (Nom, Heure, Lieu, Resp.), des
// semaines de trois lignes (numéros de jour, puis deux lignes d'entrées), une
// liste « Aperçu » à droite et, dessous, des blocs « INSCRIPTIONS » qui portent
// des noms et des téléphones. La fixture reprend la structure d'un vrai onglet
// (octobre 2026, export CSV), titres et noms inventés.
//
// Tests purs : le bandeau « Sheet des évènements injoignable » et les autres
// sources affichées se vérifient sur la page du calendrier (tranche C3).

const FIXTURE = readFileSync(path.join(process.cwd(), "tests/fixtures/sheet-evenements-mois.csv"), "utf8");
const OCTOBRE = 439766955;
const EXPORT = "https://docs.google.com/spreadsheets/d/12FxK1sMrk08bFrVnL7BjCTJd6FXTqvRXyZoyDYhgPU8/export?format=csv&gid=";

const entree = (e: Partial<EntreeSheet> & Pick<EntreeSheet, "date" | "titre">): EntreeSheet => ({
  heure: "",
  heureFin: "",
  horaire: "",
  lieu: "",
  responsable: "",
  ...e,
});

/** Onglet vide d'un autre mois : bon titre, aucune entrée. */
const ongletVide = (titre: string) => `${titre} — Calendrier des événements,,,\r\n,LUNDI,,,,MARDI\r\n`;

/** Un faux réseau : chaque appel est noté ; `reponses` donne le corps par gid, une erreur = réseau coupé. */
function faux(reponses: Record<number, string | Error | number>, debut = Date.parse("2026-10-01T10:00:00")) {
  const appels: string[] = [];
  let maintenant = debut;
  const env: EnvSheet = {
    cache: new Map(),
    maintenant: () => maintenant,
    fetch: async (url: string) => {
      appels.push(url);
      const gid = Number(new URL(url).searchParams.get("gid"));
      const r = reponses[gid] ?? FIXTURE;
      if (r instanceof Error) throw r;
      if (typeof r === "number") return { ok: false, text: async () => "" };
      return { ok: true, text: async () => r };
    },
  };
  return { env, appels, avancer: (ms: number) => { maintenant += ms; } };
}

test.describe("lecteur du Sheet des évènements (pur)", () => {
  test("les cinq onglets connus, d'août à décembre 2026", () => {
    expect(ONGLETS_SHEET).toEqual({
      "2026-08": 1458766095,
      "2026-09": 981833936,
      "2026-10": 439766955,
      "2026-11": 1033601810,
      "2026-12": 484545153,
    });
  });

  test("lireCSV garde les virgules et les retours à la ligne entre guillemets", () => {
    expect(lireCSV('a,"b, c","d\r\ne"\r\n,,\r\n"x ""y"""')).toEqual([
      ["a", "b, c", "d\r\ne"],
      ["", "", ""],
      ['x "y"'],
    ]);
  });

  test("les entrées de la grille, deux lignes sous chaque semaine, jamais l'aperçu de droite", () => {
    expect(lireMoisSheet(lireCSV(FIXTURE), "2026-10")).toEqual([
      entree({ date: "2026-10-04", titre: "Repas partagé", heure: "12:30", horaire: "12h30", lieu: "Salle polyvalente" }),
      entree({ date: "2026-10-06", titre: "Soirée louange", heure: "19:00", heureFin: "21:00", horaire: "19h-21h", lieu: "Église", responsable: "Camille Exemple" }),
      entree({ date: "2026-10-06", titre: "Prière", heure: "19:30", heureFin: "20:15", horaire: "19h30 - 20h15", lieu: "Salle 2" }),
      entree({ date: "2026-10-10", titre: "Foot au parc", heure: "20:00", horaire: "20h", lieu: "Parc", responsable: "Sacha Fictif" }),
      entree({ date: "2026-10-15", titre: "Chants de Noël", horaire: "après le culte", lieu: "Salle 2", responsable: "Sacha Fictif" }),
      entree({ date: "2026-10-31", titre: "Veillée" }),
    ]);
  });

  test("aucun téléphone ni nom d'inscrit n'est lu", () => {
    const lu = JSON.stringify(lireMoisSheet(lireCSV(FIXTURE), "2026-10"));
    for (const interdit of ["06 99 99 99 99", "07 11 22 33 44", "Jean Inscrit", "Alex Inscrit", "Téléphone", "INSCRIPTIONS", "Sortie de l'aperçu seul"]) {
      expect(lu, interdit).not.toContain(interdit);
    }
  });

  test("un mois sur six semaines (août 2026) : le 31, seul sur sa ligne, est lu", () => {
    // Août 2026 commence un samedi : sa sixième semaine (le lundi 31) tombe
    // sur la ligne 18 de l'onglet, juste avant le bloc « INSCRIPTIONS ».
    const vide = () => Array.from({ length: 30 }, () => "");
    const g = Array.from({ length: 23 }, vide);
    g[0][0] = "AOÛT 2026 — Calendrier des événements";
    ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"].forEach((j, k) => { g[1][1 + 4 * k] = j; });
    let jour = 1;
    for (const ligne of [3, 6, 9, 12, 15, 18]) {
      for (let k = ligne === 3 ? 5 : 0; k < 7 && jour <= 31; k++) g[ligne][1 + 4 * k] = String(jour++);
    }
    g[4][21] = "Pique-nique"; g[4][22] = "12h";
    g[19][1] = "Rentrée"; g[19][2] = "19h-21h"; g[19][3] = "Église";
    g[22][0] = "INSCRIPTIONS";
    expect(lireMoisSheet(g, "2026-08")).toEqual([
      entree({ date: "2026-08-01", titre: "Pique-nique", heure: "12:00", horaire: "12h" }),
      entree({ date: "2026-08-31", titre: "Rentrée", heure: "19:00", heureFin: "21:00", horaire: "19h-21h", lieu: "Église" }),
    ]);
  });

  test("un mauvais titre d'onglet ne donne aucune entrée", () => {
    const lignes = lireCSV(FIXTURE);
    expect(lireMoisSheet(lignes, "2026-11"), "l'onglet d'octobre lu pour novembre").toEqual([]);
    const renomme = lireCSV(FIXTURE.replace("OCTOBRE 2026", "NOVEMBRE 2026"));
    expect(lireMoisSheet(renomme, "2026-10"), "un onglet de novembre derrière le gid d'octobre").toEqual([]);
    expect(lireMoisSheet(lireCSV("<!DOCTYPE html><html><body>Connexion</body></html>"), "2026-10"), "une page de connexion").toEqual([]);
  });

  test("heureDuSheet : « 20h » s'écrit 20:00, « 19h-21h » 19:00 – 21:00, tout autre texte reste sans heure", () => {
    expect(heureDuSheet("20h")).toEqual({ heure: "20:00", heureFin: "" });
    expect(heureDuSheet("19h-21h")).toEqual({ heure: "19:00", heureFin: "21:00" });
    expect(heureDuSheet("9h")).toEqual({ heure: "09:00", heureFin: "" });
    expect(heureDuSheet("12h30")).toEqual({ heure: "12:30", heureFin: "" });
    expect(heureDuSheet("19h30 - 20h15")).toEqual({ heure: "19:30", heureFin: "20:15" });
    expect(heureDuSheet("19H–22H")).toEqual({ heure: "19:00", heureFin: "22:00" });
    expect(heureDuSheet("18:45")).toEqual({ heure: "18:45", heureFin: "" });
    for (const libre of ["après le culte", "", "toute la journée", "25h", "20h75", "vers 20h"]) {
      expect(heureDuSheet(libre), libre).toEqual({ heure: "", heureFin: "" });
    }
  });
});

test.describe("lecteur du Sheet des évènements : réseau, cache, panne", () => {
  test("l'adresse appelée est l'export brut de l'onglet par gid, jamais gviz", async () => {
    const { env, appels } = faux({});
    const lu = await chargerMoisSheet("2026-10", env);
    expect(appels).toEqual([`${EXPORT}${OCTOBRE}`]);
    expect(appels.join(" ")).not.toContain("gviz");
    expect(lu.injoignable).toBe(false);
    expect(lu.entrees.map((e) => e.titre)).toEqual(["Repas partagé", "Soirée louange", "Prière", "Foot au parc", "Chants de Noël", "Veillée"]);
  });

  test("un mois sans onglet (janvier 2027) n'appelle pas le Sheet", async () => {
    const { env, appels } = faux({});
    expect(await chargerMoisSheet("2027-01", env)).toEqual({ entrees: [], injoignable: false });
    expect(appels).toEqual([]);
  });

  test("deux ouvertures à moins de 5 minutes = une requête, au-delà = deux", async () => {
    const { env, appels, avancer } = faux({});
    await chargerMoisSheet("2026-10", env);
    avancer(4 * 60_000 + 59_000);
    const deuxieme = await chargerMoisSheet("2026-10", env);
    expect(appels, "à 4 min 59 s, la copie en mémoire suffit").toHaveLength(1);
    expect(deuxieme.entrees).toHaveLength(6);
    avancer(2_000);
    await chargerMoisSheet("2026-10", env);
    expect(appels, "au-delà de 5 minutes, on relit l'onglet").toHaveLength(2);
  });

  test("réseau coupé sans copie : aucune entrée, Sheet injoignable", async () => {
    const { env } = faux({ [OCTOBRE]: new TypeError("Failed to fetch") });
    expect(await chargerMoisSheet("2026-10", env)).toEqual({ entrees: [], injoignable: true });
  });

  test("une réponse en erreur (500) compte comme une panne", async () => {
    const { env } = faux({ [OCTOBRE]: 500 });
    expect(await chargerMoisSheet("2026-10", env)).toEqual({ entrees: [], injoignable: true });
  });

  test("réseau coupé avec une copie : la dernière copie, sans bandeau", async () => {
    const reponses: Record<number, string | Error> = {};
    const { env, appels, avancer } = faux(reponses);
    await chargerMoisSheet("2026-10", env);
    avancer(10 * 60_000);
    reponses[OCTOBRE] = new TypeError("Failed to fetch");
    const lu = await chargerMoisSheet("2026-10", env);
    expect(appels, "la copie est périmée : on a bien essayé de relire").toHaveLength(2);
    expect(lu.injoignable).toBe(false);
    expect(lu.entrees).toHaveLength(6);
  });

  test("lireSheetEvenements lit l'onglet de chaque mois affiché et garde les jours de la période", async () => {
    const { env, appels } = faux({
      981833936: ongletVide("SEPTEMBRE 2026"),
      1033601810: ongletVide("NOVEMBRE 2026"),
    });
    const grille = await lireSheetEvenements("2026-09-28", "2026-11-08", env);
    expect(appels.map((u) => Number(new URL(u).searchParams.get("gid"))).sort()).toEqual([439766955, 981833936, 1033601810].sort());
    expect(grille.entrees).toHaveLength(6);
    const semaine = await lireSheetEvenements("2026-10-05", "2026-10-11", env);
    expect(semaine.entrees.map((e) => `${e.date} ${e.titre}`)).toEqual([
      "2026-10-06 Soirée louange",
      "2026-10-06 Prière",
      "2026-10-10 Foot au parc",
    ]);
    expect(appels, "la semaine est déjà en mémoire").toHaveLength(3);
  });

  test("un onglet en panne n'efface pas les autres mois", async () => {
    const { env } = faux({ 981833936: new TypeError("Failed to fetch"), 1033601810: ongletVide("NOVEMBRE 2026") });
    const lu = await lireSheetEvenements("2026-09-28", "2026-11-08", env);
    expect(lu.injoignable).toBe(true);
    expect(lu.entrees).toHaveLength(6);
  });
});
