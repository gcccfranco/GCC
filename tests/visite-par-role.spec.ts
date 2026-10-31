import { expect, test, type Page } from "@playwright/test";
import { cartesDeLaVisite, type Carte } from "../src/lib/onboarding/visite";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estTelephone } from "./helpers/agencement";

// Visite de première connexion selon le rôle (docs/spec-visite-par-role.md). Profils fictifs.

const MOI = { uid: "uid-visite", email: "visite@example.com" };
const ADMIN = { uid: "uid-admin", email: ADMIN_EMAIL };
const kinds = (cartes: Carte[]) => cartes.map((c) => c.kind);

// ── 1. Composition (pur) ────────────────────────────────────────────────────

test.describe("cartesDeLaVisite", () => {
  test("présidence + choriste : une carte service, la plus haute, l'autre en « aussi »", () => {
    const cartes = cartesDeLaVisite(MOI, { sousEquipes: ["choristes", "presidence"], lieuxLouange: ["Culte Francophone"] }, true);
    expect(cartes).toEqual([{ kind: "service", role: "presidence", lieux: ["Culte Francophone"], aussi: ["chanteur"] }]);
  });

  test("back-office coupé : le rôle vient de serviceRoles, les lieux où il figure", () => {
    const cartes = cartesDeLaVisite(MOI, { serviceRoles: { Campus: ["chanteur"], "Culte Francophone": ["presidence", "chanteur"] } }, false);
    expect(cartes).toEqual([{ kind: "service", role: "presidence", lieux: ["Culte Francophone"], aussi: ["chanteur"] }]);
  });

  test("musicien seul, sans équipe : la carte service seule", () => {
    expect(kinds(cartesDeLaVisite(MOI, { sousEquipes: ["musiciens"], lieuxLouange: ["Campus"] }, true))).toEqual(["service"]);
  });

  test("membre de deux équipes, référent d'une : une carte équipe, version référent", () => {
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["regie", "medias"], referentDe: ["medias"] }, true);
    expect(cartes.filter((c) => c.kind === "equipe")).toEqual([{ kind: "equipe", equipes: ["medias", "regie"], referentDe: ["medias"] }]);
  });

  test("rôle de service seul (Louange élargi) : pas de carte équipe", () => {
    expect(kinds(cartesDeLaVisite(MOI, { serviceRoles: { "Culte Francophone": ["musicien"] } }, true))).toEqual(["membre"]);
    expect(kinds(cartesDeLaVisite(MOI, { serviceRoles: { "Culte Francophone": ["musicien"] } }, false))).toEqual(["service"]);
  });

  test("TEAM LOUANGE (dansEquipes ∋ louange) : une carte équipe", () => {
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: ["Culte Francophone"] }, true);
    expect(kinds(cartes)).toEqual(["service", "equipe"]);
  });

  test("coordination + planning + notifier : une carte, trois lignes dans l'ordre", () => {
    // Membre d'Orga : coordination, la Table, toute l'Église.
    // lot RS : la coordination vient du Comité Orga (`responsabilites`), plus de la place dans l'organigramme.
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["orga"], responsabilites: ["orga"] }, true);
    const resp = cartes.find((c) => c.kind === "responsabilites");
    expect(resp).toEqual({
      kind: "responsabilites",
      // lot RS : le Comité Orga n'ouvre plus la Table (sans gestionnaire) ; il ouvre les évènements de toutes les sections.
      lignes: [
        { kind: "coordination" }, { kind: "messages", audiences: ["*"] },
        { kind: "evenements", sections: ["Culte Francophone", "Groupe Paix", "Groupe Fidélité", "Groupe Bonté"] },
      ],
    });
  });

  test("cinq droits : quatre lignes au plus", () => {
    // Référent Louange (coordination, plannings du culte, notifier, évènements du Culte) et président de Paix.
    // lot RS : ces droits viennent des `responsabilites` (Comité Orga + planning du culte), plus des référents ;
    // être référent de son comité ne donne que la ligne « groupe ».
    const cartes = cartesDeLaVisite(MOI, { dansEquipes: ["louange"], referentDe: ["louange", "comite-paix"], responsabilites: ["orga", "planning:culte"] }, true);
    const resp = cartes.find((c) => c.kind === "responsabilites");
    expect(resp && resp.kind === "responsabilites" && resp.lignes.map((l) => l.kind)).toEqual(["coordination", "groupe", "planning", "messages"]);
  });

  test("admin : jamais de responsabilités", () => {
    expect(kinds(cartesDeLaVisite(ADMIN, { dansEquipes: ["orga"] }, true))).toEqual(["equipe"]);
    expect(kinds(cartesDeLaVisite(ADMIN, {}, true))).toEqual(["membre"]);
  });

  test("rien : la carte membre", () => {
    expect(cartesDeLaVisite(MOI, {}, true)).toEqual([{ kind: "membre" }]);
  });

  test("back-office coupé : ni équipe ni responsabilités", () => {
    const profil = { serviceRoles: { Campus: ["regie" as const] }, dansEquipes: ["orga"], referentDe: ["medias"] };
    expect(kinds(cartesDeLaVisite(MOI, profil, false))).toEqual(["service"]);
    expect(kinds(cartesDeLaVisite(MOI, { dansEquipes: ["orga"] }, false))).toEqual(["membre"]);
  });
});

// ── 2 à 7. La visite à l'écran ──────────────────────────────────────────────

// Comptes fictifs inventés pour ce fichier.
const NEUF: FakeProfile = { uid: "uid-visite-neuf", email: "nina.visite@example.com", firstName: "Nina", lastName: "Test", accueil: true };
const MUSICIENNE: FakeProfile = {
  ...NEUF, sousEquipes: ["musiciens"], lieuxLouange: ["Culte Francophone"], joue: ["piano"], dansEquipes: ["medias"],
};
const visite = (page: Page) => page.getByRole("dialog", { name: "Bienvenue dans GCC" });
const suivant = (page: Page) => visite(page).getByRole("button", { name: "Suivant" });

/** Ni PushManager ni iPad : l'écran Notifications n'est pas proposé, le nombre d'écrans est celui des cartes. */
async function sansNotifications(page: Page) {
  await page.addInitScript(() => {
    delete (window as unknown as { PushManager?: unknown }).PushManager;
    Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (X11; Linux x86_64) Chrome/120 Safari/537.36" });
  });
}

/** Avance jusqu'à l'écran dont le titre est donné. */
async function allerA(page: Page, titre: string) {
  const h = visite(page).getByRole("heading", { name: titre });
  for (let i = 0; i < 8 && !(await h.isVisible()); i++) await suivant(page).click();
  await expect(h).toBeVisible();
}

test("compte neuf musicien + Médias : « Tu joues le dimanche », « Ton équipe : Médias », « Commencer » écrit version 2", async ({ page }) => {
  await sansNotifications(page);
  const db = await signInAs(page, MUSICIENNE, {}, "/moi");
  await expect(visite(page)).toBeVisible();
  await suivant(page).click();
  await suivant(page).click();
  await expect(visite(page).getByRole("heading", { name: "Tu joues le dimanche" })).toBeVisible();
  await expect(visite(page).getByText("Musicien · Culte Franco")).toBeVisible();
  await suivant(page).click();
  await expect(visite(page).getByRole("heading", { name: "Ton équipe : Médias" })).toBeVisible();
  await expect(visite(page).getByText("Médias · membre")).toBeVisible();
  await suivant(page).click();
  await visite(page).getByRole("button", { name: "Commencer" }).click();
  await expect(visite(page)).toHaveCount(0);
  await expect.poll(() => db.doc(`onboarding/${MUSICIENNE.uid}`)?.version).toBe(2);
  expect(db.doc(`onboarding/${MUSICIENNE.uid}`)?.vu).toBe(true);
});

test("un compte qui avait vu l'accueil du lot 8 revoit la visite : « La visite a changé », « Bonjour Nina »", async ({ page }) => {
  const db = await signInAs(page, { ...NEUF, accueil: false, accueilLot8: true }, {}, "/moi");
  await expect(visite(page)).toBeVisible();
  await expect(visite(page).getByText("La visite a changé")).toBeVisible();
  await expect(visite(page).getByRole("heading", { name: "Bonjour Nina" })).toBeVisible();
  await visite(page).getByRole("button", { name: "Passer" }).click();
  await expect(visite(page)).toHaveCount(0);
  await expect.poll(() => db.doc(`onboarding/${NEUF.uid}`)?.version).toBe(2);
});

test("compte neuf sans rôle ni équipe : quatre écrans au plus, carte « La vie de l'église »", async ({ page }) => {
  await sansNotifications(page);
  await signInAs(page, NEUF, {}, "/moi");
  await expect(visite(page)).toBeVisible();
  await expect(visite(page).getByText("Étape 1 sur 4")).toBeAttached();
  await suivant(page).click();
  await suivant(page).click();
  await expect(visite(page).getByRole("heading", { name: "La vie de l'église" })).toBeVisible();
  await expect(visite(page).getByText("Étape 3 sur 4")).toBeAttached();
  await suivant(page).click();
  await expect(visite(page).getByRole("button", { name: "Commencer" })).toBeVisible();
});

test("« Voir dans le guide » sur la carte musicien mène à /guide#performance et ferme la visite", async ({ page }) => {
  await sansNotifications(page);
  await signInAs(page, MUSICIENNE, {}, "/moi");
  await allerA(page, "Tu joues le dimanche");
  await visite(page).getByRole("link", { name: "Voir dans le guide" }).click();
  await expect(page).toHaveURL(/\/guide\/?#performance$/);
  await expect(visite(page)).toHaveCount(0);
});

// ── 7. Agencement ───────────────────────────────────────────────────────────

const RESPONSABLE: FakeProfile = { ...MUSICIENNE, dansEquipes: ["louange"], referentDe: ["louange", "comite-paix"] };

test("téléphone : la fenêtre occupe toute la vue", async ({ page }, info) => {
  test.skip(!estTelephone(info), "propre au téléphone");
  await signInAs(page, MUSICIENNE, {}, "/moi");
  const vue = page.viewportSize()!;
  const d = visite(page);
  await expect(d).toBeVisible();
  const b = (await d.boundingBox())!;
  expect(Math.abs(b.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(b.width - vue.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(b.height - vue.height)).toBeLessThanOrEqual(2);
});

test("tablette paysage et ordinateur 1440 : fenêtre centrée, 448 px au plus", async ({ page }, info) => {
  test.skip(!["tablette-paysage", "ordinateur-1440"].includes(info.project.name), "propre aux grands écrans");
  await signInAs(page, MUSICIENNE, {}, "/moi");
  const vue = page.viewportSize()!;
  const d = visite(page);
  await expect(d).toBeVisible();
  const b = (await d.boundingBox())!;
  expect(Math.abs(b.x - (vue.width - (b.x + b.width)))).toBeLessThanOrEqual(2);
  expect(b.width).toBeLessThanOrEqual(448);
  expect(b.width).toBeGreaterThan(300);
});

test("rien ne déborde horizontalement sur les cartes service et responsabilités", async ({ page }) => {
  await sansNotifications(page);
  await signInAs(page, RESPONSABLE, {}, "/moi");
  const d = visite(page);
  await expect(d).toBeVisible();
  for (const titre of ["Tu joues le dimanche", "Tes responsabilités"]) {
    await allerA(page, titre);
    // L'écran entre d'un glissé de 12 px (accueil-in) : on mesure une fois posé.
    await expect.poll(() => d.evaluate((el) => el.scrollWidth - el.clientWidth), { message: titre }).toBeLessThanOrEqual(0);
  }
});

// ── 5. Revoir la visite ─────────────────────────────────────────────────────

const DEJA_VU: FakeProfile = { ...MUSICIENNE, accueil: false };
const ecritsOnboarding = (db: Awaited<ReturnType<typeof signInAs>>) => db.writes.filter((w) => w.path.startsWith("onboarding/"));

test("Moi › « Revoir la visite » rouvre la visite, et la fermer n'écrit rien", async ({ page }) => {
  const db = await signInAs(page, DEJA_VU, {}, "/moi");
  await expect(page.getByRole("heading", { name: "Moi", level: 1 })).toBeVisible();
  await expect(visite(page)).toHaveCount(0);
  await page.getByRole("button", { name: /Revoir la visite/ }).click();
  await expect(visite(page)).toBeVisible();
  // Revoir : pas la pastille « La visite a changé », et la visite repart de Bienvenue.
  await expect(visite(page).getByRole("heading", { name: "Bienvenue dans GCC" })).toBeVisible();
  await expect(visite(page).getByText("La visite a changé")).toHaveCount(0);
  await visite(page).getByRole("button", { name: "Passer" }).click();
  await expect(visite(page)).toHaveCount(0);
  expect(ecritsOnboarding(db)).toEqual([]);
  expect(db.doc(`onboarding/${DEJA_VU.uid}`)?.le).toBe("2026-09-01T10:00:00Z");
  // Une seconde ouverture repart de l'écran 1.
  await page.getByRole("button", { name: /Revoir la visite/ }).click();
  await expect(visite(page).getByText(/^Étape 1 sur/)).toBeAttached();
});

test("Guide › encart « Pour toi, en 2 cartes » : « Revoir la visite » rouvre sans rien écrire", async ({ page }) => {
  const db = await signInAs(page, DEJA_VU, {}, "/guide");
  await expect(page.getByText("Pour toi, en 2 cartes")).toBeVisible();
  await page.getByRole("button", { name: "Revoir la visite" }).click();
  await expect(visite(page)).toBeVisible();
  await visite(page).getByRole("button", { name: "Passer" }).click();
  await expect(visite(page)).toHaveCount(0);
  expect(ecritsOnboarding(db)).toEqual([]);
});

test("Guide › un compte sans rôle ni équipe : « Pour toi, en 1 carte », au singulier", async ({ page }) => {
  await signInAs(page, { ...NEUF, accueil: false }, {}, "/guide");
  await expect(page.getByText("Pour toi, en 1 carte", { exact: true })).toBeVisible();
});

test("revoir : « Voir dans le guide » ferme la visite sans rien écrire", async ({ page }) => {
  await sansNotifications(page);
  const db = await signInAs(page, DEJA_VU, {}, "/moi");
  await page.getByRole("button", { name: /Revoir la visite/ }).click();
  await allerA(page, "Tu joues le dimanche");
  await visite(page).getByRole("link", { name: "Voir dans le guide" }).click();
  await expect(page).toHaveURL(/\/guide\/?#performance$/);
  await expect(visite(page)).toHaveCount(0);
  expect(ecritsOnboarding(db)).toEqual([]);
});
