import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { QUI, type MediaPassage, type Passage } from "../src/types/programme";
import { FAMILLES, quiPermis } from "../src/lib/scene/saison";
import { FETE_CATEGORIES, ALL_CATEGORIES, toFsFields } from "../src/lib/firebase/setlists";
import { libelleQui, groupeDuQui } from "../src/lib/fetes/qui";
import { nouvelIdPassage, validerMedias } from "../src/lib/fetes/passages";
import {
  ayantsDroitDuQui, droitsDeSaisie, periodeEddDuJour, titreSetlistFete,
  type ContexteFetes, type ProfilFete,
} from "../src/lib/fetes/droits";
import { estUnChant, propositionsEnDouble, resoudrePropositions } from "../src/lib/setlist/propositions";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { categoryColor, CATEGORY_COLORS, PLANNING_COLORS } from "../src/lib/serviceColors";
import type { SetlistItem } from "../src/types/setList";
import type { DroitsRole } from "../src/types/groupe";

// Lot « chants des fêtes » (docs/spec-chants-fetes.md), tranches CF-A (modèle et logique pure),
// CF-F (documentation, parseur) et CF-G (couleurs). Noms fictifs.

const profil = (uid: string, o: Partial<ProfilFete> = {}): ProfilFete =>
  ({ uid, groupe: null, serviceRoles: {}, dansEquipes: [], planningName: "", coordination: false, ...o });

// Groupe Paix (fictif) : Ruth K. préside, Léa M. est VP, Joël F. a le rôle de service « musicien »,
// Noé P. tient un rôle relié à `musiciens`, Mei Z. un rôle relié à `orateur` coché « Saisir les chants »,
// Hugo L. un rôle relié à `orateur` non coché, Éli D. un rôle coché mais du groupe Bonté.
const PROFILS: ProfilFete[] = [
  profil("ruth", { groupe: "paix" }),
  profil("lea", { groupe: "paix" }),
  profil("joel", { serviceRoles: { "Groupe Paix": ["musicien"] } }),
  profil("noe", { groupe: "paix" }),
  profil("mei", { groupe: "paix" }),
  profil("hugo", { groupe: "paix" }),
  profil("eli", { groupe: "bonte" }),
  profil("presidence-seance", { serviceRoles: { "Groupe Paix": ["presidence"] } }),
  profil("bonte-membre", { groupe: "bonte" }),
  profil("gui", { groupe: "fidelite" }),
  profil("ana", { groupe: "joie" }),
  profil("tom", { groupe: "joie" }),
  profil("sam", { groupe: "joie" }),
  profil("dan", { planningName: "Dan O." }),
  profil("olga", { planningName: "Olga" }),
  profil("pia", { planningName: "Pia" }),
  profil("cajon", { planningName: "Caj" }),
  profil("guit", { planningName: "Guit" }),
  profil("sup", { planningName: "Supp" }),
  profil("vieux", { planningName: "Vieux" }),
  profil("octo", { planningName: "Octo" }),
  profil("team-edd", { dansEquipes: ["edd"] }),
  profil("team-louange", { dansEquipes: ["louange"] }),
  profil("choriste", { serviceRoles: { "Culte Francophone": ["chanteur"] } }),
  profil("coord", { coordination: true }),
  profil("autre", { dansEquipes: ["regie"] }),
];

// Documents `groupes/{id}` au format du lot 2 : Titulaire = { nom, uid } (uid vide = sans compte).
const t = (uid: string) => ({ nom: uid, uid });
const role = (colonne: string | null, titulaires: string[], saisirFetes?: boolean) => ({
  colonne, titulaires: titulaires.map(t),
  droits: { remplir: false, publier: false, notifier: false, ...(saisirFetes === undefined ? {} : { saisirFetes }) } as DroitsRole,
});

const GROUPES: ContexteFetes["groupes"] = {
  paix: {
    president: t("ruth"), vp: [t("lea"), { nom: "Sans compte", uid: "" }],
    roles: [
      role("musiciens", ["noe"]),
      role("orateur", ["mei"], true),
      role("orateur", ["hugo"]),
      role("percussion", ["eli"], true), // d'un autre groupe : ignoré
    ],
  },
  fidelite: { president: null, vp: [], roles: [role("guitariste", ["gui"])] },
  joie: { president: t("ana"), vp: [t("tom")], roles: [role(null, ["sam"], true), role(null, ["hugo"])] },
};

// Planning EDD 中班 : un dimanche d'octobre, de Nov–Déc 2026 et de Nov–Déc 2025 ; guitare = colonne 5.
const EDD: ContexteFetes["edd"] = {
  P5_SepOct: { classes: { "中班": [["2026-10-11", "Octo", "", "", "", "", ""]] } },
  P6_NovDec: {
    classes: {
      "中班": [
        ["2025-12-14", "Vieux", "", "", "", "", ""],
        ["2026-11-29", "Dan O.", "Supp", "Pia", "Caj", "Guit", "Olga"],
        ["2026-12-06", "Dan O.", "", "Pia", "", "Guit", "Olga"],
      ],
    },
  },
  P2_MarAvr: { classes: { "中班": [["2027-03-28", "Dan O.", "", "", "", "", ""]] } },
};

const CTX: ContexteFetes = { profils: PROFILS, groupes: GROUPES, edd: EDD, jourJ: "2026-12-24" };
const uids = (q: string, ctx = CTX) => ayantsDroitDuQui(q, ctx).map((a) => a.uid).sort();

test.describe("liste « Qui » et familles (décision 34, CF3-CF5)", () => {
  test("QUI dans l'ordre de la décision 34, sans 敬拜团, Jeunes ni Chorale", () => {
    expect([...QUI]).toEqual([
      "Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "Franco",
      "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
    ]);
  });

  test("libelleQui : Franco → Culte Francophone (法语崇拜), le reste tel quel", () => {
    expect(libelleQui("Franco")).toBe("Culte Francophone");
    expect(libelleQui("Franco", "zh")).toBe("法语崇拜");
    expect(libelleQui("Gp Paix")).toBe("Gp Paix");
    expect(libelleQui("EDD 中班", "zh")).toBe("EDD 中班");
  });

  test("FAMILLES à trois : groupes, edd, louange", () => {
    expect(FAMILLES.map((f) => f.cle)).toEqual(["groupes", "edd", "louange"]);
    expect(FAMILLES[2].qui).toEqual(["Franco"]);
    // « Qui peut réserver » se range par famille (groupes, EDD, louange) ; les mêmes dix valeurs que QUI.
    expect(quiPermis({})).toEqual(["Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班", "Franco"]);
    expect([...quiPermis({})].sort()).toEqual([...QUI].sort());
  });

  test("quiPermis : une saison qui ne garde que des valeurs retirées retombe sur les dix Qui actuels (choix faute de réponse)", () => {
    expect(quiPermis({ quiAutorises: ["Jeunes", "Chorale", "敬拜团"] })).toEqual(quiPermis({}));
    expect(quiPermis({ quiAutorises: ["Jeunes", "Gp Paix"] })).toEqual(["Gp Paix"]);
  });

  test("groupeDuQui : l'id du groupe, sinon null", () => {
    expect(groupeDuQui("Gp Paix")).toBe("paix");
    expect(groupeDuQui("Gp Fidélité")).toBe("fidelite");
    expect(groupeDuQui("Gp Bonté")).toBe("bonte");
    expect(groupeDuQui("Gp Amour")).toBe("amour");
    expect(groupeDuQui("Gp Joie")).toBe("joie");
    expect(groupeDuQui("Franco")).toBeNull();
    expect(groupeDuQui("EDD 中班")).toBeNull();
  });

  test("catégories de fête hors de ALL_CATEGORIES", () => {
    expect([...FETE_CATEGORIES]).toEqual(["Noël", "Pâques"]);
    for (const c of FETE_CATEGORIES) expect(ALL_CATEGORIES as readonly string[]).not.toContain(c);
  });
});

test.describe("qui saisit (CF16, décisions 30, 35, 45)", () => {
  test("Gp Paix : président, VP, musicien de service, rôle relié à musiciens, rôle coché", () => {
    expect(uids("Gp Paix")).toEqual(["joel", "lea", "mei", "noe", "ruth"]);
  });

  test("Gp Paix : ni orateur sans la case, ni présidence de séance, ni membre de Bonté, ni rôle coché d'un autre groupe", () => {
    const l = uids("Gp Paix");
    for (const uid of ["hugo", "presidence-seance", "bonte-membre", "eli"]) expect(l).not.toContain(uid);
  });

  test("un rôle écrit sans le champ saisirFetes ne donne aucun droit", () => {
    const ctx = { ...CTX, groupes: { ...GROUPES, paix: { ...GROUPES.paix, roles: [role("orateur", ["mei"])] } } };
    expect(uids("Gp Paix", ctx)).not.toContain("mei");
  });

  test("Gp Fidélité : titulaire relié à guitariste", () => {
    expect(uids("Gp Fidélité")).toEqual(["gui"]);
  });

  test("Gp Joie : président, VP et rôle coché seulement (pas de musiciens, pas hugo)", () => {
    expect(uids("Gp Joie")).toEqual(["ana", "sam", "tom"]);
  });

  test("EDD 中班 : présidence, suppléant, piano, cajon de tous les dimanches de Nov–Déc 2026", () => {
    expect(uids("EDD 中班")).toEqual(["cajon", "dan", "pia", "sup"]);
    expect(uids("EDD 中班")).not.toContain("guit");
    expect(uids("EDD 中班")).not.toContain("olga");
    expect(uids("EDD 中班")).not.toContain("octo");
    expect(uids("EDD 中班")).not.toContain("vieux");
  });

  test("Pâques 2027 (28 mars) → période Mars–Avr", () => {
    expect(periodeEddDuJour("2027-03-28")).toBe("P2_MarAvr");
    expect(periodeEddDuJour("2026-12-24")).toBe("P6_NovDec");
    expect(uids("EDD 中班", { ...CTX, jourJ: "2027-03-28" })).toEqual(["dan"]);
  });

  test("EDD 小班 : TEAM EDD ; Franco : TEAM LOUANGE, pas un simple choriste", () => {
    expect(uids("EDD 小班")).toEqual(["team-edd"]);
    expect(uids("Franco")).toEqual(["team-louange"]);
  });

  test("droitsDeSaisie : un ayant droit d'un passage à un seul Qui", () => {
    const p: Passage = { id: "a1", quoi: "Chant", qui: ["Gp Paix"], titre: "Paix" };
    expect(droitsDeSaisie(p, CTX, "ruth")).toEqual({ chants: true, musiques: true, mien: true });
    expect(droitsDeSaisie(p, CTX, "hugo")).toEqual({ chants: false, musiques: false, mien: false });
  });

  test("droitsDeSaisie : la coordination saisit partout (un seul Qui) mais n'a pas de « mien »", () => {
    const p: Passage = { id: "a1", quoi: "Chant", qui: ["Gp Paix"], titre: "Paix" };
    expect(droitsDeSaisie(p, CTX, "coord")).toEqual({ chants: true, musiques: true, mien: false });
  });

  test("droitsDeSaisie : passage à deux Qui (décision 37) → jamais de chants ; musiques pour chaque Qui (décision 46)", () => {
    const p: Passage = { id: "b2", quoi: "Spectacle", qui: ["EDD 中班", "EDD 小班"], titre: "Spectacle" };
    expect(droitsDeSaisie(p, CTX, "dan")).toEqual({ chants: false, musiques: true, mien: true });
    expect(droitsDeSaisie(p, CTX, "team-edd")).toEqual({ chants: false, musiques: true, mien: true });
    expect(droitsDeSaisie(p, CTX, "coord")).toEqual({ chants: false, musiques: true, mien: false });
    expect(droitsDeSaisie(p, CTX, "ruth")).toEqual({ chants: false, musiques: false, mien: false });
  });

  test("droitsDeSaisie : compte inconnu → rien", () => {
    const p: Passage = { id: "a1", quoi: "Chant", qui: ["Gp Paix"], titre: "Paix" };
    expect(droitsDeSaisie(p, CTX, "inconnu")).toEqual({ chants: false, musiques: false, mien: false });
  });

  test("titreSetlistFete : « Noël 2026 · Gp Paix », Culte Francophone, 中文", () => {
    expect(titreSetlistFete("noel", 2026, "Gp Paix")).toBe("Noël 2026 · Gp Paix");
    expect(titreSetlistFete("noel", 2026, "EDD 大班")).toBe("Noël 2026 · EDD 大班");
    expect(titreSetlistFete("noel", 2026, "Franco")).toBe("Noël 2026 · Culte Francophone");
    expect(titreSetlistFete("noel", 2026, "Gp Paix", "zh")).toBe("圣诞节 2026 · Gp Paix");
    expect(titreSetlistFete("paques", 2027, "Franco", "zh")).toBe("复活节 2027 · 法语崇拜");
  });
});

test.describe("passages et médias (CF1, CF22)", () => {
  const media = (o: Partial<MediaPassage> = {}): MediaPassage =>
    ({ id: "m1", type: "danse", titre: "Lumière dans la nuit", lien: "", duree: "", depart: "", note: "", ...o });

  test("nouvelIdPassage : huit caractères [a-z0-9], différents d'un appel à l'autre", () => {
    const a = nouvelIdPassage();
    expect(a).toMatch(/^[a-z0-9]{8}$/);
    expect(new Set(Array.from({ length: 20 }, nouvelIdPassage)).size).toBe(20);
  });

  test("validerMedias : titre vide refusé, lien http refusé, 3:40 accepté, 3.40 refusé", () => {
    expect(validerMedias([media({ titre: "  " })])).toMatchObject({ ok: false, erreur: "titre" });
    expect(validerMedias([media({ lien: "http://exemple.org/x" })])).toMatchObject({ ok: false, erreur: "lien" });
    expect(validerMedias([media({ lien: "https://exemple.org/x", duree: "3:40", depart: "0:12" })])).toMatchObject({ ok: true });
    expect(validerMedias([media({ duree: "3.40" })])).toMatchObject({ ok: false, erreur: "duree" });
    expect(validerMedias([media({ depart: "0:75" })])).toMatchObject({ ok: false, erreur: "depart" });
  });

  test("validerMedias : titre de 81, note de 201, type inconnu, onze médias refusés ; dix acceptés", () => {
    expect(validerMedias([media({ titre: "x".repeat(81) })])).toMatchObject({ ok: false, erreur: "titre" });
    expect(validerMedias([media({ note: "x".repeat(201) })])).toMatchObject({ ok: false, erreur: "note" });
    expect(validerMedias([{ ...media(), type: "autre" }])).toMatchObject({ ok: false, erreur: "type" });
    const dix = Array.from({ length: 10 }, (_, i) => media({ id: `m${i}` }));
    expect(validerMedias(dix)).toMatchObject({ ok: true });
    expect(validerMedias([...dix, media({ id: "m10" })])).toMatchObject({ ok: false, erreur: "trop" });
    expect(validerMedias("pas un tableau")).toMatchObject({ ok: false });
  });

  test("validerMedias : deux médias de même id refusés", () => {
    expect(validerMedias([media({ id: "m1" }), media({ id: "m1", titre: "Autre" })])).toMatchObject({ ok: false, erreur: "format" });
    expect(validerMedias([media({ id: "m1" }), media({ id: "m2" })])).toMatchObject({ ok: true });
  });

  test("validerMedias rend des médias nettoyés (titre rogné)", () => {
    const r = validerMedias([media({ titre: "  Danse  " })]);
    expect(r.ok && r.medias[0].titre).toBe("Danse");
  });
});

test.describe("propositions de chant (CF21)", () => {
  const chant = (slug: string): SetlistItem =>
    ({ songSlug: slug, position: 1, keyOverride: "G", showChords: true, showPinyin: false, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
  const prop = (id: string, position: number): SetlistItem =>
    ({ ...chant(""), type: "proposition", position, proposition: { id, titre: "Douce nuit" }, keyOverride: null });
  const INDEX = [{ slug: "douce-nuit", proposition: "p42" }, { slug: "autre", proposition: null }, { slug: "sans" }];

  test("un élément dont l'id est dans l'index devient le chant ; un autre reste en attente", () => {
    const r = resoudrePropositions([chant("a"), prop("p42", 2), prop("p99", 3)], INDEX);
    expect(r[0]).toMatchObject({ songSlug: "a" });
    expect(r[1]).toMatchObject({ songSlug: "douce-nuit", position: 2, keyOverride: null, structureOverride: null, showChords: true });
    expect(r[1].type).toBeUndefined();
    expect(r[1].proposition).toBeUndefined();
    expect(r[2]).toMatchObject({ type: "proposition", proposition: { id: "p99" } });
  });

  test("sans proposition, la liste revient telle quelle", () => {
    const items = [chant("a")];
    expect(resoudrePropositions(items, INDEX)).toBe(items);
  });

  test("propositionsEnDouble : un identifiant porté par deux chants est signalé (npm run validate)", () => {
    expect(propositionsEnDouble(INDEX)).toEqual([]);
    expect(propositionsEnDouble([...INDEX, { slug: "copie", proposition: "p42" }])).toEqual(["{proposition: p42} portée par plusieurs chants : douce-nuit, copie"]);
  });

  test("estUnChant : ni transition ni proposition", () => {
    expect(estUnChant(chant("a"))).toBe(true);
    expect(estUnChant({ ...chant(""), type: "fusion" })).toBe(true);
    expect(estUnChant({ ...chant(""), type: "transition" })).toBe(false);
    expect(estUnChant(prop("p1", 1))).toBe(false);
  });
});

test.describe("directive {proposition} (CF21, CF-F)", () => {
  test("le parseur la lit dans metadata.proposition", () => {
    const ast = parseChordPro("{title: Douce nuit}\n{key: G}\n{proposition: Ab3xZ9}\n\n{start_of_verse}\n[G]Douce nuit\n{end_of_verse}\n");
    expect(ast.metadata.proposition).toBe("Ab3xZ9");
  });
  test("absente : null", () => {
    expect(parseChordPro("{title: X}\n{key: G}\n").metadata.proposition).toBeNull();
  });
});

test.describe("documentation du répertoire (CF-F, décision 45 Q12)", () => {
  const lire = (rel: string) => readFileSync(path.resolve(__dirname, "..", rel), "utf8");

  test("01-format-cho.md décrit la directive {proposition} : seulement sur identifiant donné, jamais inventée", () => {
    const t = lire("docs/chants/01-format-cho.md");
    expect(t).toMatch(/\| `proposition` \|/);
    expect(t).toMatch(/jamais inventé/);
  });

  test("00-nouveau-chant.md dit quand l'écrire (réception), où (étape 3) et quoi rapporter (étape 7)", () => {
    const t = lire("docs/chants/00-nouveau-chant.md");
    expect(t).toContain("{proposition: <id>}");
    expect(t).toMatch(/Chant né d'une proposition/);
    expect(t).toMatch(/identifiant de la proposition/);
  });
});

test.describe("couleurs de Noël et de Pâques (CF26, décision 47)", () => {
  test("Noël vert sapin, Pâques violet", () => {
    expect(categoryColor("Noël")).toBe("#17633f");
    expect(categoryColor("Pâques")).toBe("#7c3aed");
  });

  test("les dix couleurs gelées ne changent pas, la scène non plus ; une catégorie inconnue reste grise", () => {
    expect(CATEGORY_COLORS).toMatchObject({
      "Culte Francophone": "#2d5a65", Intergroupe: "#a87b0f", Interfranco: "#9d3c63", Campus: "#2471a3",
      "Groupe Paix": "#6b4a8e", "Groupe Fidélité": "#a03030", "Groupe Bonté": "#8b4a2e",
      "中班": "#3b6d11", "大班": "#3b6d11", "高班": "#3b6d11",
    });
    expect(PLANNING_COLORS.scene).toBe("#3f51a3");
    expect(categoryColor("Inconnue")).toBe("#64748b");
  });
});

test.describe("getSetlistsDeFete (CF24)", () => {
  const doc = (id: string, o: Record<string, unknown>) =>
    ({ document: { name: `projects/p/databases/(default)/documents/setlists/${id}`, fields: toFsFields(o) } });
  const lignes = [
    doc("a", { isDraft: false, fete: { programme: "noel-2026", passage: "p1", qui: "Gp Paix" } }),
    doc("brouillon", { isDraft: true, fete: { programme: "noel-2026", passage: "p2", qui: "Gp Paix" } }),
    doc("autre-fete", { isDraft: false, fete: { programme: "paques-2026", passage: "p3", qui: "Franco" } }),
    doc("ordinaire", { isDraft: false }),
    {},
  ];

  /** Recharge le module avec l'interrupteur voulu (la constante est lue à l'import) et un `fetch` simulé. */
  async function appeler(interrupteur: "0" | "1") {
    const avant = process.env.NEXT_PUBLIC_BACK_OFFICE;
    process.env.NEXT_PUBLIC_BACK_OFFICE = interrupteur;
    for (const k of Object.keys(require.cache)) if (/src[\\/]lib[\\/](backOffice|firebase[\\/]setlists)\./.test(k)) delete require.cache[k];
    const appels: string[] = [];
    const vrai = globalThis.fetch;
    globalThis.fetch = (async (url: string) => { appels.push(String(url)); return new Response(JSON.stringify(lignes), { status: 200 }); }) as typeof fetch;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- rechargement voulu du module (constante lue à l'import)
      const { getSetlistsDeFete } = require("../src/lib/firebase/setlists") as typeof import("../src/lib/firebase/setlists");
      return { rendu: await getSetlistsDeFete("noel-2026"), appels };
    } finally {
      globalThis.fetch = vrai;
      if (avant === undefined) delete process.env.NEXT_PUBLIC_BACK_OFFICE; else process.env.NEXT_PUBLIC_BACK_OFFICE = avant;
    }
  }

  test("sans l'interrupteur du back-office : [] et aucune requête", async () => {
    const { rendu, appels } = await appeler("0");
    expect(rendu).toEqual([]);
    expect(appels).toEqual([]);
  });

  test("avec l'interrupteur : la requête n'est pas crue sur parole (brouillons, autre fête, sans fête écartés)", async () => {
    const { rendu, appels } = await appeler("1");
    expect(appels).toHaveLength(1);
    expect(rendu.map((s) => s.id)).toEqual(["a"]);
  });
});
