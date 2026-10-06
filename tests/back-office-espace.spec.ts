import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { entreesBackOffice, estResponsable, widgetsPermis } from "../src/lib/access";
import { entreesBarre } from "../src/lib/navigation";
import type { UserProfile } from "../src/types/user";

// Lot U6 (docs/spec-back-office.md), tranche B1 — l'espace « Back-Office » :
// qui est responsable (Q1), quelles entrées chacun voit (Q2, menu à 8 entrées dont
// Statistiques, là depuis U7 S2 ; Calendrier, depuis U8 C3), quels widgets il pourra
// ajouter, le sélecteur « App · Back-Office » dans les places de U4 (Q6 ; téléphone :
// à la place du label, question 5), la mémoire de la dernière page de chaque espace,
// et « Réservé aux responsables » pour les autres.
// Lancé aussi sur `tablette-paysage` et `ordinateur-1440` (SPECS_GRAND_ECRAN, Q16 de U4).

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Alice, pôle Événement (Réussite 2). */
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
const DA: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Bruno", lastName: "M.", poles: ["da"] };
const PLANNINGS: FakeProfile = { uid: "uid-pl", email: "pl@example.com", plannings: ["culte"] };
const NOTIFY: FakeProfile = { uid: "uid-no", email: "no@example.com", notify: ["Groupe Paix"] };
const ANNONCES: FakeProfile = { uid: "uid-an", email: "an@example.com", annonces: ["Culte Francophone"] };
const EQUIPIER: FakeProfile = { uid: "uid-eq", email: "eq@example.com", equipes: true };
const REFERENT: FakeProfile = { uid: "uid-ref", email: "ref@example.com", dansEquipes: ["regie"], referentDe: ["regie"] };
const MEMBRE_EQUIPE: FakeProfile = { uid: "uid-me", email: "me@example.com", dansEquipes: ["regie"] };
/** Un choriste sans autre droit (Réussite 1) : le pôle Louange implicite ne compte pas (question 2). */
const CHORISTE: FakeProfile = {
  uid: "uid-ch", email: "ch@example.com", firstName: "Chloé", lastName: "R.", planningName: "Chloé R.",
  serviceRoles: { "Culte Francophone": ["chanteur"] },
};
const MUSICIEN: FakeProfile = { uid: "uid-mu", email: "mu@example.com", serviceRoles: { "Culte Francophone": ["musicien"] } };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: p.planningName ?? "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], poles: p.poles ?? [],
    equipes: p.equipes ?? false, plannings: p.plannings ?? [], dansEquipes: p.dansEquipes, referentDe: p.referentDe,
  }) as UserProfile;

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const estTablettePaysage = (info: TestInfo) => info.project.name === "tablette-paysage";
const estTelephone = (info: TestInfo) => info.project.name === "telephone";
/** Le planning lit un Google Sheet public : jamais le vrai depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

/** Le label contextuel de la barre du haut (dans le lien du logo). */
// `header.barre-haut` : la navbar ; l'en-tête de page (EnTetePage, agencement v18) est aussi un <header>.
const labelDuHaut = (page: Page) => page.locator("header.barre-haut").getByRole("link").first().getByText("Louange", { exact: true });
/** Le sélecteur visible dans la disposition courante (barre du haut, ou barre latérale dépliée). */
const selecteur = (page: Page) => page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true });

/** Sur la tablette en paysage, la barre est réduite : on la déplie pour atteindre le sélecteur et le menu. */
async function deplierSiTablettePaysage(page: Page, info: TestInfo) {
  if (!estTablettePaysage(info)) return;
  await page.getByTestId("barre-laterale").getByRole("button", { name: /Déplier la barre latérale|展开侧边栏/ }).tap();
  await expect(page.getByTestId("barre-par-dessus")).toBeVisible();
}

/** Le menu du Back-Office : la barre latérale sur grand écran ; sur téléphone et tablette en
 *  portrait, la barre du bas du Back-Office (B6 : 4 onglets + « Plus »). */
function menu(page: Page, info: TestInfo) {
  if (estOrdinateur(info)) return page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" });
  if (estTablettePaysage(info)) return page.getByTestId("barre-par-dessus").getByRole("navigation", { name: "Navigation principale" });
  return page.getByTestId("barre-du-bas");
}

test.describe("Back-Office (B1) : qui est responsable (Q1)", () => {
  test("admin, pôle, plannings, notify, annonces, droit Équipes, référent : oui", () => {
    for (const p of [ADMIN, ALICE, DA, PLANNINGS, NOTIFY, ANNONCES, EQUIPIER, REFERENT]) {
      expect(estResponsable(user(p), profil(p)), p.uid).toBe(true);
    }
  });

  test("choriste ou musicien seul, membre d'équipe non référent, visiteur : non", () => {
    for (const p of [CHORISTE, MUSICIEN, MEMBRE_EQUIPE]) {
      expect(estResponsable(user(p), profil(p)), p.uid).toBe(false);
    }
    expect(estResponsable(null, null)).toBe(false);
    // Un admin l'est même sans profil.
    expect(estResponsable(user(ADMIN), null)).toBe(true);
  });
});

test.describe("Back-Office (B1) : les entrées selon les droits (Q2)", () => {
  test("un admin voit 8 entrées (Calendrier depuis U8 C3, Statistiques depuis U7 S2)", () => {
    expect(entreesBackOffice(user(ADMIN), profil(ADMIN))).toEqual(["tableau", "calendrier", "planning", "taches", "evenements", "equipes", "messages", "statistiques"]);
  });

  test("Alice (pôle Événement) : Tableau de bord, Calendrier, Tâches, Évènements — pas de Planning", () => {
    expect(entreesBackOffice(user(ALICE), profil(ALICE))).toEqual(["tableau", "calendrier", "taches", "evenements"]);
  });

  test("chaque droit ouvre ses entrées, et rien d'autre", () => {
    const cas: [FakeProfile, string[]][] = [
      [DA, ["tableau", "calendrier", "taches", "evenements"]],
      [PLANNINGS, ["tableau", "calendrier", "planning"]],
      // `notify` donne Messages, et Planning s'il permet de publier un trimestre (canPublishPlanning).
      [NOTIFY, ["tableau", "calendrier", "planning", "messages"]],
      [{ ...NOTIFY, uid: "uid-no2", notify: ["Campus"] }, ["tableau", "calendrier", "messages"]],
      [ANNONCES, ["tableau", "calendrier", "evenements"]],
      [EQUIPIER, ["tableau", "calendrier", "equipes"]],
      [REFERENT, ["tableau", "calendrier", "evenements"]],
      // Le pôle Louange implicite ne fait pas un responsable, mais compte pour Tâches et Évènements d'un responsable.
      [{ ...NOTIFY, uid: "uid-no3", serviceRoles: { "Culte Francophone": ["musicien"] } }, ["tableau", "calendrier", "planning", "taches", "evenements", "messages"]],
    ];
    for (const [p, attendu] of cas) expect(entreesBackOffice(user(p), profil(p)), p.uid).toEqual(attendu);
  });

  test("un non-responsable n'a aucune entrée", () => {
    for (const p of [CHORISTE, MUSICIEN, MEMBRE_EQUIPE]) expect(entreesBackOffice(user(p), profil(p)), p.uid).toEqual([]);
    expect(entreesBackOffice(null, null)).toEqual([]);
  });

  test("les entrées deviennent celles des barres dans l'espace « back-office », aux adresses de Q4", () => {
    const entrees = entreesBarre("back-office", { connecte: true, backOffice: true, permises: entreesBackOffice(user(ADMIN), profil(ADMIN)) });
    expect(entrees.map((e) => e.href)).toEqual([
      "/back-office", "/back-office/calendrier", "/back-office/planning", "/back-office/taches", "/back-office/evenements", "/back-office/equipes", "/back-office/messages",
      "/back-office/statistiques",
    ]);
    // L'espace « app » ne change pas.
    expect(entreesBarre("app", { connecte: true, backOffice: true }).map((e) => e.href)).toEqual(["/songs", "/setlists", "/planning", "/evenements", "/moi"]);
  });
});

test.describe("Back-Office (B1) : les widgets permis (table des widgets)", () => {
  test("un admin : tous ceux de U6, le Calendrier de U8 et Chants les plus joués (U7, S5)", () => {
    expect(widgetsPermis(user(ADMIN), profil(ADMIN))).toEqual(["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "scene", "comptes", "raccourcis"]);
  });

  test("Alice : ni Setlists à préparer (elle ne crée pas de setlist), ni Cases vides, ni Comptes", () => {
    expect(widgetsPermis(user(ALICE), profil(ALICE))).toEqual(["dimanche", "calendrier", "afaire", "evenements", "petitdej", "scene", "raccourcis"]);
  });

  test("un responsable musicien des plannings : Setlists à préparer et Cases vides ; un non-responsable : rien", () => {
    const p = { ...PLANNINGS, serviceRoles: { "Culte Francophone": ["musicien"] } };
    expect(widgetsPermis(user(p), profil(p))).toEqual(["dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "petitdej", "scene", "raccourcis"]);
    expect(widgetsPermis(user(CHORISTE), profil(CHORISTE))).toEqual([]);
  });
});

test.describe("Back-Office (B1) : rien de neuf pour l'assemblée", () => {
  test("un choriste ne voit aucun sélecteur ; le label et les entrées de l'App sont inchangés", async ({ page }, info) => {
    await signInAs(page, CHORISTE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await deplierSiTablettePaysage(page, info);
    await expect(page.getByRole("group", { name: "Choisir l'espace" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Back-Office/ })).toHaveCount(0);
    if (!estOrdinateur(info) && !estTablettePaysage(info)) {
      await expect(labelDuHaut(page)).toBeVisible();
    }
  });

  test("« /back-office » répond « Réservé aux responsables » à un choriste", async ({ page }) => {
    await signInAs(page, CHORISTE, {}, "/back-office");
    await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toHaveCount(0);
  });

  test("un visiteur sans compte : « Réservé aux responsables » et « Se connecter »", async ({ page }) => {
    await page.goto("/back-office");
    await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", /^\/login\/?\?from=%2Fback-office$/);
  });
});

test.describe("Back-Office (B1) : le sélecteur et le menu", () => {
  test("un admin passe de l'App au Back-Office : tableau de bord, 7 entrées, espace marqué", async ({ page }, info) => {
    await sansSheet(page);
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await deplierSiTablettePaysage(page, info);
    await expect(selecteur(page).getByRole("link", { name: "App" })).toHaveAttribute("aria-current", "true");
    await expect(selecteur(page).getByRole("link", { name: "Back-Office" })).not.toHaveAttribute("aria-current", "true");
    await selecteur(page).getByRole("link", { name: "Back-Office" }).click();
    await expect(page).toHaveURL(/\/back-office\/?$/);
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await expect(selecteur(page).getByRole("link", { name: "Back-Office" })).toHaveAttribute("aria-current", "true");
    await expect(menu(page, info).getByRole("link")).toHaveText(
      estOrdinateur(info) || estTablettePaysage(info)
        ? ["Tableau de bord", "Calendrier", "Planning", "Tâches", "Évènements", "Équipes", "Messages", "Statistiques"]
        // Barre du bas (B6, Q13) : défaut Accueil · Calendrier · Tâches · Planning, puis « Plus »
        // (Statistiques, U7, est dans la page « Plus »).
        : ["Accueil", "Calendrier", "Tâches", "Planning", "Plus"],
    );
    const tableau = estOrdinateur(info) || estTablettePaysage(info) ? "Tableau de bord" : "Accueil";
    await expect(menu(page, info).getByRole("link", { name: tableau })).toHaveAttribute("aria-current", "page");
  });

  test("Alice voit Tableau de bord, Calendrier, Tâches, Évènements", async ({ page }, info) => {
    await signInAs(page, ALICE, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await expect(menu(page, info).getByRole("link")).toHaveText(
      estOrdinateur(info) || estTablettePaysage(info)
        ? ["Tableau de bord", "Calendrier", "Tâches", "Évènements"]
        : ["Accueil", "Calendrier", "Tâches", "Évènements", "Plus"],
    );
  });

  test("une entrée du menu mène à sa page du Back-Office (Tâches : le pôle de la personne, B3)", async ({ page }, info) => {
    await signInAs(page, ALICE, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await menu(page, info).getByRole("link", { name: "Tâches" }).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/evenement\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tâches" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Événement" })).toBeVisible();
    // Le sélecteur reste dans l'espace Back-Office.
    await deplierSiTablettePaysage(page, info);
    await expect(selecteur(page).getByRole("link", { name: "Back-Office" })).toHaveAttribute("aria-current", "true");
  });

  test("une entrée inconnue répond 404 (Calendrier, U8, et Statistiques, U7, sont arrivés)", async ({ page }) => {
    await signInAs(page, ALICE, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    expect((await page.goto("/back-office/nimporte-quoi"))?.status()).toBe(404);
  });

  test("le sélecteur rouvre la dernière page de chaque espace (mémoire de session)", async ({ page }, info) => {
    await sansSheet(page);
    await signInAs(page, ALICE, {}, "/setlists");
    await page.getByRole("heading", { name: "Setlists" }).first().waitFor();
    await deplierSiTablettePaysage(page, info);
    // Rien encore en mémoire côté Back-Office : le tableau de bord.
    await expect(selecteur(page).getByRole("link", { name: "Back-Office" })).toHaveAttribute("href", /^\/back-office\/?$/);
    await selecteur(page).getByRole("link", { name: "Back-Office" }).click();
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await menu(page, info).getByRole("link", { name: "Évènements" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/?$/);
    await deplierSiTablettePaysage(page, info);
    await expect(selecteur(page).getByRole("link", { name: "App" })).toHaveAttribute("href", /^\/setlists\/?$/);
    await selecteur(page).getByRole("link", { name: "App" }).click();
    await expect(page).toHaveURL(/\/setlists\/?$/);
    await deplierSiTablettePaysage(page, info);
    await expect(selecteur(page).getByRole("link", { name: "Back-Office" })).toHaveAttribute("href", /^\/back-office\/evenements\/?$/);
    // Une nouvelle session (mémoire vidée) repart des défauts : le tableau de bord, et /planning côté App.
    await page.evaluate(() => sessionStorage.clear());
    await page.goto("/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await expect(selecteur(page).getByRole("link", { name: "App" })).toHaveAttribute("href", /^\/planning\/?$/);
  });

  test("téléphone : le sélecteur prend la place du label, la langue passe par Moi", async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone");
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const enTete = page.locator("header.barre-haut");
    await expect(selecteur(page)).toBeVisible();
    await expect(labelDuHaut(page)).toBeHidden();
    await expect(enTete.getByRole("button", { name: "切换为中文" })).toBeHidden();
    await expect(enTete.getByRole("button", { name: "Notifications" })).toBeVisible();
    const s = (await selecteur(page).boundingBox())!;
    expect(s.x + s.width, "dans l'écran").toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("tablette en portrait : label, puis sélecteur, cloche et langue", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "propre à la tablette en portrait");
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const enTete = page.locator("header.barre-haut");
    const label = labelDuHaut(page);
    await expect(label).toBeVisible();
    await expect(selecteur(page)).toBeVisible();
    expect((await selecteur(page).boundingBox())!.x, "après le label").toBeGreaterThan((await label.boundingBox())!.x);
    await expect(enTete.getByRole("button", { name: "切换为中文" })).toBeVisible();
  });

  test("grand écran : le sélecteur sous le label de la barre dépliée, absent de la barre réduite", async ({ page }, info) => {
    test.skip(!estOrdinateur(info) && !estTablettePaysage(info), "propre aux grands écrans");
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const barre = page.getByTestId("barre-laterale");
    if (estOrdinateur(info)) {
      const place = barre.getByTestId("place-selecteur");
      await expect(place.getByRole("group", { name: "Choisir l'espace" })).toBeVisible();
      await barre.getByRole("button", { name: "Réduire la barre latérale" }).click();
    }
    // Réduite : ni label, ni sélecteur (U4, question 2) ; on change d'espace en dépliant.
    await expect(barre.getByRole("group", { name: "Choisir l'espace" })).toBeHidden();
    if (estOrdinateur(info)) {
      await barre.getByRole("button", { name: "Déplier la barre latérale" }).click();
      await expect(barre.getByRole("group", { name: "Choisir l'espace" })).toBeVisible();
    } else {
      await deplierSiTablettePaysage(page, info);
      await page.getByTestId("barre-par-dessus").getByRole("link", { name: "Back-Office" }).tap();
      await expect(page).toHaveURL(/\/back-office\/?$/);
      // Le choix d'un espace referme la barre posée par-dessus.
      await expect(page.getByTestId("barre-par-dessus")).toHaveCount(0);
    }
  });

  test("en 中文 : 应用 · 后台, et le menu traduit", async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await signInAs(page, ALICE, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await expect(page.getByRole("group", { name: "选择空间" }).filter({ visible: true }).getByRole("link")).toHaveText(["应用", "后台"]);
  });
});

// Relecture du lot U6 : les pastilles de Q15 sont aussi celles de la barre latérale
// (« Écrans ordinateur : entrées permises (icônes, pastilles) », planche bo-tableau-de-bord).
test.describe("Back-Office : pastilles de la barre latérale (Q15)", () => {
  const PASTILLES = {
    "reports/r1": { kind: "site", title: "Lien mort", status: "pending", createdAt: "2026-09-30T10:00:00Z" },
    "reports/r2": { kind: "site", title: "Réglé", status: "resolved", createdAt: "2026-09-29T10:00:00Z" },
    "songProposals/p1": { title: "Un chant", youtubeUrl: "https://example.com/v", status: "pending", createdAt: "2026-09-30T10:00:00Z" },
    // À faire pour l'admin : la sienne en retard et une sans responsable ; pas celle d'un autre.
    "poles/da/taches/t1": { titre: "Affiche", responsableUid: "uid-admin", responsableNom: "Admin T.", echeance: "2026-09-28", repetition: null },
    "poles/orga/taches/t2": { titre: "Salle", responsableUid: null, responsableNom: "", echeance: "2026-10-05", repetition: null },
    "poles/media/taches/t3": { titre: "Photos", responsableUid: "uid-autre", responsableNom: "Pers. B", echeance: "2026-10-05", repetition: null },
    "poles/da/taches/t4": { titre: "Fond du culte", responsableUid: "uid-da", responsableNom: "Bruno M.", echeance: "2026-10-03", repetition: null },
  };

  test("grand écran : Tâches (à faire pour moi) et Messages (en attente) portent leur compte", async ({ page }, info) => {
    test.skip(!estOrdinateur(info) && !estTablettePaysage(info), "propre aux grands écrans");
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, ADMIN, PASTILLES, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    const entree = (nom: string) => menu(page, info).getByRole("link", { name: nom, exact: true });
    await expect(entree("Tâches").getByTestId("pastille")).toHaveText("2");
    await expect(entree("Messages").getByTestId("pastille")).toHaveText("2");
    await expect(entree("Planning").getByTestId("pastille")).toHaveCount(0);
    // Dans l'App, la barre latérale n'a pas de pastille.
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(page.getByTestId("barre-laterale").getByTestId("pastille")).toHaveCount(0);
  });

  test("un responsable qui n'est pas admin : Tâches compte, Messages n'est pas lu", async ({ page }, info) => {
    test.skip(!estOrdinateur(info), "propre à l'ordinateur");
    const lus: string[] = [];
    page.on("request", (r) => { if (r.url().includes(":runQuery")) lus.push(r.postData() ?? ""); });
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, { ...DA, notify: ["Groupe Paix"] }, PASTILLES, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expect(menu(page, info).getByRole("link", { name: "Tâches", exact: true }).getByTestId("pastille")).toHaveText("1");
    await expect(menu(page, info).getByRole("link", { name: "Messages", exact: true }).getByTestId("pastille")).toHaveCount(0);
    expect(lus.filter((b) => b.includes("\"reports\"") || b.includes("\"songProposals\""))).toEqual([]);
  });

  test("téléphone et tablette en portrait : la barre latérale, cachée, ne lit rien", async ({ page }, info) => {
    test.skip(estOrdinateur(info) || estTablettePaysage(info), "propre au téléphone et à la tablette en portrait");
    const lus: string[] = [];
    page.on("request", (r) => { if (r.url().includes(":runQuery")) lus.push(r.postData() ?? ""); });
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, ADMIN, PASTILLES, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expect(page.getByTestId("barre-du-bas").getByRole("link").first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(lus.filter((b) => b.includes("\"reports\"") || b.includes("\"songProposals\""))).toEqual([]);
  });

  // Comparée à la planche bo-tableau-de-bord (barre latérale : Tâches 3, Messages 2).
  test("capture : la barre latérale et ses pastilles (à regarder)", async ({ page }, info) => {
    test.skip(!estOrdinateur(info) && !estTablettePaysage(info), "propre aux grands écrans");
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, ADMIN, PASTILLES, "/back-office");
    await page.goto("/back-office/taches/da");
    await expect(page.getByRole("heading", { level: 1, name: "Tâches" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await expect(menu(page, info).getByRole("link", { name: "Messages", exact: true }).getByTestId("pastille")).toHaveText("2");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/back-office-captures/${info.project.name}-pastilles.png` });
  });

  test("Messages : seuls les signalements et propositions en attente sont lus", async ({ page }, info) => {
    test.skip(!estOrdinateur(info), "propre à l'ordinateur");
    const requetes: { from: { collectionId: string }[]; where?: unknown }[] = [];
    page.on("request", (r) => {
      if (!r.url().includes(":runQuery")) return;
      const q = (r.postDataJSON() as { structuredQuery: { from: { collectionId: string }[]; where?: unknown } }).structuredQuery;
      if (["reports", "songProposals"].includes(q.from[0].collectionId)) requetes.push(q);
    });
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, ADMIN, PASTILLES, "/back-office");
    await expect(menu(page, info).getByRole("link", { name: "Messages", exact: true }).getByTestId("pastille")).toHaveText("2");
    expect(requetes.map((q) => q.from[0].collectionId).sort()).toEqual(["reports", "songProposals"]);
    for (const q of requetes) {
      expect(q.where).toEqual({ fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "pending" } } });
    }
  });
});

test.describe("Back-Office (B1) : captures à regarder", () => {
  // Comparées aux planches bo-tableau-de-bord, bo-telephone-accueil, tablette-portrait-back-office.
  test("App puis Back-Office, d'un admin, dans chaque disposition", async ({ page }, info) => {
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: `test-results/back-office-captures/${info.project.name}-app.png` });
    await page.goto("/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: `test-results/back-office-captures/${info.project.name}-tableau.png` });
    if (estTablettePaysage(info)) {
      await deplierSiTablettePaysage(page, info);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/back-office-captures/${info.project.name}-deplie.png` });
    }
  });
});
