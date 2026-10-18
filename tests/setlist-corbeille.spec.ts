import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { CORBEILLE_JOURS, limiteDePurge } from "../src/lib/setlists/corbeille";

// Lot SC2 — corbeille des setlists (docs/spec-createur-corbeille-absences.md). Personnes fictives.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const NINA: FakeProfile = {
  uid: "uid-nina",
  email: "nina@example.com",
  firstName: "Nina",
  lastName: "Valmont",
  serviceRoles: { "Culte Francophone": ["chanteur"] },
};

/** Musicien du service : niveau « edit » sur la catégorie, mais pas créateur. */
const OSCAR: FakeProfile = {
  uid: "uid-oscar",
  email: "oscar@example.com",
  firstName: "Oscar",
  lastName: "Tellier",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const ADMIN: FakeProfile = {
  uid: "uid-admin",
  email: "tc328829@gmail.com",
  firstName: "Agathe",
  lastName: "Admin",
  serviceRoles: { "Culte Francophone": ["chanteur"] },
};

const setlist = (over: Record<string, unknown>) => ({
  title: "Sans titre",
  leader: "",
  category: "Culte Francophone",
  date: "2025-03-02",
  language: "fr",
  notes: "",
  ownerId: NINA.uid,
  isPrivate: false,
  isDraft: false,
  items: [],
  ...over,
});

const A_LA_CORBEILLE = { supprimeeLe: "2026-10-10T09:00:00.000Z", supprimeePar: NINA.uid };

async function planningVide(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
}

async function ouvrir(page: Page, profil: FakeProfile, docs: Record<string, Record<string, unknown>>, url = "/setlists") {
  await planningVide(page);
  return signInAs(page, profil, docs, url);
}

const archives = (page: Page) => page.getByRole("tab", { name: "Archives" }).click();
const entreeCorbeille = (page: Page) => page.getByRole("button", { name: /^Corbeille \(\d+\)/ });
const ecrituresSetlists = (db: { writes: { method: string; path: string }[] }) =>
  db.writes.filter((w) => w.path.startsWith("setlists")).map((w) => `${w.method} ${w.path}`);

test("fiche : le créateur met à la corbeille, le bandeau propose d'annuler", async ({ page }) => {
  const masques: string[][] = [];
  page.on("request", (r) => {
    if (r.method() !== "PATCH" || !r.url().includes("/setlists/c1")) return;
    masques.push(new URL(r.url()).searchParams.getAll("updateMask.fieldPaths"));
  });
  const db = await ouvrir(page, NINA, { "setlists/c1": setlist({ title: "Culte des familles", date: "2099-01-10" }) }, "/setlists/c1");
  await expect(page.getByRole("heading", { name: "Culte des familles" })).toBeVisible();

  await page.getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Elle reste 30 jours dans la corbeille");
  await page.getByRole("button", { name: "Mettre à la corbeille" }).click();

  const bandeau = page.getByTestId("bandeau-corbeille");
  await expect(bandeau).toHaveText(/Setlist mise à la corbeille/);
  expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe("/setlists");
  expect(ecrituresSetlists(db)).toEqual(["PATCH setlists/c1"]);
  expect(db.writes.find((w) => w.path === "setlists/c1")!.data).toMatchObject({ supprimeePar: NINA.uid, supprimeeLe: expect.any(String) });
  expect(db.writes.some((w) => w.method === "DELETE")).toBe(false);
  expect(masques[0]).toEqual(["supprimeeLe", "supprimeePar"]);
  // Le paramètre `?corbeille=` ne reste pas dans l'adresse.
  await expect.poll(() => new URL(page.url()).search).not.toContain("corbeille");

  await bandeau.getByRole("button", { name: "Annuler" }).click();
  await expect(bandeau).toHaveCount(0);
  await expect.poll(() => db.doc("setlists/c1")).toBeDefined();
  await expect.poll(() => "supprimeeLe" in (db.doc("setlists/c1") ?? {})).toBe(false);
  expect(db.doc("setlists/c1")).not.toHaveProperty("supprimeePar");
  // Annuler ne touche que ces deux champs : le masque les nomme, le corps n'en porte aucun.
  expect(masques[1]).toEqual(["supprimeeLe", "supprimeePar"]);
  expect(ecrituresSetlists(db)).toEqual(["PATCH setlists/c1", "PATCH setlists/c1"]);
  await expect(page.getByText("Culte des familles").first()).toBeVisible();
});

test("une setlist à la corbeille n'est ni dans « À venir » ni dans « Archives » ; la section est repliée, Restaurer la ramène", async ({ page }) => {
  const db = await ouvrir(page, NINA, {
    "setlists/c2": setlist({ title: "Veillée de printemps", ...A_LA_CORBEILLE }),
    // Celle d'une autre personne, à venir, à la corbeille : ni listée, ni dans la corbeille de Nina.
    "setlists/c3": setlist({ title: "Culte d'un autre", ownerId: "uid-autre", date: "2099-01-10", supprimeeLe: "2026-10-11T09:00:00.000Z", supprimeePar: "uid-autre" }),
    "setlists/c4": setlist({ title: "Culte de référence", date: "2099-02-07" }),
  });
  await expect(page.getByText("Culte de référence").first()).toBeVisible();
  await expect(page.getByText("Culte d'un autre")).toHaveCount(0);
  await expect(page.getByText("Veillée de printemps")).toHaveCount(0);
  await expect(entreeCorbeille(page)).toHaveCount(0);

  await archives(page);
  await expect(entreeCorbeille(page)).toHaveText(/Corbeille \(1\)/);
  await expect(entreeCorbeille(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Veillée de printemps")).toHaveCount(0);
  await expect(page.getByText("Les setlists supprimées restent ici 30 jours.")).toBeVisible();

  await entreeCorbeille(page).click();
  await expect(entreeCorbeille(page)).toHaveAttribute("aria-expanded", "true");
  const corbeille = page.getByTestId("corbeille");
  await expect(corbeille.getByText("Veillée de printemps")).toBeVisible();
  await expect(corbeille.getByText(/Supprimée le 10\/10/)).toBeVisible();
  await expect(corbeille.getByRole("button", { name: "Restaurer" })).toBeVisible();
  await expect(corbeille.getByRole("button", { name: "Supprimer définitivement" })).toBeVisible();

  await corbeille.getByRole("button", { name: "Restaurer" }).click();
  await expect(page.getByTestId("corbeille")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("listitem").filter({ hasText: "Veillée de printemps" })).toBeVisible();
  expect(db.doc("setlists/c2")).not.toHaveProperty("supprimeeLe");
  expect(ecrituresSetlists(db)).toEqual(["PATCH setlists/c2"]);
});

test("« Mes setlists » ne montre pas une setlist privée mise à la corbeille", async ({ page }) => {
  await ouvrir(page, NINA, {
    "setlists/p1": setlist({ title: "Répétition cachée", isPrivate: true, ...A_LA_CORBEILLE }),
    "setlists/p2": setlist({ title: "Répétition gardée", isPrivate: true }),
  });
  await page.getByRole("tab", { name: /Mes setlists/ }).click();
  await expect(page.getByText("Répétition gardée").first()).toBeVisible();
  await expect(page.getByText("Répétition cachée")).toHaveCount(0);
});

test("« Supprimer définitivement » demande confirmation, puis supprime pour de bon", async ({ page }) => {
  const db = await ouvrir(page, NINA, { "setlists/c5": setlist({ title: "Veillée de l'été", ...A_LA_CORBEILLE }) });
  await archives(page);
  await entreeCorbeille(page).click();
  await page.getByTestId("corbeille").getByRole("button", { name: "Supprimer définitivement" }).click();

  const dialogue = page.getByRole("alertdialog");
  await expect(dialogue.getByRole("heading")).toHaveText("Supprimer définitivement « Veillée de l'été » ?");
  await expect(dialogue).toContainText("Elle ne pourra plus être restaurée.");
  expect(ecrituresSetlists(db)).toEqual([]);
  await dialogue.getByRole("button", { name: "Supprimer définitivement" }).click();

  await expect(page.getByTestId("corbeille")).toHaveCount(0);
  expect(ecrituresSetlists(db)).toEqual(["DELETE setlists/c5"]);
  expect(db.doc("setlists/c5")).toBeUndefined();
});

test("la corbeille d'un autre n'est pas visible d'un musicien ; un admin la voit", async ({ page, browser }) => {
  const docs = {
    "setlists/c6": setlist({ title: "Veillée de l'automne", ...A_LA_CORBEILLE }),
    "setlists/c7": setlist({ title: "Culte de référence" }),
  };
  await ouvrir(page, OSCAR, docs);
  await archives(page);
  await expect(page.getByText("Culte de référence").first()).toBeVisible();
  await expect(entreeCorbeille(page)).toHaveCount(0);

  const contexte = await browser.newContext();
  const pageAdmin = await contexte.newPage();
  try {
    await ouvrir(pageAdmin, ADMIN, docs);
    await archives(pageAdmin);
    await expect(pageAdmin.getByText("Culte de référence").first()).toBeVisible();
    await expect(entreeCorbeille(pageAdmin)).toHaveText(/Corbeille \(1\)/);
  } finally {
    await contexte.close();
  }
});

test("la page d'une setlist à la corbeille est introuvable", async ({ page }) => {
  await ouvrir(page, NINA, { "setlists/c8": setlist({ title: "Veillée oubliée", ...A_LA_CORBEILLE }) }, "/setlists/c8");
  await expect(page.getByText("Setlist introuvable").first()).toBeVisible();
  await expect(page.getByText("Veillée oubliée")).toHaveCount(0);
});

test("en 中文, la corbeille et le bandeau sont traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, NINA, { "setlists/c9": setlist({ title: "Veillée d'hiver", ...A_LA_CORBEILLE }) });
  await page.getByRole("tab", { name: "历史" }).click();
  const entree = page.getByRole("button", { name: "回收站（1）" });
  await expect(entree).toBeVisible();
  await expect(page.getByText("已删除的歌单在这里保留 30 天。")).toBeVisible();
  await entree.click();
  await expect(page.getByTestId("corbeille").getByText(/删除于 10月10日/)).toBeVisible();
  await expect(page.getByRole("button", { name: "恢复" })).toBeVisible();
  await expect(page.getByRole("button", { name: "永久删除" })).toBeVisible();
});

test.describe("corbeille : pur et textes", () => {
  test("limiteDePurge recule de 30 jours", () => {
    expect(CORBEILLE_JOURS).toBe(30);
    expect(limiteDePurge(new Date("2026-10-31T00:00:00Z"))).toBe("2026-10-01T00:00:00.000Z");
  });

  test("les règles : écrire supprimeeLe = pouvoir supprimer", () => {
    const regles = lire("firestore.rules");
    const update = regles.slice(regles.indexOf("allow update", regles.indexOf("match /setlists/{id}")));
    const bloc = update.slice(0, update.indexOf("allow delete"));
    expect(bloc).toContain("hasAny(['supprimeeLe', 'supprimeePar'])");
    expect(bloc).toContain("canDeleteSetlistDoc(resource.data)");
    expect(bloc).toContain("supprimeePar");
  });

  test("le cron purge la corbeille hors de l'interrupteur du back-office", () => {
    const cron = lire("src/app/api/cron/reminders/route.ts");
    const appel = cron.indexOf("await purgerCorbeille(db)");
    expect(appel).toBeGreaterThan(-1);
    const ligne = cron.slice(cron.lastIndexOf("\n", appel) + 1, cron.indexOf("\n", appel));
    expect(ligne).not.toContain("BACK_OFFICE");
    // Et aucun `if (BACK_OFFICE)` ne l'enveloppe : l'appel est dans le try du début de GET.
    const avant = cron.slice(cron.indexOf("export async function GET"), appel);
    expect(avant).not.toMatch(/if \(BACK_OFFICE\)/);
    expect(cron).toContain("recursiveDelete");
  });

  test("les routes d'envoi traitent une setlist à la corbeille comme introuvable", () => {
    for (const f of ["src/app/api/push/notify-setlist/route.ts", "src/app/api/setlist/presentation/route.ts"]) {
      expect(lire(f)).toContain('snap.get("supprimeeLe")');
    }
  });
});
