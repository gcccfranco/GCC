import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";

// Ma partition, tranche MP-4 (docs/spec-ma-partition.md, « Partage ») : la feuille « Partager ma partition », la
// lecture d'une partition partagée, « Garder une copie », le retrait du partage, « toutes mes partitions ». Base
// simulée, deux comptes fictifs. Agencement (feuille du bas / popover) : dans SPECS_GRAND_ECRAN.

const AMBRE: FakeProfile = {
  uid: "uid-ambre", email: "ambre.quere@example.invalid", firstName: "Ambre", lastName: "Quéré", planningName: "Ambre Q.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const BASTIEN: FakeProfile = {
  uid: "uid-bastien", email: "bastien.roussel@example.invalid", firstName: "Bastien", lastName: "Roussel", planningName: "Bastien R.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const profilDoc = (p: FakeProfile) => ({ email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: p.planningName, serviceRoles: p.serviceRoles ?? {} });

const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const ZH = readFileSync("content/songs/一生爱你.cho", "utf8");
const MA_ABBA = ABBA.replace("planait", "flottait");
const MON_ZH = ZH.replace("宝", "寶");

const partition = (owner: FakeProfile, slug: string, base: string, content: string, sharedWith: string[] = []) => [
  `partitions/${owner.uid}__${slug}`,
  { ownerUid: owner.uid, ownerName: owner.planningName, base, content, structure: null, key: null, traits: [], sharedWith, sharedTraits: false, updatedAt: new Date("2026-11-02T10:00:00Z") },
] as const;
const [CHEMIN_ABBA, DOC_ABBA] = partition(AMBRE, "abba-pere", ABBA, MA_ABBA);
const [CHEMIN_ZH, DOC_ZH] = partition(AMBRE, "一生爱你", ZH, MON_ZH);

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([
    ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
    ["04/10", "Ambre Q.", "", "", "Bastien R.", "", "", "", "", "", "", "", ""],
  ]),
};
const SERVICE = {
  title: "Culte du 4 octobre", leader: "Ambre Q.", category: "Culte Francophone", date: "2026-10-04", language: "fr", notes: "",
  ownerId: AMBRE.uid, isPrivate: false,
  items: [{ songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
};
const DOCS_DE_AMBRE = { [`users/${BASTIEN.uid}`]: profilDoc(BASTIEN), "setlists/partage-sl": SERVICE };

const sansAide = (page: Page) => page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
const enParoles = (page: Page) => page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
const feuille = (page: Page) => page.locator('[data-testid="partage-feuille"], [data-testid="partage-popover"]');
const case_ = (page: Page, nom: string) => feuille(page).getByRole("checkbox", { name: nom, exact: true });
const lu = (page: Page, mot: string) => page.getByText(mot).first();

async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(600); // fin des animations : la capture montre l'état stable
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>>, vers: string, db?: FakeDb) {
  await sansAide(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const nom = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[nom] ?? "" });
  });
  return signInAs(page, qui, docs, vers, db);
}
/** Une seconde session (autre compte) sur la même base. */
async function autreSession(browser: Browser, page: Page, qui: FakeProfile, vers: string, db: FakeDb, docs: Record<string, Record<string, unknown>> = {}) {
  const { defaultBrowserType: _ignore, ...use } = test.info().project.use as Record<string, unknown>;
  const contexte = await browser.newContext({ ...(use as object), baseURL: new URL(page.url()).origin });
  const p = await contexte.newPage();
  await ouvrir(p, qui, docs, vers, db);
  return { page: p, fermer: () => contexte.close() };
}
const menuJeLis = (page: Page) => page.getByRole("button", { name: /^Je lis/ }).first();
async function choisirDansLeMenu(page: Page, entree: string) {
  await menuJeLis(page).click();
  await page.getByRole("menuitemradio", { name: entree, exact: true }).click();
}
async function ouvrirLaFeuille(page: Page) {
  await choisirDansLeMenu(page, "Partager ma partition…");
  await expect(feuille(page)).toBeVisible();
}

test("A partage sa partition avec B ; B la lit sous « Partition de A » et suit une retouche de A", async ({ page, browser }) => {
  const db = await ouvrir(page, AMBRE, { ...DOCS_DE_AMBRE, [CHEMIN_ABBA]: DOC_ABBA }, "/songs/abba-pere");
  await ouvrirLaFeuille(page);
  await feuille(page).getByRole("searchbox").fill("Bastien");
  await case_(page, "Bastien R.").click();
  await expect.poll(() => db.doc(CHEMIN_ABBA)?.sharedWith).toEqual([BASTIEN.uid]);
  await expect(case_(page, "Bastien R.")).toBeChecked();
  await expect(feuille(page).getByRole("switch", { name: "Inclure mes traits" })).not.toBeChecked();
  await page.keyboard.press("Escape");

  const b = await autreSession(browser, page, BASTIEN, "/songs/abba-pere", db, { [`users/${AMBRE.uid}`]: profilDoc(AMBRE) });
  try {
    await expect(lu(b.page, "planait")).toBeVisible();
    await choisirDansLeMenu(b.page, "Partition de Ambre Q.");
    await expect(lu(b.page, "flottait")).toBeVisible();
    await expect.poll(() => db.doc(`partitions/${BASTIEN.uid}__choix`)).toMatchObject({ choices: { "abba-pere": AMBRE.uid } });

    // A retouche à son tour : B, qui relit la page, suit.
    await page.getByRole("button", { name: "Crayon", exact: true }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: "Paroles", exact: true }).click();
    await page.getByRole("button").filter({ hasText: "flottait" }).first().click();
    const champ = page.getByRole("dialog").first().locator("textarea");
    await champ.fill((await champ.inputValue()).replace("flottait", "glissait"));
    await page.getByRole("dialog").first().getByRole("button", { name: "Valider", exact: true }).click();
    await page.getByRole("dialog").first().getByRole("button", { name: "Valider", exact: true }).click();
    await expect.poll(() => String(db.doc(CHEMIN_ABBA)?.content)).toContain("glissait");
    await b.page.reload();
    await expect(lu(b.page, "glissait")).toBeVisible();
  } finally {
    await b.fermer();
  }
});

test("B « Garde une copie » : la partition de A devient la sienne et son choix passe à « Ma partition »", async ({ page }) => {
  const db = await ouvrir(page, BASTIEN, {
    [`users/${AMBRE.uid}`]: profilDoc(AMBRE),
    [CHEMIN_ABBA]: { ...DOC_ABBA, sharedWith: [BASTIEN.uid] },
    [`partitions/${BASTIEN.uid}__choix`]: { choices: { "abba-pere": AMBRE.uid }, partageTout: [] },
  }, "/songs/abba-pere");
  await expect(lu(page, "flottait")).toBeVisible();
  await page.getByRole("button", { name: "Garder une copie", exact: true }).click();
  await expect.poll(() => db.doc(`partitions/${BASTIEN.uid}__abba-pere`)).toMatchObject({ ownerUid: BASTIEN.uid, content: MA_ABBA, sharedWith: [] });
  await expect.poll(() => db.doc(`partitions/${BASTIEN.uid}__choix`)).toMatchObject({ choices: { "abba-pere": "mienne" } });
  await expect(menuJeLis(page)).toContainText("Ma partition");
  await expect(page.getByRole("button", { name: "Garder une copie", exact: true })).toHaveCount(0);
});

test("« Garder une copie » devant une partition retouchée : une confirmation, Annuler la garde", async ({ page }) => {
  const [chemin, doc] = partition(BASTIEN, "abba-pere", ABBA, ABBA.replace("planait", "glissait"));
  const db = await ouvrir(page, BASTIEN, {
    [`users/${AMBRE.uid}`]: profilDoc(AMBRE),
    [CHEMIN_ABBA]: { ...DOC_ABBA, sharedWith: [BASTIEN.uid] },
    [chemin]: doc,
    [`partitions/${BASTIEN.uid}__choix`]: { choices: { "abba-pere": AMBRE.uid }, partageTout: [] },
  }, "/songs/abba-pere");
  await page.getByRole("button", { name: "Garder une copie", exact: true }).click();
  const alerte = page.getByRole("alertdialog");
  await expect(alerte).toContainText("Remplacer ma partition ?");
  await alerte.getByRole("button", { name: "Annuler" }).click();
  expect(String(db.doc(chemin)?.content)).toContain("glissait");
  await page.getByRole("button", { name: "Garder une copie", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Garder une copie", exact: true }).click();
  await expect.poll(() => String(db.doc(chemin)?.content)).toContain("flottait");
});

test("A retire le partage : B, sans copie, retombe sur le chant d'origine", async ({ page, browser }) => {
  const db = await ouvrir(page, AMBRE, {
    ...DOCS_DE_AMBRE,
    [CHEMIN_ABBA]: { ...DOC_ABBA, sharedWith: [BASTIEN.uid] },
    [`partitions/${BASTIEN.uid}__choix`]: { choices: { "abba-pere": AMBRE.uid }, partageTout: [] },
  }, "/songs/abba-pere");
  await ouvrirLaFeuille(page);
  await expect(case_(page, "Bastien R.")).toBeChecked();
  await case_(page, "Bastien R.").click();
  await expect.poll(() => db.doc(CHEMIN_ABBA)?.sharedWith).toEqual([]);
  await page.keyboard.press("Escape");

  const b = await autreSession(browser, page, BASTIEN, "/songs/abba-pere", db, { [`users/${AMBRE.uid}`]: profilDoc(AMBRE) });
  try {
    await expect(lu(b.page, "planait")).toBeVisible();
    await expect(b.page.getByText("flottait")).toHaveCount(0);
    await expect(menuJeLis(b.page)).toHaveCount(0);
  } finally {
    await b.fermer();
  }
});

test("« toutes mes partitions » : les partitions présentes, puis une partition neuve, sont partagées avec B", async ({ page }) => {
  await enParoles(page);
  const db = await ouvrir(page, AMBRE, { ...DOCS_DE_AMBRE, [CHEMIN_ZH]: DOC_ZH }, `/songs/${encodeURIComponent("一生爱你")}`);
  await ouvrirLaFeuille(page);
  await feuille(page).getByRole("searchbox").fill("Bastien");
  await case_(page, "Bastien R.").click();
  await feuille(page).getByRole("checkbox", { name: "Partager toutes mes partitions avec cette personne : Bastien R.", exact: true }).click();
  await expect.poll(() => db.doc(`partitions/${AMBRE.uid}__choix`)?.partageTout).toEqual([BASTIEN.uid]);
  await expect.poll(() => db.doc(CHEMIN_ZH)?.sharedWith).toEqual([BASTIEN.uid]);

  // Une partition neuve (une première retouche sur un autre chant) la reçoit à sa création.
  await page.goto("/songs/abba-pere");
  await page.getByRole("button", { name: "Crayon", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Paroles", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "planait" }).first().click();
  const champ = page.getByRole("dialog").first().locator("textarea");
  await champ.fill((await champ.inputValue()).replace("planait", "flottait"));
  await page.getByRole("dialog").first().getByRole("button", { name: "Valider", exact: true }).click();
  await page.getByRole("dialog").first().getByRole("button", { name: "Valider", exact: true }).click();
  await expect.poll(() => db.doc(CHEMIN_ABBA)?.sharedWith).toEqual([BASTIEN.uid]);

  // Décocher « toutes » retire B des deux, et du document de choix.
  await ouvrirLaFeuille(page);
  await feuille(page).getByRole("checkbox", { name: "Partager toutes mes partitions avec cette personne : Bastien R.", exact: true }).click();
  await expect.poll(() => db.doc(`partitions/${AMBRE.uid}__choix`)?.partageTout).toEqual([]);
  await expect.poll(() => db.doc(CHEMIN_ZH)?.sharedWith).toEqual([]);
});

test("chant ZH : B lit la partition de A, avec son texte chinois", async ({ page, browser }) => {
  await enParoles(page);
  const adresse = `/songs/${encodeURIComponent("一生爱你")}`;
  const db = await ouvrir(page, AMBRE, { ...DOCS_DE_AMBRE, [CHEMIN_ZH]: DOC_ZH }, adresse);
  await ouvrirLaFeuille(page);
  await feuille(page).getByRole("searchbox").fill("Bastien");
  await case_(page, "Bastien R.").click();
  await expect.poll(() => db.doc(CHEMIN_ZH)?.sharedWith).toEqual([BASTIEN.uid]);
  await capture(page, "partage-feuille-zh");
  await page.keyboard.press("Escape");

  const b = await autreSession(browser, page, BASTIEN, adresse, db, { [`users/${AMBRE.uid}`]: profilDoc(AMBRE) });
  try {
    await enParoles(b.page);
    await b.page.reload();
    await choisirDansLeMenu(b.page, "Partition de Ambre Q.");
    await expect(b.page.getByText("寶").first()).toBeVisible();
  } finally {
    await b.fermer();
  }
});

test("la feuille : l'équipe du service (moi exclu), les traits, la disposition (feuille au téléphone, popover ailleurs)", async ({ page }, info) => {
  const db = await ouvrir(page, AMBRE, { ...DOCS_DE_AMBRE, [CHEMIN_ABBA]: DOC_ABBA }, "/songs/abba-pere?setlist=partage-sl");
  await ouvrirLaFeuille(page);
  const ouverte = feuille(page);
  await expect(ouverte.getByText("Partager ma partition", { exact: true }).first()).toBeVisible();
  await expect(ouverte.getByText("Ce dimanche avec toi")).toBeVisible();
  await expect(case_(page, "Bastien R.")).toBeVisible();
  await expect(case_(page, "Ambre Q.")).toHaveCount(0);
  const telephone = info.project.name === "telephone";
  await expect(page.getByTestId("partage-feuille")).toHaveCount(telephone ? 1 : 0);
  await expect(page.getByTestId("partage-popover")).toHaveCount(telephone ? 0 : 1);
  if (!telephone) expect(Math.round((await page.getByTestId("partage-popover").boundingBox())!.width)).toBe(380);
  const fermer = ouverte.getByRole("button", { name: "Fermer" });
  expect((await fermer.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  expect((await fermer.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await capture(page, "partage-feuille");

  await case_(page, "Bastien R.").click();
  await expect.poll(() => db.doc(CHEMIN_ABBA)?.sharedWith).toEqual([BASTIEN.uid]);
  await ouverte.getByRole("switch", { name: "Inclure mes traits" }).click();
  await expect.poll(() => db.doc(CHEMIN_ABBA)?.sharedTraits).toBe(true);
  await fermer.click();
  await expect(feuille(page)).toHaveCount(0);
});

test("sans partition à moi, le menu « Je lis » n'offre pas « Partager ma partition… »", async ({ page }) => {
  await ouvrir(page, BASTIEN, { [`users/${AMBRE.uid}`]: profilDoc(AMBRE), [CHEMIN_ABBA]: { ...DOC_ABBA, sharedWith: [BASTIEN.uid] } }, "/songs/abba-pere");
  await menuJeLis(page).click();
  await expect(page.getByRole("menuitemradio", { name: "Partition de Ambre Q.", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitemradio", { name: "Partager ma partition…" })).toHaveCount(0);
});
