import { expect, test, type Page } from "@playwright/test";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { CLES_USAGE, normaliserRoute } from "../src/lib/usageCles";

// Comptage d'usage, T1 (docs/spec-comptage-usage.md). Compte fictif ; jamais de vraie écriture : `documents:commit`
// est interceptée (route posée APRÈS fakeFirestore, la dernière posée gagne).

const MEMBRE: FakeProfile = { uid: "uid-usage-t1-brume", email: "ondine.brume@example.com", firstName: "Ondine", lastName: "Brume" };
const SLUG = "a-l-agneau";

type Commit = { writes: { update: { name: string }; updateTransforms: { fieldPath: string; increment: { integerValue: string } }[] }[] };

async function poserCommit(page: Page, statut: () => number) {
  const recus: { corps: string; json: Commit }[] = [];
  await page.route("**/documents:commit", async (route) => {
    const corps = route.request().postData() ?? "";
    if (statut() !== 200) return route.fulfill({ status: statut(), contentType: "application/json", body: "{}" });
    recus.push({ corps, json: JSON.parse(corps) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ writeResults: [] }) });
  });
  return recus;
}

async function arriere(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

async function troisEcrans(page: Page) {
  await page.goto("/songs");
  await page.goto(`/songs/${SLUG}`);
  await page.goto("/guide");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("gcc-usage") ?? "")).toContain("ecran.guide");
}

const autoriserEnvoi = (page: Page) => page.evaluate(() => localStorage.removeItem("gcc-usage-envoi"));

const stock = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("gcc-usage") ?? "{}"));

async function connecte(page: Page, statut: () => number = () => 200) {
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MEMBRE, {}, "/guide");
  const recus = await poserCommit(page, statut);
  // La connexion a déjà compté la page de connexion et envoyé (vers fakeFirestore) : on repart de zéro, et on bloque
  // l'envoi du montage (date du jour) pour que seul le passage en arrière-plan, après `autoriserEnvoi`, envoie.
  await page.evaluate(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    const d = new Date();
    localStorage.removeItem("gcc-usage");
    localStorage.setItem("gcc-usage-envoi", `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  });
  return recus;
}

test("trois écrans puis arrière-plan : un seul commit, sans uid, courriel ni slug", async ({ page }) => {
  const recus = await connecte(page);
  await troisEcrans(page);
  await autoriserEnvoi(page);
  await arriere(page);
  await expect.poll(() => recus.length).toBe(1);
  const champs = recus[0].json.writes.flatMap((w) => w.updateTransforms.map((t) => t.fieldPath));
  expect(champs).toContain("`ecran.songs/[slug]`.n");
  expect(champs).toContain("`ecran.songs/[slug]`.j");
  expect(champs).toContain("_actif.j");
  for (const w of recus[0].json.writes) expect(w.update.name).toMatch(/\/documents\/usage\/\d{4}-\d{2}$/);
  expect(recus[0].corps).not.toContain(MEMBRE.uid);
  expect(recus[0].corps).not.toContain(MEMBRE.email);
  expect(recus[0].corps).not.toContain(SLUG);
  // b. second passage le même jour : aucun commit de plus.
  await page.goto("/songs");
  await arriere(page);
  await page.waitForTimeout(500);
  expect(recus.length).toBe(1);
});

test("envoi refusé : les comptes restent, puis partent au passage suivant", async ({ page }) => {
  let statut = 503;
  const recus = await connecte(page, () => statut);
  await troisEcrans(page);
  await autoriserEnvoi(page);
  await arriere(page);
  await page.waitForTimeout(500);
  expect(recus.length).toBe(0);
  expect(await stock(page)).not.toEqual({});
  expect(await page.evaluate(() => localStorage.getItem("gcc-usage-envoi"))).toBeNull();
  statut = 200;
  await page.evaluate(() => localStorage.setItem("gcc-usage-envoi", "2000-01-01"));
  await arriere(page);
  await expect.poll(() => recus.length).toBe(1);
  await expect.poll(async () => Object.values(await stock(page)).every((j) => Object.keys((j as { c: object }).c).length === 0)).toBe(true);
});

test("sans compte connecté : aucun commit, comptes gardés", async ({ page }) => {
  await fakeFirestore(page, {});
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const recus = await poserCommit(page, () => 200);
  await page.goto("/songs");
  await page.goto("/guide");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("gcc-usage") ?? "")).toContain("ecran.guide");
  await arriere(page);
  await page.waitForTimeout(500);
  expect(recus.length).toBe(0);
  expect(await stock(page)).not.toEqual({});
});

test("registre : chaque page a sa clé ecran.…, une clé inconnue ne stocke rien", async ({ page }) => {
  const pages: string[] = [];
  const parcourir = (dir: string) => {
    for (const nom of readdirSync(dir)) {
      const p = join(dir, nom);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (nom === "page.tsx") pages.push(p);
    }
  };
  parcourir("src/app");
  expect(pages.length).toBeGreaterThan(50);
  for (const p of pages) {
    const route = p.replace(/^src\/app\/?/, "").replace(/\/?page\.tsx$/, "").split("/").filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
    expect(CLES_USAGE, p).toHaveProperty([route === "" ? "ecran.accueil" : `ecran.${route}`]);
  }
  expect(normaliserRoute("/songs/un-slug-quelconque")).toBe("ecran.songs/[slug]");
  expect(normaliserRoute("/songs/statistiques")).toBe("ecran.songs/statistiques");
  expect(normaliserRoute("/harmonie/une/fiche")).toBe("ecran.harmonie/[...fiche]");
  expect(normaliserRoute("/inconnue/x")).toBeNull();

  await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await fakeFirestore(page, {});
  await page.goto("/guide");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("gcc-usage") ?? "")).toContain("ecran.guide");
  const avant = await page.evaluate(() => localStorage.getItem("gcc-usage"));
  expect(avant).not.toContain("cmd.inexistante");
});

test("le champ <clé>.d.<disposition> porte la disposition de l'appareil", async ({ page }, info) => {
  const recus = await connecte(page);
  await page.goto("/guide");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("gcc-usage") ?? "")).toContain("ecran.guide");
  await autoriserEnvoi(page);
  await arriere(page);
  await expect.poll(() => recus.length).toBe(1);
  const attendu = info.project.name === "telephone" ? "telephone" : info.project.name === "tablette" ? "tablette" : "ordinateur";
  const champs = recus[0].json.writes.flatMap((w) => w.updateTransforms.map((t) => t.fieldPath));
  expect(champs).toContain(`\`ecran.guide\`.d.${attendu}`);
  expect(champs).toContain(`_actif.d.${attendu}`);
  for (const autre of ["telephone", "tablette", "ordinateur"].filter((d) => d !== attendu)) {
    expect(champs).not.toContain(`\`ecran.guide\`.d.${autre}`);
  }
});
