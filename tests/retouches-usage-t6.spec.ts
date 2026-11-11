import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 1 du rapport d'usage, tranche T6 (docs/spec-retouches-usage.md) : retours et liens morts. Chaque
// retour mène à la page d'origine (`?depuis=` posé par le lien) ; les chants du service sont des liens
// qui gardent la tonalité de la setlist ; le filtre « Sans équipe » vide propose sa sortie.
// « Où l'entendre » (musiciens-5) est laissé à une décision (aucune fonction de recherche par titre
// n'existe dans la liste « chants qui le jouent », qui travaille par slug). Base et Sheets simulés,
// noms fictifs. Horloge au 1er octobre 2026.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", dansEquipes: ["da"] };
const MIRA: FakeProfile = { uid: "u-mira", email: "mira@example.com", firstName: "Mira", lastName: "Quenot", dansEquipes: ["da"] };
const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K.", serviceRoles: { "Culte Francophone": ["musicien"] } };

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([
    ENTETE_CULTE,
    ["18/10", "Hugo L.", "Noé T.", "Inès V.", "Ruth K.", "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""],
  ]),
};

const ZH = "一切歌颂赞美";
const item = (songSlug: string, position: number, keyOverride: string | null) => ({
  songSlug, position, keyOverride, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const M = (nom: string) => ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "" });
const DOCS: Record<string, Record<string, unknown>> = {
  "setlists/sl-1": {
    title: "Culte du 18 octobre", leader: "Hugo L.", category: "Culte Francophone", date: "2026-10-18", language: "mixed", notes: "",
    ownerId: "uid-owner", isPrivate: false, items: [item("abba-pere", 1, "G"), item(ZH, 2, "F")],
  },
  "equipes/da": { pole: "da", membres: [M("Mira Quenot")], updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" },
  "equipes/da/taches/affiche": {
    equipe: "da", titre: "Affiche de Noël", responsableUid: "u-mira", responsableNom: "Mira Quenot", echeance: "2026-10-11",
    repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-mira",
    createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z",
  },
};

async function ouvrir(page: Page, p: FakeProfile, vers: string, docs = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
  return signInAs(page, p, docs, vers);
}
const entete = (page: Page) => page.locator("header[data-entete-page]");

test.describe("equipes-taches-app-1 : le retour d'une équipe suit la provenance", () => {
  test("?depuis=equipes : « ‹ Équipes » mène à l'organigramme", async ({ page }) => {
    await ouvrir(page, MIRA, "/equipes/da?depuis=equipes");
    await entete(page).getByRole("link", { name: "Équipes", exact: true }).click();
    await expect(page).toHaveURL(/\/equipes\/?$/);
  });

  test("?depuis=moi, sans paramètre ou valeur inconnue : « ‹ Moi » mène à /moi", async ({ page }) => {
    for (const adresse of ["/equipes/da?depuis=moi", "/equipes/da", "/equipes/da?depuis=https://example.org"]) {
      await page.goto(adresse);
      await expect(page.getByRole("heading", { name: "DA", level: 1 })).toBeVisible();
      const retour = entete(page).getByRole("link", { name: "Moi", exact: true });
      await expect(retour, adresse).toHaveAttribute("href", /\/moi\/?$/);
    }
  });

  test("depuis Moi, la ligne de l'équipe pose ?depuis=moi et le retour revient à Moi", async ({ page }) => {
    await ouvrir(page, MIRA, "/moi");
    await page.getByTestId("equipe-ligne").first().click();
    await expect(page).toHaveURL(/\/equipes\/da\/?\?depuis=moi$/);
    await entete(page).getByRole("link", { name: "Moi", exact: true }).click();
    await expect(page).toHaveURL(/\/moi\/?$/);
  });

  test("une tâche ouverte depuis la page de son équipe revient à l'équipe", async ({ page }) => {
    await ouvrir(page, MIRA, "/equipes/da");
    await page.getByRole("region", { name: "Tâches" }).getByText("Affiche de Noël").click();
    await expect(page).toHaveURL(/\/taches\/da\/affiche\/?\?depuis=equipe$/);
    await entete(page).getByRole("link", { name: "DA", exact: true }).click();
    await expect(page).toHaveURL(/\/equipes\/da\/?$/);
  });

  test("une tâche ouverte sans provenance garde « ‹ Tâches »", async ({ page }) => {
    await ouvrir(page, MIRA, "/taches/da/affiche");
    await expect(entete(page).getByRole("link", { name: "Tâches", exact: true })).toHaveAttribute("href", /\/taches\/?$/);
  });
});

test.describe("musiciens-8 : « ‹ Chants » seulement depuis un chant", () => {
  test("?depuis=<slug d'un chant> : le retour mène au chant", async ({ page }) => {
    await page.goto("/accords?accord=G&depuis=abba-pere");
    const retour = page.getByRole("link", { name: "Chants", exact: true });
    await expect(retour).toHaveAttribute("href", /\/songs\/abba-pere$/);
    await retour.click();
    await expect(page).toHaveURL(/\/songs\/abba-pere\/?$/);
  });

  test("sans paramètre, slug inconnu ou adresse libre : pas de retour", async ({ page }) => {
    for (const adresse of ["/accords?accord=G", "/accords?accord=G&depuis=chant-qui-n-existe-pas", "/accords?accord=G&depuis=https://example.org"]) {
      await page.goto(adresse);
      await expect(page.locator("[data-accord-nom]").first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Chants", exact: true }), adresse).toHaveCount(0);
      await expect(page.locator('a[href*="example.org"]'), adresse).toHaveCount(0);
    }
  });

  test("« Voir tout le dictionnaire » depuis la page d'un chant pose ?depuis=<slug>", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
    await page.goto("/songs/abba-pere");
    await page.locator("[data-accord-touchable]").first().click();
    const lien = page.getByRole("link", { name: /Voir tout le dictionnaire/ });
    await expect(lien).toHaveAttribute("href", /^\/accords\?accord=[^&]+&depuis=abba-pere$/);
  });
});

test.describe("accueil-compte-3 : après « Enregistrer », retour à Moi", () => {
  test("sans ?from=, le profil enregistré ramène à /moi", async ({ page }) => {
    await ouvrir(page, MIRA, "/profil");
    await page.getByRole("button", { name: /^Enregistrer/ }).first().click();
    await expect(page).toHaveURL(/\/moi\/?$/);
  });
});

test.describe("services-5 : les chants du service sont des liens, à la tonalité de la setlist", () => {
  test("un chant FR (G) et un chant ZH (F) ouvrent la page chant à cette tonalité", async ({ page }) => {
    await ouvrir(page, RUTH, "/mes-services/2026-10-18");
    const fr = page.getByRole("link", { name: "Abba Père" });
    await expect(fr).toHaveAttribute("href", `/songs/abba-pere?key=${encodeURIComponent(JSON.stringify("G"))}`);
    await expect(page.getByRole("link", { name: ZH })).toHaveAttribute("href", `/songs/${encodeURIComponent(ZH)}?key=${encodeURIComponent(JSON.stringify("F"))}`);
    await fr.click();
    await expect(page).toHaveURL(/\/songs\/abba-pere\/?\?key=%22G%22$/);
    await expect(page.locator("[data-accord-touchable]").first()).toBeVisible();
  });
});

test.describe("bo-equipes-15 : filtre « Sans équipe » vide", () => {
  test("une phrase et « Retirer le filtre » qui rend la liste", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes/personnes");
    await page.getByRole("button", { name: "Sans équipe", exact: true }).click();
    await expect(page.getByText("Tout le monde a une équipe.").first()).toBeVisible();
    const sortie = page.getByRole("button", { name: "Retirer le filtre" }).first();
    expect(Math.round((await sortie.boundingBox())!.height)).toBeGreaterThanOrEqual(36);
    await sortie.click();
    await expect(page.getByText("Tout le monde a une équipe.")).toHaveCount(0);
    await expect(page.getByText("Mira").first()).toBeVisible();
  });

  test("en 中文 : la phrase et la sortie sont traduites", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, ADMIN, "/back-office/equipes/personnes");
    await page.getByRole("button", { name: "没有团队", exact: true }).click();
    await expect(page.getByText("每个人都有团队。").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "取消筛选" }).first()).toBeVisible();
  });
});

test.describe("musiciens-5 : « Où l'entendre » ouvre le chant", () => {
  const PIANISTE: FakeProfile = { uid: "uid-anouk", email: "anouk@example.com", firstName: "Anouk", lastName: "Ferrand", planningName: "Anouk F.", ...musicien("piano") };

  test("un titre retrouvé dans l'index est un lien vers le chant ; une phrase reste du texte", async ({ page }) => {
    await signInAs(page, PIANISTE, {}, "/harmonie/substitutions/2m7-pour-4");
    const bloc = page.locator("[data-ou-l-entendre]").filter({ visible: true });
    await expect(bloc).toBeVisible();
    const lien = bloc.getByRole("link", { name: "Hosanna", exact: true });
    await expect(lien).toHaveAttribute("href", /\/songs\/hosanna$/);
    await lien.click();
    await expect(page).toHaveURL(/\/songs\/hosanna\/?(\?.*)?$/);
  });
});
