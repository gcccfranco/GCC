import { expect, test } from "@playwright/test";
import type { FSSetlist } from "../src/lib/firebase/setlists";
import type { SetlistItem } from "../src/types/setList";
import {
  bornesDeLaPeriode, chantsDeLaSetlist, choixDesFiltres, debutDeLHistorique, libellePart, libelleTendance,
  nomDePresidence, presidences, statsBibliotheque, statsChants, statsGroupe, statsPresidence, type ContexteBibliotheque, statsDuChant, veille, type FiltresStats,
} from "../src/lib/stats/chantsJoues";
import { trierMoinsJouesIci } from "../src/lib/setlist/bibliotheque";
import type { SongIndexEntry } from "../src/types/song";

// Lot U7, tranche S1 (docs/spec-statistiques.md) : le calcul des statistiques
// des chants, une fonction pure. Décisions Q3 à Q12 de la spec, une par bloc.
// Horloge au 04/10/2026, setlists et recueil simulés (aucune lecture de la base).

const AUJOURDHUI = "2026-10-04";
const TOUT: FiltresStats = { periode: "debut", service: null, langue: null, presidence: null };

const INDEX = [
  { slug: "a-toi-essai", title: "À toi l'essai", language: "fr" as const, artist: "Auteur Un", originalKey: "D" },
  { slug: "beni-essai", title: "Béni soit l'essai", language: "fr" as const, artist: "Auteur Deux", originalKey: "C#" },
  { slug: "zh-essai", title: "测试赞美", language: "zh" as const, artist: "作者三", originalKey: "G" },
  { slug: "dernier-essai", title: "Dernier essai", language: "fr" as const, artist: "Auteur Quatre", originalKey: "E" },
  { slug: "zh-jamais", title: "从未唱过", language: "zh" as const, artist: "作者五", originalKey: "A" },
];

function chant(songSlug: string, keyOverride: string | null = null): SetlistItem {
  return {
    songSlug, position: 0, keyOverride, showChords: true, showPinyin: false, useJianpu: false,
    structureOverride: null, sectionNotes: {}, notes: "",
  };
}

function fusion(...chants: [string, string | null][]): SetlistItem {
  return {
    ...chant(""), type: "fusion",
    fusionSongs: chants.map(([songSlug, keyOverride]) => ({ songSlug, keyOverride, structureOverride: null, sectionNotes: {} })),
  };
}

function transition(): SetlistItem {
  return { ...chant(""), type: "transition", transitionText: "Prière" };
}

function setlist(date: string, items: SetlistItem[], autres: Partial<FSSetlist> = {}): FSSetlist {
  return {
    id: `s-${date}-${Math.random()}`, title: "Culte", leader: "Alpha Exemple", category: "Culte Franco",
    date, language: "fr", notes: "", createdAt: null, items, ...autres,
  };
}

// ─── Q3 : publiées passées ────────────────────────────────────────────────────

test("comptées : publiée passée oui ; brouillon, privée, du jour, à venir, sans date : non", () => {
  const r = statsChants([
    setlist("2026-09-20", [chant("a-toi-essai")]),
    setlist("2026-05-24T09:30:00", [chant("a-toi-essai")]),
    setlist("2026-09-27", [chant("a-toi-essai")], { isDraft: true }),
    setlist("2026-09-13", [chant("a-toi-essai")], { isPrivate: true }),
    setlist("2026-10-04", [chant("a-toi-essai")]),
    setlist("2026-10-11", [chant("a-toi-essai")]),
    setlist("", [chant("a-toi-essai")]),
    setlist("20/09/2026", [chant("a-toi-essai")]),
  ], INDEX, TOUT, AUJOURDHUI);

  expect(r.comptees, "la date se lit sur ses dix premiers caractères").toEqual({ nombre: 2, du: "2026-05-24", au: "2026-09-20" });
  expect(r.plusJoues.map((l) => [l.slug, l.setlists])).toEqual([["a-toi-essai", 2]]);
});

test("aucune setlist comptée : zéro, sans bornes", () => {
  const r = statsChants([setlist("2026-10-11", [chant("a-toi-essai")])], INDEX, TOUT, AUJOURDHUI);
  expect(r.comptees).toEqual({ nombre: 0, du: null, au: null });
  expect(r.plusJoues).toEqual([]);
});

// Relecture : la règle Q3 sert aussi au début de l'historique (« À redécouvrir », Q11), écrite une fois.
test("début de l'historique : la première publiée passée ; brouillon, privée, du jour, à venir, sans date : non", () => {
  expect(debutDeLHistorique([
    setlist("2026-09-20", []),
    setlist("2026-05-10", [], { isDraft: true }),
    setlist("2026-05-17", [], { isPrivate: true }),
    setlist("2026-05-24T09:30:00", []),
    setlist("", []),
    setlist("20/09/2026", []),
  ], AUJOURDHUI)).toBe("2026-05-24");
  expect(debutDeLHistorique([setlist("2026-10-04", []), setlist("2026-10-11", [])], AUJOURDHUI)).toBeNull();
});

test("veille : le jour d'avant, mois et années compris", () => {
  expect(veille("2026-10-04")).toBe("2026-10-03");
  expect(veille("2026-03-01")).toBe("2026-02-28");
  expect(veille("2027-01-01")).toBe("2026-12-31");
});

// ─── Q4 : les chants d'une setlist ────────────────────────────────────────────

test("chants d'une setlist : dans l'ordre, fusions dépliées, transitions ignorées, chaque chant une fois", () => {
  const s = setlist("2026-09-20", [
    chant("a-toi-essai", "D"),
    fusion(["beni-essai", null], ["a-toi-essai", "E"]),
    transition(),
    chant("zh-essai"),
    chant(""),
  ]);
  expect(chantsDeLaSetlist(s), "tonalité de la première apparition ; null = l'originale").toEqual([
    { slug: "a-toi-essai", tonalite: "D" },
    { slug: "beni-essai", tonalite: null },
    { slug: "zh-essai", tonalite: null },
  ]);
});

test("un chant seul et en fusion dans la même setlist compte 1 ; chants de fusion comptés ; transitions non", () => {
  const r = statsChants([
    setlist("2026-09-20", [chant("a-toi-essai"), transition(), fusion(["a-toi-essai", null], ["beni-essai", null])]),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.plusJoues.map((l) => [l.slug, l.setlists])).toEqual([["a-toi-essai", 1], ["beni-essai", 1]]);
  expect(r.comptees.nombre).toBe(1);
});

// ─── Q5 : la tonalité la plus jouée ───────────────────────────────────────────

test("tonalité : keyOverride, sinon l'originale du recueil", () => {
  const r = statsChants([
    setlist("2026-09-06", [chant("a-toi-essai", "E")]),
    setlist("2026-09-13", [chant("a-toi-essai", "E"), chant("dernier-essai")]),
    setlist("2026-09-20", [chant("a-toi-essai")]),
  ], INDEX, TOUT, AUJOURDHUI);
  const parSlug = new Map(r.plusJoues.map((l) => [l.slug, l]));
  expect(parSlug.get("a-toi-essai")?.tonalites).toEqual(["E"]);
  expect(parSlug.get("dernier-essai")?.tonalites, "originale du recueil : E").toEqual(["E"]);
});

test("tonalité : celle de la première apparition quand le chant revient dans la setlist", () => {
  const r = statsChants([
    setlist("2026-09-20", [chant("a-toi-essai", "F"), fusion(["a-toi-essai", "G"])]),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.plusJoues[0].tonalites).toEqual(["F"]);
});

test("tonalité : C# et Db regroupés sous la graphie la plus fréquente ; un nom inconnu reste à part", () => {
  const r = statsChants([
    setlist("2026-08-30", [chant("beni-essai")]),          // originale C#
    setlist("2026-09-06", [chant("beni-essai", "Db")]),
    setlist("2026-09-13", [chant("beni-essai", "Db")]),
    setlist("2026-09-20", [chant("beni-essai", "Am")]),
    setlist("2026-09-27", [chant("beni-essai", "Am")]),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.plusJoues[0].tonalites, "3 fois la hauteur de Db (2 Db, 1 C#) contre 2 Am").toEqual(["Db"]);
});

test("tonalité : ex aequo, toutes, la plus récente d'abord", () => {
  const r = statsChants([
    setlist("2026-08-02", [chant("a-toi-essai", "C"), chant("dernier-essai", "Db")]),
    setlist("2026-08-30", [chant("a-toi-essai", "Db"), chant("dernier-essai", "C")]),
  ], INDEX, TOUT, AUJOURDHUI);
  const parSlug = new Map(r.plusJoues.map((l) => [l.slug, l]));
  expect(parSlug.get("a-toi-essai")?.tonalites, "« Db / C »").toEqual(["Db", "C"]);
  expect(parSlug.get("dernier-essai")?.tonalites, "l'ordre suit la date, pas l'alphabet").toEqual(["C", "Db"]);
});

// ─── Q6 : la part des setlists ────────────────────────────────────────────────

test("% = setlists où figure le chant / setlists comptées", () => {
  const r = statsChants([
    setlist("2026-09-06", [chant("a-toi-essai")]),
    setlist("2026-09-13", [chant("a-toi-essai")]),
    setlist("2026-09-20", [chant("a-toi-essai"), chant("zh-essai")]),
    setlist("2026-09-27", [chant("zh-essai")]),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.plusJoues.map((l) => [l.slug, l.part])).toEqual([["a-toi-essai", 0.75], ["zh-essai", 0.5]]);
});

test("% arrondi à l'unité, « < 1 % » plutôt que « 0 % »", () => {
  expect(libellePart(12 / 92)).toBe("13 %");
  expect(libellePart(11 / 92)).toBe("12 %");
  expect(libellePart(1 / 2)).toBe("50 %");
  expect(libellePart(1 / 150), "0,67 % s'arrondit à 1").toBe("1 %");
  expect(libellePart(1 / 250)).toBe("< 1 %");
  expect(libellePart(1)).toBe("100 %");
});

// ─── Q9 : dernière fois et rang ───────────────────────────────────────────────

test("dernière fois = la setlist comptée la plus récente", () => {
  const r = statsChants([
    setlist("2026-09-20", [chant("a-toi-essai")]),
    setlist("2026-06-07", [chant("a-toi-essai")]),
    setlist("2026-10-11", [chant("a-toi-essai")]),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.plusJoues[0].derniereFois, "la setlist à venir ne compte pas").toBe("2026-09-20");
});

test("rang : au nombre de setlists, ex aequo départagés par la dernière fois puis le titre", () => {
  const r = statsChants([
    setlist("2026-09-06", [chant("dernier-essai"), chant("beni-essai"), chant("a-toi-essai"), chant("zh-essai")]),
    setlist("2026-09-13", [chant("dernier-essai"), chant("zh-essai")]),
    setlist("2026-09-20", [chant("beni-essai"), chant("a-toi-essai")]),
  ], INDEX, TOUT, AUJOURDHUI);
  // 2 setlists chacun : « Béni » et « À toi » joués le 20/09, « Dernier » et 测试 le 13/09.
  expect(r.plusJoues.map((l) => [l.rang, l.titre])).toEqual([
    [1, "À toi l'essai"],
    [2, "Béni soit l'essai"],
    [3, "Dernier essai"],
    [4, "测试赞美"],
  ]);
});

// ─── Q10 : la tendance ────────────────────────────────────────────────────────

test("tendance = seconde moitié − première, coupées au milieu entre la première et la dernière setlist comptée", () => {
  // Du 01/06 au 31/07 : milieu au 01/07, qui ouvre la seconde moitié.
  const r = statsChants([
    setlist("2026-06-01", [chant("a-toi-essai"), chant("beni-essai"), chant("zh-essai")]),
    setlist("2026-06-15", [chant("beni-essai"), chant("zh-essai")]),
    setlist("2026-07-01", [chant("a-toi-essai")]),
    setlist("2026-07-31", [chant("a-toi-essai"), chant("zh-essai")]),
  ], INDEX, TOUT, AUJOURDHUI);
  const parSlug = new Map(r.plusJoues.map((l) => [l.slug, l.tendance]));
  expect(parSlug.get("a-toi-essai"), "1 avant, 2 après").toBe(1);
  expect(parSlug.get("beni-essai"), "2 avant, 0 après").toBe(-2);
  expect(parSlug.get("zh-essai"), "2 avant, 1 après").toBe(-1);
});

test("tendance : « — » s'il y a moins de deux dates", () => {
  const r = statsChants([
    setlist("2026-09-20", [chant("a-toi-essai")]),
    setlist("2026-09-20", [chant("a-toi-essai")], { category: "Groupe Paix" }),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.plusJoues[0].tendance).toBeNull();
});

test("tendance écrite « +3 », « −1 » (signe moins), « = », « — »", () => {
  expect(libelleTendance(3)).toBe("+3");
  expect(libelleTendance(-1)).toBe("−1");
  expect(libelleTendance(0)).toBe("=");
  expect(libelleTendance(null)).toBe("—");
});

// ─── Q7 : les périodes ────────────────────────────────────────────────────────

test("période : de la même date N mois plus tôt jusqu'à hier, bornes comprises", () => {
  expect(bornesDeLaPeriode({ mois: 3 }, AUJOURDHUI)).toEqual({ du: "2026-07-04", au: "2026-10-03" });
  expect(bornesDeLaPeriode({ mois: 6 }, AUJOURDHUI)).toEqual({ du: "2026-04-04", au: "2026-10-03" });
  expect(bornesDeLaPeriode({ mois: 12 }, AUJOURDHUI)).toEqual({ du: "2025-10-04", au: "2026-10-03" });
  expect(bornesDeLaPeriode("debut", AUJOURDHUI)).toEqual({ du: null, au: "2026-10-03" });
  expect(bornesDeLaPeriode({ mois: 3 }, "2026-12-31"), "pas de 31/09 : le dernier jour du mois").toEqual({ du: "2026-09-30", au: "2026-12-30" });
  expect(bornesDeLaPeriode({ mois: 3 }, "2027-01-01"), "changement d'année").toEqual({ du: "2026-10-01", au: "2026-12-31" });
});

test("période : dates libres bornes comprises, toujours avant aujourd'hui", () => {
  expect(bornesDeLaPeriode({ du: "2026-06-01", au: "2026-06-30" }, AUJOURDHUI)).toEqual({ du: "2026-06-01", au: "2026-06-30" });
  expect(bornesDeLaPeriode({ du: "2026-09-01", au: "2026-12-31" }, AUJOURDHUI)).toEqual({ du: "2026-09-01", au: "2026-10-03" });
});

test("filtre période : les bornes comptent, aujourd'hui non", () => {
  const setlists = [
    setlist("2026-07-03", [chant("a-toi-essai")]),
    setlist("2026-07-04", [chant("a-toi-essai")]),
    setlist("2026-10-03", [chant("a-toi-essai")]),
    setlist("2026-10-04", [chant("a-toi-essai")]),
  ];
  const r = statsChants(setlists, INDEX, { ...TOUT, periode: { mois: 3 } }, AUJOURDHUI);
  expect(r.comptees).toEqual({ nombre: 2, du: "2026-07-04", au: "2026-10-03" });

  const libre = statsChants(setlists, INDEX, { ...TOUT, periode: { du: "2026-07-03", au: "2026-07-04" } }, AUJOURDHUI);
  expect(libre.comptees).toEqual({ nombre: 2, du: "2026-07-03", au: "2026-07-04" });
});

// ─── Q8 : service, présidence, langue ─────────────────────────────────────────

test("filtre service : seules les setlists de ce service comptent", () => {
  const r = statsChants([
    setlist("2026-09-06", [chant("a-toi-essai")]),
    setlist("2026-09-13", [chant("a-toi-essai")], { category: "Groupe Paix" }),
    setlist("2026-09-20", [chant("zh-essai")], { category: "Groupe Paix" }),
  ], INDEX, { ...TOUT, service: "Groupe Paix" }, AUJOURDHUI);
  expect(r.comptees.nombre).toBe(2);
  expect(r.plusJoues.map((l) => [l.slug, l.setlists, l.part])).toEqual([["zh-essai", 1, 0.5], ["a-toi-essai", 1, 0.5]]);
});

test("filtre présidence : le texte regroupé par normalizeName (accents, casse, ponctuation)", () => {
  const r = statsChants([
    setlist("2026-09-06", [chant("a-toi-essai")], { leader: "Bêta Exemple" }),
    setlist("2026-09-13", [chant("a-toi-essai")], { leader: " beta exemple. " }),
    setlist("2026-09-20", [chant("a-toi-essai")], { leader: "Alpha Exemple" }),
  ], INDEX, { ...TOUT, presidence: "BETA EXEMPLE" }, AUJOURDHUI);
  expect(r.comptees.nombre).toBe(2);
});

test("filtre langue : retire les lignes de l'autre langue sans changer les % ; les rangs se renumérotent", () => {
  const setlists = [
    setlist("2026-09-06", [chant("a-toi-essai"), chant("zh-essai")]),
    setlist("2026-09-13", [chant("a-toi-essai"), chant("chant-renomme")]),
    setlist("2026-09-20", [chant("a-toi-essai")]),
    setlist("2026-09-27", [chant("beni-essai")]),
  ];
  const tout = statsChants(setlists, INDEX, TOUT, AUJOURDHUI);
  const zh = statsChants(setlists, INDEX, { ...TOUT, langue: "zh" }, AUJOURDHUI);
  const fr = statsChants(setlists, INDEX, { ...TOUT, langue: "fr" }, AUJOURDHUI);

  expect(zh.comptees, "le dénominateur ne bouge pas").toEqual(tout.comptees);
  expect(zh.plusJoues.map((l) => [l.rang, l.slug, l.part])).toEqual([[1, "zh-essai", 0.25]]);
  expect(fr.plusJoues.map((l) => [l.rang, l.slug, l.part]), "le chant absent du recueil est écarté").toEqual([
    [1, "a-toi-essai", 0.75], [2, "beni-essai", 0.25],
  ]);
});

test("choix des filtres : services connus puis inconnus trouvés ; présidences regroupées sous leur graphie la plus fréquente, A→Z", () => {
  const c = choixDesFiltres([
    setlist("2026-09-06", [], { leader: "Bêta Exemple" }),
    setlist("2026-09-13", [], { leader: "beta exemple." }),
    setlist("2026-09-20", [], { leader: "Bêta Exemple", category: "Culte de Noël" }),
    setlist("2026-09-27", [], { leader: "Alpha Exemple", category: "Groupe Paix" }),
    setlist("2026-08-30", [], { leader: "  " }),
    setlist("2026-08-23", [], { leader: "Gamma Brouillon", isDraft: true }),
    setlist("2026-08-16", [], { leader: "Delta Privée", isPrivate: true, category: "Atelier" }),
  ], AUJOURDHUI, ["Culte Franco", "Groupe Paix"]);
  expect(c.services).toEqual(["Culte Franco", "Groupe Paix", "Culte de Noël"]);
  expect(c.presidences).toEqual(["Alpha Exemple", "Bêta Exemple"]);
});

// ─── Q11 : jamais joués et à redécouvrir ──────────────────────────────────────

test("jamais joués : les chants du recueil absents des setlists comptées, ordre du recueil, dernière fois toutes dates confondues", () => {
  const r = statsChants([
    setlist("2026-06-07", [chant("dernier-essai")]),
    setlist("2026-06-14", [chant("dernier-essai")], { category: "Groupe Paix" }),
    setlist("2026-09-20", [chant("a-toi-essai")]),
    setlist("2026-10-11", [chant("beni-essai")]),
  ], INDEX, { ...TOUT, periode: { mois: 3 }, service: "Culte Franco" }, AUJOURDHUI);
  expect(r.jamaisJoues).toEqual([
    { slug: "beni-essai", titre: "Béni soit l'essai", langue: "fr", artiste: "Auteur Deux", derniereFois: null },
    { slug: "zh-essai", titre: "测试赞美", langue: "zh", artiste: "作者三", derniereFois: null },
    { slug: "dernier-essai", titre: "Dernier essai", langue: "fr", artiste: "Auteur Quatre", derniereFois: "2026-06-07" },
    { slug: "zh-jamais", titre: "从未唱过", langue: "zh", artiste: "作者五", derniereFois: null },
  ]);

  const zh = statsChants([], INDEX, { ...TOUT, langue: "zh" }, AUJOURDHUI);
  expect(zh.jamaisJoues.map((c) => c.slug), "le filtre de langue vaut aussi ici").toEqual(["zh-essai", "zh-jamais"]);
});

test("à redécouvrir : au moins 3 setlists avant la période, aucune pendant, triés par ce nombre puis la dernière fois", () => {
  const r = statsChants([
    // « Dernier » : 4 fois avant juillet (2 E, 2 F), rien depuis → oui. « Béni » : 2 C#, 1 Db.
    setlist("2026-05-24", [chant("dernier-essai"), chant("a-toi-essai"), chant("beni-essai")]),
    setlist("2026-05-31", [chant("dernier-essai"), chant("a-toi-essai"), chant("beni-essai")]),
    setlist("2026-06-07", [chant("dernier-essai", "F"), chant("a-toi-essai"), chant("beni-essai", "Db"), chant("chant-renomme", "B")]),
    setlist("2026-06-14", [chant("dernier-essai", "F"), chant("zh-essai"), chant("chant-renomme", "B")]),
    setlist("2026-06-21", [chant("zh-essai"), chant("chant-renomme", "B")]),
    // « À toi » : 3 fois avant, mais rejoué pendant → non. 测试 : 2 fois avant → non.
    setlist("2026-09-20", [chant("a-toi-essai")]),
  ], INDEX, { ...TOUT, periode: { mois: 3 } }, AUJOURDHUI);
  expect(r.aRedecouvrir).toEqual([
    { slug: "dernier-essai", titre: "Dernier essai", langue: "fr", avant: 4, derniereFois: "2026-06-14", tonalites: ["F", "E"] },
    { slug: "chant-renomme", titre: "chant-renomme", langue: null, avant: 3, derniereFois: "2026-06-21", tonalites: ["B"] },
    { slug: "beni-essai", titre: "Béni soit l'essai", langue: "fr", avant: 3, derniereFois: "2026-06-07", tonalites: ["C#"] },
  ]);
});

test("à redécouvrir : rien « depuis le début », qui n'a pas d'avant", () => {
  const r = statsChants([
    setlist("2026-05-24", [chant("dernier-essai")]),
    setlist("2026-05-31", [chant("dernier-essai")]),
    setlist("2026-06-07", [chant("dernier-essai")]),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.aRedecouvrir).toEqual([]);
});

// ─── Q12 : chant absent du recueil ────────────────────────────────────────────

test("slug absent du recueil : une ligne à son nom, sans langue, jamais dans « Jamais joués »", () => {
  const r = statsChants([
    setlist("2026-09-13", [chant("chant-renomme", "G")]),
    setlist("2026-09-20", [chant("chant-renomme")]),
  ], INDEX, TOUT, AUJOURDHUI);
  expect(r.plusJoues).toEqual([{
    slug: "chant-renomme", titre: "chant-renomme", langue: null, rang: 1, setlists: 2, part: 1,
    derniereFois: "2026-09-20", tonalites: ["G"], tendance: 0,
  }]);
  expect(r.jamaisJoues.map((c) => c.slug)).not.toContain("chant-renomme");
});

// ─── Lot ST, ST2 : un chant ───────────────────────────────────────────────────

test.describe("statsDuChant (lot ST, ST2)", () => {
  const PAIX = "Groupe Paix", FIDELITE = "Groupe Fidélité", BONTE = "Groupe Bonté";
  const A = "a-toi-essai";
  const calcul = (liste: FSSetlist[], periode: Parameters<typeof statsDuChant>[3] = "debut", sauf?: string) =>
    statsDuChant(liste, INDEX, A, periode, AUJOURDHUI, sauf);

  test("total et dernière : la plus récente avec son service", () => {
    const r = calcul([
      setlist("2026-09-06", [chant(A)], { category: PAIX }),
      setlist("2026-09-20", [chant(A)], { category: FIDELITE }),
      setlist("2026-09-13", [chant("zh-essai")], { category: BONTE }),
    ]);
    expect(r.total).toBe(2);
    expect(r.derniere).toEqual({ jour: "2026-09-20", service: FIDELITE });
  });

  test("un chant deux fois dans une setlist (dont en fusion) compte une fois", () => {
    const r = calcul([setlist("2026-09-20", [chant(A), fusion([A, "G"], ["zh-essai", null]), chant(A)], { category: PAIX })]);
    expect(r.total).toBe(1);
    expect(r.parService).toEqual([{ service: PAIX, fois: 1, derniere: "2026-09-20" }]);
  });

  test("brouillon, privée, du jour et à venir ne comptent pas ; une transition n'est pas un chant", () => {
    const r = calcul([
      setlist("2026-09-20", [chant(A)], { category: PAIX }),
      setlist("2026-09-27", [chant(A)], { category: PAIX, isDraft: true }),
      setlist("2026-09-13", [chant(A)], { category: PAIX, isPrivate: true }),
      setlist("2026-10-04", [chant(A)], { category: PAIX }),
      setlist("2026-10-11", [chant(A)], { category: PAIX }),
      setlist("2026-09-06", [transition()], { category: PAIX }),
    ]);
    expect(r.total).toBe(1);
  });

  test("tonalités : celle de la setlist, sinon l'originale du recueil", () => {
    const r = calcul([
      setlist("2026-09-06", [chant(A, "G")]),
      setlist("2026-09-13", [chant(A, "G")]),
      setlist("2026-09-20", [chant(A)]),
    ]);
    expect(r.tonalites).toEqual(["G"]);
  });

  test("parService : fois décroissant, puis le plus récent d'abord", () => {
    const r = calcul([
      setlist("2026-08-02", [chant(A)], { category: BONTE }),
      setlist("2026-09-06", [chant(A)], { category: PAIX }),
      setlist("2026-09-13", [chant(A)], { category: FIDELITE }),
      setlist("2026-09-20", [chant(A)], { category: FIDELITE }),
      setlist("2026-09-27", [chant(A)], { category: PAIX }),
      setlist("2026-09-01", [chant(A)], { category: "" }),
    ]);
    expect(r.parService).toEqual([
      { service: PAIX, fois: 2, derniere: "2026-09-27" },
      { service: FIDELITE, fois: 2, derniere: "2026-09-20" },
      { service: BONTE, fois: 1, derniere: "2026-08-02" },
    ].sort((a, b) => b.fois - a.fois || b.derniere.localeCompare(a.derniere)));
    expect(r.parService.map((l) => l.service)).toEqual([PAIX, FIDELITE, BONTE]);
  });

  test("jamaisDans : les services comptés où le chant n'apparaît jamais, dans l'ordre des catégories", () => {
    const r = calcul([
      setlist("2026-09-06", [chant(A)], { category: PAIX }),
      setlist("2026-09-13", [chant("zh-essai")], { category: BONTE }),
      setlist("2026-09-20", [chant("zh-essai")], { category: FIDELITE }),
      setlist("2026-09-27", [chant("zh-essai")], { category: PAIX }),
      setlist("2026-10-11", [chant("zh-essai")], { category: "Groupe Inconnu" }),
    ]);
    expect(r.jamaisDans).toEqual([FIDELITE, BONTE]);
  });

  test("prochaine : la plus proche, publiée ; brouillon, privée et passée ignorés ; indépendante de la période", () => {
    const r = calcul([
      setlist("2026-10-25", [chant(A)], { category: BONTE, id: "loin" }),
      setlist("2026-10-11", [chant(A)], { category: PAIX, id: "proche" }),
      setlist("2026-10-06", [chant(A)], { category: PAIX, id: "brouillon", isDraft: true }),
      setlist("2026-10-05", [chant(A)], { category: PAIX, id: "privee", isPrivate: true }),
      setlist("2026-10-08", [chant("zh-essai")], { category: PAIX, id: "autre-chant" }),
      setlist("2026-09-20", [chant(A)], { category: PAIX, id: "passee" }),
    ], { mois: 3 });
    expect(r.prochaine).toEqual({ jour: "2026-10-11", service: PAIX, setlistId: "proche" });
    expect(calcul([setlist("2026-09-20", [chant(A)])]).prochaine).toBeNull();
    // Le jour même compte comme prochaine (≥ aujourd'hui), sans être comptée.
    const duJour = calcul([setlist("2026-10-04", [chant(A)], { id: "ajd" })]);
    expect(duJour.total).toBe(0);
    expect(duJour.prochaine?.setlistId).toBe("ajd");
  });

  test("sauf : la setlist ignorée n'entre ni dans les comptes ni dans la prochaine", () => {
    const liste = [
      setlist("2026-09-20", [chant(A)], { id: "edit-passee", category: PAIX }),
      setlist("2026-09-13", [chant(A)], { id: "autre", category: FIDELITE }),
      setlist("2026-10-11", [chant(A)], { id: "edit-future", category: PAIX }),
    ];
    const r = calcul(liste, "debut", "edit-passee");
    expect(r.total).toBe(1);
    expect(r.derniere?.service).toBe(FIDELITE);
    expect(r.prochaine?.setlistId).toBe("edit-future");
    expect(calcul(liste, "debut", "edit-future").prochaine).toBeNull();
  });

  test("période 3 mois : les comptes sont bornés, jamaisDans suit la période", () => {
    const liste = [
      setlist("2026-09-20", [chant(A)], { category: PAIX }),
      setlist("2026-05-10", [chant(A)], { category: FIDELITE }),
      setlist("2026-09-27", [chant("zh-essai")], { category: BONTE }),
      setlist("2026-04-12", [chant("zh-essai")], { category: "Groupe Ancien" }),
    ];
    const court = calcul(liste, { mois: 3 });
    expect(court.total).toBe(1);
    expect(court.parService.map((l) => l.service)).toEqual([PAIX]);
    expect(court.jamaisDans).toEqual([BONTE]);
    const tout = calcul(liste);
    expect(tout.total).toBe(2);
    expect(tout.jamaisDans).toEqual([BONTE, "Groupe Ancien"]);
  });

  test("jamais joué : total 0, dernière null, tonalités vides", () => {
    const r = calcul([setlist("2026-09-20", [chant("zh-essai")], { category: PAIX })]);
    expect(r).toEqual({ total: 0, derniere: null, tonalites: [], parService: [], jamaisDans: [PAIX], prochaine: null });
  });
});

// ─── Lot ST, ST5 : la bibliothèque de l'éditeur ───────────────────────────────

test.describe("statsBibliotheque", () => {
  const FID = "Groupe Fidélité", PAIX = "Groupe Paix";
  const A = "a-toi-essai", B = "beni-essai", Z = "zh-essai";
  // La setlist en cours : Fidélité, le 01/11/2026 (aujourd'hui : 04/10, donc à venir).
  const CTX = { service: FID, date: "2026-11-01", setlistId: "en-cours" };
  const calcul = (liste: FSSetlist[], ctx: ContexteBibliotheque = CTX, slugs = [A, B, Z]) => statsBibliotheque(liste, slugs, ctx, AUJOURDHUI);

  test("repère orange : 7 jours avant, 9 jours après, même jour ; 21 jours pile : rien", () => {
    const liste = [
      setlist("2026-10-25", [chant(A)], { category: FID }),   // 7 j avant
      setlist("2026-11-10", [chant(B)], { category: FID }),   // 9 j après
      setlist("2026-11-01", [chant(Z)], { category: FID }),   // même jour
      setlist("2026-10-11", [chant(A)], { category: FID }),   // 21 j avant : hors repère pour A (déjà 7 j)
    ];
    const r = calcul(liste);
    expect(r.get(A)?.recent).toEqual({ jour: "2026-10-25", avant: true, jours: 7 });
    expect(r.get(B)?.recent).toEqual({ jour: "2026-11-10", avant: false, jours: 9 });
    expect(r.get(Z)?.recent).toEqual({ jour: "2026-11-01", avant: false, jours: 0 });
    const pile = calcul([setlist("2026-10-11", [chant(A)], { category: FID }), setlist("2026-11-22", [chant(B)], { category: FID })]);
    expect(pile.get(A)?.recent).toBeNull();
    expect(pile.get(B)?.recent).toBeNull();
    // 20 jours : dans le repère.
    expect(calcul([setlist("2026-10-12", [chant(A)], { category: FID })]).get(A)?.recent?.jours).toBe(20);
  });

  test("le plus proche gagne ; à égalité, celle d'avant", () => {
    const r = calcul([
      setlist("2026-10-20", [chant(A)], { category: FID }),   // 12 j avant
      setlist("2026-11-05", [chant(A)], { category: FID }),   // 4 j après
      setlist("2026-10-28", [chant(B)], { category: FID }),   // 4 j avant
      setlist("2026-11-05", [chant(B)], { category: FID }),   // 4 j après
    ]);
    expect(r.get(A)?.recent).toEqual({ jour: "2026-11-05", avant: false, jours: 4 });
    expect(r.get(B)?.recent).toEqual({ jour: "2026-10-28", avant: true, jours: 4 });
  });

  test("autre service, brouillon, privée, setlist éditée : pas de repère ; mais le total d'un autre service compte", () => {
    const r = calcul([
      setlist("2026-09-25", [chant(A)], { category: PAIX }),
      setlist("2026-10-26", [chant(B)], { category: FID, isDraft: true }),
      setlist("2026-10-27", [chant(Z)], { category: FID, isPrivate: true }),
      setlist("2026-10-28", [chant(Z)], { category: FID, id: "en-cours" }),
    ]);
    expect([A, B, Z].map((s) => r.get(s)?.recent)).toEqual([null, null, null]);
    expect(r.get(A)?.total).toBe(1);
    expect(r.get(Z)?.total).toBe(0);
  });

  test("comptes : service choisi, vert, jamais nulle part, setlist éditée exclue, à venir non comptée", () => {
    const r = calcul([
      setlist("2026-09-06", [chant(A)], { category: FID }),
      setlist("2026-09-13", [chant(A)], { category: FID }),
      setlist("2026-09-20", [chant(A), chant(B)], { category: PAIX }),
      setlist("2026-09-27", [chant(A)], { category: FID, id: "en-cours" }),
      setlist("2026-10-18", [chant(Z)], { category: FID }),
    ]);
    expect(r.get(A)).toMatchObject({ total: 3, dansService: { fois: 2, derniere: "2026-09-13" }, jamaisNullePart: false, jamaisDansService: false });
    expect(r.get(B)).toMatchObject({ total: 1, dansService: null, jamaisDansService: true, jamaisNullePart: false });
    expect(r.get(Z)).toMatchObject({ total: 0, jamaisNullePart: true });
    // Le chant prévu à venir (18/10) donne un repère, pas un compte.
    expect(r.get(Z)?.recent).toEqual({ jour: "2026-10-18", avant: true, jours: 14 });
  });

  test("sans service ou sans date : le total seul, pas de repère", () => {
    const liste = [setlist("2026-09-06", [chant(A)], { category: FID }), setlist("2026-10-25", [chant(B)], { category: FID })];
    const sansService = calcul(liste, { service: null, date: "2026-11-01", setlistId: null });
    expect(sansService.get(A)).toEqual({ total: 1, dansService: null, jamaisNullePart: false, jamaisDansService: false, recent: null });
    expect(sansService.get(B)?.recent).toBeNull();
    const sansDate = calcul(liste, { service: FID, date: null, setlistId: null });
    expect(sansDate.get(A)).toMatchObject({ total: 1, dansService: { fois: 1, derniere: "2026-09-06" }, recent: null });
    expect(sansDate.get(B)?.recent).toBeNull();
  });

  test("date avec heure : les 10 premiers caractères", () => {
    const r = calcul([setlist("2026-10-25T09:30:00", [chant(A)], { category: FID })], { ...CTX, date: "2026-11-01T10:00:00" });
    expect(r.get(A)?.recent?.jours).toBe(7);
  });
});

test.describe("trierMoinsJouesIci", () => {
  const song = (slug: string, title: string, over: Partial<SongIndexEntry> = {}) =>
    ({ slug, title, titlePinyin: null, language: "fr", ...over }) as SongIndexEntry;
  const songs = [
    song("a", "Zèbre"), song("b", "Alpha"), song("c", "Béta"),
    song("zh1", "回家", { language: "zh", titlePinyin: "Huí jiā" }), song("d", "Delta"),
  ];
  test("jamais d'abord (A→Z, pinyin pour le chinois), puis la dernière fois la plus ancienne", () => {
    const stats = new Map([
      ["a", { dansService: { derniere: "2026-09-01" } }],
      ["b", { dansService: { derniere: "2026-03-01" } }],
      ["c", { dansService: null }],
      ["zh1", { dansService: null }],
      ["d", { dansService: { derniere: "2026-09-01" } }],
    ]);
    expect(trierMoinsJouesIci(songs, stats).map((s) => s.slug)).toEqual(["c", "zh1", "b", "d", "a"]);
  });
});

// ─── Lot SP : présidences et groupes ──────────────────────────────────────────

test.describe("lot SP", () => {
  const PAIX = "Groupe Paix", FIDELITE = "Groupe Fidélité", BONTE = "Groupe Bonté";
  const LUC = "Luc Essai";
  const pres = (liste: FSSetlist[], nom = LUC, periode: Parameters<typeof statsPresidence>[3] = "debut") =>
    statsPresidence(liste, INDEX, nom, periode, AUJOURDHUI);
  const de = (date: string, items: SetlistItem[], leader: string, category = FIDELITE, autres: Partial<FSSetlist> = {}) =>
    setlist(date, items, { leader, category, ...autres });

  test("statsPresidence : les graphies (casse, espaces, point, virgule) se regroupent ; un autre nom non", () => {
    const r = pres([
      de("2026-09-06", [chant("a-toi-essai")], "Luc Essai"),
      de("2026-09-13", [chant("a-toi-essai")], "luc  essai"),
      de("2026-09-20", [chant("a-toi-essai")], "Luc Essai."),
      de("2026-09-27", [chant("a-toi-essai")], "LUC ESSAI"),
      de("2026-08-30", [chant("a-toi-essai")], "Lucie Essai"),
    ], "luc essai");
    expect(r.total).toBe(4);
  });

  test("statsPresidence : brouillon, privée, du jour et à venir ne comptent pas", () => {
    const r = pres([
      de("2026-09-20", [chant("a-toi-essai")], LUC),
      de("2026-09-27", [chant("a-toi-essai")], LUC, FIDELITE, { isDraft: true }),
      de("2026-09-13", [chant("a-toi-essai")], LUC, FIDELITE, { isPrivate: true }),
      de("2026-10-04", [chant("a-toi-essai")], LUC),
      de("2026-10-11", [chant("a-toi-essai")], LUC),
    ]);
    expect(r.total).toBe(1);
    expect(r.derniere).toEqual({ jour: "2026-09-20", service: FIDELITE });
  });

  test("statsPresidence : la période borne les setlists comptées, pas la prochaine", () => {
    const liste = [
      de("2026-02-01", [chant("a-toi-essai")], LUC),
      de("2026-09-20", [chant("a-toi-essai")], LUC),
      de("2026-11-01", [chant("a-toi-essai")], LUC, PAIX),
    ];
    const r = pres(liste, LUC, { mois: 3 });
    expect(r.total).toBe(1);
    expect(r.prochaine).toEqual({ jour: "2026-11-01", service: PAIX, setlistId: liste[2].id });
    expect(pres(liste).total).toBe(2);
  });

  test("statsPresidence : parService trié fois puis dernière", () => {
    const r = pres([
      de("2026-09-06", [chant("a-toi-essai")], LUC, PAIX),
      de("2026-09-13", [chant("a-toi-essai")], LUC, FIDELITE),
      de("2026-09-20", [chant("a-toi-essai")], LUC, FIDELITE),
      de("2026-09-27", [chant("a-toi-essai")], LUC, BONTE),
    ]);
    expect(r.parService).toEqual([
      { service: FIDELITE, fois: 2, derniere: "2026-09-20" },
      { service: BONTE, fois: 1, derniere: "2026-09-27" },
      { service: PAIX, fois: 1, derniere: "2026-09-06" },
    ]);
  });

  test("statsPresidence : chants triés fois, dernière fois, puis titre ; jamaisChoisis = chants du recueil non choisis", () => {
    const r = pres([
      de("2026-09-06", [chant("beni-essai"), chant("zh-essai"), chant("a-toi-essai")], LUC),
      de("2026-09-13", [chant("zh-essai"), chant("a-toi-essai")], LUC),
      de("2026-09-20", [chant("zh-essai"), chant("hors-recueil")], LUC),
      de("2026-09-27", [chant("dernier-essai")], "Autre Personne"),
    ]);
    // zh-essai 3 ; a-toi-essai 2 ; puis 1 fois : hors-recueil (09-20) avant beni-essai (09-06)
    expect(r.chants).toEqual([
      { slug: "zh-essai", fois: 3 }, { slug: "a-toi-essai", fois: 2 },
      { slug: "hors-recueil", fois: 1 }, { slug: "beni-essai", fois: 1 },
    ]);
    // recueil : 5 chants, 3 choisis (hors-recueil n'en est pas) → dernier-essai et zh-jamais
    expect(r.jamaisChoisis).toBe(2);
    // même fois, même dernière fois : le titre départage (« À toi l'essai » avant « Béni soit l'essai »)
    const egal = pres([de("2026-09-06", [chant("beni-essai"), chant("a-toi-essai")], LUC)]);
    expect(egal.chants.map((c) => c.slug)).toEqual(["a-toi-essai", "beni-essai"]);
  });

  test("statsPresidence : prochaine = la plus proche, publiée, d'aujourd'hui ou après ; aucune sinon", () => {
    const liste = [
      de("2026-10-18", [chant("a-toi-essai")], LUC, PAIX),
      de("2026-10-04", [chant("a-toi-essai")], "luc essai", BONTE),
      de("2026-10-05", [chant("a-toi-essai")], LUC, FIDELITE, { isDraft: true }),
      de("2026-10-06", [chant("a-toi-essai")], LUC, FIDELITE, { isPrivate: true }),
      de("2026-10-07", [chant("a-toi-essai")], "Autre Personne"),
    ];
    expect(pres(liste).prochaine).toEqual({ jour: "2026-10-04", service: BONTE, setlistId: liste[1].id });
    expect(pres(liste, "Personne Inconnue")).toEqual({
      total: 0, derniere: null, parService: [], chants: [], jamaisChoisis: INDEX.length, prochaine: null,
    });
  });

  test("presidences : graphie la plus fréquente, services dans l'ordre des catégories, tri fois puis dernière puis nom ; leader vide ignoré", () => {
    const liste = [
      de("2026-09-06", [], "Luc Essai", BONTE),
      de("2026-09-13", [], "luc essai", FIDELITE),
      de("2026-09-20", [], "luc essai", FIDELITE),
      de("2026-09-27", [], "Marie Test", PAIX),
      de("2026-09-13", [], "Zoé Test", PAIX),
      de("2026-09-20", [], "Anne Test", PAIX),
      de("2026-09-21", [], "   ", PAIX),
      de("2026-09-22", [], "", PAIX),
      de("2026-09-23", [], "Brouillon Test", PAIX, { isDraft: true }),
    ];
    const r = presidences(liste, "debut", AUJOURDHUI, null);
    expect(r.map((l) => l.nom)).toEqual(["luc essai", "Marie Test", "Anne Test", "Zoé Test"]);
    expect(r[0]).toMatchObject({ nom: "luc essai", fois: 3, derniere: "2026-09-20" });
    // ordre de ALL_CATEGORIES : Fidélité avant Bonté
    expect(r[0].services).toEqual([FIDELITE, BONTE]);
  });

  test("presidences : le filtre service ne garde que ses setlists ; la période borne", () => {
    const liste = [
      de("2026-02-01", [], "Luc Essai", FIDELITE),
      de("2026-09-13", [], "Luc Essai", FIDELITE),
      de("2026-09-20", [], "Luc Essai", PAIX),
      de("2026-09-27", [], "Marie Test", PAIX),
    ];
    expect(presidences(liste, "debut", AUJOURDHUI, FIDELITE)).toEqual([
      { nom: "Luc Essai", fois: 2, derniere: "2026-09-13", services: [FIDELITE] },
    ]);
    expect(presidences(liste, { mois: 3 }, AUJOURDHUI, PAIX).map((l) => [l.nom, l.fois])).toEqual([["Marie Test", 1], ["Luc Essai", 1]]);
    expect(presidences(liste, "debut", AUJOURDHUI, BONTE)).toEqual([]);
  });

  test("statsGroupe : une seule setlist → 1,0 par mois ; plusieurs → setlists / (jours / 30,44)", () => {
    const une = statsGroupe([de("2026-09-20", [chant("a-toi-essai")], LUC)], INDEX, FIDELITE, "debut", AUJOURDHUI);
    expect(une.setlists).toBe(1);
    expect(une.parMois).toBe(1);
    // 4 setlists sur 91,32 jours (3 mois exacts) → 1,3
    const liste = ["2026-06-01", "2026-07-01", "2026-08-01", "2026-08-31"].map((d) => de(d, [chant("a-toi-essai")], LUC));
    const plusieurs = statsGroupe(liste, INDEX, FIDELITE, "debut", AUJOURDHUI);
    expect(plusieurs.setlists).toBe(4);
    expect(plusieurs.parMois).toBe(Math.round((4 / (91 / 30.44)) * 10) / 10);
    expect(plusieurs.parMois).toBe(1.3);
    // moins d'un mois entre la première et la dernière : le minimum de 1 mois s'applique
    const serrees = statsGroupe(["2026-09-06", "2026-09-13", "2026-09-20"].map((d) => de(d, [], LUC)), INDEX, FIDELITE, "debut", AUJOURDHUI);
    expect(serrees.parMois).toBe(3);
  });

  test("statsGroupe : chants différents, part 中文 des passages (hors recueil ignoré), tonalités", () => {
    const r = statsGroupe([
      de("2026-09-06", [chant("a-toi-essai"), chant("zh-essai"), chant("hors-recueil")], LUC),
      de("2026-09-13", [chant("a-toi-essai", "G"), chant("a-toi-essai"), fusion(["zh-essai", "G"], ["beni-essai", null])], LUC),
      de("2026-09-20", [chant("dernier-essai")], LUC, PAIX),
      de("2026-09-27", [chant("zh-jamais")], LUC, FIDELITE, { isDraft: true }),
    ], INDEX, FIDELITE, "debut", AUJOURDHUI);
    expect(r.setlists).toBe(2);
    expect(r.chantsDifferents).toBe(4); // a-toi, zh-essai, hors-recueil, beni
    // passages du recueil : a-toi ×2, zh-essai ×2, beni ×1 = 5 ; 中文 : 2
    expect(r.partZh).toBeCloseTo(2 / 5, 10);
    // D (a-toi, setlist 1), G (a-toi, setlist 2), G (zh-essai, setlist 2), G (zh-essai, setlist 1 = originale G), C# (beni)
    expect(r.tonalites).toEqual(["G"]);
  });

  test("statsGroupe : aucune setlist, ou aucun passage du recueil → zéros", () => {
    expect(statsGroupe([de("2026-09-20", [chant("a-toi-essai")], LUC, PAIX)], INDEX, FIDELITE, "debut", AUJOURDHUI))
      .toEqual({ setlists: 0, parMois: 0, chantsDifferents: 0, partZh: 0, tonalites: [] });
    const horsRecueil = statsGroupe([de("2026-09-20", [chant("hors-recueil")], LUC)], INDEX, FIDELITE, "debut", AUJOURDHUI);
    expect(horsRecueil.partZh).toBe(0);
    expect(horsRecueil.chantsDifferents).toBe(1);
  });

  test("nomDePresidence : planningName d'abord, sinon prénom nom", () => {
    expect(nomDePresidence({ planningName: "  Luc E.  ", firstName: "Luc", lastName: "Essai" })).toBe("Luc E.");
    expect(nomDePresidence({ planningName: "   ", firstName: "Luc", lastName: "Essai" })).toBe("Luc Essai");
    expect(nomDePresidence({ firstName: "Luc", lastName: "Essai" })).toBe("Luc Essai");
    expect(nomDePresidence({ firstName: "Luc" })).toBe("Luc");
  });
});
