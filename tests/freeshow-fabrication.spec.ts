import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseChordPro } from "../src/lib/chordpro/parser";
import type { SongContent } from "../src/lib/api/songs";
import type { ChordProSection } from "../src/types/chordPro";
import {
  decouperChinois,
  decouperFrancais,
  fabriquerProjetFreeShow,
  nomDeGroupe,
  nomFichierFreeShow,
  type FreeShowProjet,
} from "../src/lib/setlist/freeshow";

// Fabrication d'un .project FreeShow (docs/spec-export-freeshow.md) : fonctions pures, pas de navigateur.

function section(over: Partial<ChordProSection>): ChordProSection {
  return { type: "verse", id: "verse-1", name: "Couplet", lines: [], uid: "verse-1-0", ...over };
}

test("FR : ligne longue coupée à la virgule du milieu, virgule retirée", () => {
  expect(decouperFrancais(["Bien avant le chant, qui créa l'univers"])).toEqual([["Bien avant le chant", "qui créa l'univers"]]);
});

test("FR : ligne longue sans virgule centrale coupée à l'espace du milieu", () => {
  // La virgule est à 7 % de la ligne : hors de la zone centrale.
  expect(decouperFrancais(["Oui, Tu es mon Dieu et mon Roi pour toujours"])).toEqual([
    ["Oui, Tu es mon Dieu et", "mon Roi pour toujours"],
  ]);
  expect(decouperFrancais(["Anticonstitutionnellement-parfaitement-sansespace"])).toEqual([
    ["Anticonstitutionnellement-parfaitement-sansespace"],
  ]);
});

test("FR : deux courtes réunies, jamais trois ; courte suivie d'une longue seule", () => {
  expect(decouperFrancais(["Un", "Deux", "Trois"])).toEqual([["Un", "Deux"], ["Trois"]]);
  const longue = "Tu es fidèle de génération en génération";
  expect(decouperFrancais(["Court", longue])).toEqual([["Court"], ...decouperFrancais([longue])]);
});

test("FR : ponctuation de fin retirée avant de mesurer", () => {
  expect(decouperFrancais(["Alléluia !", "Gloire à Dieu…", "Amen,"])).toEqual([["Alléluia", "Gloire à Dieu"], ["Amen"]]);
  // 30 caractères + virgule : reste une ligne courte.
  expect(decouperFrancais(["a".repeat(30) + ","])).toEqual([["a".repeat(30)]]);
});

test("ZH : demi-phrases, pinyin réparti, ponctuation retirée", () => {
  const d = decouperChinois([{ texte: "我爱你，我的主。", pinyin: "wǒ ài nǐ wǒ de zhǔ" }]);
  expect(d).toEqual([
    { caracteres: "我爱你", pinyin: "wǒ ài nǐ" },
    { caracteres: "我的主", pinyin: "wǒ de zhǔ" },
  ]);
  // Pinyin trop long : le dernier morceau prend le reste ; trop court : morceaux suivants vides.
  expect(decouperChinois([{ texte: "我爱，你", pinyin: "a b c d" }])).toEqual([
    { caracteres: "我爱", pinyin: "a b" },
    { caracteres: "你", pinyin: "c d" },
  ]);
  expect(decouperChinois([{ texte: "我爱，你", pinyin: "a" }])).toEqual([
    { caracteres: "我爱", pinyin: "a" },
    { caracteres: "你", pinyin: "" },
  ]);
});

test("noms et couleurs des groupes", () => {
  expect(nomDeGroupe(section({ number: "2" }))).toEqual({ nom: "Couplet 2", couleur: "#0074D9" });
  expect(nomDeGroupe(section({ type: "verse", name: "主歌/Couplet (x2)" }))).toEqual({
    nom: "Couplet 1",
    couleur: "#39CCCC",
    globalGroup: "verse",
  });
  expect(nomDeGroupe(section({ type: "chorus" }))).toEqual({ nom: "Refrain 1", couleur: "#2ECC40", globalGroup: "chorus" });
  expect(nomDeGroupe(section({ type: "bridge", number: "2" }))).toEqual({ nom: "Pont 2", couleur: "#d1d1d1" });
  expect(nomDeGroupe(section({ type: "bridge" }))).toEqual({ nom: "Pont", couleur: "#FFFFFF", globalGroup: "bridge" });
  expect(nomDeGroupe(section({ type: "chorus", name: "Dernière phrase – R" }))).toEqual({ nom: "Dp", couleur: "#FF4136" });
  expect(nomDeGroupe(section({ type: "prechorus" })).nom).toBe("Pré-refrain");
});

test("nom de fichier", () => {
  expect(nomFichierFreeShow("2026-11-01")).toBe("011126.project");
});

function contenu(slug: string): SongContent {
  const source = readFileSync(`content/songs/${slug}.cho`, "utf8");
  return { slug, ast: parseChordPro(source), source };
}

test("projet complet : chant FR, chant ZH, transition exclue", () => {
  const contents = { "abba-pere": contenu("abba-pere"), 一生爱你: contenu("一生爱你") };
  const base = { keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, sectionNotes: {}, notes: "" };
  const items = [
    { ...base, songSlug: "一生爱你", position: 3, structureOverride: ["verse-2-0", "chorus-3-1"] },
    { ...base, type: "transition" as const, songSlug: "", position: 2, structureOverride: null },
    { ...base, songSlug: "abba-pere", position: 1, structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"] },
  ];
  let n = 0;
  const nouvelId = () => (++n).toString(16).padStart(11, "0");
  const projet: FreeShowProjet = JSON.parse(
    JSON.stringify(fabriquerProjetFreeShow({ date: "2026-11-01", items }, contents, { maintenant: 1000, nouvelId })),
  );

  expect(projet.project.name).toBe("01/11/26");
  expect(projet.project.shows.map((s) => s.index)).toEqual([0, 1]);
  expect(projet.categories.presentation.name).toBe("Chants");
  const [fr, zh] = projet.project.shows.map((s) => projet.shows[s.id]);
  expect([fr.name, zh.name]).toEqual([contents["abba-pere"].ast.metadata.title, "一生爱你"]);

  const resume = (show: typeof fr) => {
    const layout = Object.values(show.layouts)[0];
    expect(show.settings.activeLayout).toBe(Object.keys(show.layouts)[0]);
    const ids = layout.slides.map((e) => e.id);
    expect(show.slides[ids[0]].group).toBe(".");
    expect(show.slides[ids[ids.length - 1]]).toMatchObject({ group: "Rien", items: [] });
    return { layout, ids };
  };
  const a = resume(fr);
  // Couplet, refrain, refrain repris : même id deux fois, de suite.
  const tetes = a.ids.slice(1, -1);
  expect(tetes).toHaveLength(3);
  expect(tetes[1]).toBe(tetes[2]);
  expect(tetes[0]).not.toBe(tetes[1]);
  // Chaque fille figure dans un `children`, et la layout les déroule par la même entrée.
  const filles = Object.keys(fr.slides).filter((id) => fr.slides[id].group === null);
  expect(filles.length).toBeGreaterThan(0);
  const enfants = Object.values(fr.slides).flatMap((s) => s.children ?? []);
  expect(enfants.sort()).toEqual(filles.sort());
  expect(Object.keys(a.layout.slides[2].children ?? {}).length).toBe(fr.slides[tetes[1]].children!.length);
  expect(fr.slides[tetes[1]].globalGroup).toBe("chorus");

  const textes = (show: typeof fr) =>
    Object.values(show.slides).flatMap((s) => s.items.flatMap((i) => i.lines.map((l) => l.text[0])));
  expect(textes(fr).every((t) => !/[,;:.!?…]$/.test(t.value))).toBe(true);

  resume(zh);
  const zhTextes = textes(zh);
  expect(zhTextes.some((t) => t.style.includes("'Corbel'") && /[a-zǎ]/i.test(t.value))).toBe(true);
  expect(zhTextes.some((t) => t.style.includes("'KaiTi'") && /[㐀-鿿]/.test(t.value))).toBe(true);
  expect(zhTextes.every((t) => !/[，。]/.test(t.value))).toBe(true);

  // Aperçu de la découpe, pour relecture.
  for (const show of [fr, zh]) {
    const ids = Object.values(show.layouts)[0].slides.map((e) => e.id);
    const ecrire = (id: string) => `[${show.slides[id].group}] ` + show.slides[id].items.map((i) => i.lines.map((l) => l.text[0].value).join(" / ")).join("");
    console.log(show.name + "\n" + ids.flatMap((id) => [id, ...(show.slides[id].children ?? [])]).map(ecrire).join("\n"));
  }
});
