import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Cours d'Harmonie (docs/spec-cours-harmonie.md, décisions du 02/10/2026) :
// C1 lire le cours, C2 « J'ai fini » et la progression, C4 la progression de
// l'équipe pour les admins. Accès : celui d'Harmonie (pianistes, guitaristes, admins).

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
// Ruth tient le piano, Yiyi la batterie : c'est le planning qui le dit.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Jonathan Z.", "", "", "Ruth K.", "Éloïse M.", "Yiyi C.", "", "", "Hewei", "", ""],
]);

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "Kouassi", planningName: "Ruth K." };
const YIYI: FakeProfile = { uid: "uid-yiyi", email: "yiyi@example.com", firstName: "Yiyi", lastName: "C.", planningName: "Yiyi C." };
const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Timothée", lastName: "C." };

const INDEX = JSON.parse(readFileSync("public/harmonie-cours/index.json", "utf8")) as {
  chapitres: { id: string; numero: number | null; niveau: number | null; exercices: number; sousParties: string[] }[];
};
const LECONS = INDEX.chapitres.filter((c) => c.niveau !== null);
const CH = (n: number) => INDEX.chapitres.find((c) => c.numero === n)!;

async function entrer(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  return signInAs(page, qui, docs, to);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

// ── L'import (C0) contre le document ─────────────────────────────────────────

test("le cours importé : 23 chapitres à cocher, 79 exercices, niveaux de 5 · 6 · 5 · 7, deux schémas", () => {
  expect(LECONS).toHaveLength(23);
  expect(LECONS.reduce((n, c) => n + c.exercices, 0)).toBe(79);
  expect([1, 2, 3, 4].map((n) => LECONS.filter((c) => c.niveau === n).length)).toEqual([5, 6, 5, 7]);
  const schemas = INDEX.chapitres.flatMap((c) =>
    JSON.stringify(JSON.parse(readFileSync(`public/harmonie-cours/${c.id}.json`, "utf8"))).match(/"t":"schema"/g) ?? [],
  );
  expect(schemas).toHaveLength(2);
});

// ── C1 : lire ────────────────────────────────────────────────────────────────

test("un pianiste trouve le cours en tête d'Harmonie, rangé par niveau", async ({ page }) => {
  await entrer(page, RUTH, "/harmonie");
  await page.getByRole("link", { name: /Cours de théorie musicale/ }).click();
  await page.waitForURL(/\/harmonie\/cours\/?$/);
  await expect(page.getByRole("link", { name: "Mode d'emploi" })).toBeVisible();
  for (const [n, nom, total] of [[1, "Fondations", 5], [2, "Accompagnateur", 6], [3, "Musicien d'équipe", 5], [4, "Directeur musical", 7]] as const) {
    await expect(page.getByRole("heading", { name: `Niveau ${n} · ${nom} · 0 / ${total}` })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Annexes" })).toBeVisible();
  await capture(page, "cours-liste");
});

test("un chapitre : sommaire, texte, exercices ; un tableau large défile dans son cadre, pas la page", async ({ page }) => {
  const ch6 = CH(6);
  await entrer(page, RUTH, `/harmonie/cours/${ch6.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`6. Tous les accords`);
  // Tablette debout (U4 bis, B3) : le sommaire est dans le panneau « Sommaire », par-dessus la leçon.
  if (test.info().project.name === "tablette") await page.getByRole("button", { name: "Sommaire" }).click();
  await expect(page.getByRole("navigation", { name: "Sommaire" }).getByRole("listitem")).toHaveCount(ch6.sousParties.length);
  await expect(page.locator("[data-sous-partie]")).toHaveCount(ch6.sousParties.length);
  const exercices = page.locator("[data-sous-partie]").filter({ has: page.getByRole("heading", { name: /Exercices$/ }) });
  await expect(exercices.locator("ol > li")).toHaveCount(ch6.exercices);
  const debord = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(debord, "la page ne défile pas de côté").toBe(0);
  await expect(page.locator("[data-cours-tableau]").first()).toBeVisible();
  const dir = process.env.PW_CAPTURES;
  if (dir) {
    await page.screenshot({ path: `${dir}/cours-chapitre-6-haut-${test.info().project.name}.png` });
    await page.locator("[data-cours-tableau]").first().screenshot({ path: `${dir}/cours-tableau-${test.info().project.name}.png` });
  }
});

test("les deux schémas du cours s'affichent : cercle des quintes (ch. 5), arc d'intensité (ch. 18)", async ({ page }) => {
  await entrer(page, RUTH, `/harmonie/cours/${CH(5).id}`);
  await expect(page.locator('[data-cours-schema="cercle-des-quintes"] svg[role="img"]')).toBeVisible();
  await expect(page.getByRole("img", { name: "Deux tonalités voisines ne diffèrent que d’une altération" })).toBeVisible();
  await page.goto(`/harmonie/cours/${CH(18).id}`);
  await expect(page.locator('[data-cours-schema="arc-intensite"] svg[role="img"]')).toBeVisible();
});

test("une liste à cocher du texte (20.5) se dessine avec ses cases, sans les crochets", async ({ page }) => {
  await entrer(page, RUTH, `/harmonie/cours/${CH(20).id}`);
  await expect(page.locator("[data-case]")).toHaveCount(5);
  await expect(page.locator("[data-chapitre]")).not.toContainText("[ ]");
});

test("interface 中文 : libellés chinois, et une ligne dit que le chapitre est en français", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await entrer(page, RUTH, `/harmonie/cours/${CH(1).id}`);
  await expect(page.getByText("本章尚未翻译，暂以法文显示。")).toBeVisible();
  await expect(page.getByRole("button", { name: "我学完了" })).toBeVisible();
  await page.goto("/harmonie/cours");
  await expect(page.getByRole("heading", { name: "第 1 级 · 基础 · 0 / 5" })).toBeVisible();
});

test("un batteur n'a pas le cours (accès d'Harmonie : piano, guitare, admins)", async ({ page }) => {
  await entrer(page, YIYI, "/harmonie/cours");
  await expect(page.getByRole("link", { name: "Mode d'emploi" })).toHaveCount(0);
  await expect(page.locator("[data-cours]")).toHaveCount(0);
});

// ── C2 : « J'ai fini » ───────────────────────────────────────────────────────

test("« J'ai fini » n'écrit que ce chapitre dans coursProgres/<mon uid>, et tient au rechargement", async ({ page }) => {
  const ch1 = CH(1);
  const db = await entrer(page, RUTH, `/harmonie/cours/${ch1.id}`);
  await page.getByRole("button", { name: "J'ai fini" }).click();
  await expect(page.getByText(/^Fini le /)).toBeVisible();
  // Sous la leçon : en grand, la liste du cours à gauche a aussi sa ligne « Prochain chapitre » (U4 bis, B3).
  await expect(page.locator("[data-j-ai-fini]").getByRole("link", { name: /Prochain chapitre/ })).toContainText("2.");
  const cours = () => db.writes.filter((w) => w.path.startsWith("coursProgres/"));
  await expect.poll(() => cours().map((w) => `${w.method} ${w.path}`)).toEqual([`PATCH coursProgres/${RUTH.uid}`]);
  expect(Object.keys((cours()[0].data.fini ?? {}) as object), "ce seul chapitre").toEqual([ch1.id]);

  await page.reload();
  await expect(page.getByText(/^Fini le /)).toBeVisible();
  await page.goto("/harmonie/cours");
  await expect(page.locator("[data-cours-progres]")).toHaveText("1 / 23 chapitres finis");
  await expect(page.getByRole("heading", { name: "Niveau 1 · Fondations · 1 / 5" })).toBeVisible();
  await capture(page, "cours-progression");
});

test("« Annuler » retire le chapitre ; deux chapitres finis à la suite restent tous les deux", async ({ page }) => {
  const [a, b] = [CH(1), CH(2)];
  const db = await entrer(page, RUTH, `/harmonie/cours/${a.id}`);
  await page.getByRole("button", { name: "J'ai fini" }).click();
  await page.goto(`/harmonie/cours/${b.id}`);
  await page.getByRole("button", { name: "J'ai fini" }).click();
  await expect(page.getByText(/^Fini le /)).toBeVisible();
  await expect.poll(() => Object.keys((db.doc(`coursProgres/${RUTH.uid}`)?.fini ?? {}) as object).sort()).toEqual([a.id, b.id].sort());

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("button", { name: "J'ai fini" })).toBeVisible();
  await expect.poll(() => Object.keys((db.doc(`coursProgres/${RUTH.uid}`)?.fini ?? {}) as object)).toEqual([a.id]);
});

test("le niveau 1 fini : « Niveau terminé », et le prochain chapitre est le 6", async ({ page }) => {
  const fini = Object.fromEntries(LECONS.filter((c) => c.niveau === 1).map((c) => [c.id, "2026-10-01T10:00:00.000Z"]));
  await entrer(page, RUTH, "/harmonie/cours", { [`coursProgres/${RUTH.uid}`]: { fini } });
  await expect(page.locator('[data-niveau-fini="1"]')).toHaveText("Niveau terminé");
  await expect(page.locator("[data-prochain]")).toHaveText(`6. Tous les accords`);
});

// ── C4 : la progression de l'équipe ──────────────────────────────────────────

test("un admin voit la progression de l'équipe ; un pianiste ne voit que la sienne", async ({ page }) => {
  const docs = {
    [`coursProgres/${RUTH.uid}`]: { fini: { [CH(1).id]: "2026-10-01T10:00:00.000Z", [CH(6).id]: "2026-10-02T10:00:00.000Z" } },
    [`users/${RUTH.uid}`]: { uid: RUTH.uid, email: RUTH.email, firstName: "Ruth", lastName: "Kouassi", planningName: "Ruth K." },
  };
  await entrer(page, ADMIN, "/harmonie/cours", docs);
  const equipe = page.locator("[data-cours-equipe]");
  await expect(equipe.getByRole("row", { name: /Ruth Kouassi/ })).toContainText("2 / 23");
  await capture(page, "cours-equipe");
});

test("un pianiste ne voit pas le tableau de l'équipe", async ({ page }) => {
  await entrer(page, RUTH, "/harmonie/cours");
  await expect(page.locator("[data-cours]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progression de l'équipe" })).toHaveCount(0);
});
