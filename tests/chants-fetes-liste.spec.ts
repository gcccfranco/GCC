import "./helpers/cleFirebase";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { upcomingSetlists } from "../src/lib/setlist/upcoming";
import type { FSSetlist } from "../src/lib/firebase/setlists";

// Lot « chants des fêtes », tranche CF-E (docs/spec-chants-fetes.md, CF13, CF15, CF24, CF25) : Setlists › Fêtes ›
// Noël dans l'ordre de passage, « Sans chant », visibilité, « Mes services », « Prochaines setlists », cloche.
// Comptes, programmes et setlists simulés. Noms fictifs.

const MEMBRE: FakeProfile = { uid: "uid-mo", email: "mo@example.com", firstName: "Mo", lastName: "M.", planningName: "Mo M.", serviceRoles: {} };

const item = (songSlug: string, position: number) =>
  ({ songSlug, position, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
const setlist = (passage: string, qui: string, leader: string, items: unknown[], editeurs: string[] = []) => ({
  title: `Noël 2026 · ${qui}`, leader, category: "Noël", date: "2026-12-24", language: "fr", notes: "", isDraft: false, isPrivate: false,
  ownerId: null, createdAt: "2026-10-05T10:00:00Z", editeurs, fete: { programme: "noel-2026", passage, qui }, items,
});
const PROGRAMME = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: true,
  plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60, createdBy: "uid-alice", updatedAt: "2026-10-01T10:00:00Z",
  passages: [
    { id: "p1aaaaaa", titre: "Ouverture", quoi: "Séance louange", qui: ["Gp Paix"] },
    { id: "p2bbbbbb", titre: "Les bergers", quoi: "Chant", qui: ["Gp Joie"] },
    { id: "p3cccccc", titre: "Le grand spectacle", quoi: "Spectacle", qui: ["EDD 中班", "EDD 大班"] },
    { id: "p4dddddd", titre: "Louange finale", quoi: "Chant", qui: ["Franco"] },
  ],
};
// Insérées à l'envers : l'ordre affiché est celui du programme, pas celui de la base.
const DOCS = {
  "programmes/noel-2026": PROGRAMME,
  "setlists/noel-2026-p4dddddd": setlist("p4dddddd", "Franco", "Léa M.", []),
  "setlists/noel-2026-p2bbbbbb": setlist("p2bbbbbb", "Gp Joie", "Mei Z.", [item("beni-soit-ton-nom", 1)]),
  "setlists/noel-2026-p1aaaaaa": setlist("p1aaaaaa", "Gp Paix", "Ruth K.", [item("a-jamais-tu-es-saint", 1), item("abba-pere", 2)], ["uid-mo"]),
};

async function ouvrir(page: Page, docs: Record<string, Record<string, unknown>> = DOCS, chemin = "/setlists") {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  return signInAs(page, MEMBRE, docs, chemin);
}
const categorie = (page: Page) => page.locator("select").filter({ has: page.locator("optgroup") }).first();

test.describe("CF-E · Setlists › Fêtes (CF13)", () => {
  test("un membre sans catégorie voit « Fêtes › Noël » ; les setlists non vides, dans l'ordre de passage", async ({ page }) => {
    await ouvrir(page);
    const menu = categorie(page);
    await expect(menu.locator('optgroup[label="Fêtes"] option')).toHaveText(["Noël", "Pâques"]);
    await menu.selectOption("Noël");
    await expect(page.getByText("Noël 2026 · jeudi 24 décembre")).toBeVisible();
    const titres = page.getByRole("link", { name: /Noël 2026 · / });
    await expect(titres.nth(0)).toContainText("Noël 2026 · Gp Paix");
    await expect(titres.nth(1)).toContainText("Noël 2026 · Gp Joie");
    await expect(titres).toHaveCount(2); // la setlist vide de Franco n'a pas de ligne
    await expect(titres.nth(0)).toContainText("Ouverture · Ruth K.");
    await expect(titres.nth(0)).toContainText("Noël · passage 1 · 2 chants");
  });

  test("« Sans chant : … » : les passages sans setlist non vide, dont celui à deux Qui", async ({ page }) => {
    await ouvrir(page);
    await categorie(page).selectOption("Noël");
    await expect(page.getByText("Sans chant : 3 · Le grand spectacle, 4 · Louange finale")).toBeVisible();
  });

  test("une fête sans setlist : « Sans chant » pour tous ses passages", async ({ page }) => {
    await ouvrir(page, { "programmes/noel-2026": PROGRAMME });
    await categorie(page).selectOption("Noël");
    await expect(page.getByText(/^Sans chant : 1 · Ouverture, 2 · Les bergers, 3 · Le grand spectacle, 4 · Louange finale$/)).toBeVisible();
  });

  test("« Mes services » coché : avec « Toutes », seulement celles dont on est éditeur ; avec « Noël », toutes", async ({ page }) => {
    await ouvrir(page);
    await expect(page.getByRole("button", { name: /Mes services/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: /Noël 2026 · Gp Paix/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Noël 2026 · Gp Joie/ })).toHaveCount(0);
    await categorie(page).selectOption("Noël");
    await expect(page.getByRole("link", { name: /Noël 2026 · Gp Joie/ })).toBeVisible();
  });

  test("une setlist dont on est éditeur n'a pas la marque « Dans l'équipe »", async ({ page }) => {
    await ouvrir(page);
    await expect(page.getByRole("link", { name: /Noël 2026 · Gp Paix/ })).toBeVisible();
    await expect(page.getByText("Dans l'équipe")).toHaveCount(0);
  });

  test("un passage retiré de l'ordre de passage : sa setlist n'est plus listée", async ({ page }) => {
    const sans = { ...PROGRAMME, passages: PROGRAMME.passages.filter((p) => p.id !== "p2bbbbbb") };
    await ouvrir(page, { ...DOCS, "programmes/noel-2026": sans });
    await categorie(page).selectOption("Noël");
    await expect(page.getByRole("link", { name: /Noël 2026 · Gp Paix/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Noël 2026 · Gp Joie/ })).toHaveCount(0);
  });

  test("en 中文 : le groupe « 节日 », « 圣诞节 » et le titre recalculé", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page);
    const menu = categorie(page);
    await expect(menu.locator('optgroup[label="节日"] option')).toHaveText(["圣诞节", "复活节"]);
    await menu.selectOption("Noël");
    await expect(page.getByRole("link", { name: /圣诞节 2026 · Gp Paix/ })).toBeVisible();
  });
});

test.describe("CF-E · Archives", () => {
  test("une édition passée : en Archives, l'en-tête de la plus récente, les setlists dans l'ordre de passage", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await page.clock.setFixedTime(new Date("2027-01-10T10:00:00"));
    await signInAs(page, MEMBRE, DOCS, "/setlists?tab=archived&cat=No%C3%ABl");
    await expect(page.getByText("Noël 2026 · jeudi 24 décembre")).toBeVisible();
    const titres = page.getByRole("link", { name: /Noël 2026 · / });
    await expect(titres.nth(0)).toContainText("Gp Paix");
    await expect(titres.nth(1)).toContainText("Gp Joie");
  });

  test("« Mes setlists » (privées) : pas d'en-tête de fête", async ({ page }) => {
    await ouvrir(page, DOCS, "/setlists?tab=mine&cat=No%C3%ABl");
    await expect(page.getByText("Noël 2026 · jeudi 24 décembre")).toHaveCount(0);
  });
});

test.describe("CF-E · ailleurs (CF15, CF25)", () => {
  test("« Prochaines setlists » de Chants : aucune setlist de fête (pur)", () => {
    const ordinaire = { id: "a", title: "Culte", category: "Culte Francophone", date: "2026-12-20", isDraft: false, isPrivate: false, items: [], ownerId: "uid-mo" } as unknown as FSSetlist;
    const fete = { ...ordinaire, id: "b", title: "Noël 2026 · Gp Paix", category: "Noël", date: "2026-12-19", fete: { programme: "noel-2026", passage: "p1", qui: "Gp Paix" } } as FSSetlist;
    const retenues = upcomingSetlists([fete, ordinaire], { uid: "uid-mo" }, { serviceRoles: { "Culte Francophone": ["musicien"] } } as never, "2026-10-09");
    expect(retenues.map((s) => s.id)).toEqual(["a"]);
  });
});

test.describe("CF-E · la cloche (CF15)", () => {
  test("une setlist de fête ne laisse aucune ligne dans la cloche des admins ; une ordinaire, si", async ({ page }) => {
    const admin: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "A.", serviceRoles: {} };
    const ordinaire = { title: "Culte du jour", leader: "Présidence", category: "Culte Francophone", date: "2026-10-18", language: "fr", notes: "", isDraft: false, isPrivate: false, ownerId: "uid-autre", createdAt: new Date("2026-10-08T10:00:00Z"), items: [item("abba-pere", 1)] };
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    const recentes = Object.fromEntries(Object.entries(DOCS).map(([k, v]) => [k, k.startsWith("setlists/") ? { ...v, createdAt: new Date("2026-10-08T10:00:00Z") } : v]));
    await signInAs(page, admin, { ...recentes, "setlists/culte-du-jour": ordinaire }, "/songs");
    await page.addInitScript(() => localStorage.setItem("notificationsLastSeen", "1"));
    await page.goto("/songs");
    await page.getByRole("button", { name: "Notifications" }).first().click();
    // La ligne de la setlist ordinaire est dans la cloche (hors « Prochaines setlists » de Chants) ; celle de la fête non.
    const cloche = page.getByRole("menu");
    await expect(cloche).toContainText("Culte du jour");
    await expect(cloche).not.toContainText("Noël 2026 · Gp Paix");
  });
});
