import { readFileSync } from "fs";
import { expect, test, type Page } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { materializeLastPhrase } from "../src/lib/setlist/lastPhrase";
import { dpFullName, dpOrigin, groupSteps, isDp, paletteKeyOf } from "../src/lib/setlist/dp";
import type { SectionOccurrence } from "../src/lib/setlist/sectionSteps";
import type { SectionNuance, SetlistItem } from "../src/types/setList";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { onStage } from "./helpers/louange";

// Lot RS, tranche RS-A (docs/spec-rappel-structure-louange.md) : les règles des
// « Dernière phrase » (Dp) dans les bandeaux de structure et en Structure seule —
// couleur de la section d'origine, Dp1/Dp2, même Dp de suite = « ×n ».

// ─── Données ─────────────────────────────────────────────────────────────────

const lire = (slug: string) => readFileSync(`content/songs/${slug}.cho`, "utf8");
const PRINCE = lire("prince-de-paix");
const WEI_WO = lire("为我而来");

/** Source avec les Dp demandés, dans l'ordre : [sectionId, abréviation]. */
function avecDp(source: string, dps: [string, string][]): { source: string; ids: string[] } {
  let courant = source;
  const ids: string[] = [];
  for (const [sectionId, label] of dps) {
    const r = materializeLastPhrase(courant, sectionId, 1 + ids.length, label)!;
    courant = r.source;
    ids.push(r.sectionId);
  }
  return { source: courant, ids };
}

/** Une étape par id, dans l'ordre ; `nuances` : nuance par position. */
function etapes(source: string, ids: string[], nuances: Record<number, SectionNuance> = {}): SectionOccurrence[] {
  const sections = parseChordPro(source).sections;
  return ids.map((id, i) => ({
    section: { ...sections.find((s) => s.id === id)!, uid: `${id}-${i}` },
    note: "",
    transition: "",
    nuance: nuances[i],
  }));
}
const nom = (s: { name?: string; type: string }) => s.name ?? s.type;

const MP_CRESC: SectionNuance = { tags: ["mp", "cresc"] };
const MF: SectionNuance = { tags: ["mf"] };
const FF: SectionNuance = { tags: ["ff"] };

// ─── 1. Pur : origine, couleur, regroupement ─────────────────────────────────

test.describe("Dp : origine, palette, nom (pur)", () => {
  test("l'origine se lit après le tiret, par l'inverse des abréviations", () => {
    const lues = [["R", "chorus"], ["C", "verse"], ["P", "bridge"], ["Pr", "prechorus"], ["Po", "postchorus"], ["I", "intro"], ["F", "outro"], ["Pm", "interlude"], ["Tag", "tag"]];
    for (const [abbr, sorte] of lues) {
      expect(dpOrigin({ type: "other", name: `Dernière phrase – ${abbr}` }), abbr).toBe(sorte);
    }
    expect(dpOrigin({ type: "other", name: "最后一句 – R" })).toBe("chorus");
    expect(dpOrigin({ type: "other", name: "Dernière phrase – C2" }), "chiffre ignoré").toBe("verse");
    expect(dpOrigin({ type: "other", name: "Dernière phrase" }), "sans tiret").toBeNull();
    expect(dpOrigin({ type: "other", name: "Dernière phrase – ???" }), "illisible").toBeNull();
    expect(dpOrigin({ type: "chorus", name: "Refrain" }), "pas un Dp").toBeNull();
    expect(isDp({ type: "other", name: "Dernière phrase – R" })).toBe(true);
    expect(isDp({ type: "other", name: "Bénédiction" })).toBe(false);
  });

  test("clé de palette : celle de l'origine pour un Dp, sinon comme avant, « other » à défaut", () => {
    expect(paletteKeyOf({ type: "other", name: "Dernière phrase – R" })).toBe("chorus");
    expect(paletteKeyOf({ type: "other", name: "Dernière phrase – P" })).toBe("bridge");
    expect(paletteKeyOf({ type: "other", name: "Dernière phrase – C" })).toBe("verse");
    expect(paletteKeyOf({ type: "other", name: "Dernière phrase – Po" }), "post-refrain = couleur du refrain").toBe("chorus");
    expect(paletteKeyOf({ type: "other", name: "Dernière phrase – ???" })).toBe("other");
    expect(paletteKeyOf({ type: "other", name: "Bénédiction" })).toBe("other");
    expect(paletteKeyOf({ type: "verse", name: "Couplet 1" })).toBe("verse");
    expect(paletteKeyOf({ type: "postchorus", name: "Post-refrain" })).toBe("chorus");
  });

  test("nom complet d'un Dp : l'origine en toutes lettres, en français et en 中文", () => {
    const traduire = (fichier: string) => {
      const json = JSON.parse(readFileSync(`src/locales/${fichier}.json`, "utf8"));
      return (key: string, o?: { defaultValue?: string }) =>
        (key.split(".").reduce((acc: unknown, k) => (acc as Record<string, unknown> | undefined)?.[k], json) as string | undefined) ?? o?.defaultValue ?? key;
    };
    expect(dpFullName({ type: "other", name: "Dernière phrase – R" }, traduire("fr"))).toBe("Dernière phrase – Refrain");
    expect(dpFullName({ type: "other", name: "Dernière phrase – P" }, traduire("fr"))).toBe("Dernière phrase – Pont");
    expect(dpFullName({ type: "other", name: "最后一句 – R" }, traduire("zh-CN"))).toBe("最后一句 – 副歌");
    expect(dpFullName({ type: "other", name: "Dernière phrase – ???" }, traduire("fr"))).toBeNull();
    expect(dpFullName({ type: "chorus", name: "Refrain" }, traduire("fr"))).toBeNull();
  });
});

test.describe("groupSteps (pur)", () => {
  test("deux Dp différents de la même origine : Dp1 et Dp2 ; un seul reste « Dp »", () => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"], ["chorus-3", "R"]]);
    const groupes = groupSteps(etapes(source, ["chorus-3", ids[0], ids[1], ids[0]]), nom);
    expect(groupes.map((g) => g.abbr)).toEqual(["R", "Dp1", "Dp2", "Dp1"]);
    const seul = groupSteps(etapes(source, ["chorus-3", ids[0]]), nom);
    expect(seul.map((g) => g.abbr)).toEqual(["R", "Dp"]);
    // Origines différentes : chacun reste « Dp ».
    const mixte = avecDp(PRINCE, [["chorus-3", "R"], ["bridge-5", "P"]]);
    expect(groupSteps(etapes(mixte.source, mixte.ids), nom).map((g) => g.abbr)).toEqual(["Dp", "Dp"]);
  });

  test("le même Dp de suite = un groupe ×n malgré des nuances différentes, nuances gardées dans l'ordre", () => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"]]);
    const [dp] = ids;
    const g = groupSteps(etapes(source, [dp, dp, dp, "chorus-3"], { 0: MP_CRESC, 1: MF, 2: MF }), nom);
    expect(g).toHaveLength(2);
    expect(g[0].repeat).toBe(3);
    expect(g[0].uids).toEqual([`${dp}-0`, `${dp}-1`, `${dp}-2`]);
    expect(g[0].nuances).toEqual([MP_CRESC, MF]);
    // Une note ou une modulation différente ne sépare pas non plus le même Dp.
    const avecNote = etapes(source, [dp, dp]);
    avecNote[1] = { ...avecNote[1], note: "Piano seul", targetKey: "D" };
    expect(groupSteps(avecNote, nom)).toHaveLength(1);
    // Séparé par une autre section : deux groupes.
    expect(groupSteps(etapes(source, [dp, "chorus-3", dp]), nom)).toHaveLength(3);
  });

  test("deux refrains de nuances différentes restent séparés ; identiques, ils se replient", () => {
    const { source } = avecDp(PRINCE, [["chorus-3", "R"]]);
    const separes = groupSteps(etapes(source, ["chorus-3", "chorus-3"], { 0: MF, 1: FF }), nom);
    expect(separes.map((g) => g.repeat)).toEqual([1, 1]);
    const pareils = groupSteps(etapes(source, ["chorus-3", "chorus-3"], { 0: MF, 1: MF }), nom);
    expect(pareils.map((g) => g.repeat)).toEqual([2]);
    expect(pareils[0].nuances).toEqual([MF]);
  });

  test("deux Dp différents joués de suite ne se replient pas, même nom et même nuance", () => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"], ["chorus-3", "R"]]);
    expect(groupSteps(etapes(source, ids, { 0: MF, 1: MF }), nom).map((g) => g.repeat)).toEqual([1, 1]);
  });
});

// ─── 2. À l'écran : mode louange ─────────────────────────────────────────────

const SETLIST_ID = "setlist-rappel-dp";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Partial<SetlistItem> & { songSlug: string }): SetlistItem => ({
  position: 1,
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

/** Chant adapté : `ids` dans l'ordre joué (un uid par position, comme l'éditeur). */
const joue = (slug: string, source: string, ids: string[], over: Partial<SetlistItem> = {}) =>
  item({ songSlug: slug, contentOverride: source, structureOverride: ids.map((id, i) => `${id}-${i}`), ...over });

async function ouvrirMode(page: Page, items: SetlistItem[], affichage: string | null = null) {
  await page.addInitScript((a) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    if (a) localStorage.setItem("partition-layout", a);
  }, affichage);
  await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: {
        title: "Culte du 25 octobre",
        leader: "Présidence",
        category: "Culte Francophone",
        date: "2026-10-25",
        language: "mixed",
        notes: "",
        ownerId: "uid-owner",
        isPrivate: false,
        items,
      },
    },
    `/setlists/${SETLIST_ID}`,
  );
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.locator("[data-performance-mode] span.tabular-nums").last()).toHaveText(/^\d+ \/ \d+$/);
  await expect(page.getByText("Mise en page…")).toHaveCount(0, { timeout: 20_000 });
}

const bandeau = (page: Page) => onStage(page, "[data-entete-chant]").getByRole("list", { name: "Structure" });
const pastilles = (page: Page) => bandeau(page).locator("li > span");
const couleurs = (page: Page) =>
  pastilles(page).evaluateAll((els) => els.map((e) => ({ texte: e.textContent ?? "", couleur: getComputedStyle(e).color, fond: getComputedStyle(e).backgroundColor })));

test.describe("bandeau du mode louange : règles des Dp", () => {
  test("Prince de paix, cinq Dp « – R » : 12 étapes, « Dp ×2 » en tête et en fin, nuances « mp ↗ → mf » (FR)", async ({ page }) => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"]]);
    const dp = ids[0];
    // Dp×2 · I · C1 · R · C2 · R · P · Dp · R · C1 · R · Dp×2 : cinq passages du même Dp, douze étapes.
    const ordre = [dp, dp, "intro-1", "verse-2", "chorus-3", "verse-4", "chorus-3", "bridge-5", dp, "chorus-3", "verse-2", "chorus-3", dp, dp];
    await ouvrirMode(page, [
      joue("prince-de-paix", source, ordre, {
        sectionNuances: { [`${dp}-0`]: MP_CRESC, [`${dp}-1`]: MF },
      }),
    ]);
    const etapesVues = bandeau(page).getByRole("listitem");
    await expect(etapesVues).toHaveCount(12);
    await expect(etapesVues.first()).toContainText("Dp×2");
    await expect(etapesVues.last()).toContainText("Dp×2");
    const premiere = etapesVues.first();
    // mp, la flèche du crescendo, puis mf, séparés par « → ».
    await expect(premiere.locator("[data-nuance]")).toHaveCount(3);
    await expect(premiere.locator("[data-nuance]").first()).toHaveText("mp");
    await expect(premiere.locator("[data-nuance][aria-label='cresc.']")).toHaveCount(1);
    await expect(premiere.locator("[data-nuance]").last()).toHaveText("mf");
    await expect(premiere.getByText("→", { exact: true })).toHaveCount(1);
    await expect(etapesVues.nth(7)).toContainText("Dp");
    await expect(etapesVues.nth(7)).not.toContainText("×");
  });

  test("un Dp « – R » et un Dp « – P » : couleurs différentes, celles de leur origine (FR)", async ({ page }) => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"], ["bridge-5", "P"]]);
    await ouvrirMode(page, [joue("prince-de-paix", source, ["chorus-3", "bridge-5", ids[0], ids[1]])]);
    await expect(pastilles(page)).toHaveCount(4);
    const [r, p, dpR, dpP] = await couleurs(page);
    expect(dpR.couleur, "Dp-R = orange du refrain").toBe(r.couleur);
    expect(dpP.couleur, "Dp-P = violet du pont").toBe(p.couleur);
    expect(dpR.fond).toBe(r.fond);
    expect(dpR.couleur).not.toBe(dpP.couleur);
    expect(r.couleur).not.toBe(p.couleur);
  });

  test("deux Dp « – R » différents : Dp1 et Dp2 (FR)", async ({ page }) => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"], ["chorus-3", "R"]]);
    await ouvrirMode(page, [joue("prince-de-paix", source, ["chorus-3", ids[0], ids[1], ids[0]])]);
    await expect(bandeau(page).getByRole("listitem")).toHaveText(["R", "Dp1", "Dp2", "Dp1"]);
  });

  test("chant chinois avec un Dp : « Dp » aux couleurs du 副歌 (ZH)", async ({ page }) => {
    const base = avecDp(WEI_WO, [["chorus-3", "R"]]);
    const source = base.source.replace("Dernière phrase", "最后一句");
    await ouvrirMode(page, [joue("为我而来", source, ["verse-1", "chorus-3", base.ids[0]])]);
    // Sur scan 简谱 : bandeau au-dessus du scan, ou colonne de la marge en paysage (grand écran).
    const liste = onStage(page, "ol[aria-label=Structure]");
    await expect(liste.locator("li")).toHaveCount(3);
    const pastilleZh = liste.locator("li > span:first-child");
    await expect(pastilleZh.nth(2)).toContainText("Dp");
    const [r, dp] = await pastilleZh.evaluateAll((els) =>
      els.slice(1).map((e) => ({ couleur: getComputedStyle(e).color, fond: getComputedStyle(e).backgroundColor })),
    );
    expect(dp.couleur).toBe(r.couleur);
    expect(dp.fond).toBe(r.fond);
    // En colonne, le nom écrit l'origine en entier.
    if ((await liste.evaluate((el) => el.className)).includes("flex-col")) {
      await expect(liste.locator("li").nth(2)).toContainText("最后一句 – Refrain");
    }
  });
});

test.describe("Structure seule : règles des Dp", () => {
  test("le même Dp de suite est replié en « ×2 » malgré sa nuance ; deux refrains de nuances différentes restent deux blocs (FR)", async ({ page }) => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"]]);
    const dp = ids[0];
    await ouvrirMode(
      page,
      [
        joue("prince-de-paix", source, [dp, dp, "chorus-3", "chorus-3"], {
          sectionNuances: { [`${dp}-0`]: MF, [`${dp}-1`]: FF, "chorus-3-2": MF, "chorus-3-3": FF },
        }),
      ],
      "structure",
    );
    const blocs = onStage(page, "[data-section]");
    await expect(blocs).toHaveCount(3);
    await expect(blocs.first()).toContainText("×2");
    await expect(blocs.nth(1)).not.toContainText("×");
  });

  test("le cadre d'un bloc Dp prend le style de son origine (FR)", async ({ page }) => {
    const { source, ids } = avecDp(PRINCE, [["chorus-3", "R"]]);
    await ouvrirMode(page, [joue("prince-de-paix", source, ["chorus-3", ids[0]])], "structure");
    const blocs = onStage(page, "[data-section]");
    await expect(blocs).toHaveCount(2);
    const style = (i: number) => blocs.nth(i).evaluate((el) => el.getAttribute("style"));
    expect(await style(1)).toBe(await style(0));
  });
});
