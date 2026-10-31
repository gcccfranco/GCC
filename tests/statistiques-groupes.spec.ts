import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot SP, SP-C (docs/spec-stats-personnes-groupes.md, SP3 et SP4) : la page Statistiques d'un service
// choisi (rangée du groupe pour tout connecté) et les présidences (admins). Horloge au 04/10/2026,
// noms fictifs inventés pour ce fichier.

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
const MEMBRE: FakeProfile = { uid: "uid-mb", email: "mb@example.com", firstName: "Maud", lastName: "B." };

const RECUEIL = [
  { slug: "abba-pere", title: "Abba Père", language: "fr", artist: "Auteur Un", originalKey: "A" },
  { slug: "abrite-moi", title: "Abrite-moi", language: "fr", artist: "Auteur Deux", originalKey: "C" },
  { slug: "a-jamais-tu-es-saint", title: "À jamais Tu es saint", language: "fr", artist: "Auteur Trois", originalKey: "C#" },
  { slug: "爱的约定", title: "爱的约定", language: "zh", artist: "作者四", originalKey: "C" },
];

const chant = (songSlug: string, keyOverride: string | null = null) => ({
  songSlug, position: 0, keyOverride, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, category: string, leader: string, items: unknown[], extra: Record<string, unknown> = {}) => ({
  title: `Setlist du ${date}`, date, category, leader, language: "fr", notes: "", items, isDraft: false, isPrivate: false, ...extra,
});
const FIDELITE = "Groupe Fidélité";
const PAIX = "Groupe Paix";

// Fidélité : 4 setlists comptées (14/06 au 06/09), 4 chants différents ; passages : 6 FR et 2 中文.
// Une graphie différente (« noé v ») pour la même présidence ; un brouillon ignoré.
const SETLISTS: Record<string, Record<string, unknown>> = {
  "setlists/a1": setlist("2026-06-14", FIDELITE, "Noé V.", [chant("abba-pere", "G"), chant("abrite-moi")]),
  "setlists/a2": setlist("2026-07-12", FIDELITE, "Noé V.", [chant("abba-pere", "G"), chant("爱的约定")]),
  "setlists/a3": setlist("2026-08-09", FIDELITE, "noé v", [chant("a-jamais-tu-es-saint"), chant("爱的约定", "D")]),
  "setlists/a4": setlist("2026-09-06", FIDELITE, "Iris D.", [chant("abba-pere", "G"), chant("abrite-moi")]),
  "setlists/a5": setlist("2026-09-20", PAIX, "Noé V.", [chant("abba-pere", "A")]),
  "setlists/brouillon": setlist("2026-09-13", FIDELITE, "Hugo P.", [chant("abrite-moi")], { isDraft: true }),
};

// Les profils lus par `listProfiles` (admin + service choisi) : deux ont présidé (Noé par son nom de
// planning, Iris aussi), deux n'ont pas présidé à Fidélité, un seul est à Paix.
const profil = (prenom: string, nom: string, planningName: string, roles: Record<string, string[]>) => ({
  email: `${prenom.toLowerCase()}@example.com`, firstName: prenom, lastName: nom, planningName,
  serviceRoles: roles, annonces: [], notify: [],
});
const PROFILS: Record<string, Record<string, unknown>> = {
  "users/uid-noe": profil("Noé", "Vasseur", "Noé V.", { [FIDELITE]: ["chanteur"], [PAIX]: ["chanteur"] }),
  "users/uid-iris": profil("Iris", "Dumont", "Iris D.", { [FIDELITE]: ["musicien"] }),
  "users/uid-zoe": profil("Zoé", "Brun", "", { [FIDELITE]: ["chanteur"] }),
  "users/uid-lou": profil("Lou", "Ardent", "", { [FIDELITE]: ["regie"] }),
  "users/uid-hugo": profil("Hugo", "Pasquier", "Hugo P.", { [PAIX]: ["musicien"] }),
};

async function ouvrir(page: Page, profilConnecte: FakeProfile, chemin: string, langue: "fr" | "zh-CN" = "fr") {
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  await signInAs(page, profilConnecte, { ...SETLISTS, ...PROFILS }, chemin);
  await expect(page.locator("header[data-entete-page] p").first()).toContainText(" · ");
}

const SERVICE_FIDELITE = "/songs/statistiques?service=Groupe%20Fid%C3%A9lit%C3%A9";

test.describe("Statistiques (SP-C) : groupes et présidences", () => {
  test.use({ serviceWorkers: "block" });

  test("un membre, service choisi : la rangée du groupe, aucune présidence", async ({ page }) => {
    await ouvrir(page, MEMBRE, SERVICE_FIDELITE);
    const rangee = page.getByTestId("groupe-rangee");
    await expect(rangee).toBeVisible();
    await expect(rangee.getByTestId("groupe-setlists")).toHaveText("4");
    // 4 setlists du 14/06 au 06/09 (84 jours ≈ 2,8 mois) : 1,4 par mois (virgule française).
    await expect(rangee.getByTestId("groupe-par-mois")).toHaveText("1,4");
    await expect(rangee.getByTestId("groupe-chants")).toHaveText("4");
    await expect(rangee.getByTestId("groupe-langues")).toHaveText("FR 75 % · 中文 25 % · tonalité la plus jouée : G / C");
    await expect(page.getByTestId("presidences-admin")).toHaveCount(0);
    await expect(page.getByTestId("presidence-bloc")).toHaveCount(0);
    await expect(page.getByText("n'ont pas présidé")).toHaveCount(0);
  });

  test("un membre, service « Tous » : pas de rangée", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/songs/statistiques");
    await expect(page.getByTestId("setlists-comptees")).toBeVisible();
    await expect(page.getByTestId("groupe-rangee")).toHaveCount(0);
    await expect(page.getByTestId("presidences-admin")).toHaveCount(0);
  });

  test("un admin sans service : « Présidences » triée, un clic choisit la présidence", async ({ page }) => {
    await ouvrir(page, ADMIN, "/songs/statistiques");
    const carte = page.getByTestId("presidences-admin");
    await expect(carte.getByRole("heading", { name: "Présidences" })).toBeVisible();
    await expect(carte).toContainText("admins");
    await expect(page.getByTestId("groupe-rangee")).toHaveCount(0);
    const lignes = await carte.getByTestId("ligne-presidence").evaluateAll((els) =>
      els.map((el) => [...el.querySelectorAll("[data-champ]")].map((c) => (c.textContent ?? "").trim())));
    // Noé V. : 4 fois (3 à Fidélité, 1 à Paix), dernière le 20/09 ; Iris D. : 1 fois le 06/09.
    expect(lignes.map((l) => l.slice(0, 3))).toEqual([["Noé V.", "4", "20/09"], ["Iris D.", "1", "06/09"]]);
    await expect(carte.getByRole("button", { name: "Tout afficher" })).toHaveCount(0);

    await carte.getByRole("button", { name: "Noé V." }).click();
    await expect(page).toHaveURL(/presidence=No%C3%A9\+V\./);
    const bloc = page.getByTestId("presidence-bloc");
    await expect(bloc.getByRole("heading", { name: "Présidences de Noé V." })).toBeVisible();
    await expect(bloc.getByTestId("presidence-fois")).toHaveText("4");
    await expect(bloc.getByTestId("presidence-derniere")).toHaveText("20/09");
    await expect(bloc.getByTestId("presidence-groupes")).toHaveText("2");
    await expect(bloc.getByTestId("presidence-services")).toHaveText("Fidélité 3 · Paix 1");
    await expect(page.getByTestId("presidences-admin")).toHaveCount(0);
  });

  test("un admin, présidence et service choisis : le bloc ne garde que le service", async ({ page }) => {
    await ouvrir(page, ADMIN, `${SERVICE_FIDELITE}&presidence=No%C3%A9%20V.`);
    const bloc = page.getByTestId("presidence-bloc");
    await expect(bloc.getByTestId("presidence-fois")).toHaveText("3");
    await expect(bloc.getByTestId("presidence-groupes")).toHaveText("1");
    await expect(bloc.getByTestId("presidence-services")).toHaveText("Fidélité 3");
    await expect(page.getByTestId("groupe-rangee")).toBeVisible();
  });

  test("un admin, service choisi : « Présidences à Fidélité » et les membres qui n'ont pas présidé", async ({ page }) => {
    await ouvrir(page, ADMIN, SERVICE_FIDELITE);
    const carte = page.getByTestId("presidences-admin");
    await expect(carte.getByRole("heading", { name: "Présidences à Fidélité" })).toBeVisible();
    await expect(carte.getByTestId("ligne-presidence")).toHaveCount(2);
    await expect(carte.getByTestId("ligne-presidence").first()).toContainText("Noé V.");
    await expect(page.getByTestId("groupe-rangee")).toBeVisible();

    const bouton = carte.getByRole("button", { name: "2 membres du groupe n'ont pas présidé sur la période" });
    await expect(bouton).toHaveAttribute("aria-expanded", "false");
    await expect(carte.getByRole("listitem")).toHaveCount(0);
    await bouton.click();
    await expect(bouton).toHaveAttribute("aria-expanded", "true");
    // Prénom Nom, A→Z : Hugo (Paix seulement), Noé et Iris (ont présidé) n'y sont pas.
    await expect(carte.getByRole("listitem")).toHaveText(["Lou Ardent", "Zoé Brun"]);
  });

  test("un admin, présidences au-delà de dix : « Tout afficher »", async ({ page }) => {
    const beaucoup = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [
      `setlists/m${i}`, setlist(`2026-09-${String(i + 1).padStart(2, "0")}`, PAIX, `Invité ${String.fromCharCode(65 + i)}.`, [chant("abrite-moi")]),
    ]));
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "fr"));
    await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
    await page.route(/\/songs-index\.json/, (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
    await signInAs(page, ADMIN, { ...SETLISTS, ...beaucoup }, "/songs/statistiques");
    const carte = page.getByTestId("presidences-admin");
    await expect(carte.getByTestId("ligne-presidence")).toHaveCount(10);
    await carte.getByRole("button", { name: "Tout afficher" }).click();
    await expect(carte.getByTestId("ligne-presidence")).toHaveCount(13);
    await expect(carte.getByRole("button", { name: "Tout afficher" })).toHaveCount(0);
  });

  test("中文 : la rangée du groupe et les présidences", async ({ page }) => {
    await ouvrir(page, ADMIN, SERVICE_FIDELITE, "zh-CN");
    const rangee = page.getByTestId("groupe-rangee");
    await expect(rangee).toContainText("歌单");
    await expect(rangee).toContainText("每月");
    await expect(rangee.getByTestId("groupe-par-mois")).toHaveText("1.4");
    await expect(rangee).toContainText("首不同诗歌");
    await expect(rangee.getByTestId("groupe-langues")).toContainText("最常用调：G");
    const carte = page.getByTestId("presidences-admin");
    await expect(carte.getByRole("heading", { name: "信实团契 的主领" })).toBeVisible();
    await expect(carte).toContainText("管理员");
    await expect(carte.getByRole("button", { name: "2 位团契成员在此期间未主领" })).toBeVisible();
  });
});

// Captures à regarder : test-results/sp-c/<appareil>-<profil>.png
test.describe("Statistiques (SP-C) : captures", () => {
  test.use({ serviceWorkers: "block" });
  for (const [nom, profilConnecte] of [["admin-service", ADMIN], ["membre-service", MEMBRE]] as const) {
    test(`capture : ${nom}`, async ({ page }, info: TestInfo) => {
      await ouvrir(page, profilConnecte, SERVICE_FIDELITE);
      if (profilConnecte === ADMIN) {
        await page.getByTestId("presidences-admin").getByRole("button", { name: /n'ont pas présidé/ }).click();
      }
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `test-results/sp-c/${info.project.name}-${nom}.png`, fullPage: true });
    });
  }
});
