import { expect, test } from "@playwright/test";
import type { FSSetlist } from "../src/lib/firebase/setlists";
import type { SetlistItem } from "../src/types/setList";
import {
  bornesDeLaPeriode, chantsDeLaSetlist, choixDesFiltres, libellePart, libelleTendance,
  statsChants, type FiltresStats,
} from "../src/lib/stats/chantsJoues";

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
