import { readFileSync } from "node:fs";
import { expect, test, type BrowserContextOptions, type Page } from "@playwright/test";
import { fusionner, passerAuCulte, rangDansLaCourante } from "../src/lib/partition/fusion";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { basculerMode, choisirDestination } from "./helpers/menuSetlist";
import { ouvrirPartitions } from "./helpers/setlist";

// Ma partition, tranche MP-3 (docs/spec-ma-partition.md, « Le Crayon ») : un seul bouton « Crayon », la barre basse, le
// choix « Pour moi / Pour tout le culte », « Passer au culte », et la page d'un chant. Base simulée ; noms fictifs.
// Agencement (barre basse, feuille de choix) : dans SPECS_GRAND_ECRAN.

const MUSICIEN: FakeProfile = {
  uid: "uid-nadege",
  email: "nadege.tellier@example.invalid",
  firstName: "Nadège",
  lastName: "Tellier",
  planningName: "Nadège T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const RESPONSABLE: FakeProfile = {
  uid: "uid-corentin",
  email: "corentin.vasseur@example.invalid",
  firstName: "Corentin",
  lastName: "Vasseur",
  planningName: "Corentin V.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});
const setlist = (date: string, items: Record<string, unknown>[]) => ({
  title: `Culte du ${date}`,
  leader: "Corentin V.",
  category: "Culte Francophone",
  date,
  language: "mixed",
  notes: "",
  ownerId: RESPONSABLE.uid,
  isPrivate: false,
  items,
});
const SETLIST_A = "setlists/crayon-a";
const SETLIST_B = "setlists/crayon-b";
const DOCS = {
  [SETLIST_A]: setlist("2026-09-21", [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2 })]),
  [SETLIST_B]: setlist("2026-09-28", [item({ songSlug: "abba-pere", position: 1 })]),
};

const ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
const MA_PARTITION = `partitions/${MUSICIEN.uid}__abba-pere`;

const ligne = (page: Page, texte: string) => page.getByRole("button").filter({ hasText: texte }).first();
const lue = (page: Page, texte: string) => page.locator("[data-copy-line]", { hasText: texte });
const feuille = (page: Page) => page.getByRole("dialog").first();
/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}
/** 一生爱你 a un scan, affiché par défaut : les tests du chant chinois lisent ses paroles. */
const enParoles = (page: Page) => page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
/** La bulle « Touche un accord… » de la page d'un chant recouvre la barre basse : déjà vue, comme dans les autres specs. */
const sansAide = (page: Page) => page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));

/** « Paroles » à la barre basse, la ligne touchée, ses paroles changées, puis « Valider » (les paroles, puis la ligne). */
async function retoucherParoles(page: Page, texte: string, changer: (v: string) => string) {
  await page.getByRole("button", { name: "Paroles", exact: true }).click();
  await ligne(page, texte).click();
  const champ = feuille(page).locator("textarea");
  await champ.fill(changer(await champ.inputValue()));
  await feuille(page).getByRole("button", { name: "Valider", exact: true }).click();
  await feuille(page).getByRole("button", { name: "Valider", exact: true }).click();
}

async function ouvrirSetlist(page: Page, qui: FakeProfile, id: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, qui, docs, `/setlists/${id}`);
  await ouvrirPartitions(page);
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  return db;
}

test.describe("le Crayon : fonctions pures (sans page)", () => {
  const base = "a\nb\nc\nd\ne";

  test("rangDansLaCourante : la ligne que la courante a en cet endroit ; rien pour une ligne que j'ai ajoutée", () => {
    const f = fusionner(base, "a\nb\nc\nD\ne", "a\nB\nc\nd\ne\nf", base);
    expect(f.source).toBe("a\nB\nc\nD\ne\nf");
    expect([0, 1, 2, 3, 4, 5].map((n) => rangDansLaCourante(f, n))).toEqual([0, 1, 2, 3, 4, null]);
  });

  test("passerAuCulte : ma ligne prend la place de celle du culte ; mes autres lignes restent à moi", () => {
    const courante = "a\nb\nc\nD\ne";
    const f = fusionner(base, courante, "a\nB\nc\nd\nE", base);
    expect(f.source).toBe("a\nB\nc\nD\nE");
    const nouvelle = passerAuCulte(f, courante, 1)!;
    expect(nouvelle).toBe("a\nB\nc\nD\ne");
    // Réécrite sur la nouvelle couche du culte : la ligne n'est plus « moi », la dernière l'est encore.
    const apres = fusionner(nouvelle, nouvelle, f.source, base);
    expect(apres.origines).toEqual(["origine", "culte", "origine", "culte", "moi"]);
    // Une ligne qui n'est pas de moi ne passe pas.
    expect(passerAuCulte(f, courante, 0)).toBeNull();
    expect(passerAuCulte(f, courante, 3)).toBeNull();
  });
});

test("un musicien sans droit retouche au Crayon : sa partition s'écrit, elle se lit marquée « moi » dans une autre setlist", async ({ page }) => {
  const db = await ouvrirSetlist(page, MUSICIEN, "crayon-a");
  await expect(page.getByRole("button", { name: "Adapter", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ma version", exact: true })).toHaveCount(0);
  await basculerMode(page);
  await expect(page.getByText("Crayon : touche un accord ou un mot pour le retoucher.")).toBeVisible();
  const barre = page.locator("[data-barre-crayon]");
  await expect(barre.getByRole("button")).toHaveText(["Accord", "Paroles", "Ordre", "Terminé"]);
  await expect(barre.getByRole("button", { name: "Accord", exact: true })).toHaveAttribute("aria-pressed", "true");
  await capture(page, "crayon-barre-basse");

  await retoucherParoles(page, "planait", (v) => v.replace("planait", "flottait"));
  // Sans droit sur la setlist : pas de choix, Pour moi directement.
  await expect(page.locator("[data-choix-destination]")).toHaveCount(0);
  await expect(page.getByText("Pour tout le culte", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Passer au culte")).toHaveCount(0);
  await expect(lue(page, "flottait")).toHaveCount(1);
  await expect(page.locator('[data-marque="moi"]', { hasText: "flottait" })).toHaveCount(1);

  const ecrite = db.doc(MA_PARTITION)!;
  expect(ecrite.base).toBe(ABBA);
  expect(ecrite.content).toContain("flottait");
  expect(ecrite.content).not.toContain("planait");
  expect(ecrite).toMatchObject({ ownerUid: MUSICIEN.uid, traits: [], sharedWith: [], sharedTraits: false, key: null });
  expect(db.writes.filter((w) => w.path.startsWith("setlists")), "aucune écriture de setlist").toEqual([]);
  expect(db.writes.filter((w) => w.path.includes("/versions/")), "versions/{uid} n'est plus écrit").toEqual([]);

  // Une autre setlist qui a le même chant : la ligne retouchée s'y lit, marquée « moi ».
  await page.goto("/setlists/crayon-b");
  await ouvrirPartitions(page);
  await expect(page.locator('[data-marque="moi"]', { hasText: "flottait" })).toHaveCount(1);
  await expect(lue(page, "planait")).toHaveCount(0);
});

test("un responsable enregistre « Pour tout le culte » : l'item porte la retouche, les partitions personnelles restent intactes", async ({ page, browser }) => {
  // La partition déposée de la musicienne : une autre ligne retouchée.
  const sienne = { ownerUid: MUSICIEN.uid, ownerName: "Nadège T.", base: ABBA, content: ABBA.replace("Bien a[F#m]vant", "Bien a[F#m]vant tout"), structure: null, key: null, traits: [], sharedWith: [], sharedTraits: false };
  const db = await ouvrirSetlist(page, RESPONSABLE, "crayon-a", { ...DOCS, [MA_PARTITION]: sienne });
  await basculerMode(page);
  await retoucherParoles(page, "planait", (v) => v.replace("planait", "flottait"));

  // Le choix à deux lignes (un responsable), Pour moi par défaut.
  const choix = page.locator("[data-choix-destination]");
  await expect(choix).toBeVisible();
  await expect(choix.getByRole("radio", { name: /^Pour moi/ })).toBeChecked();
  await expect(choix.getByText("Seul toi la vois, dans tous tes cultes.")).toBeVisible();
  await expect(choix.getByText("Pour tout le culte du 21 sept.")).toBeVisible();
  await expect(choix.getByText("Tout le monde la lit.")).toBeVisible();
  await capture(page, "crayon-choix-destination");
  await choisirDestination(page, "culte");

  await expect.poll(() => (db.doc("setlists/crayon-a")!.items as { contentOverride?: string }[])[0].contentOverride ?? "").toContain("flottait");
  expect(db.writes.filter((w) => w.path.startsWith("partitions/")), "aucune partition touchée").toEqual([]);
  expect(db.doc(MA_PARTITION)).toMatchObject({ base: ABBA, content: sienne.content });
  // L'historique s'écrit après la setlist.
  await expect.poll(() => db.list("setlists/crayon-a/history").length, { message: "l'historique de la setlist" }).toBeGreaterThan(0);

  // Chez la musicienne : la ligne du culte se lit marquée « culte », sa propre ligne reste « moi ».
  const { defaultBrowserType: _ignore, ...use } = test.info().project.use as Record<string, unknown>;
  const contexte = await browser.newContext({ ...(use as BrowserContextOptions), baseURL: new URL(page.url()).origin });
  try {
    const autre = await contexte.newPage();
    await signInAs(autre, MUSICIEN, {}, "/setlists/crayon-a", db);
    await ouvrirPartitions(autre);
    await expect(autre.locator('[data-marque="culte"]', { hasText: "flottait" })).toHaveCount(1);
    await expect(autre.locator('[data-marque="moi"]', { hasText: "Bien" })).toHaveCount(1);
  } finally {
    await contexte.close();
  }
});

test("« Passer au culte » : ma ligne rejoint le culte, ma partition suit, mes autres retouches restent", async ({ page }) => {
  const moi = { ownerUid: RESPONSABLE.uid, ownerName: "Corentin V.", base: ABBA, content: ABBA.replace("planait", "flottait").replace("Bien a[F#m]vant", "Bien a[F#m]vant tout"), structure: null, key: null, traits: [], sharedWith: [], sharedTraits: false };
  const db = await ouvrirSetlist(page, RESPONSABLE, "crayon-a", { ...DOCS, [`partitions/${RESPONSABLE.uid}__abba-pere`]: moi });
  // Hors Crayon : pas de lien.
  await expect(page.getByText("Passer au culte")).toHaveCount(0);
  await basculerMode(page);
  const flottait = page.locator('[data-marque="moi"]', { hasText: "flottait" });
  await expect(flottait).toHaveCount(1);
  await capture(page, "crayon-passer-au-culte");
  // Le lien de la ligne « flottait » (la ligne « Bien avant tout », plus haut, a le sien).
  await flottait.locator("xpath=following-sibling::button[1]").click();

  await expect.poll(() => (db.doc("setlists/crayon-a")!.items as { contentOverride?: string }[])[0].contentOverride ?? "").toContain("flottait");
  const partition = () => db.doc(`partitions/${RESPONSABLE.uid}__abba-pere`)!;
  await expect.poll(() => String(partition().base)).toContain("flottait");
  expect(String(partition().content)).toContain("Bien a[F#m]vant tout");
  // La ligne n'est plus « moi » : elle est celle du culte ; l'autre l'est encore.
  await expect(page.locator('[data-marque="moi"]', { hasText: "flottait" })).toHaveCount(0);
  await expect(page.locator('[data-marque="culte"]', { hasText: "flottait" })).toHaveCount(1);
  await expect(page.locator('[data-marque="moi"]', { hasText: "Bien" })).toHaveCount(1);
});

test("page d'un chant (FR) : « Crayon », une retouche Pour moi, sans choix de culte", async ({ page }) => {
  await sansAide(page);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, RESPONSABLE, DOCS, "/songs/abba-pere");
  const crayon = page.getByRole("button", { name: "Crayon", exact: true }).filter({ visible: true }).first();
  await expect(crayon).toBeVisible();
  await crayon.click();
  await expect(page.locator("[data-barre-crayon]").getByRole("button")).toHaveText(["Accord", "Paroles", "Terminé"]);
  await capture(page, "crayon-page-chant");
  await retoucherParoles(page, "planait", (v) => v.replace("planait", "flottait"));
  await expect(page.locator("[data-choix-destination]")).toHaveCount(0);
  await expect(page.locator('[data-marque="moi"]', { hasText: "flottait" })).toHaveCount(1);
  expect(db.doc(`partitions/${RESPONSABLE.uid}__abba-pere`)).toMatchObject({ base: ABBA });
  expect(db.writes.filter((w) => w.path.startsWith("setlists"))).toEqual([]);
});

test("page d'un chant (ZH) : une retouche des paroles garde le pinyin et se lit marquée « moi »", async ({ page }) => {
  await enParoles(page);
  await sansAide(page);
  const db = await signInAs(page, MUSICIEN, DOCS, `/songs/${encodeURIComponent("一生爱你")}`);
  await page.getByRole("button", { name: "Crayon", exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Paroles", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "宝" }).first().click();
  const champ = feuille(page).locator("textarea");
  await champ.fill((await champ.inputValue()).replace("宝贵", "珍贵"));
  await feuille(page).getByLabel("Pinyin").fill("qīn ài de zhēn guì yē sū nǐ ài hé děng de gān tián");
  await feuille(page).getByRole("button", { name: "Valider", exact: true }).click();
  await feuille(page).getByRole("button", { name: "Valider", exact: true }).click();
  await expect(page.locator('[data-marque="moi"]', { hasText: "珍贵" })).toHaveCount(1);
  expect(String(db.doc(`partitions/${MUSICIEN.uid}__一生爱你`)!.content)).toContain("珍");
});
