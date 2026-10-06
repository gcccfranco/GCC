import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot U4 bis, tranche B7 — la Réception en grand (docs/spec-pages-en-grand.md, Q15 ; planches
// `bo-reception-*`). Back-Office › Messages › Réception. En grand (ordinateur, iPad paysage) : la
// liste à gauche avec les filtres « Tout · Signalements · Propositions », le message à droite
// (« Marquer traité », supprimer ; « Refuser » pour une proposition) ; sans message choisi, le
// premier signalement en attente (Q3). Tablette portrait : les deux cartes côte à côte.
// Téléphone : les filtres, la liste filtrée, le message qui se déplie dessous. Firestore simulé ;
// personnes fictives.

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };

const DOCS = {
  "reports/r1": {
    kind: "song", title: "Problème avec : Hosanna", status: "pending", createdAt: new Date("2026-10-02T10:00:00Z"),
    description: "Au refrain, la partition met Bm7 à la fin de la 2e ligne, mais à l'église on joue A.",
    songSlug: "hosanna", songTitle: "Hosanna", pageUrl: "https://example.com/songs/hosanna",
    authorName: "Léa M.", authorId: "uid-lea", authorEmail: "lea@example.com",
  },
  "reports/r2": {
    kind: "site", title: "Le planning ne s'affiche pas sur l'iPad", status: "pending", createdAt: new Date("2026-09-30T10:00:00Z"),
    description: "Page blanche après la connexion.", songSlug: "", songTitle: "", pageUrl: "",
    authorName: "Noé T.", authorId: "uid-noe", authorEmail: "noe@example.com",
  },
  "reports/r3": {
    kind: "site", title: "Lien mort sur le guide", status: "resolved", createdAt: new Date("2026-09-20T10:00:00Z"),
    description: "", songSlug: "", songTitle: "", pageUrl: "", authorName: "Inès V.", authorId: "uid-ines", authorEmail: "",
  },
  "songProposals/p1": {
    title: "Tu es fidèle", youtubeUrl: "https://example.com/video", pdfUrl: "https://example.com/partition.pdf",
    status: "pending", createdAt: new Date("2026-09-29T10:00:00Z"), authorName: "Inès V.", authorId: "uid-ines",
  },
  "songProposals/p2": {
    title: "Un chant déjà ajouté", youtubeUrl: "https://example.com/v2", pdfUrl: "",
    status: "accepted", createdAt: new Date("2026-09-10T10:00:00Z"), authorName: "Noé T.", authorId: "uid-noe",
  },
};

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand"; // ordinateur (1 280 px), ordinateur-1440, tablette-paysage
}

async function ouvrir(page: Page, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-03T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, ADMIN, docs, "/back-office/messages");
  await expect(page.getByRole("heading", { name: "Signalements" }).first()).toBeVisible();
  return db;
}

const filtres = (page: Page) => page.getByRole("group", { name: "Filtrer les messages" });
const liste = (page: Page) => page.locator('[data-volet="liste"]');
const message = (page: Page) => page.getByRole("region", { name: "Message" });
const ligne = (page: Page, titre: string) => page.getByRole("button", { name: new RegExp(titre) });

const pasDeDefilementHorizontal = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

// ─── En grand : la liste et le message ───────────────────────────────────────

test.describe("Réception en grand (ordinateur, iPad paysage)", () => {
  test.beforeEach(({}, info) => test.skip(disposition(info) !== "grand", "propre aux grands écrans"));

  test("la liste à gauche, le premier signalement en attente à droite (Q3)", async ({ page }) => {
    await ouvrir(page);
    await expect(filtres(page).getByRole("button")).toHaveText(["Tout", "Signalements", "Propositions"]);
    await expect(filtres(page).getByRole("button", { name: "Tout" })).toHaveAttribute("aria-pressed", "true");
    await expect(liste(page).getByRole("heading", { name: "Signalements" })).toBeVisible();
    await expect(liste(page).getByRole("heading", { name: "Propositions de chants" })).toBeVisible();
    await expect(liste(page).getByText("2 en attente")).toBeVisible();
    await expect(liste(page).getByText("1 en attente")).toBeVisible();
    // Les traités restent repliés.
    await expect(liste(page).getByText("Lien mort sur le guide")).toHaveCount(0);
    await expect(liste(page).getByRole("button", { name: "Voir les traités (1)" })).toHaveCount(2);

    const m = message(page);
    await expect(m.getByRole("heading", { level: 2 })).toHaveText("Problème avec : Hosanna");
    await expect(m).toContainText("Léa M.");
    await expect(m).toContainText("Au refrain, la partition met Bm7");
    await expect(m.getByRole("link", { name: "Hosanna" })).toHaveAttribute("href", /\/songs\/hosanna/);
    await expect(m.getByRole("link", { name: "Page" })).toBeVisible();
    await expect(m.getByRole("button", { name: "Marquer traité" })).toBeVisible();
    await expect(m.getByRole("button", { name: "Supprimer le signalement" })).toBeVisible();
    await expect(ligne(page, "Problème avec : Hosanna")).toHaveAttribute("aria-current", "true");

    // Liste et message côte à côte.
    const g = (await liste(page).boundingBox())!;
    const d = (await m.boundingBox())!;
    expect(d.x).toBeGreaterThanOrEqual(g.x + g.width - 1);
    await pasDeDefilementHorizontal(page);
  });

  test("toucher un message l'ouvre à droite ; « Marquer traité » l'enregistre", async ({ page }) => {
    const db = await ouvrir(page);
    await ligne(page, "Le planning ne s'affiche pas").click();
    await expect(message(page).getByRole("heading", { level: 2 })).toHaveText("Le planning ne s'affiche pas sur l'iPad");
    await expect(message(page)).toContainText("Page blanche après la connexion.");
    await expect(ligne(page, "Le planning ne s'affiche pas")).toHaveAttribute("aria-current", "true");
    await expect(ligne(page, "Problème avec : Hosanna")).not.toHaveAttribute("aria-current", "true");

    await message(page).getByRole("button", { name: "Marquer traité" }).click();
    await expect.poll(() => db.doc("reports/r2")?.status).toBe("resolved");
    // Le message reste ouvert, traité ; il quitte les « en attente ».
    await expect(message(page).getByRole("button", { name: "Rouvrir" })).toBeVisible();
    await expect(liste(page).getByText("1 en attente")).toHaveCount(2);
  });

  test("filtre « Propositions » : les propositions seules, la première à droite ; « Refuser »", async ({ page }) => {
    const db = await ouvrir(page);
    await filtres(page).getByRole("button", { name: "Propositions" }).click();
    await expect(filtres(page).getByRole("button", { name: "Propositions" })).toHaveAttribute("aria-pressed", "true");
    await expect(liste(page).getByRole("heading", { name: "Signalements" })).toHaveCount(0);
    await expect(liste(page).getByRole("heading", { name: "Propositions de chants" })).toBeVisible();

    const m = message(page);
    await expect(m.getByRole("heading", { level: 2 })).toHaveText("Tu es fidèle");
    await expect(m).toContainText("Proposé par Inès V.");
    await expect(m.getByRole("link", { name: /YouTube/ })).toHaveAttribute("href", "https://example.com/video");
    await expect(m.getByRole("link", { name: /Partition PDF/ })).toBeVisible();
    await m.getByRole("button", { name: "Refuser" }).click();
    await expect.poll(() => db.doc("songProposals/p1")?.status).toBe("rejected");
    await expect(m.getByText("Refusé")).toBeVisible();
  });

  test("filtre « Signalements » : sans les propositions", async ({ page }) => {
    await ouvrir(page);
    await filtres(page).getByRole("button", { name: "Signalements" }).click();
    await expect(liste(page).getByRole("heading", { name: "Propositions de chants" })).toHaveCount(0);
    await expect(liste(page).getByRole("heading", { name: "Signalements" })).toBeVisible();
    await expect(message(page).getByRole("heading", { level: 2 })).toHaveText("Problème avec : Hosanna");
  });

  test("« Voir les traités » les montre ; supprimer passe au suivant", async ({ page }) => {
    const db = await ouvrir(page);
    // Le bouton du groupe Signalements (`first()` prenait celui des Propositions quand les
    // signalements arrivaient après elles).
    await liste(page).getByRole("region", { name: "Signalements" }).getByRole("button", { name: "Voir les traités (1)" }).click();
    await ligne(page, "Lien mort sur le guide").click();
    await expect(message(page).getByRole("heading", { level: 2 })).toHaveText("Lien mort sur le guide");
    await expect(message(page).getByRole("button", { name: "Rouvrir" })).toBeVisible();

    await message(page).getByRole("button", { name: "Supprimer le signalement" }).click();
    await expect.poll(() => db.doc("reports/r3")).toBeUndefined();
    await expect(ligne(page, "Lien mort sur le guide")).toHaveCount(0);
    await expect(message(page).getByRole("heading", { level: 2 })).toHaveText("Problème avec : Hosanna");
  });

  test("rien en attente : le volet de droite le dit", async ({ page }) => {
    await ouvrir(page, { "reports/r3": DOCS["reports/r3"] });
    await expect(message(page)).toContainText("Aucun message en attente.");
  });
});

// ─── Tablette portrait : deux cartes côte à côte ─────────────────────────────

test("tablette : les deux cartes côte à côte, un message se déplie dans sa carte", async ({ page }, info) => {
  test.skip(disposition(info) !== "tablette", "propre à la tablette portrait");
  await ouvrir(page);
  await expect(liste(page)).toHaveCount(0);
  await expect(filtres(page)).toHaveCount(0);
  const signalements = page.getByRole("region", { name: "Signalements" });
  const propositions = page.getByRole("region", { name: "Propositions de chants" });
  const a = (await signalements.boundingBox())!;
  const b = (await propositions.boundingBox())!;
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);

  const r1 = ligne(page, "Problème avec : Hosanna");
  await expect(r1).toHaveAttribute("aria-expanded", "false");
  await r1.click();
  await expect(r1).toHaveAttribute("aria-expanded", "true");
  await expect(signalements).toContainText("Au refrain, la partition met Bm7");
  await expect(signalements.getByRole("button", { name: "Marquer traité" })).toBeVisible();
  await pasDeDefilementHorizontal(page);
});

// ─── Téléphone : la liste filtrée puis le message ────────────────────────────

test("téléphone : les filtres, la liste filtrée, le message qui se déplie", async ({ page }, info) => {
  test.skip(disposition(info) !== "telephone", "propre au téléphone");
  const db = await ouvrir(page);
  await expect(liste(page)).toHaveCount(0);
  await expect(filtres(page).getByRole("button")).toHaveText(["Tout", "Signalements", "Propositions"]);
  await expect(page.getByRole("heading", { name: "Propositions de chants" })).toBeVisible();

  const r1 = ligne(page, "Problème avec : Hosanna");
  await r1.click();
  await expect(r1).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Au refrain, la partition met Bm7")).toBeVisible();
  await page.getByRole("button", { name: "Marquer traité" }).click();
  await expect.poll(() => db.doc("reports/r1")?.status).toBe("resolved");

  await filtres(page).getByRole("button", { name: "Propositions" }).click();
  await expect(page.getByRole("heading", { name: "Signalements" })).toHaveCount(0);
  await expect(ligne(page, "Tu es fidèle")).toBeVisible();
  await pasDeDefilementHorizontal(page);
});

// ─── 中文 ─────────────────────────────────────────────────────────────────────

test("en 中文 : les filtres et les titres traduits", async ({ page }, info) => {
  test.skip(disposition(info) === "tablette", "pas de filtres sur la tablette portrait");
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-03T10:00:00"));
  await signInAs(page, ADMIN, DOCS, "/back-office/messages");
  await expect(page.getByRole("group", { name: "筛选消息" }).getByRole("button")).toHaveText(["全部", "问题反馈", "诗歌推荐"]);
  await expect(page.getByRole("heading", { name: "问题反馈" }).first()).toBeVisible();
});

// ─── Captures, regardées à l'œil ─────────────────────────────────────────────

test("captures : la Réception", async ({ page }, info) => {
  await ouvrir(page);
  if (disposition(info) === "telephone") await ligne(page, "Problème avec : Hosanna").click();
  if (disposition(info) === "tablette") await ligne(page, "Problème avec : Hosanna").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `test-results/pages-en-grand-captures/b7-reception-${info.project.name}.png` });
});
