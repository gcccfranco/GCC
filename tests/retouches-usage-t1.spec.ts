import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ajouterChant, boutonTonalite, groupeTonalites, reglerElement } from "./helpers/editeurSetlist";

// Lot 1 du rapport d'usage, tranche T1 (docs/spec-retouches-usage.md) : zones de toucher de 44 px, sans changer
// le dessin. Au toucher seulement : `::after` ≥ 44 px, dessin < 44 px (modèle : tests/equipes-page.spec.ts).
// Ce qui est trop coûteux à atteindre en test (feuille IdeesSheet, Réglages profonds, Sommaire des deux volets,
// aperçus de Moi, historique de grille, bandeau des rappels) est vérifié par une mesure des classes dans le source.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
const MUSICIEN: FakeProfile = {
  uid: "u-sacha", email: "sacha@example.com", planningName: "Sacha V.", serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SANS_SHEETS = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

const estTactile = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);
const hauteurApres = (el: Locator) => el.evaluate((n) => parseFloat(getComputedStyle(n, "::after").height));

/** `::after` ≥ 44 px, dessin (boîte) < 44 px. */
async function zone44(el: Locator, nom: string) {
  await expect(el, nom).toBeVisible();
  expect(await hauteurApres(el), `${nom} : hauteur du ::after`).toBeGreaterThanOrEqual(44);
  expect((await el.boundingBox())!.height, `${nom} : le dessin ne grandit pas`).toBeLessThan(44);
}

test.describe("zones de 44 px (T1)", () => {
  test("bascule 简谱 / Paroles d'un chant ZH : zone de 44 px, un toucher à 20 px du centre bascule (appareils tactiles)", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    const groupe = page.getByRole("radiogroup", { name: "简谱 · Paroles" });
    await expect(groupe).toBeVisible();
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const paroles = groupe.getByRole("radio", { name: "Paroles" });
    await zone44(groupe.getByRole("radio", { name: "简谱" }), "简谱");
    await zone44(paroles, "Paroles");
    const b = (await paroles.boundingBox())!;
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 + 20);
    await expect(paroles).toHaveAttribute("aria-checked", "true");
  });

  test("un chant FR sans scan n'a pas la bascule 简谱 / Paroles : rien à mesurer", async ({ page }) => {
    await page.goto("/songs/abba-pere");
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: "简谱 · Paroles" })).toHaveCount(0);
  });

  test("tonalités du réglage : zone de 44 px, toucher la voisine sélectionne la voisine, pas la précédente (appareils tactiles)", async ({ page }) => {
    await SANS_SHEETS(page);
    await signInAs(page, MUSICIEN, {}, "/setlists/new?autre=1");
    await ajouterChant(page, "Je reviens au cœur");
    await reglerElement(page, "Je reviens au cœur");
    const groupe = groupeTonalites(page, "Je reviens au cœur");
    await expect(groupe).toBeVisible();
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const radios = groupe.getByRole("radio");
    // Deux tonalités voisines sur la même rangée (les douze passent à la ligne selon la largeur).
    const n = await radios.count();
    const boites = await Promise.all(Array.from({ length: n }, (_, i) => radios.nth(i).boundingBox()));
    let i2 = 2;
    while (i2 < n && Math.abs(boites[i2]!.y - boites[i2 - 1]!.y) > 2) i2++;
    expect(i2, "deux voisines sur une même rangée").toBeLessThan(n);
    const voisine = radios.nth(i2);
    expect(await hauteurApres(voisine), "hauteur du ::after").toBeGreaterThanOrEqual(44);
    expect((await boutonTonalite(groupe, "D").boundingBox())!.width, "le dessin garde 40 px").toBeLessThanOrEqual(40);
    const b = (await voisine.boundingBox())!;
    // 1 px dans l'écart de gauche : c'est la zone de la voisine (écart 5 px, zones de 2 px de chaque côté).
    await page.touchscreen.tap(b.x - 1, b.y + 18);
    await expect(voisine).toBeChecked();
    await expect(radios.nth(i2 - 1)).not.toBeChecked();
  });

  test("dates libres de Statistiques : zone de 44 px sur les deux labels (appareils tactiles)", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
    // Sans setlist, la page affiche l'échec de lecture et pas les filtres : une setlist inventée suffit.
    const setlist = {
      title: "Culte test", date: "2026-06-14", category: "Culte Francophone", leader: "Sacha V.", language: "fr", notes: "",
      items: [{ songSlug: "abba-pere", position: 0, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
      isDraft: false, isPrivate: false,
    };
    await signInAs(page, ADMIN, { "setlists/t1": setlist }, "/songs/statistiques?periode=libre&du=2026-06-01&au=2026-06-30");
    const labels = page.locator("label").filter({ has: page.locator('input[type="date"]') });
    await expect(labels).toHaveCount(2);
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    await zone44(labels.nth(0), "Du");
    await zone44(labels.nth(1), "Au");
  });

  test("questionnaire : étoiles et pastilles de réponse, zone de 44 px (appareils tactiles)", async ({ page }) => {
    await SANS_SHEETS(page);
    await signInAs(page, ADMIN, {}, "/questionnaire");
    await expect(page.getByTestId("questions")).toBeVisible();
    test.skip(!(await estTactile(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
    const etoiles = page.getByTestId("questions").locator('button[aria-label$="/5"]');
    const pastilles = page.getByTestId("questions").locator("button[aria-pressed]");
    expect((await etoiles.count()) + (await pastilles.count()), "au moins une commande de réponse à l'écran").toBeGreaterThan(0);
    if (await etoiles.count()) {
      expect(await hauteurApres(etoiles.first()), "étoile").toBeGreaterThanOrEqual(44);
      expect((await etoiles.first().boundingBox())!.height, "l'étoile garde 40 px").toBeLessThan(44);
    }
    if (await pastilles.count()) await zone44(pastilles.first(), "pastille de réponse");
  });
});

// Mesure des classes : le composant porte la bonne zone (les pages sont trop profondes pour un test d'usage).
const source = (chemin: string) => readFileSync(chemin, "utf8");
const contient = (chemin: string, motif: RegExp, quoi: string) =>
  test(`${quoi} (mesure des classes, ${chemin})`, () => {
    expect(source(chemin), quoi).toMatch(motif);
  });

test.describe("zones de 44 px posées par le source (T1)", () => {
  const R = "src/components/setlists/editeur/Reglages.tsx";
  contient(R, /\$\{TOUCHER_44\} group flex w-10 flex-col/, "les douze tonalités : TOUCHER_44");
  contient(R, /\$\{TOUCHER_44\} flex h-8 items-center gap-1 rounded-full border border-border/, "« + section » : TOUCHER_44");
  contient(R, /\$\{TOUCHER_44\} flex h-8 items-center gap-1 rounded-full border border-dashed/, "« + Dernière phrase » : TOUCHER_44");
  contient(R, /\$\{TOUCHER_PILULE\} flex h-\[26px\]/, "Note, Nuance, Transition, Modulation : TOUCHER_PILULE");
  contient("src/components/harmonie/IdeesSheet.tsx", /\$\{TOUCHER_44\} ml-auto text-sm/, "« Ne marche pas sur ce chant » : TOUCHER_44");
  contient("src/app/setlists/[id]/_components/Sommaire.tsx", /\$\{TOUCHER_PILULE\} h-\[18px\]/, "pastilles de Sommaire : TOUCHER_PILULE");
  contient("src/app/setlists/[id]/_components/Sommaire.tsx", /relative mt-1\.5 flex flex-wrap gap-1\.5/, "pastilles de Sommaire : écart de 6 px");
  contient("src/components/moi/Apercus.tsx", /\$\{TOUCHER_44\} -mr-1 inline-flex/, "« Tout voir » : TOUCHER_44");
  contient("src/components/planning/GrilleHistorique.tsx", /\$\{TOUCHER_44\} inline-flex/, "« Historique » : TOUCHER_44");
  contient("src/components/planning/BarreDeGrille.tsx", /\$\{TOUCHER_44\} inline-flex h-9 shrink-0/, "« Mes dates » : TOUCHER_44");
  contient("src/components/planning/PetitDejCarte.tsx", /const bouton = `\$\{TOUCHER_44\}/, "« Je m'inscris » du petit déj : TOUCHER_44");
  contient("src/components/guide/GuideLien.tsx", /\$\{TOUCHER_44\} text-sm/, "« Comment ça marche ? » : TOUCHER_44");
  contient("src/components/admin/InscriptionsComptes.tsx", /className=\{TOUCHER_44\}/, "réglage des inscriptions : TOUCHER_44 sur l'interrupteur");
  // services-9 : croix absolue, zone écrite à la main, jamais `relative`.
  contient("src/components/planning/BarreDeGrille.tsx", /\[@media\(pointer:coarse\)\]:after:-inset-\[6px\]/, "croix du prénom : ::after à -inset-[6px] au toucher (32 px + 12 = 44)");
  test("croix du prénom : pas de `relative` (elle est absolute)", () => {
    const ligne = source("src/components/planning/BarreDeGrille.tsx").split("\n").find((l) => l.includes("after:-inset-[6px]"))!;
    expect(ligne).not.toMatch(/\brelative\b/);
  });
  // services-10 : 24 px à la souris (16 + 2 × 4), la zone tactile reste.
  const P = "src/components/push/PushPrompt.tsx";
  contient(P, /after:absolute after:-inset-1 after:content-\[''\]/, "croix du bandeau : ::after de 24 px à la souris");
  contient(P, /\[@media\(pointer:coarse\)\]:after:-inset-3\.5/, "croix du bandeau : zone tactile conservée");
});
