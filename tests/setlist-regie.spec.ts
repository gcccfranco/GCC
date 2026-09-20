import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { isOnDutyRegie, parsePresentationUrl } from "../src/lib/setlist/presentationLink";
import type { Servant } from "../src/lib/planning/names";

// Chantier Régie (docs/spec-regie.md) : ce dont la régie se sert avant le
// culte, sur ordinateur, depuis la vue partitions de la setlist.
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const SETLIST_ID = "setlist-regie";
const REGIE: FakeProfile = {
  uid: "uid-regie",
  email: "regie@example.com",
  planningName: "Test R.",
  serviceRoles: { "Culte Francophone": ["regie"] },
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

function setlist(over: Record<string, unknown> = {}) {
  return {
    title: "Culte du 14 septembre",
    leader: "Présidence",
    category: "Culte Francophone",
    date: "2026-09-14",
    language: "mixed",
    notes: "",
    ownerId: "uid-owner",
    isPrivate: false,
    items: [
      // FR : couplet puis refrain repris deux fois.
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"] }),
      // ZH affiché sur son scan 简谱 : la copie ne dépend pas de l'écran.
      item({ songSlug: "一生爱你", position: 2, jianpuSheet: true, structureOverride: ["verse-2-0", "chorus-3-1"] }),
    ],
    ...over,
  };
}

async function openPartitions(page: Page, profile = REGIE, data = setlist()) {
  await signInAs(page, profile, { [`setlists/${SETLIST_ID}`]: data }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
}

test("bouton « Copier les paroles » : ordre joué, reprises comprises, ligne vide entre sections (FR)", async ({ page }) => {
  await openPartitions(page);
  await page.getByRole("button", { name: "Copier les paroles" }).first().click();
  const refrain = [
    "Abba Père, je suis à Toi, Abba Père, je suis à Toi,",
    "Abba Père, je suis à Toi, Abba Père, je suis à Toi.",
  ];
  const text = await page.evaluate(() => navigator.clipboard.readText());
  const blocks = text.split("\n\n");
  expect(blocks[0].split("\n")[0]).toBe("Bien avant le chant qui créa l'univers,");
  expect(text, "pas de nom de section").not.toMatch(/Couplet|Refrain/);
  expect(text, "pas d'accord").not.toMatch(/F#m/);
  // Le couplet a deux strophes : elles restent séparées par une ligne vide.
  expect(blocks.slice(-2), "le refrain repris est copié deux fois").toEqual([refrain.join("\n"), refrain.join("\n")]);
  await expect(page.getByRole("button", { name: "Copié" })).toBeVisible();
});

test.describe("déroulé", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("sur ordinateur, le sommaire liste chants et sections et y amène au clic", async ({ page }) => {
    await openPartitions(page);
    const outline = page.getByRole("navigation", { name: "Déroulé" });
    await expect(outline).toBeVisible();
    await expect(outline.getByRole("button", { name: /Abba Père/ })).toBeVisible();
    await expect(outline.getByRole("button", { name: /一生爱你/ })).toBeVisible();
    await expect(outline.getByRole("button", { name: "Refrain ×2" })).toBeVisible();

    // Aller au 2ᵉ chant : son en-tête vient se placer sous la barre d'outils.
    await outline.getByRole("button", { name: /一生爱你/ }).click();
    const song2 = page.locator('[data-outline-item="2"]');
    await expect.poll(async () => (await song2.boundingBox())!.y).toBeLessThan(250);
    await expect(outline.getByRole("button", { name: /一生爱你/ })).toHaveAttribute("aria-current", "true");

    // Retour à une section précise du 1ᵉʳ chant.
    await outline.getByRole("button", { name: "Refrain ×2" }).click();
    const refrain = page.locator('[data-outline-item="1"] [data-section]').nth(1);
    await expect.poll(async () => (await refrain.boundingBox())!.y).toBeLessThan(250);
  });
});

test("sur tablette, pas de sommaire latéral", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openPartitions(page);
  await expect(page.locator('[data-section]').first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Déroulé" })).toBeHidden();
});

test("bouton « Copier les paroles » : caractères puis pinyin, même sur un scan 简谱 (ZH)", async ({ page }) => {
  await openPartitions(page);
  await page.getByRole("button", { name: "Copier les paroles" }).nth(1).click();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n").slice(0, 2)).toEqual([
    "亲爱的宝贵耶稣，你爱何等的甘甜，",
    "qīn ài de bǎo guì yē sū nǐ ài hé děng de gān tián",
  ]);
  expect(text).toContain("\n\n一生爱你，一生敬拜你，一生爱你，一生荣耀你，\nyī shēng ài nǐ");
});

test.describe("lien de présentation", () => {
  const API = "**/api/setlist/presentation";
  const CANVA = "https://www.canva.com/design/DAG123/view";

  test("tout membre qui voit la setlist ouvre la présentation, sans pouvoir la changer", async ({ page }) => {
    const choriste: FakeProfile = { uid: "uid-ch", email: "ch@example.com", serviceRoles: { "Culte Francophone": ["chanteur"] } };
    await signInAs(page, choriste, { [`setlists/${SETLIST_ID}`]: setlist({ presentationUrl: CANVA }) }, `/setlists/${SETLIST_ID}`);
    const link = page.getByRole("link", { name: "Présentation" });
    await expect(link).toHaveAttribute("href", CANVA);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("button", { name: /lien/ })).toHaveCount(0);
  });

  test("un lien non https glissé dans la setlist n'est jamais affiché", async ({ page }) => {
    const choriste: FakeProfile = { uid: "uid-ch", email: "ch@example.com", serviceRoles: { "Culte Francophone": ["chanteur"] } };
    await signInAs(page, choriste, { [`setlists/${SETLIST_ID}`]: setlist({ presentationUrl: "javascript:alert(1)" }) }, `/setlists/${SETLIST_ID}`);
    await expect(page.getByRole("heading", { name: "Culte du 14 septembre" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Présentation" })).toHaveCount(0);
  });

  test("la régie ajoute le lien : envoyé au serveur avec son jeton, puis affiché", async ({ page }) => {
    await signInAs(page, REGIE, { [`setlists/${SETLIST_ID}`]: setlist() }, `/setlists/${SETLIST_ID}`);
    let sent: { body: unknown; auth: string | undefined } | null = null;
    await page.route(API, (route) => {
      sent = { body: route.request().postDataJSON(), auth: route.request().headers()["authorization"] };
      return route.fulfill({ json: { ok: true, presentationUrl: CANVA } });
    });
    await page.getByRole("button", { name: "Ajouter le lien de la présentation" }).click();
    const input = page.getByRole("textbox", { name: "Lien de la présentation" });

    // Un lien sans https:// est refusé avant tout envoi.
    await input.fill("canva.com/design/DAG123");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Le lien doit commencer par https://")).toBeVisible();
    expect(sent).toBeNull();

    await input.fill(CANVA);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("link", { name: "Présentation" })).toHaveAttribute("href", CANVA);
    expect(sent!.body).toEqual({ setlistId: SETLIST_ID, url: CANVA });
    expect(sent!.auth).toMatch(/^Bearer /);
  });

  test("le refus du serveur est expliqué", async ({ page }) => {
    await signInAs(page, REGIE, { [`setlists/${SETLIST_ID}`]: setlist() }, `/setlists/${SETLIST_ID}`);
    const refusal = "Seule la régie inscrite au planning ce jour-là peut ajouter ce lien.";
    await page.route(API, (route) => route.fulfill({ status: 403, json: { error: refusal } }));
    await page.getByRole("button", { name: "Ajouter le lien de la présentation" }).click();
    await page.getByRole("textbox", { name: "Lien de la présentation" }).fill(CANVA);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText(refusal)).toBeVisible();
    await expect(page.getByRole("link", { name: "Présentation" })).toHaveCount(0);
  });

  test("la route refuse un appel sans connexion", async ({ request }) => {
    const res = await request.post("/api/setlist/presentation", { data: { setlistId: SETLIST_ID, url: CANVA } });
    expect(res.status()).toBe(401);
  });
});

test.describe("régie de service (règle du serveur)", () => {
  const servant = (over: Partial<Servant>): Servant =>
    ({ name: "Test R.", category: "Culte Francophone", serviceRole: "regie", leader: "", ...over });
  const culte = { date: "2026-09-14", category: "Culte Francophone", leader: "Présidence" };

  test("la régie du jour est reconnue par son nom de planning (Sono ou PPT)", () => {
    expect(isOnDutyRegie([servant({ name: "test r" })], culte, "Test R.")).toBe(true);
    expect(isOnDutyRegie([servant({ serviceRole: "musicien" })], culte, "Test R."), "musicien").toBe(false);
    expect(isOnDutyRegie([servant({ category: "Groupe Paix" })], culte, "Test R."), "autre service").toBe(false);
    expect(isOnDutyRegie([servant({})], culte, ""), "profil sans nom de planning").toBe(false);
  });

  test("Campus : seulement la régie de la séance (matin ou soir)", () => {
    const campus = { ...culte, category: "Campus", moment: "soir" as const };
    expect(isOnDutyRegie([servant({ category: "Campus", moment: "soir" })], campus, "Test R.")).toBe(true);
    expect(isOnDutyRegie([servant({ category: "Campus", moment: "matin" })], campus, "Test R.")).toBe(false);
  });

  test("seuls les liens https sont acceptés", () => {
    expect(parsePresentationUrl(" https://www.canva.com/design/x ")).toBe("https://www.canva.com/design/x");
    expect(parsePresentationUrl("https://docs.google.com/presentation/d/x")).toBe("https://docs.google.com/presentation/d/x");
    expect(parsePresentationUrl("http://canva.com/x")).toBeNull();
    expect(parsePresentationUrl("javascript:alert(1)")).toBeNull();
    expect(parsePresentationUrl("canva.com/x")).toBeNull();
    expect(parsePresentationUrl(`https://canva.com/${"x".repeat(2000)}`), "lien démesuré").toBeNull();
  });
});
