import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, ouvrirJeJoue } from "./helpers/louange";

// Lot pupitre, tranche PU-5 : choisir un rôle pose aussi l'ordre et la disposition (Pianiste, Guitariste : Tout le chant
// et Classique ; Batteur : Plan du chant ; Présidence, Choriste : rien d'imposé) ; changer l'ordre ensuite ne retire plus
// le rôle ; l'ordre est retenu par compte, la disposition par appareil. Comptes simulés, noms fictifs.

const SETLIST_ID = "setlist-role-regle";
const profil = (uid: string, prenom: string, nom: string): FakeProfile => ({
  uid, email: `${uid}@example.com`, firstName: prenom, lastName: nom,
  serviceRoles: { "Culte Francophone": ["musicien"] },
});
const LISE = profil("uid-lise", "Lise", "Corbin");
const NOEL = profil("uid-noel", "Noël", "Vasseur");

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = {
  title: "Culte d'essai des rôles",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-09",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: ["avec-nous", "abba-pere"].map((s, i) => item(s, i + 1)),
};

const lire = (page: Page, cle: string) => page.evaluate((c) => localStorage.getItem(c), cle);

/** Réglages de départ posés une seule fois ; les deux comptes ont déjà répondu à la question du rôle. */
async function preparer(page: Page, init: Record<string, string> = {}) {
  const depart = { "perf-role-migre": "uid-autre", "perf-role-asked-uid-lise": "1", "perf-role-asked-uid-noel": "1", ...init };
  await page.addInitScript((extra) => {
    try {
      if (!localStorage.getItem("perf-test-init")) {
        localStorage.setItem("perf-test-init", "1");
        for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
      }
    } catch { /* ignore */ }
  }, depart);
}

async function ouvrirMode(page: Page, compte: FakeProfile) {
  await signInAs(page, compte, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

const ordre = (d: ReturnType<Page["locator"]>, nom: string) =>
  d.getByRole("radiogroup", { name: "Ordre des sections" }).getByRole("radio", { name: nom });
const disposition = (d: ReturnType<Page["locator"]>, nom: RegExp) =>
  d.locator('[role=radiogroup][aria-labelledby="perf-disposition"]').getByRole("radio", { name: nom });
const role = (d: ReturnType<Page["locator"]>, nom: string) => d.getByRole("button", { name: new RegExp(`^${nom}`) });

const AUTRES = { [`partition-layout-${LISE.uid}`]: "unique", disposition: "scene" };

test("Pianiste pose Tout le chant et Classique", async ({ page }) => {
  await preparer(page, AUTRES);
  await ouvrirMode(page, LISE);
  const d = await ouvrirJeJoue(page);
  await role(d, "Pianiste").click();
  await expect(ordre(d, "Tout le chant")).toHaveAttribute("aria-checked", "true");
  await expect(disposition(d, /^Classique/)).toHaveAttribute("aria-checked", "true");
  expect(await lire(page, `partition-layout-${LISE.uid}`)).toBe("played");
  expect(await lire(page, "disposition")).toBe("classique");
});

test("Batteur pose Plan du chant, sans toucher à la disposition", async ({ page }) => {
  await preparer(page, AUTRES);
  await ouvrirMode(page, LISE);
  const d = await ouvrirJeJoue(page);
  await role(d, "Batteur").click();
  await expect(ordre(d, "Plan du chant")).toHaveAttribute("aria-checked", "true");
  expect(await lire(page, "disposition"), "disposition sans objet pour le Batteur").toBe("scene");
});

test("Présidence garde l'ordre et la disposition choisis", async ({ page }) => {
  await preparer(page, AUTRES);
  await ouvrirMode(page, LISE);
  const d = await ouvrirJeJoue(page);
  await role(d, "Présidence").click();
  await expect(role(d, "Présidence")).toHaveAttribute("aria-pressed", "true");
  await expect(ordre(d, "Chaque section une fois")).toHaveAttribute("aria-checked", "true");
  await expect(disposition(d, /^Scène/)).toHaveAttribute("aria-checked", "true");
});

test("choisir « Chaque section une fois » garde Pianiste coché, aussi après rechargement ; rechoisir un rôle réapplique", async ({ page }) => {
  await preparer(page, AUTRES);
  await ouvrirMode(page, LISE);
  const d = await ouvrirJeJoue(page);
  await role(d, "Pianiste").click();
  await ordre(d, "Chaque section une fois").click();
  await expect(ordre(d, "Chaque section une fois")).toHaveAttribute("aria-checked", "true");
  await expect(role(d, "Pianiste")).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  const rouvert = await ouvrirJeJoue(page);
  await expect(role(rouvert, "Pianiste")).toHaveAttribute("aria-pressed", "true");
  await expect(ordre(rouvert, "Chaque section une fois")).toHaveAttribute("aria-checked", "true");

  await role(rouvert, "Guitariste").click();
  await expect(ordre(rouvert, "Tout le chant"), "rechoisir un rôle réapplique son ordre").toHaveAttribute("aria-checked", "true");
  await expect(disposition(rouvert, /^Classique/)).toHaveAttribute("aria-checked", "true");
});

test("deux comptes sur le même appareil : chacun garde son ordre, la disposition reste celle de l'appareil", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await preparer(page);
  await ouvrirMode(page, LISE);
  const d1 = await ouvrirJeJoue(page);
  await ordre(d1, "Chaque section une fois").click();
  await disposition(d1, /^Marge/).click();
  expect(await lire(page, `partition-layout-${LISE.uid}`)).toBe("unique");

  // Même appareil, autre compte : un contexte neuf reçoit le localStorage de l'appareil (sans la session de Lise).
  const stockage = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const contexte = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const page2 = await contexte.newPage();
  await page2.addInitScript((s) => {
    if (localStorage.getItem("perf-test-copie")) return;
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v as string);
    localStorage.setItem("perf-test-copie", "1");
  }, stockage);
  await ouvrirMode(page2, NOEL);
  const d2 = await ouvrirJeJoue(page2);
  await expect(ordre(d2, "Tout le chant"), "Noël n'hérite pas de l'ordre de Lise").toHaveAttribute("aria-checked", "true");
  await expect(disposition(d2, /^Marge/), "la disposition est celle de l'appareil").toHaveAttribute("aria-checked", "true");
  await ordre(d2, "Plan du chant").click();
  expect(await lire(page2, `partition-layout-${NOEL.uid}`)).toBe("structure");
  expect(await lire(page2, `partition-layout-${LISE.uid}`), "l'ordre de Lise n'a pas bougé").toBe("unique");
  await contexte.close();
});
