import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, curseurPage, lireCompteur, onStage, ouvrirJeJoue } from "./helpers/louange";

// Lot pupitre, tranche PU-5 : choisir un rôle pose aussi l'ordre et la disposition (Pianiste, Guitariste : Tout le chant
// et Classique ; Batteur : Plan ; Présidence, Choriste : rien d'imposé) ; changer l'ordre ensuite ne retire plus
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
  d.getByRole("radiogroup", { name: "Ordre des sections" }).getByRole("radio", { name: nom, exact: true });
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
  await expect(ordre(d, "Plan")).toHaveAttribute("aria-checked", "true");
  expect(await lire(page, "disposition"), "disposition sans objet pour le Batteur").toBe("scene");
});

test("Présidence garde l'ordre et la disposition choisis", async ({ page }) => {
  await preparer(page, AUTRES);
  await ouvrirMode(page, LISE);
  const d = await ouvrirJeJoue(page);
  await role(d, "Présidence").click();
  await expect(role(d, "Présidence")).toHaveAttribute("aria-pressed", "true");
  await expect(ordre(d, "Une fois chacune")).toHaveAttribute("aria-checked", "true");
  await expect(disposition(d, /^Scène/)).toHaveAttribute("aria-checked", "true");
});

test("choisir « Chaque section une fois » garde Pianiste coché, aussi après rechargement ; rechoisir un rôle réapplique", async ({ page }) => {
  await preparer(page, AUTRES);
  await ouvrirMode(page, LISE);
  const d = await ouvrirJeJoue(page);
  await role(d, "Pianiste").click();
  await ordre(d, "Une fois chacune").click();
  await expect(ordre(d, "Une fois chacune")).toHaveAttribute("aria-checked", "true");
  await expect(role(d, "Pianiste")).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  const rouvert = await ouvrirJeJoue(page);
  await expect(role(rouvert, "Pianiste")).toHaveAttribute("aria-pressed", "true");
  await expect(ordre(rouvert, "Une fois chacune")).toHaveAttribute("aria-checked", "true");

  await role(rouvert, "Guitariste").click();
  await expect(ordre(rouvert, "Tout le chant"), "rechoisir un rôle réapplique son ordre").toHaveAttribute("aria-checked", "true");
  await expect(disposition(rouvert, /^Classique/)).toHaveAttribute("aria-checked", "true");
});

test("deux comptes sur le même appareil : chacun garde son ordre, la disposition reste celle de l'appareil", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await preparer(page);
  await ouvrirMode(page, LISE);
  const d1 = await ouvrirJeJoue(page);
  await ordre(d1, "Une fois chacune").click();
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
  await ordre(d2, "Plan").click();
  expect(await lire(page2, `partition-layout-${NOEL.uid}`)).toBe("structure");
  expect(await lire(page2, `partition-layout-${LISE.uid}`), "l'ordre de Lise n'a pas bougé").toBe("unique");
  await contexte.close();
});

// Parcours à l'œil du 13/11, constat 4 : le choriste (paroles seules) voyait l'intro et l'interlude d'Abba Père en
// cadres titrés vides. Une section sans paroles n'est plus rendue quand les accords ne sont pas montrés ; le pianiste
// la garde. Toutes les pages du chant sont parcourues.
test.describe("paroles seules : pas de cadre vide (parcours du 13/11, constat 4)", () => {
  const SETLIST_SEULE = "setlist-cadres-vides";
  const ouvrirAbba = async (page: Page) => {
    await preparer(page, { [`partition-layout-${LISE.uid}`]: "played", disposition: "classique" });
    await signInAs(page, LISE, { [`setlists/${SETLIST_SEULE}`]: { ...setlist, items: [item("abba-pere", 1)] } }, `/setlists/${SETLIST_SEULE}`);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  };
  /** Sur chaque page : le texte de chaque section affichée (titre, puis lignes). */
  const sectionsDeToutesLesPages = async (page: Page) => {
    const vues: { titre: string; lignes: string }[] = [];
    // Le compteur est relu à chaque page : la mise en page peut se refaire après le choix du rôle.
    for (let tour = 0; tour < 20; tour++) {
      for (const sec of await onStage(page, "[data-section]").all()) {
        vues.push(await sec.evaluate((el) => ({
          titre: (el.firstElementChild as HTMLElement | null)?.innerText.trim() ?? "",
          lignes: [...el.querySelectorAll<HTMLElement>("[data-copy-line]")].map((l) => l.innerText.trim()).join(" ").trim(),
        })));
      }
      const [cur, total] = (await lireCompteur(page)).split(" / ");
      if (cur === total) break;
      await curseurPage(page).press("ArrowRight");
      await expect.poll(() => lireCompteur(page)).not.toBe(`${cur} / ${total}`);
    }
    return vues;
  };

  test("Choriste : ni Intro ni Interlude, chaque section affichée porte des paroles", async ({ page }) => {
    await ouvrirAbba(page);
    const d = await ouvrirJeJoue(page);
    await role(d, "Choriste").click();
    await page.keyboard.press("Escape");
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    const vues = await sectionsDeToutesLesPages(page);
    expect(vues.map((v) => v.titre).join(" | ")).toMatch(/Couplet 1/);
    expect(vues.filter((v) => /^—?\s*(Intro|Interlude)/.test(v.titre)), "aucun cadre Intro ni Interlude").toEqual([]);
    expect(vues.filter((v) => v.lignes === ""), "aucune section affichée sans paroles").toEqual([]);
  });

  test("Pianiste : l'intro reste, avec ses accords", async ({ page }) => {
    await ouvrirAbba(page);
    const d = await ouvrirJeJoue(page);
    await role(d, "Pianiste").click();
    await page.keyboard.press("Escape");
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-section]").filter({ hasText: "Intro" }).first()).toBeVisible();
    await expect(onStage(page, "[data-section]").filter({ hasText: "Intro" }).first()).toContainText("F#m");
  });
});
