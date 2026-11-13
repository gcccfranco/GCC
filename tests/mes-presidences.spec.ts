import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot SP, SP-B (docs/spec-stats-personnes-groupes.md, SP2) : la carte « Mes présidences » de Moi, sous
// « Mes services », et son détail (feuille du bas sur téléphone et tablette debout, panneau à droite dès la
// tablette couchée). Lancé aussi sur `tablette-paysage` et `ordinateur-1440` (SPECS_GRAND_ECRAN).
// Horloge au 30/10/2026 ; setlists simulées, noms fictifs.

const LUC: FakeProfile = {
  uid: "uid-luc-spb", email: "luc-spb@example.com", firstName: "Luc", lastName: "Essai", planningName: "Luc Essai",
};
const NORA: FakeProfile = { uid: "uid-nora-spb", email: "nora-spb@example.com", firstName: "Nora", lastName: "Exemple" };
const SANS_PRESIDENCE: FakeProfile = {
  uid: "uid-ines-spb", email: "ines-spb@example.com", firstName: "Ines", lastName: "Vide", planningName: "Ines Vide",
};
const ANCIEN: FakeProfile = {
  uid: "uid-paul-spb", email: "paul-spb@example.com", firstName: "Paul", lastName: "Ancien", planningName: "Paul Ancien",
};
const CAPTURES = "/home/user/GCC/test-results/sp-b";

const FR = "abba-pere";
const ZH = "回家";
const AUTRE = "a-jamais-tu-es-saint";
const ENCORE = "jamais-marche-seul";

const chant = (songSlug: string) => ({
  songSlug, position: 0, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, category: string, leader: string, items: unknown[], extra: Record<string, unknown> = {}) => ({
  title: `Setlist du ${date}`, date, category, leader, language: "fr", notes: "", items, isDraft: false, isPrivate: false, ...extra,
});

const SETLISTS: Record<string, Record<string, unknown>> = {
  // Luc : Paix ×1 (juin), Fidélité ×2 (août, octobre sous une autre graphie), une prochaine et un brouillon.
  "setlists/l1": setlist("2026-06-14", "Groupe Paix", "Luc Essai", [chant(FR), chant(ZH)]),
  "setlists/l2": setlist("2026-08-16", "Groupe Fidélité", "Luc Essai", [chant(FR), chant(AUTRE)]),
  "setlists/l3": setlist("2026-10-19", "Groupe Fidélité", "luc essai", [chant(FR)]),
  "setlists/l-prochaine": setlist("2026-11-09", "Groupe Fidélité", "Luc Essai", [chant(FR)]),
  "setlists/l-brouillon": setlist("2026-11-02", "Groupe Paix", "Luc Essai", [chant(FR)], { isDraft: true }),
  // D'autres présidences, d'autres noms fictifs.
  "setlists/a1": setlist("2026-09-06", "Groupe Bonté", "Anaïs Modèle", [chant(ENCORE)]),
  "setlists/p1": setlist("2026-02-01", "Groupe Bonté", "Paul Ancien", [chant(ENCORE)]),
  "setlists/p2": setlist("2026-12-06", "Groupe Bonté", "Paul Ancien", [chant(ENCORE)]),
  "setlists/n1": setlist("2026-10-04", "Culte Francophone", "Nora Exemple", [chant(FR)]),
  "setlists/n2": setlist("2026-10-11", "Culte Francophone", "nora exemple", [chant(ZH)]),
};

const telephoneOuTabletteDebout = () => ["telephone", "tablette"].includes(test.info().project.name);

async function ouvrir(page: Page, profil: FakeProfile, { langue = "fr" }: { langue?: "fr" | "zh-CN" } = {}) {
  await page.addInitScript((l) => {
    localStorage.setItem("i18nextLng", l);
    localStorage.setItem("theme", "light");
  }, langue);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.clock.setFixedTime(new Date("2026-10-30T10:00:00"));
  await signInAs(page, profil, SETLISTS, "/moi");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

const carte = (page: Page) => page.getByTestId("mes-presidences");
const detailDe = (page: Page, nom = "Mes présidences") => page.getByRole("dialog", { name: nom });

async function capture(page: Page, nom: string) {
  fs.mkdirSync(CAPTURES, { recursive: true });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${CAPTURES}/${test.info().project.name}-${nom}.png` });
}

test.use({ serviceWorkers: "block" });

test.describe("Moi : Mes présidences (SP-B)", () => {
  test("la carte : trois chiffres, « Surtout à … · prochaine le … », sous Mes services", async ({ page }) => {
    await ouvrir(page, LUC);
    await expect(carte(page)).toBeVisible();
    await expect(carte(page)).toContainText("Mes présidences");
    await expect(carte(page)).toContainText("visible par toi et les admins");
    await expect(page.getByTestId("chiffre-presidences")).toHaveText("présidences3");
    await expect(page.getByTestId("chiffre-derniere")).toHaveText("dernière19/10");
    await expect(page.getByTestId("chiffre-groupes")).toHaveText("groupes2");
    await expect(page.getByTestId("mes-presidences-ligne")).toHaveText("Surtout à Fidélité (2) · prochaine le 09/11");
    // Sous la carte « Mes services ».
    const services = await page.getByRole("region", { name: "Mes services", exact: true }).boundingBox();
    const box = (await carte(page).boundingBox())!;
    expect(box.y).toBeGreaterThan(services!.y + services!.height - 1);
    await carte(page).scrollIntoViewIfNeeded();
    await capture(page, "carte");
  });

  test("le détail : feuille en bas (téléphone, tablette debout) ou panneau à droite, période, chants, jamais, prochaine", async ({ page }) => {
    await ouvrir(page, LUC);
    await carte(page).click();
    const detail = detailDe(page);
    await expect(detail).toBeVisible();
    await page.waitForTimeout(600); // fin de l'animation
    const { width, height } = page.viewportSize()!;
    const box = (await detail.boundingBox())!;
    if (telephoneOuTabletteDebout()) {
      expect(box.y + box.height, "feuille posée en bas").toBeGreaterThan(height - 2);
      expect(box.width, "feuille sur la largeur").toBeGreaterThan(Math.min(width, 768) - 4);
      expect(box.y, "feuille, pas plein écran").toBeGreaterThan(height * 0.1);
    } else {
      expect(box.x + box.width, "panneau collé à droite").toBeGreaterThan(width - 2);
      expect(box.width, "panneau d'environ 380 px").toBeGreaterThan(370);
      expect(box.width).toBeLessThan(390);
      expect(box.height, "pleine hauteur").toBeGreaterThan(height - 70);
    }

    await expect(detail.getByRole("button", { name: "Depuis le début" })).toHaveAttribute("aria-pressed", "true");
    await expect(detail.getByTestId("chiffre-detail-presidences")).toContainText("3");
    // Tableau : Fidélité (2) en tête, puis Paix (1), avec une barre décorative.
    const groupes = detail.getByTestId("ligne-groupe");
    await expect(groupes).toHaveCount(2);
    await expect(groupes.first().locator('[data-champ="service"]')).toHaveText("Fidélité");
    await expect(groupes.first().locator('[data-champ="fois"]')).toHaveText("2");
    await expect(groupes.first().locator('[data-champ="derniere"]')).toHaveText("19/10");
    await expect(groupes.first().locator("[aria-hidden]")).toHaveCount(1);
    await expect(groupes.nth(1).locator('[data-champ="service"]')).toHaveText("Paix");
    // Les chants les plus choisis : Abba Père ×3, puis le plus récent des deux ×1.
    const chants = detail.getByTestId("mon-chant");
    await expect(chants).toHaveCount(3);
    await expect(chants.first()).toContainText("Abba Père");
    await expect(chants.first().locator('[data-champ="fois"]')).toHaveText("3");
    await expect(chants.first().getByRole("link")).toHaveAttribute("href", new RegExp(`/songs/${FR}/?$`));
    await expect(chants.nth(1)).toContainText("À jamais Tu es saint");
    // Jamais choisis : le nombre, avec le lien de la vue.
    await expect(detail.getByTestId("jamais-choisis")).toHaveText(/^Jamais choisis : \d+ chants$/);
    await expect(detail.getByTestId("jamais-choisis")).toHaveAttribute("href", /\/songs\/statistiques\/?\?vue=jamais-joues$/);
    // La prochaine et la note.
    await expect(detail.getByTestId("prochaine")).toHaveText("Prévu le 09/11, Fidélité");
    await expect(detail.getByTestId("prochaine").getByRole("link")).toHaveAttribute("href", /\/setlists\/l-prochaine\/?$/);
    await expect(detail.getByText("Présidences comptées sous le nom « Luc Essai » · setlists publiées et passées")).toBeVisible();
    await capture(page, "detail");

    // 3 mois : sans le 14/06 (Paix), le total passe à 2 et un seul groupe.
    await detail.getByRole("button", { name: "3 mois" }).click();
    await expect(detail.getByTestId("chiffre-detail-presidences")).toContainText("2");
    await expect(detail.getByTestId("ligne-groupe")).toHaveCount(1);
    await expect(detail.getByTestId("mon-chant")).toHaveCount(2);
    // 12 mois : tout.
    await detail.getByRole("button", { name: "12 mois" }).click();
    await expect(detail.getByTestId("chiffre-detail-presidences")).toContainText("3");
    await detail.getByRole("button", { name: "Depuis le début" }).click();

    // Échap ferme.
    await page.keyboard.press("Escape");
    await expect(detail).toBeHidden();
  });

  test("le panneau se ferme par sa croix (ordinateur, tablette couchée)", async ({ page }) => {
    test.skip(telephoneOuTabletteDebout(), "panneau seulement dès la tablette couchée");
    await ouvrir(page, LUC);
    await carte(page).click();
    const detail = detailDe(page);
    await expect(detail).toBeVisible();
    await detail.getByRole("button", { name: "Fermer" }).click();
    await expect(detail).toBeHidden();
  });

  test("un membre sans présidence ni prochaine : pas de carte", async ({ page }) => {
    await ouvrir(page, SANS_PRESIDENCE);
    await expect(page.getByRole("region", { name: "Mes services", exact: true })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(carte(page)).toHaveCount(0);
  });

  test("sans nom de planning : les présidences sont comptées sous « Prénom Nom »", async ({ page }) => {
    await ouvrir(page, NORA);
    await expect(carte(page)).toBeVisible();
    await expect(page.getByTestId("chiffre-presidences")).toHaveText("présidences2");
    await expect(page.getByTestId("mes-presidences-ligne")).toHaveText("Surtout à Culte Francophone (2)");
    await carte(page).click();
    await expect(detailDe(page).getByText("Présidences comptées sous le nom « Nora Exemple » · setlists publiées et passées")).toBeVisible();
  });

  test("une période sans présidence : « Aucune présidence sur cette période »", async ({ page }) => {
    // Paul n'a présidé qu'en février, et préside le 06/12.
    await ouvrir(page, ANCIEN);
    await expect(page.getByTestId("mes-presidences-ligne")).toHaveText("Surtout à Bonté (1) · prochaine le 06/12");
    await carte(page).click();
    const detail = detailDe(page);
    await expect(detail.getByTestId("ligne-groupe")).toHaveCount(1);
    await detail.getByRole("button", { name: "3 mois" }).click();
    await expect(detail.getByTestId("mes-presidences-aucune")).toHaveText("Aucune présidence sur cette période");
    await expect(detail.getByTestId("ligne-groupe")).toHaveCount(0);
    await expect(detail.getByTestId("chiffre-detail-presidences")).toContainText("0");
  });

  test("en 中文", async ({ page }) => {
    await ouvrir(page, LUC, { langue: "zh-CN" });
    await expect(carte(page)).toBeVisible();
    await expect(carte(page)).toContainText("我的主领");
    await expect(carte(page)).toContainText("仅你和管理员可见");
    await expect(page.getByTestId("chiffre-presidences")).toHaveText("次主领3");
    await expect(page.getByTestId("mes-presidences-ligne")).toHaveText("主要在 信实团契（2） · 下次 09/11");
    await carte(page).scrollIntoViewIfNeeded();
    await capture(page, "carte-zh");
    await carte(page).click();
    const detail = detailDe(page, "我的主领");
    await expect(detail).toBeVisible();
    await expect(detail.getByText("我最常选的诗歌")).toBeVisible();
    await expect(detail.getByTestId("jamais-choisis")).toHaveText(/^从未选过：\d+ 首$/);
    await expect(detail.getByText("以「Luc Essai」计算 · 已发布且已过去的歌单")).toBeVisible();
    await capture(page, "detail-zh");
  });
});
