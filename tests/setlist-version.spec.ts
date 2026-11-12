import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage } from "./helpers/louange";
import { enDeuxVolets, ouvrirAffichage, ouvrirListe, ouvrirPartitions, ouvrirSommaire } from "./helpers/setlist";
import { verifierPuce } from "./helpers/puce";
import { basculerMode, choisirDestination } from "./helpers/menuSetlist";

// Version perso d'un chant dans une setlist (docs/spec-version-perso.md).
// V1 : « Ma version » — accords et paroles retouchés pour soi, sans toucher la setlist de la présidence ; jouée en
// mode louange. MP-3 : la retouche passe par le Crayon (« Pour moi ») et s'écrit dans `partitions/{uid}__{slug}` ;
// les anciens documents `versions/{uid}` restent lisibles (menu « Je lis », groupe « Dans cette setlist »).

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-perso";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const VERSION_DOC = `setlists/${SETLIST_ID}/versions/${MUSICIEN.uid}`;
const PARTITION_ABBA = `partitions/${MUSICIEN.uid}__abba-pere`;
const PARTITION_ZH = `partitions/${MUSICIEN.uid}__一生爱你`;
const SOURCE_ABBA = readFileSync("content/songs/abba-pere.cho", "utf8");
/** Ma partition au nouveau rangement : le texte retouché, sur le chant d'origine. */
const maPartition = (content: string | null, structure: string[] | null = null) => ({
  ownerUid: MUSICIEN.uid, ownerName: "Ruth K.", base: SOURCE_ABBA, content, structure, key: null, traits: [], sharedWith: [], sharedTraits: false,
});

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

const SETLIST = {
  title: "Culte du 21 septembre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-09-21",
  language: "mixed",
  notes: "",
  // SC1 (docs/spec-createur-corbeille-absences.md) : seul le créateur modifie — la setlist est la sienne.
  ownerId: "uid-musicien",
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1 }),
    item({ songSlug: "一生爱你", position: 2 }),
  ],
};

/** Ma version d'Abba Père : « planait » devient « flottait » (couplet 1). */
const MY_ABBA = readFileSync("content/songs/abba-pere.cho", "utf8").replace("planait sur la", "flottait sur la");

const myDoc = (items: Record<string, unknown>) => ({
  authorUid: MUSICIEN.uid,
  authorName: "Ruth K.",
  items,
  choices: {},
});

const lyricLine = (page: Page, text: string) => page.locator("[data-copy-line]", { hasText: text });
/** Page affichée du mode louange, sans la copie invisible qui sert à mesurer. */
const onStage = (page: Page, text: string) =>
  page.locator("[data-performance-mode] [data-copy-line]:not([aria-hidden=true] *)", { hasText: text });
const song = (page: Page, position: number) => page.locator(`[data-outline-item="${position}"]`);
/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

/** 一生爱你 a un scan, affiché par défaut : les tests du chant chinois lisent
 *  ses paroles (préférence de l'appareil réglée sur Paroles). */
const enParoles = (page: Page) => page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));

async function openPartitions(page: Page, extraDocs: Record<string, Record<string, unknown>> = {}, who: FakeProfile = MUSICIEN) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  const db = await signInAs(page, who, { [SETLIST_DOC]: SETLIST, ...extraDocs }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.getByRole("heading", { name: "Abba Père" })).toBeVisible();
  return db;
}

/** Supprime une ligne au Crayon, pour moi (la musicienne règle la setlist : « Enregistrer » lui demande où). */
async function deleteLine(page: Page, text: string | RegExp) {
  await page.getByRole("button").filter({ hasText: text }).first().click();
  await page.getByRole("button", { name: "Supprimer la ligne" }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await choisirDestination(page, "moi");
}

test("Crayon, pour moi : retoucher une ligne écrit dans ma partition, jamais dans la setlist", async ({ page }) => {
  const db = await openPartitions(page);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await basculerMode(page);
  await expect(page.getByText("Crayon : touche un accord ou un mot pour le retoucher.")).toBeVisible();
  await capture(page, "v1-mode-ma-version");
  await deleteLine(page, "planait");

  await capture(page, "v1-apres-retouche");
  await expect(lyricLine(page, "planait")).toHaveCount(0);
  await expect(lyricLine(page, "le chant qui")).toHaveCount(1);

  const mine = db.doc(PARTITION_ABBA)!;
  expect(String(mine.content)).toContain("Bien a[F#m]vant le chant");
  expect(String(mine.content)).not.toContain("planait");
  expect(mine.base).toBe(SOURCE_ABBA);
  expect(db.writes.filter((w) => w.path === VERSION_DOC), "versions/{uid} n'est plus écrit").toHaveLength(0);
  expect(db.writes.filter((w) => w.path === SETLIST_DOC || w.path.startsWith(`${SETLIST_DOC}/history`)), "la setlist et son historique ne bougent pas").toHaveLength(0);
});

test("ma version s'affiche dans la vue partitions et se joue en mode louange", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(lyricLine(page, "planait")).toHaveCount(0);
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toBeVisible();
  await expect(song(page, 2).getByText("Ma version", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(onStage(page, "flottait").first()).toBeVisible();
  await expect(onStage(page, "planait")).toHaveCount(0);
  await capture(page, "v1-mode-louange");
});

test("revenir à la présidence vide ma partition de ce chant", async ({ page }) => {
  const db = await openPartitions(page, { [PARTITION_ABBA]: maPartition(MY_ABBA) });
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await basculerMode(page);
  await page.getByRole("button", { name: "Revenir à la présidence" }).click();
  await capture(page, "v1-revenir-presidence");
  await page.getByRole("button", { name: "Rétablir", exact: true }).click();

  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect.poll(() => db.doc(PARTITION_ABBA)?.content).toBeNull();
  expect(db.doc(PARTITION_ABBA)).toMatchObject({ content: null, structure: null });
  expect(db.writes.filter((w) => w.path === SETLIST_DOC)).toHaveLength(0);
});

test("au Crayon, je retouche ce que je lis : ma version d'abord", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await basculerMode(page);
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(lyricLine(page, "planait")).toHaveCount(0);
});

test("chant chinois : ma partition garde les caractères et le pinyin des autres lignes", async ({ page }) => {
  await enParoles(page);
  const db = await openPartitions(page);
  await basculerMode(page);
  await deleteLine(page, "宝");

  await song(page, 2).scrollIntoViewIfNeeded();
  await capture(page, "v1-zh");
  await expect(lyricLine(page, "宝")).toHaveCount(0);
  await expect(page.locator("span").filter({ hasText: /^wǒ$/ }).first()).toBeVisible();
  const mine = db.doc(PARTITION_ZH)!;
  expect(String(mine.content)).not.toContain("宝贵");
  expect(String(mine.content)).toContain("wǒ de xīn shēn shēn");
  expect(db.doc(PARTITION_ABBA)).toBeUndefined();
});

// ── V2 : ma structure (quelles sections voir, dans quel ordre) ────────────────

/** Ma structure d'Abba Père : C1 R P, une fois chacune. */
const MY_STRUCTURE = ["verse-2", "chorus-3", "bridge-6"];
const strip = (page: Page, position: number) => song(page, position).locator("ol abbr");
const bodySections = (page: Page, position: number) => song(page, position).locator("[data-section]");
/** Pastilles d'un chant du Sommaire : seulement en deux volets (ordinateur, tablette
 *  couchée ; docs/spec-deux-volets.md, Q6). */
const pastilles = (page: Page, position: number) =>
  page.getByRole("navigation", { name: "Sommaire" }).locator(`[data-sommaire="${position}"] [data-pastille]`);

test("ma structure : le corps la suit, le bandeau, le sommaire et la liste restent cohérents", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false } }),
  });
  await expect(bodySections(page, 1)).toHaveCount(3);
  await expect(bodySections(page, 1).nth(0)).toContainText("Couplet 1");
  await expect(bodySections(page, 1).nth(1)).toContainText("Refrain");
  await expect(bodySections(page, 1).nth(2)).toContainText("Pont");
  await expect(strip(page, 1), "le bandeau garde la structure de la présidence").toHaveText(["I", "C1", "R", "Int", "C2", "P"]);
  const deuxVolets = await enDeuxVolets(page);
  if (deuxVolets) {
    await ouvrirSommaire(page);
    await expect(pastilles(page, 1), "le sommaire suit ce qui est affiché").toHaveText(["C1", "R", "P"]);
  }
  await capture(page, "v2-ma-structure");
  if (deuxVolets) return; // pas de vue liste en deux volets

  await ouvrirListe(page);
  // 5C1 (20/09/2026) : la liste écrit la structure en abrégé — l'interlude de la présidence y est « Int ».
  await expect(page.getByRole("listitem").filter({ hasText: "Abba Père" }).first(), "la vue liste garde la présidence").toContainText("Int");
});

test("« Ordre » enregistre ma structure dans ma partition sans toucher la setlist", async ({ page }) => {
  const db = await openPartitions(page);
  await expect(bodySections(page, 1)).toHaveCount(6);
  await basculerMode(page);
  await page.locator("[data-barre-crayon]").getByRole("button", { name: "Ordre", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Sections" });
  await expect(sheet).toBeVisible();
  await capture(page, "v2-feuille-sections");
  // Retirer « Interlude » : dernier bouton de sa ligne (corbeille).
  await sheet.locator("span", { hasText: /^Interlude$/ }).locator("..").locator("button").last().click();
  await sheet.getByRole("button", { name: "Enregistrer" }).click();

  await expect(sheet).toBeHidden();
  await expect(bodySections(page, 1)).toHaveCount(5);
  await expect(song(page, 1).getByText("Interlude")).toHaveCount(0);
  const mine = db.doc(PARTITION_ABBA)!;
  expect(mine.structure).toEqual(["intro-1", "verse-2", "chorus-3", "verse-5", "bridge-6"]);
  expect(mine.content).toBeNull();
  expect(db.writes.filter((w) => w.path === SETLIST_DOC)).toHaveLength(0);
});

test("« Réinitialiser » dans la feuille revient à la structure de la présidence", async ({ page }) => {
  const db = await openPartitions(page, { [PARTITION_ABBA]: maPartition(null, MY_STRUCTURE) });
  await basculerMode(page);
  await page.locator("[data-barre-crayon]").getByRole("button", { name: "Ordre", exact: true }).click();
  await page.getByRole("dialog", { name: "Sections" }).getByRole("button", { name: "Réinitialiser" }).click();

  await expect(bodySections(page, 1)).toHaveCount(6);
  await expect.poll(() => db.doc(PARTITION_ABBA)?.structure).toBeNull();
});

test("« Structure seule » masque le corps même avec ma structure", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false } }),
  });
  await ouvrirAffichage(page);
  await page.getByRole("menuitemradio", { name: "Structure seule" }).click();
  await expect(bodySections(page, 1)).toHaveCount(0);
  await expect(strip(page, 1)).toHaveText(["I", "C1", "R", "Int", "C2", "P"]);
});

test("mode louange : ma structure, sans les notes d'occurrence de la présidence", async ({ page }) => {
  const withNote = {
    ...SETLIST,
    items: [item({ songSlug: "abba-pere", position: 1, sectionNotes: { "verse-2": "doucement" } }), SETLIST.items[1]],
  };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, MUSICIEN, {
    [SETLIST_DOC]: withNote,
    [VERSION_DOC]: myDoc({ "abba-pere": { content: null, structure: MY_STRUCTURE, shared: false } }),
  }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(bodySections(page, 1)).toHaveCount(3);
  await expect(song(page, 1).getByText("doucement"), "la note reste dans le bandeau, pas dans le corps").toHaveCount(1);
  await expect(bodySections(page, 1).getByText("doucement")).toHaveCount(0);

  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  const stage = page.locator("[data-performance-mode] [data-section]:not([aria-hidden=true] *)");
  await expect(stage.first()).toContainText("Couplet 1");
  await expect(page.locator("[data-performance-mode]").getByText("Interlude")).toHaveCount(0);
  await capture(page, "v2-mode-louange");
});

test("chant chinois : ma structure ne garde que le refrain, avec son pinyin", async ({ page }) => {
  await enParoles(page);
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "一生爱你": { content: null, structure: ["chorus-3"], shared: false } }),
  });
  await expect(bodySections(page, 2)).toHaveCount(1);
  await expect(bodySections(page, 2).first()).toContainText("Refrain");
  await expect(song(page, 2).locator("span").filter({ hasText: /^yī$/ }).first()).toBeVisible();
  await expect(lyricLine(page, "宝")).toHaveCount(0);
  await expect(strip(page, 2)).toHaveText(["I", "C", "R"]);
  await song(page, 2).scrollIntoViewIfNeeded();
  await capture(page, "v2-zh");
});

// ── V3 : partager ma version, choisir celle d'un autre ────────────────────────

const CHRISTELLE: FakeProfile = {
  uid: "uid-christelle",
  email: "christelle@example.com",
  firstName: "Christelle",
  lastName: "Durand",
  planningName: "Christelle D.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const CHRISTELLE_DOC = `setlists/${SETLIST_ID}/versions/${CHRISTELLE.uid}`;
/** La version de Ruth (« flottait »), partagée. */
const RUTH_SHARED = myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: true } });
/** Version de Ruth de 一生爱你 : première ligne du couplet (et son pinyin) retirée.
 *  Le filtre lit les paroles sans accords : la partition pose A dans « 宝[A]贵 ». */
const MY_ZH = readFileSync("content/songs/一生爱你.cho", "utf8")
  .split("\n")
  .filter((l) => !l.replace(/\[[^\]]*\]/g, "").includes("宝贵") && !l.startsWith("qīn ài de bǎo guì"))
  .join("\n");
// Le choix de partition est le menu « Je lis » (MP-2) : le déclencheur se nomme « Je lis : <choix> », le panneau est dans le portail de la page.
const versionSelect = (page: Page, position: number) => song(page, position).getByRole("button", { name: /^Je lis : / });
const choisirVersion = async (page: Page, position: number, libelle: string) => {
  await versionSelect(page, position).click();
  await page.getByRole("menuitemradio", { name: libelle, exact: true }).click();
};
const copyButton = (page: Page, position: number) => song(page, position).getByRole("button", { name: "Copier les paroles" });

test("une version partagée se choisit, et le choix suit mon compte jusqu'en mode louange", async ({ page }) => {
  const db = await openPartitions(page, { [VERSION_DOC]: RUTH_SHARED }, CHRISTELLE);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(versionSelect(page, 1)).toHaveAccessibleName("Je lis : Le chant d'origine");
  await expect(versionSelect(page, 2), "pas d'alternative sur le second chant").toHaveCount(0);
  await choisirVersion(page, 1, "Version de Ruth K.");

  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(song(page, 1).getByText("Version de Ruth K.", { exact: true })).toBeVisible();
  await expect(copyButton(page, 1), "pas de copie des paroles hors présidence").toHaveCount(0);
  await capture(page, "v3-version-choisie");
  const last = db.writes.filter((w) => w.path === CHRISTELLE_DOC).pop()!;
  expect(last.data.choices).toEqual({ "abba-pere": MUSICIEN.uid });
  expect(last.data.authorUid).toBe(CHRISTELLE.uid);
  expect(db.writes.filter((w) => w.path === SETLIST_DOC)).toHaveLength(0);

  await page.reload();
  await ouvrirPartitions(page);
  await expect(lyricLine(page, "flottait"), "le choix est retrouvé au rechargement").toHaveCount(1);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(onStage(page, "flottait").first()).toBeVisible();
});

test("au Crayon, « Revenir à la présidence » est une puce de 32 px, 12 px au moins, zone de toucher de 44 px (dimanche-17)", async ({ page }, info) => {
  await openPartitions(page, { [PARTITION_ABBA]: maPartition(MY_ABBA) });
  await basculerMode(page);
  await verifierPuce(song(page, 1).getByRole("button", { name: "Revenir à la présidence" }), info);
});

test("une version non partagée n'est proposée à personne", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  }, CHRISTELLE);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(versionSelect(page, 1)).toHaveCount(0);
  await expect(song(page, 1).getByText(/Version de/)).toHaveCount(0);
});

test("un choix vers une version retirée du partage revient à la présidence", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
    [CHRISTELLE_DOC]: { authorUid: CHRISTELLE.uid, authorName: "Christelle D.", items: {}, choices: { "abba-pere": MUSICIEN.uid } },
  }, CHRISTELLE);
  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(lyricLine(page, "flottait")).toHaveCount(0);
  await expect(song(page, 1).getByText(/Version de/)).toHaveCount(0);
});

test("choisir « Présidence » alors que j'ai ma version, sans la perdre", async ({ page }) => {
  const db = await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "abba-pere": { content: MY_ABBA, structure: null, shared: false } }),
  });
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(versionSelect(page, 1)).toHaveAccessibleName("Je lis : Ma version");
  await choisirVersion(page, 1, "Le chant d'origine");

  await expect(lyricLine(page, "planait")).toHaveCount(1);
  await expect(song(page, 1).getByText("Ma version", { exact: true })).toHaveCount(0);
  // L'écriture du choix suit l'affichage (MP-2) : on l'attend.
  await expect.poll(() => db.writes.filter((w) => w.path === VERSION_DOC).length).toBeGreaterThan(0);
  const last = db.writes.filter((w) => w.path === VERSION_DOC).pop()!;
  expect(last.data.choices).toEqual({ "abba-pere": "presidence" });
  expect(Object.keys(last.data.items as object)).toEqual(["abba-pere"]);
});

test("chant chinois : la version partagée de Ruth, avec son pinyin", async ({ page }) => {
  await enParoles(page);
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({ "一生爱你": { content: MY_ZH, structure: null, shared: true } }),
  }, CHRISTELLE);
  await expect(lyricLine(page, "宝")).toHaveCount(1);
  await choisirVersion(page, 2, "Version de Ruth K.");
  await expect(lyricLine(page, "宝")).toHaveCount(0);
  await expect(song(page, 2).locator("span").filter({ hasText: /^wǒ$/ }).first()).toBeVisible();
  await expect(song(page, 2).getByText("Version de Ruth K.", { exact: true })).toBeVisible();
  await song(page, 2).scrollIntoViewIfNeeded();
  await capture(page, "v3-zh");
});

test("« Copier les paroles » n'existe que si je suis la setlist de la présidence", async ({ page }) => {
  await openPartitions(page, {
    [VERSION_DOC]: myDoc({
      "abba-pere": { content: MY_ABBA, structure: null, shared: false },
      "一生爱你": { content: null, structure: ["chorus-3"], shared: false },
    }),
  });
  await expect(copyButton(page, 1), "ma version d'accords et paroles").toHaveCount(0);
  await expect(copyButton(page, 2), "ma structure").toHaveCount(0);
  await choisirVersion(page, 1, "Le chant d'origine");
  await expect(copyButton(page, 1), "de retour sur la présidence").toHaveCount(1);
  await expect(copyButton(page, 2)).toHaveCount(0);
});
