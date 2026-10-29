import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { notifie, remplit, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { entreesBackOffice } from "../src/lib/access";
import { ongletsBackOffice } from "../src/lib/navigation";
import type { UserProfile } from "../src/types/user";

// Lot U6 (docs/spec-back-office.md), tranche B6, refondue par la piste A (docs/spec-back-office-piste-a.md,
// BO-A : BO1, BO2) — la barre du bas du Back-Office, sur téléphone et tablette en portrait : cinq onglets
// FIXES, À faire · Calendrier · Planning · Équipes · App (seulement ceux que la personne a le droit de voir ;
// « App » = retour à l'espace app), Messages en icône à pastille dans l'en-tête, plus de « Personnaliser la
// barre » ni de page « Plus » (son adresse redirige). Le réglage `barreDuBas` du profil est ignoré, pas effacé.
// Les cas qui valent sur les cinq dispositions (ordre des entrées, captures) sont dans back-office-espace.spec.ts,
// qui tourne sur les cinq projets ; celui-ci n'est pas dans `SPECS_GRAND_ECRAN` (trois projets : ordinateur,
// téléphone, tablette) et `estGrandEcran` n'y écarte en pratique que l'ordinateur. Aucun nom réel.

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Pôle Événement (Réussite 2) et coordination (cochée). */
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", dansEquipes: ["evenementiel"], referentDe: ["evenementiel"], coordination: true };
const PLANNINGS: FakeProfile = { uid: "uid-pl", email: "pl@example.com", firstName: "Paul", lastName: "N.", plannings: ["culte"] };
/** Droit de notifier un groupe (Messages › Notifier seulement), et Planning par la publication. */
const NOTIFY: FakeProfile = { uid: "uid-no", email: "no@example.com", firstName: "Nora", lastName: "V.", notify: ["Groupe Paix"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: p.planningName ?? "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], coordination: p.coordination,
    equipes: p.equipes ?? false, plannings: p.plannings ?? [], dansEquipes: p.dansEquipes, referentDe: p.referentDe,
  }) as UserProfile;
const permises = (p: FakeProfile) => entreesBackOffice(user(p), profil(p));

const estGrandEcran = (info: TestInfo) => info.project.name.startsWith("ordinateur") || info.project.name === "tablette-paysage";
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
const barre = (page: Page) => page.getByTestId("barre-du-bas");
const onglets = (page: Page) => barre(page).getByRole("link");
const ecrituresBO = (db: FakeDb, uid: string) => db.writes.filter((w) => w.path === `backOffice/${uid}`);
const iconeMessages = (page: Page) => page.getByTestId("icone-messages");
const REPORTS = {
  "reports/r1": { kind: "site", title: "Lien mort", status: "pending", createdAt: "2026-09-30T10:00:00Z" },
  "reports/r2": { kind: "site", title: "Réglé", status: "resolved", createdAt: "2026-09-29T10:00:00Z" },
  "songProposals/p1": { title: "Un chant", youtubeUrl: "https://example.com/v", status: "pending", createdAt: "2026-09-30T10:00:00Z" },
};

async function ouvrir(page: Page, p: FakeProfile, docs: Record<string, Record<string, unknown>> = {}, to = "/back-office") {
  await sansSheet(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  const db = await signInAs(page, p, docs, to);
  await expect(onglets(page).first()).toBeVisible();
  return db;
}

// ─── Règles pures ────────────────────────────────────────────────────────────────

test.describe("Barre du bas (BO2) : règles pures", () => {
  test("cinq onglets fixes dans l'ordre, ceux qu'on a le droit de voir, puis App ; Messages n'y est jamais", () => {
    expect(ongletsBackOffice(permises(ADMIN)).map((o) => o.cle)).toEqual([
      "backOffice.entrees.afaire", "backOffice.entrees.calendrier", "backOffice.entrees.planning", "backOffice.entrees.equipes", "backOffice.barre.app",
    ]);
    expect(ongletsBackOffice(permises(PLANNINGS)).map((o) => o.cle)).toEqual([
      "backOffice.entrees.afaire", "backOffice.entrees.calendrier", "backOffice.entrees.planning", "backOffice.barre.app",
    ]);
    expect(ongletsBackOffice(["afaire", "calendrier", "messages"]).map((o) => o.cle)).not.toContain("backOffice.entrees.messages");
    expect(ongletsBackOffice([]), "pas de Back-Office, pas de barre").toEqual([]);
  });

  test("l'onglet App mène où on le dit, et n'est jamais la page courante", () => {
    const app = ongletsBackOffice(permises(ADMIN), "/setlists").at(-1)!;
    expect(app.href).toBe("/setlists");
    expect(app.actifSur).toEqual([]);
  });
});

// ─── Écrans (téléphone et tablette en portrait) ────────────────────────────────────

test.describe("Barre du bas (BO2) : la barre", () => {
  test.beforeEach(({}, info) => test.skip(estGrandEcran(info), "propre au téléphone et à la tablette en portrait"));

  test("un admin : À faire · Calendrier · Planning · Équipes · App, À faire marqué", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(onglets(page)).toHaveText(["À faire", "Calendrier", "Planning", "Équipes", "App"]);
    await expect(barre(page).getByRole("link", { name: "À faire" })).toHaveAttribute("aria-current", "page");
    await expect(barre(page).getByRole("link", { name: "À faire" })).toHaveAttribute("href", /^\/back-office\/?$/);
    await expect(barre(page).getByRole("link", { name: "Équipes" })).toHaveAttribute("href", /^\/back-office\/equipes\/?$/);
    // Ni Tâches, ni Plus, ni Messages : plus d'onglets mobiles pour eux.
    for (const nom of ["Tâches", "Plus", "Messages", "Évènements", "Réunions", "Statistiques"]) {
      await expect(barre(page).getByRole("link", { name: nom }), nom).toHaveCount(0);
    }
    await expect(page.getByTestId("menu-back-office")).toHaveCount(0);
  });

  test("Alice (référente) : seulement ses onglets, App toujours à droite", async ({ page }) => {
    await ouvrir(page, ALICE);
    await expect(onglets(page)).toHaveText(["À faire", "Calendrier", "Équipes", "App"]);
  });

  test("les onglets ont un nom accessible ; « App » dit où il mène", async ({ page }) => {
    await ouvrir(page, ADMIN);
    for (const nom of ["À faire", "Calendrier", "Planning", "Équipes", "Revenir à l'app"]) {
      await expect(barre(page).getByRole("link", { name: nom, exact: true }), nom).toBeVisible();
    }
  });

  test("« App » rouvre la dernière page de l'app (sinon /planning)", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(barre(page).getByRole("link", { name: "Revenir à l'app" })).toHaveAttribute("href", /^\/planning\/?$/);
    await barre(page).getByRole("link", { name: "Revenir à l'app" }).click();
    await expect(page).toHaveURL(/\/planning\/?$/);
    await expect(onglets(page)).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
  });

  test("la barre de l'App ne change pas, pour un responsable comme pour les autres", async ({ page }) => {
    await ouvrir(page, ADMIN, {}, "/songs");
    await expect(onglets(page)).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
    await expect(barre(page).getByRole("link", { name: "App", exact: true })).toHaveCount(0);
  });

  test("« Personnaliser la barre » a disparu, même avec une barre enregistrée dans le profil : le réglage est ignoré, pas effacé", async ({ page }) => {
    const enregistre = { barreDuBas: ["messages", "planning", "equipes", "tableau"], majLe: "2026-09-30T10:00:00Z" };
    const db = await ouvrir(page, { ...PLANNINGS, ...remplit("paix") }, { "backOffice/uid-pl": enregistre });
    await expect(onglets(page)).toHaveText(["À faire", "Calendrier", "Planning", "App"]);
    await expect(page.getByRole("button", { name: "Personnaliser la barre" })).toHaveCount(0);
    await expect(page.getByText("Personnaliser la barre")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Ta barre du bas" })).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(ecrituresBO(db, "uid-pl"), "aucune écriture neuve").toHaveLength(0);
    expect(db.doc("backOffice/uid-pl"), "le réglage n'est pas effacé").toEqual(enregistre);
  });

  test("la page « Plus » n'existe plus : son adresse ramène à /back-office", async ({ page }) => {
    await ouvrir(page, ADMIN, {}, "/back-office/plus");
    await expect(page).toHaveURL(/\/back-office\/?$/);
    await expect(page.getByRole("heading", { name: "À faire" })).toBeVisible();
    await expect(page.getByTestId("plus-entree")).toHaveCount(0);
  });

  test("une page hors de la barre ne marque aucun onglet", async ({ page }) => {
    await ouvrir(page, ADMIN, {}, "/back-office/statistiques");
    await expect(barre(page).locator("[aria-current]")).toHaveCount(0);
    await page.goto("/back-office/equipes");
    await expect(barre(page).getByRole("link", { name: "Équipes" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("Messages dans l'en-tête (BO2)", () => {
  test.beforeEach(({}, info) => test.skip(estGrandEcran(info), "propre au téléphone et à la tablette en portrait"));

  test("un admin : l'icône à côté de la cloche, avec la pastille des non-lus et un nom qui dit le nombre", async ({ page }) => {
    await ouvrir(page, ADMIN, REPORTS);
    const enTete = page.locator("header.barre-haut");
    const icone = enTete.getByTestId("icone-messages");
    await expect(icone).toBeVisible();
    await expect(icone).toHaveAttribute("href", /^\/back-office\/messages\/?$/);
    await expect(icone.getByTestId("pastille")).toHaveText("2");
    await expect(icone).toHaveAttribute("aria-label", "Messages, 2 non lus");
    // À côté de la cloche, avant elle.
    const [m, c] = [await icone.boundingBox(), await enTete.getByRole("button", { name: "Notifications" }).boundingBox()];
    expect(m!.x + m!.width, "avant la cloche").toBeLessThanOrEqual(c!.x);
    expect(Math.abs((m!.y + m!.height / 2) - (c!.y + c!.height / 2)), "même ligne").toBeLessThan(4);
    await icone.click();
    await expect(page).toHaveURL(/\/back-office\/messages/);
  });

  test("sans signalement en attente : l'icône est là, sans pastille, nommée « Messages »", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(iconeMessages(page)).toHaveAttribute("aria-label", "Messages");
    await expect(iconeMessages(page).getByTestId("pastille")).toHaveCount(0);
  });

  test("qui n'a pas l'entrée Messages n'a pas l'icône ; l'App non plus", async ({ page }) => {
    await ouvrir(page, PLANNINGS);
    await expect(iconeMessages(page)).toHaveCount(0);
    await page.goto("/songs");
    await expect(page.getByRole("searchbox")).toBeVisible();
    await expect(iconeMessages(page)).toHaveCount(0);
  });

  test("dans l'App, un admin n'a pas l'icône : elle est propre au Back-Office", async ({ page }) => {
    await ouvrir(page, ADMIN, REPORTS, "/songs");
    await expect(iconeMessages(page)).toHaveCount(0);
  });

  test("un responsable qui notifie sans être admin : l'icône sans pastille, rien n'est lu", async ({ page }) => {
    const lus: string[] = [];
    page.on("request", (r) => { if (r.url().includes(":runQuery")) lus.push(r.postData() ?? ""); });
    await ouvrir(page, { ...NOTIFY, ...notifie("Groupe Paix") }, REPORTS);
    await expect(iconeMessages(page)).toBeVisible();
    await expect(iconeMessages(page).getByTestId("pastille")).toHaveCount(0);
    expect(lus.filter((b) => b.includes("\"reports\"") || b.includes("\"songProposals\""))).toEqual([]);
  });

  test("en 中文", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, ADMIN, REPORTS);
    await expect(onglets(page)).toHaveText(["待办", "日历", "排班表", "团队", "应用"]);
    await expect(barre(page).getByRole("link", { name: "返回应用" })).toBeVisible();
    await expect(iconeMessages(page)).toHaveAttribute("aria-label", "消息，2 条未读");
  });
});

test.describe("Barre du bas (BO4) : un simple membre d'équipe", () => {
  test.beforeEach(({}, info) => test.skip(estGrandEcran(info), "propre au téléphone et à la tablette en portrait"));

  test("pas de barre du Back-Office : « Réservé aux responsables », et sa barre de l'App est celle de tous", async ({ page }) => {
    const membre: FakeProfile = { uid: "uid-me", email: "me@example.com", firstName: "Maé", lastName: "L.", dansEquipes: ["regie"] };
    await sansSheet(page);
    await signInAs(page, membre, {}, "/back-office");
    await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
    await expect(page.getByTestId("icone-messages")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Choisir l'espace" })).toHaveCount(0);
    await expect(barre(page).getByRole("link", { name: "À faire" })).toHaveCount(0);
  });
});

// ─── Cibles de l'en-tête (BO-E2) ─────────────────────────────────────────────────

test.describe("En-tête du back-office (BO-E2) : cibles de toucher de 44 × 44 px", () => {
  test("sélecteur App / Back-Office, logo et Compte : la zone qui répond fait 44 px, sans changer le dessin", async ({ page }) => {
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, ADMIN, {}, "/back-office");
    await expect(page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true }).first()).toBeVisible();
    const cibles = [
      page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true }).first().getByRole("link", { name: "App" }),
      page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true }).first().getByRole("link", { name: "Back-Office" }),
      page.getByRole("link", { name: /GCC Logo/ }).filter({ visible: true }).first(),
      page.getByRole("button", { name: "Compte" }).filter({ visible: true }).first(),
    ];
    for (const cible of cibles) {
      // Le bouton Compte n'est pas dans l'en-tête du téléphone : seules les cibles posées sont mesurées.
      if (!(await cible.count())) continue;
      await expect(cible).toBeVisible();
      // La zone de toucher est le ::after posé sur la cible, hors dessin (`elementFromPoint` serait gêné par le
      // voyant de Next en développement) : sa taille mesurée, et elle doit contenir la cible.
      const zone = await cible.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const z = getComputedStyle(el, "::after");
        const w = parseFloat(z.width), h = parseFloat(z.height);
        return { position: z.position, w: Math.max(w || 0, r.width), h: Math.max(h || 0, r.height), dessinW: r.width, dessinH: r.height };
      });
      const nom = await cible.evaluate((el) => el.outerHTML.slice(0, 60));
      expect(zone.w, nom).toBeGreaterThanOrEqual(44);
      expect(zone.h, nom).toBeGreaterThanOrEqual(44);
    }
  });
});
