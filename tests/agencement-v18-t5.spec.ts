import { expect, test, type Page } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";
import {
  enTete, estGrandEcran, fenetreDuSite, interdireDialoguesNatifs, ongletsRail, pilules,
  repondreDansLeSite, verifierAgencement,
} from "./helpers/agencement";
import type { MembreEquipe } from "../src/types/equipe";

// Agencement v18, tranche T5 (docs/spec-agencement-v18.md, B8 à B12) : Back-Office › Équipes
// (Organigramme en bandeau, « Recalculer » dans l'en-tête, crayon → panneau d'édition ;
// Personnes en deux volets, inscriptions en tête, `?uid=`) et Messages (un seul en-tête pour
// les trois onglets ; Réception « ⋯ », chant signalé, du même membre ; Notifier avec l'aperçu et
// les derniers envois ; Questionnaire en deux volets). Firestore et Sheets simulés ; personnes
// fictives ; aucune notification réelle (la route d'envoi est simulée).

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };

const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

const PROFIL = (prenom: string, nom: string, over: Record<string, unknown> = {}) => ({
  email: `${prenom.toLowerCase()}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`,
  serviceRoles: {}, annonces: [], notify: [], poles: [], equipes: false, plannings: [], ...over,
});

const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da": {
    pole: "da",
    membres: [M("Bérénice A.", { uid: "u-berenice", mention: "Référente", referent: true }), M("Côme E.", { essai: true })],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  // La base simulée date tous les comptes du 01/01/2026 (`createTime`) : « Récents » garde l'ordre
  // de `listProfiles` (par nom) ; aucun compte n'a moins de sept jours au 06/10/2026.
  "users/u-berenice": PROFIL("Bérénice", "A.", { serviceRoles: { "Culte Francophone": ["musicien"] }, poles: ["da"] }),
  "users/u-gaspard": PROFIL("Gaspard", "O.", { serviceRoles: { "Culte Francophone": ["presidence"] }, plannings: ["culte"] }),
  "users/u-ysee": PROFIL("Ysée", "R."),
  "config/app": { registrationOpen: true },
};

/** Le Culte Franco : Bérénice A. au piano le 11/10, Gaspard O. à la présidence. */
const CULTE = [
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["11/10", "Gaspard O.", "", "", "Bérénice A.", "", "", "", "", "", "", "", ""],
].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

async function ouvrir(
  page: Page, to: string, docs: Record<string, Record<string, unknown>> = DOCS, qui: FakeProfile = ADMIN,
  le = new Date("2026-10-06T10:00:00"),
) {
  await page.clock.setFixedTime(le);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  return signInAs(page, qui, docs, to);
}

const titre = (page: Page) => enTete(page).locator("h1");
/** Le bloc de contenu de la page : celui qui suit l'en-tête (pleine zone, R10). */
const sousEnTete = (page: Page) => enTete(page).locator("xpath=following-sibling::*[1]");

// ─── Équipes › Organigramme ──────────────────────────────────────────────────

test.describe("T5 : Équipes › Organigramme", () => {
  test("l'agencement commun ; le bandeau sans défilement de page en largeur ; « Recalculer » dans l'en-tête", async ({ page }) => {
    interdireDialoguesNatifs(page);
    await ouvrir(page, "/back-office/equipes");
    await expect(page.getByTestId("equipe-da")).toBeVisible();
    await expect(titre(page)).toHaveText("Équipes");
    await expect(enTete(page)).toContainText("il donne les pôles de chacun");
    await expect(page.getByTestId("bandeau-equipes")).toBeVisible();
    const bandeau = page.getByTestId("bandeau-equipes");
    await verifierAgencement(page, { premierBloc: bandeau, contenu: bandeau, onglets: { rail: 1, pilules: 1 } });
    // Rail : Organigramme · Personnes ; sous-onglets Équipes · Musiciens en pilules.
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Organigramme", "Personnes"]);
    await expect(pilules(page).filter({ hasText: "Musiciens" }).getByRole("button")).toHaveText(["Équipes", "Musiciens"]);
    await expect(enTete(page).getByRole("button", { name: "Recalculer depuis l'organigramme" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nouvelle équipe/ }), "les treize équipes sont fixes").toHaveCount(0);
  });

  test("« Recalculer » : le résultat sous l'en-tête", async ({ page }) => {
    const envois: unknown[] = [];
    await page.route("**/api/equipes/poles", (route) => {
      envois.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 4 }) });
    });
    await ouvrir(page, "/back-office/equipes");
    await enTete(page).getByRole("button", { name: "Recalculer depuis l'organigramme" }).click();
    await expect(enTete(page).getByText("4 profils mis à jour.")).toBeVisible();
    expect(envois).toEqual([{ tous: true }]);
  });

  test("crayon → panneau d'édition ; enregistrer met à jour la carte", async ({ page }, info) => {
    await page.route("**/api/equipes/poles", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) }));
    const db = await ouvrir(page, "/back-office/equipes");
    const carte = page.getByTestId("equipe-da");
    // Les membres lus, le bandeau rangé : la carte a sa hauteur.
    await expect(carte).toContainText("Bérénice A.");
    await expect(page.getByTestId("bandeau-equipes")).toHaveAttribute("data-range", "1");
    const hauteur = (await carte.boundingBox())!.height;
    await carte.getByRole("button", { name: "Modifier TEAM DA" }).click();
    const panneau = page.getByRole("dialog", { name: "TEAM DA" });
    await expect(panneau).toBeVisible();
    // La carte garde sa hauteur : l'édition n'est pas dedans.
    expect(Math.abs((await carte.boundingBox())!.height - hauteur)).toBeLessThan(1);
    await expect(carte.getByPlaceholder("Ajouter un membre")).toHaveCount(0);

    const largeur = page.viewportSize()!.width;
    // L'animation d'ouverture finie : le panneau est posé contre le bord droit.
    await expect.poll(async () => Math.round(((b) => b.x + b.width)((await panneau.boundingBox())!))).toBe(largeur);
    const boite = (await panneau.boundingBox())!;
    if (estGrandEcran(info)) {
      // 420 px à droite.
      expect(Math.round(boite.width)).toBe(420);
    } else {
      // Une feuille sur toute la largeur, en bas.
      expect(Math.round(boite.width)).toBeGreaterThanOrEqual(largeur - 1);
    }

    await panneau.getByPlaceholder("Ajouter un membre").fill("Gaspard");
    await panneau.getByRole("button", { name: /Gaspard O\./ }).click();
    await panneau.getByRole("button", { name: "Enregistrer" }).click();
    await expect(panneau).toBeHidden();
    await expect(carte.getByRole("button", { name: /Gaspard O\./ })).toBeVisible();
    await expect(carte).toContainText("3 personnes");
    const ecrit = db.doc("equipes/da") as { membres: MembreEquipe[] } | undefined;
    expect(ecrit?.membres.map((m) => m.nom)).toEqual(["Bérénice A.", "Côme E.", "Gaspard O."]);
  });

  test("Musiciens : la matrice sous le même en-tête", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes");
    await pilules(page).getByRole("button", { name: "Musiciens" }).click();
    await expect(pilules(page).getByRole("button", { name: "Musiciens" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("bandeau-equipes")).toHaveCount(0);
    await expect(titre(page)).toHaveText("Équipes");
    await expect(page.getByText("Bérénice A.").filter({ visible: true }).first()).toBeVisible();
  });
});

// ─── Équipes › Personnes ─────────────────────────────────────────────────────

test.describe("T5 : Équipes › Personnes", () => {
  test("l'agencement commun ; le sous-titre compte ; la carte des inscriptions en tête", async ({ page }) => {
    interdireDialoguesNatifs(page);
    await ouvrir(page, "/back-office/equipes/personnes");
    await expect(titre(page)).toHaveText("Équipes");
    await expect(enTete(page)).toContainText("4 inscrits · 1 musicien · 1 présidence");
    const inscriptions = enTete(page).getByRole("region", { name: "Inscriptions" });
    await expect(inscriptions).toContainText("Inscriptions ouvertes");
    await expect(inscriptions.getByRole("switch")).toBeChecked();
    await expect(inscriptions, "aucun compte de la semaine").not.toContainText("nouveau compte");
    await expect(page.getByRole("button", { name: /Bérénice A\./ })).toBeVisible();
    await verifierAgencement(page, { contenu: sousEnTete(page), onglets: { rail: 1, pilules: 1 } });
    await expect(ongletsRail(page).getByRole("link", { name: "Personnes" })).toHaveAttribute("aria-current", "page");
  });

  test("l'interrupteur ferme les inscriptions", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/equipes/personnes");
    const inscriptions = enTete(page).getByRole("region", { name: "Inscriptions" });
    await inscriptions.getByRole("switch").click();
    await expect(inscriptions).toContainText("Inscriptions fermées");
    await expect.poll(() => db.doc("config/app")?.registrationOpen).toBe(false);
  });

  test("les comptes de la semaine : « Voir les n » les montre", async ({ page }, info) => {
    // Le 04/01/2026, les quatre comptes (créés le 01/01) ont moins de sept jours.
    await ouvrir(page, "/back-office/equipes/personnes?uid=u-ysee", DOCS, ADMIN, new Date("2026-01-04T10:00:00"));
    const inscriptions = enTete(page).getByRole("region", { name: "Inscriptions" });
    await expect(inscriptions).toContainText("4 nouveaux comptes");
    await inscriptions.getByRole("button", { name: "Voir les 4" }).click();
    await expect(page.getByRole("button", { name: "Récents" })).toHaveAttribute("aria-pressed", "true");
    if (estGrandEcran(info)) {
      // La personne choisie : le plus récent des nouveaux comptes (ici le premier de la liste).
      await expect(page).toHaveURL(/[?&]uid=u-berenice/);
      await expect(page.locator('[data-volet="detail"]').getByRole("heading", { level: 2 })).toHaveText("Bérénice A.");
    }
    await expect(page.getByRole("button", { name: /Bérénice A\./ }).locator("text=Nouveau")).toBeVisible();
  });

  test("en grand : la première personne à droite ; toucher une ligne écrit `?uid=`", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    await ouvrir(page, "/back-office/equipes/personnes");
    const fiche = page.locator('[data-volet="detail"]');
    // Tri « Récents » : le compte le plus récent d'abord.
    await expect(fiche.getByRole("heading", { level: 2 })).toHaveText("Bérénice A.");
    await expect(fiche).toContainText("Services et rôles");
    await expect(fiche).toContainText("Pôles");
    await expect(fiche).toContainText("Droits");
    await expect(fiche).toContainText("Ses prochains services");
    await expect(fiche).toContainText("Piano");

    await page.locator('[data-volet="liste"]').getByRole("button", { name: /Gaspard O\./ }).click();
    await expect(page).toHaveURL(/[?&]uid=u-gaspard/);
    await expect(fiche.getByRole("heading", { level: 2 })).toHaveText("Gaspard O.");
    await expect(fiche).toContainText("Culte Franco"); // écrit dans le planning du Culte
  });

  test("`?uid=` ouvre la personne", async ({ page }, info) => {
    await ouvrir(page, "/back-office/equipes/personnes?uid=u-ysee");
    if (estGrandEcran(info)) {
      await expect(page.locator('[data-volet="detail"]').getByRole("heading", { level: 2 })).toHaveText("Ysée R.");
    } else {
      // Un volet : la ligne de la personne se déplie, avec son formulaire.
      await expect(page.getByRole("button", { name: /Ysée R\./ })).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByRole("button", { name: "Enregistrer" })).toBeVisible();
    }
  });

  test("en grand : « Modifier » montre le formulaire dans le volet ; enregistrer revient à la fiche", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    const db = await ouvrir(page, "/back-office/equipes/personnes?uid=u-ysee");
    const fiche = page.locator('[data-volet="detail"]');
    await fiche.getByRole("button", { name: "Modifier" }).click();
    await fiche.getByRole("button", { name: /Équipes \(tout l'organigramme\)/ }).click();
    await fiche.getByRole("button", { name: "Enregistrer" }).click();
    await expect(fiche.getByRole("heading", { level: 2 })).toHaveText("Ysée R.");
    await expect(fiche.getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect.poll(() => db.doc("users/u-ysee")?.equipes).toBe(true);
  });
});

// ─── Messages ────────────────────────────────────────────────────────────────

const MESSAGES_DOCS: Record<string, Record<string, unknown>> = {
  "reports/r1": {
    kind: "song", title: "Problème avec : Hosanna", status: "pending", createdAt: new Date("2026-10-02T10:00:00Z"),
    description: "Au refrain, un accord ne correspond pas.", songSlug: "hosanna", songTitle: "Hosanna", pageUrl: "",
    authorName: "Léonie P.", authorId: "uid-leonie", authorEmail: "leonie@example.com",
  },
  "reports/r2": {
    kind: "site", title: "Accord manquant sur une page", status: "resolved", createdAt: new Date("2026-09-12T10:00:00Z"),
    description: "", songSlug: "", songTitle: "", pageUrl: "", authorName: "Léonie P.", authorId: "uid-leonie", authorEmail: "",
  },
  "songProposals/p1": {
    title: "Un chant proposé", youtubeUrl: "https://example.com/video", pdfUrl: "",
    status: "pending", createdAt: new Date("2026-09-29T10:00:00Z"), authorName: "Léonie P.", authorId: "uid-leonie",
  },
};

test.describe("T5 : Messages", () => {
  test("le h1 a le même x et le même y sur les trois onglets", async ({ page }, info) => {
    interdireDialoguesNatifs(page);
    await ouvrir(page, "/back-office/messages", MESSAGES_DOCS);
    await expect(page.getByRole("heading", { name: "Signalements" }).first()).toBeVisible();
    // Réception : les filtres en pilules, sauf sur tablette portrait (les deux cartes côte à côte, sans filtres).
    const filtres = info.project.name === "tablette" ? 0 : 1;
    await verifierAgencement(page, { contenu: sousEnTete(page), onglets: { rail: 1, pilules: filtres } });
    const ici = async () => (await titre(page).boundingBox())!;
    const a = await ici();
    await expect(enTete(page)).toContainText("Ce que les membres signalent et proposent");

    await ongletsRail(page).getByRole("link", { name: "Notifier" }).click();
    await expect(page).toHaveURL(/\/back-office\/messages\/notifier\/?$/);
    await expect(page.getByText("Aperçu", { exact: true })).toBeVisible();
    await verifierAgencement(page, { contenu: sousEnTete(page), onglets: { rail: 1, pilules: 1 } });
    const b = await ici();

    await ongletsRail(page).getByRole("link", { name: "Questionnaire" }).click();
    await expect(page).toHaveURL(/\/back-office\/messages\/questionnaire\/?$/);
    await expect(page.getByText("Aucune réponse pour l'instant.").filter({ visible: true }).first()).toBeVisible();
    await verifierAgencement(page, { contenu: sousEnTete(page), onglets: { rail: 1, pilules: 0 } });
    const c = await ici();
    for (const r of [b, c]) {
      expect(Math.abs(r.x - a.x)).toBeLessThan(1);
      expect(Math.abs(r.y - a.y)).toBeLessThan(1);
    }
  });

  test("Réception : « ⋯ › Supprimer » confirme dans le site", async ({ page }, info) => {
    interdireDialoguesNatifs(page);
    const db = await ouvrir(page, "/back-office/messages", MESSAGES_DOCS);
    const ligne = page.getByRole("button", { name: /Problème avec : Hosanna/ });
    if (!estGrandEcran(info)) await ligne.click();
    await expect(page.getByRole("button", { name: "Supprimer le signalement" })).toHaveCount(0);
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await expect(fenetreDuSite(page)).toBeVisible();
    await repondreDansLeSite(page, "Annuler");
    expect(db.doc("reports/r1")).toBeDefined();
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect.poll(() => db.doc("reports/r1")).toBeUndefined();
  });

  test("Réception en grand : le chant signalé et les messages du même membre", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    await ouvrir(page, "/back-office/messages", MESSAGES_DOCS);
    const message = page.getByRole("region", { name: "Message" });
    await expect(message.getByRole("heading", { level: 2 })).toHaveText("Problème avec : Hosanna");
    const chant = message.getByRole("region", { name: "Le chant signalé" });
    await expect(chant).toContainText("Hosanna");
    await expect(chant).toContainText(/tonalité [A-G]/);
    await expect(chant).toContainText(/\d+ sections?/);
    await expect(chant.getByRole("link", { name: "Ouvrir la partition" })).toHaveAttribute("href", /\/songs\/hosanna/);
    const meme = message.getByRole("region", { name: "Du même membre" });
    await expect(meme).toContainText("Accord manquant sur une page");
    await expect(meme).toContainText("Un chant proposé");
    await expect(meme).not.toContainText("Problème avec : Hosanna");
    // Toucher un message du même membre l'ouvre.
    await meme.getByRole("button", { name: /Un chant proposé/ }).click();
    await expect(message.getByRole("heading", { level: 2 })).toHaveText("Un chant proposé");
  });

  test("Notifier : l'aperçu reprend le titre et le message tapés ; pied « Annuler · Envoyer à n personnes »", async ({ page }) => {
    interdireDialoguesNatifs(page);
    await ouvrir(page, "/back-office/messages/notifier", DOCS);
    const apercu = page.getByRole("region", { name: "Aperçu" });
    await expect(apercu).toContainText("GCC Louange");
    await page.getByRole("textbox", { name: "Titre" }).fill("Répétition déplacée");
    await page.getByRole("textbox", { name: "Message" }).fill("Rendez-vous à 18 h au lieu de 17 h.");
    await expect(apercu).toContainText("Répétition déplacée");
    await expect(apercu).toContainText("Rendez-vous à 18 h au lieu de 17 h.");

    // Audience en pilules : « Cultes » puis « Culte Franco » (un musicien et une présidence).
    await page.getByRole("group", { name: "Audience" }).getByRole("button", { name: "Cultes" }).click();
    await page.getByRole("group", { name: "Cultes" }).getByRole("button", { name: "Culte Franco" }).click();
    await expect(page.getByRole("button", { name: "Envoyer à 2 personnes" })).toBeEnabled();
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByRole("textbox", { name: "Titre" })).toHaveValue("");
    await expect(apercu).not.toContainText("Répétition déplacée");
  });

  test("Notifier : « Derniers envois » liste au plus cinq envois manuels", async ({ page }) => {
    const docs: Record<string, Record<string, unknown>> = { ...DOCS };
    for (let i = 1; i <= 7; i++) {
      docs[`notifications/m${i}`] = {
        title: `Envoi ${i}`, body: "…", url: "/mes-services", kind: "manual",
        recipients: i === 1 ? [] : ["u-a", "u-b", "u-c"], everyone: i === 1, createdAt: new Date(`2026-09-${10 + i}T10:00:00Z`),
      };
    }
    docs["notifications/rappel"] = {
      title: "Rappel automatique", body: "…", url: "/", kind: "reminder", recipients: ["u-a"], everyone: false,
      createdAt: new Date("2026-09-30T10:00:00Z"),
    };
    await ouvrir(page, "/back-office/messages/notifier", docs);
    const envois = page.getByRole("region", { name: "Derniers envois" });
    await expect(envois.getByRole("listitem")).toHaveCount(5);
    await expect(envois.getByRole("listitem").first()).toContainText("Envoi 7");
    await expect(envois.getByRole("listitem").first()).toContainText("3 personnes");
    await expect(envois).not.toContainText("Rappel automatique");
    await expect(envois).not.toContainText("Envoi 2");
  });

  test("Questionnaire : la première partie ouverte d'office", async ({ page }, info) => {
    const docs = {
      "surveyResponses/u-a": {
        authorName: "Anouk T.", authorEmail: "", submitted: true, createdAt: new Date("2026-10-01T10:00:00Z"),
        updatedAt: new Date("2026-10-01T10:00:00Z"), answers: { frequency: "weekly", overall: 4, ease: 3 },
      },
      "surveyResponses/u-b": {
        authorName: "Basile V.", authorEmail: "", submitted: true, createdAt: new Date("2026-10-03T10:00:00Z"),
        updatedAt: new Date("2026-10-03T10:00:00Z"), answers: { frequency: "daily", overall: 5, ease: 4 },
      },
    };
    await ouvrir(page, "/back-office/messages/questionnaire", docs);
    if (estGrandEcran(info)) {
      const partie = page.locator('[data-volet="detail"]');
      await expect(partie.getByRole("heading", { level: 2 })).toHaveText("Toi et ton usage");
      const sommaire = page.locator('[data-volet="liste"]');
      await expect(sommaire).toContainText("2 réponses");
      await sommaire.getByRole("button", { name: /Impression générale/ }).click();
      await expect(partie.getByRole("heading", { level: 2 })).toHaveText("Impression générale");
      await expect(partie).toContainText("moyenne");
      await expect(sommaire.getByRole("link", { name: "Voir la page du questionnaire" })).toHaveAttribute("href", /\/questionnaire/);
    } else {
      // Un volet : les parties dépliables, la première ouverte.
      await expect(page.getByRole("button", { name: "Toi et ton usage" })).toHaveAttribute("aria-expanded", "true");
    }
  });
});

// ─── Captures, regardées à l'œil ─────────────────────────────────────────────

test("captures : Équipes et Messages", async ({ page }, info) => {
  const docs = { ...DOCS, ...MESSAGES_DOCS };
  await ouvrir(page, "/back-office/equipes", docs);
  await expect(page.getByTestId("equipe-da")).toBeVisible();
  const dossier = "test-results/agencement-v18-t5";
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dossier}/organigramme-${info.project.name}.png` });
  await page.getByTestId("equipe-da").getByRole("button", { name: "Modifier TEAM DA" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dossier}/organigramme-panneau-${info.project.name}.png` });
  for (const [nom, chemin] of [
    ["personnes", "/back-office/equipes/personnes"],
    ["reception", "/back-office/messages"],
    ["notifier", "/back-office/messages/notifier"],
    ["questionnaire", "/back-office/messages/questionnaire"],
  ] as const) {
    await page.goto(chemin);
    await expect(enTete(page)).toBeVisible();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${dossier}/${nom}-${info.project.name}.png` });
  }
});
