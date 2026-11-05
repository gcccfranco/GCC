import { expect, test, type Page } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";
import {
  enTete, estGrandEcran, fenetreDuSite, interdireDialoguesNatifs, ongletsRail,
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
  serviceRoles: {}, annonces: [], notify: [], equipes: false, plannings: [], ...over,
});

const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da": {
    pole: "da",
    membres: [M("Bérénice A.", { uid: "u-berenice", mention: "Référente", referent: true }), M("Côme E.", { essai: true })],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  // La base simulée date tous les comptes du 01/01/2026 (`createTime`) : « Récents » garde l'ordre
  // de `listProfiles` (par nom) ; aucun compte n'a moins de sept jours au 06/10/2026.
  "users/u-berenice": PROFIL("Bérénice", "A.", { serviceRoles: { "Culte Francophone": ["musicien"] }, dansEquipes: ["da"], referentDe: ["da"] }),
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
    await expect(enTete(page)).toContainText("Organigramme GCC Franco");
    await expect(enTete(page)).not.toContainText("pôles");
    await expect(page.getByTestId("bandeau-equipes")).toBeVisible();
    const bandeau = page.getByTestId("bandeau-equipes");
    // Trois rails depuis le lot CD, T3c : Organigramme · Personnes, le sélecteur Église · Paix · … et Équipes · Musiciens.
    await verifierAgencement(page, { premierBloc: bandeau, contenu: bandeau, onglets: { rail: 3, pilules: 0 } });
    // Rail : Organigramme · Personnes ; vues Équipes · Musiciens en rail aussi.
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Organigramme", "Personnes", "Responsabilités"]); // lot RS : la page Responsabilités (admins)
    await expect(page.getByRole("tablist", { name: "Vue" }).getByRole("tab")).toHaveText(["Équipes", "Musiciens"]);
    await expect(enTete(page).getByRole("button", { name: "Recalculer depuis l'organigramme" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Nouvelle équipe/ }), "les treize équipes sont fixes").toHaveCount(0);
  });

  test("« Recalculer » : son aide dans la fenêtre du site, puis le résultat sous l'en-tête", async ({ page }) => {
    // Relecture : sur téléphone le bouton n'est qu'une icône et l'infobulle n'existe pas au
    // toucher ; l'aide (ce que le calcul écrit sur les profils) se lit avant de lancer.
    interdireDialoguesNatifs(page);
    const envois: unknown[] = [];
    await page.route("**/api/equipes/rattachement", (route) => {
      envois.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 4 }) });
    });
    await ouvrir(page, "/back-office/equipes");
    const bouton = enTete(page).getByRole("button", { name: "Recalculer depuis l'organigramme" });
    await bouton.click();
    await expect(fenetreDuSite(page)).toContainText("les réunions et les tâches de leur équipe");
    await repondreDansLeSite(page, "Annuler");
    expect(envois).toEqual([]);
    await bouton.click();
    await repondreDansLeSite(page, "Recalculer");
    await expect(enTete(page).getByText("4 profils mis à jour.")).toBeVisible();
    expect(envois).toEqual([{ tous: true }]);
  });

  test("le sous-titre porte l'année en cours", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes", DOCS, ADMIN, new Date("2027-02-01T10:00:00"));
    await expect(enTete(page)).toContainText("Organigramme GCC Franco 2027");
  });

  test("droit Équipes sans être admin : ni rail ni sa marge dans l'en-tête", async ({ page }) => {
    // Lot AO : tenir l'organigramme vient d'une place (ici référente de TEAM DA : elle tient son équipe), plus de la case « Équipes ».
    const equipier: FakeProfile = { uid: "u-equipier", email: "equipier@example.com", firstName: "Elsa", lastName: "N.", dansEquipes: ["da"], referentDe: ["da"] };
    await ouvrir(page, "/back-office/equipes", DOCS, equipier);
    await expect(page.getByTestId("equipe-da").getByRole("button", { name: "Modifier DA" })).toBeVisible();
    await expect(page.locator('nav[data-onglets="rail"]')).toHaveCount(0);
    await expect(enTete(page).locator(":scope > div:empty"), "aucun bloc vide (la place du rail)").toHaveCount(0);
  });

  test("le panneau d'édition est décrit, sans avertissement de Radix", async ({ page }) => {
    const avertissements: string[] = [];
    page.on("console", (m) => { if (/Missing `Description`/.test(m.text())) avertissements.push(m.text()); });
    await ouvrir(page, "/back-office/equipes");
    await page.getByTestId("equipe-da").getByRole("button", { name: "Modifier DA" }).click();
    await expect(page.getByRole("dialog", { name: "DA", exact: true })).toHaveAccessibleDescription("Direction artistique");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Une équipe sans sous-titre.
    await page.getByTestId("equipe-traduction").getByRole("button", { name: "Modifier Traduction" }).click();
    await expect(page.getByRole("dialog", { name: "Traduction", exact: true })).toBeVisible();
    await page.waitForTimeout(300);
    expect(avertissements).toEqual([]);
  });

  test("crayon → panneau d'édition ; enregistrer met à jour la carte", async ({ page }, info) => {
    await page.route("**/api/equipes/rattachement", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) }));
    const db = await ouvrir(page, "/back-office/equipes");
    const carte = page.getByTestId("equipe-da");
    // Les membres lus, le bandeau rangé : la carte a sa hauteur.
    await expect(carte).toContainText("Bérénice A.");
    await expect(page.getByTestId("bandeau-equipes")).toHaveAttribute("data-range", "1");
    const hauteur = (await carte.boundingBox())!.height;
    await carte.getByRole("button", { name: "Modifier DA" }).click();
    const panneau = page.getByRole("dialog", { name: "DA", exact: true });
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
    // Lot AO : les Musiciens viennent de l'équipe Louange de l'organigramme (plus du planning ni des rôles déclarés).
    await ouvrir(page, "/back-office/equipes", {
      ...DOCS,
      "equipes/louange": {
        membres: [M("Bérénice A.", { uid: "u-berenice", sousEquipes: ["musiciens"], joue: ["piano"], lieux: ["Culte Francophone"] })],
        updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
      },
    });
    await page.getByRole("tab", { name: "Musiciens" }).click();
    await expect(page.getByRole("tab", { name: "Musiciens" })).toHaveAttribute("aria-selected", "true");
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
    await expect(enTete(page)).toContainText("4 inscrits, dont 4 sans groupe");
    const inscriptions = enTete(page).getByRole("region", { name: "Inscriptions" });
    await expect(inscriptions).toContainText("Inscriptions ouvertes");
    await expect(inscriptions.getByRole("switch")).toBeChecked();
    await expect(inscriptions, "aucun compte de la semaine").not.toContainText("nouveau compte");
    await expect(page.getByRole("button", { name: /Bérénice A\./ })).toBeVisible();
    await verifierAgencement(page, { contenu: sousEnTete(page), onglets: { rail: 2, pilules: 1 } });
    await expect(ongletsRail(page).getByRole("link", { name: "Personnes" })).toHaveAttribute("aria-current", "page");
  });

  // bo-equipes-2 : le texte d'aide du champ dit quoi taper et tient en entier (mesuré au canvas, avec la police du champ).
  for (const zh of [false, true]) {
    test(`le texte d'aide du champ de recherche tient en entier${zh ? " (中文)" : ""}`, async ({ page }, info) => {
      if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
      await ouvrir(page, "/back-office/equipes/personnes");
      const champ = estGrandEcran(info) ? page.locator('[data-volet="liste"]').getByRole("searchbox") : page.getByRole("searchbox").first();
      await expect(champ).toBeVisible();
      const aide = await champ.getAttribute("placeholder");
      expect(aide).toBe(zh ? "姓名、邮箱或排班名" : "Nom, e-mail ou nom au planning");
      await expect(champ).toHaveAttribute("aria-label", zh ? "按姓名、邮箱或排班名搜索成员" : "Rechercher un membre par nom, e-mail ou nom au planning");
      const { texte, utile } = await champ.evaluate((el, a) => {
        const s = getComputedStyle(el);
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        return { texte: ctx.measureText(a ?? "").width, utile: el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) };
      }, aide);
      expect(texte, "largeur du texte d'aide < largeur utile du champ").toBeLessThan(utile);
    });
  }

  // bo-equipes-11 : sur une ligne qui ouvre une page (un volet) ou choisit une personne (deux volets), un chevron droit, jamais « ˅ ».
  test("une ligne de la liste ne se déplie pas : chevron droit, pas d'aria-expanded", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/personnes");
    const ligne = page.getByRole("button", { name: /Gaspard O\./ });
    await expect(ligne).toBeVisible();
    await expect(ligne).not.toHaveAttribute("aria-expanded", /.*/);
    await expect(ligne.locator("svg.lucide-chevron-down")).toHaveCount(0);
    await expect(ligne.locator("svg.lucide-chevron-right")).toHaveCount(1);
    // Centré sur la ligne.
    await expect.poll(async () => {
      const l = (await ligne.boundingBox())!;
      const c = (await ligne.locator("svg.lucide-chevron-right").boundingBox())!;
      return Math.abs(c.y + c.height / 2 - (l.y + l.height / 2));
    }, { message: "chevron centré sur la ligne" }).toBeLessThanOrEqual(2);
  });

  test("l'interrupteur ferme les inscriptions ; son nom ne change pas, son état dit ouvert ou fermé", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/equipes/personnes");
    const inscriptions = enTete(page).getByRole("region", { name: "Inscriptions" });
    // Relecture : un `role=switch` annonce déjà son état ; un nom qui disait l'action
    // (« Fermer les inscriptions, activé ») se lisait comme l'inverse de l'état.
    const interrupteur = inscriptions.getByRole("switch", { name: "Inscriptions ouvertes", exact: true });
    await expect(interrupteur).toBeChecked();
    await interrupteur.click();
    await expect(inscriptions).toContainText("Inscriptions fermées");
    await expect(interrupteur).not.toBeChecked();
    await expect.poll(() => db.doc("config/app")?.registrationOpen).toBe(false);
  });

  test("les comptes de la semaine : « Voir les n » les montre", async ({ page }, info) => {
    // Le 04/01/2026, les quatre comptes (créés le 01/01) ont moins de sept jours.
    // Un volet : `?uid=` ouvrirait la personne en page entière, sans la carte des inscriptions.
    await ouvrir(page, estGrandEcran(info) ? "/back-office/equipes/personnes?uid=u-ysee" : "/back-office/equipes/personnes", DOCS, ADMIN, new Date("2026-01-04T10:00:00"));
    const inscriptions = enTete(page).getByRole("region", { name: "Inscriptions" });
    await expect(inscriptions).toContainText("4 nouveaux comptes");
    await inscriptions.getByRole("button", { name: "Voir les 4" }).click();
    await expect(page.getByRole("tab", { name: "Récents" })).toHaveAttribute("aria-selected", "true");
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
    await expect(fiche).toContainText("Services et équipes");
    // Lot 1 du chantier « équipes et groupes » (EQ26) : la carte « Pôles » cède la place à la carte Droits ;
    // lot AO : plus de ligne « Coordination » cochée, mais « Ce que ça lui ouvre », calculé depuis l'organigramme.
    await expect(fiche).not.toContainText("Coordination");
    await expect(fiche).toContainText("Ce que ça lui ouvre");
    await expect(fiche).toContainText("Tenir l'équipe DA dans l'organigramme");
    await expect(fiche).not.toContainText("Pôles");
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
      // Un volet : la personne s'ouvre en page entière ; « Modifier » montre le formulaire.
      await expect(page.locator("article").getByRole("heading", { level: 2 })).toHaveText("Ysée R.");
      await page.getByRole("button", { name: "Modifier", exact: true }).click();
      await expect(page.getByRole("button", { name: "Enregistrer" })).toBeVisible();
    }
  });

  test("en grand : « Modifier » montre le formulaire dans le volet ; enregistrer revient à la fiche", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    const db = await ouvrir(page, "/back-office/equipes/personnes?uid=u-ysee");
    const fiche = page.locator('[data-volet="detail"]');
    await fiche.getByRole("button", { name: "Modifier" }).click();
    // Lot AO : le formulaire n'a plus de case de droit (Équipes…) — l'identité seule, et « Ce que ça lui ouvre ».
    await expect(fiche.getByRole("button", { name: /Équipes \(tout l'organigramme\)/ })).toHaveCount(0);
    await expect(fiche.getByRole("button", { name: "Enregistrer" })).toBeVisible();
    await fiche.getByRole("button", { name: "Enregistrer" }).click();
    await expect(fiche.getByRole("heading", { level: 2 })).toHaveText("Ysée R.");
    await expect(fiche.getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect.poll(() => db.writes.some((w) => w.path === "users/u-ysee")).toBe(true);
    expect(Object.keys(db.writes.find((w) => w.path === "users/u-ysee")!.data).sort()).toEqual(["firstName", "lastName", "planningName"]);
  });

  test("en grand : « Modifier » garde la personne quand la liste change (recherche, tri)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    // Relecture : sans `?uid=`, la personne choisie était la première de la liste filtrée ;
    // chercher un autre nom remontait le formulaire, et ses droits, sur une autre personne.
    await ouvrir(page, "/back-office/equipes/personnes");
    const fiche = page.locator('[data-volet="detail"]');
    const liste = page.locator('[data-volet="liste"]');
    await expect(fiche.getByRole("heading", { level: 2 })).toHaveText("Bérénice A.");
    await fiche.getByRole("button", { name: "Modifier" }).click();
    await expect(fiche.getByRole("button", { name: "Enregistrer" })).toBeVisible();
    await liste.getByRole("searchbox", { name: /Rechercher un membre/ }).fill("Gaspard");
    await expect(liste.getByRole("button", { name: /Gaspard O\./ })).toBeVisible();
    await expect(liste.getByRole("button", { name: /Bérénice A\./ })).toHaveCount(0);
    await expect(fiche.getByRole("heading", { level: 2 })).toHaveText("Bérénice A.");
    await expect(fiche.getByRole("button", { name: "Enregistrer" })).toBeVisible();
    await liste.getByRole("tab", { name: "A–Z" }).click();
    await expect(fiche.getByRole("heading", { level: 2 })).toHaveText("Bérénice A.");
    await expect(page).toHaveURL(/[?&]uid=u-berenice/);
  });

  test("en grand : une ligne de la liste = avatar, nom, e-mail, services (ni nom au planning ni date, bo-equipes-9)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    await ouvrir(page, "/back-office/equipes/personnes");
    const ligne = page.locator('[data-volet="liste"]').getByRole("button", { name: /Gaspard O\./ });
    await expect(ligne).toContainText("Présidence");
    await expect(ligne).toContainText("gaspard@example.com");
    await expect(ligne).not.toContainText("planning :");
    await expect(ligne).not.toContainText("inscrit le");
  });

  test("en grand : les filtres tiennent sur une ligne dans la colonne de la liste (deux menus et une pastille), le tri dessous à droite", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    // Lot CD, T3c (bo-equipes-10) : plus de rangée de pilules à plier ; Service et Groupe sont des menus, « Sans équipe » une
    // pastille-bascule, « Trier » un rail de deux segments sur sa propre ligne.
    await ouvrir(page, "/back-office/equipes/personnes");
    const liste = page.locator('[data-volet="liste"]');
    const service = liste.getByRole("button", { name: /^Service( :|$)/ });
    const groupe = liste.getByRole("button", { name: /^Groupe( :|$)/ });
    const sansEquipe = liste.getByRole("button", { name: "Sans équipe" });
    await expect(sansEquipe).toBeVisible();
    await expect(liste.locator("select:visible"), "aucun select").toHaveCount(0);
    // Lues ensemble (la rangée « sans compte » arrive après et pousse les filtres : trois lectures séparées se croisaient).
    const lire = async () => [(await service.boundingBox())!, (await groupe.boundingBox())!, (await sansEquipe.boundingBox())!];
    await expect.poll(async () => new Set((await lire()).map((b) => Math.round(b.y))).size, { message: "une seule ligne" }).toBe(1);
    const boites = await lire();
    const colonne = (await liste.boundingBox())!;
    for (const b of boites) expect(b.x + b.width, "entier dans la colonne").toBeLessThanOrEqual(colonne.x + colonne.width);
    const tri = liste.getByRole("tablist", { name: "Trier", exact: true });
    await expect(tri.getByRole("tab")).toHaveText(["Récents", "A–Z"]);
    const t = (await tri.boundingBox())!;
    expect(t.y, "le tri sur sa propre ligne").toBeGreaterThan(boites[0].y + boites[0].height - 1);
    // Un seul filtre à la fois : choisir un groupe remet le service à « Tous ».
    await service.click();
    await page.getByRole("menuitemradio", { name: "Campus", exact: true }).click();
    await expect(service).toHaveAttribute("aria-label", "Service : Campus");
    await groupe.click();
    await page.getByRole("menuitemradio", { name: "Groupe Paix" }).click();
    await expect(service).toHaveAttribute("aria-label", "Service");
    await expect(groupe).toHaveAttribute("aria-label", "Groupe : Groupe Paix");
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

/** Trois réponses au questionnaire (personnes fictives), « Impression générale » notée. */
const SONDAGE: Record<string, Record<string, unknown>> = {
  "surveyResponses/u-a": {
    authorName: "Anouk T.", authorEmail: "", submitted: true, createdAt: new Date("2026-10-01T10:00:00Z"),
    updatedAt: new Date("2026-10-01T10:00:00Z"),
    answers: { frequency: "weekly", overall: 4, ease: 3, speed: 4, readability: 5, reliability: "rare", mobile: "great", recommend: "yes" },
  },
  "surveyResponses/u-b": {
    authorName: "Basile V.", authorEmail: "", submitted: true, createdAt: new Date("2026-10-03T10:00:00Z"),
    updatedAt: new Date("2026-10-03T10:00:00Z"),
    answers: { frequency: "daily", overall: 5, ease: 4, speed: 3, readability: 4, reliability: "never", mobile: "ok", recommend: "yes" },
  },
  "surveyResponses/u-c": {
    authorName: "Capucine L.", authorEmail: "", submitted: false, createdAt: new Date("2026-10-04T10:00:00Z"),
    updatedAt: new Date("2026-10-04T10:00:00Z"),
    answers: { frequency: "weekly", overall: 3, ease: 4, mobile: "problems", recommend: "maybe" },
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
    // compte-11 : « Messages » n'a plus de sous-titre (il décrivait la seule Réception).
    await expect(enTete(page)).not.toContainText("Ce que les membres signalent et proposent");

    await ongletsRail(page).getByRole("link", { name: "Notifier" }).click();
    await expect(page).toHaveURL(/\/back-office\/messages\/notifier\/?$/);
    await expect(page.getByText("Aperçu", { exact: true })).toBeVisible();
    await verifierAgencement(page, { contenu: sousEnTete(page), onglets: { rail: 1, pilules: 1 } });
    const b = await ici();

    await ongletsRail(page).getByRole("link", { name: "Questionnaire" }).click();
    await expect(page).toHaveURL(/\/back-office\/messages\/questionnaire\/?$/);
    await expect(page.getByText("Aucune réponse pour l'instant.").filter({ visible: true }).first()).toBeVisible();
    // Sans réponse, en grand, l'état vide est une colonne de 960 px calée sur le titre (BO9, `colonneSeule`).
    await verifierAgencement(page, { contenu: sousEnTete(page), colonne: 960, onglets: { rail: 1, pilules: 0 } });
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

  test("Notifier : l'aperçu reprend le titre et le message tapés ; pied « Effacer · Envoyer à n personnes » et ce qui manque (compte-12, compte-13)", async ({ page }) => {
    interdireDialoguesNatifs(page);
    await ouvrir(page, "/back-office/messages/notifier", DOCS);
    const apercu = page.getByRole("region", { name: "Aperçu" });
    await expect(apercu).toContainText("GCC Louange");
    // compte-13 : un seul aperçu, neutre (ni heure, ni dégradé) ; sous `lg` dans le formulaire (entre Message et « Ouvre au clic »), au-delà à droite.
    await expect(apercu).toHaveCount(1);
    await expect(apercu).not.toContainText("9:41");
    const banniere = apercu.locator("div.bg-card");
    expect(await banniere.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
    const largeur = page.viewportSize()!.width;
    const yApercu = (await apercu.boundingBox())!.y;
    const yMessage = (await page.locator("#notif-message").boundingBox())!.y;
    const yDestination = (await page.locator("#notif-destination").boundingBox())!.y;
    if (largeur < 1024) {
      expect(yApercu, "sous le champ Message").toBeGreaterThan(yMessage);
      expect(yApercu, "avant « Ouvre au clic »").toBeLessThan(yDestination);
    } else {
      const xMessage = (await page.locator("#notif-message").boundingBox())!.x;
      expect((await apercu.boundingBox())!.x, "dans la colonne de droite").toBeGreaterThan(xMessage);
    }
    // compte-12 : vide, « Effacer » absent, « Envoyer » grisé, la première condition qui manque dessous.
    const aide = page.locator("#notif-manque");
    await expect(page.getByRole("button", { name: "Effacer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Envoyer", exact: true })).toBeDisabled();
    await expect(aide).toHaveText("Choisis à qui écrire.");
    await expect(page.getByRole("button", { name: "Envoyer", exact: true })).toHaveAttribute("aria-describedby", "notif-manque");
    await page.getByRole("textbox", { name: "Titre" }).fill("Répétition déplacée");
    await expect(page.getByRole("button", { name: "Effacer" })).toBeVisible();
    await page.getByRole("group", { name: "Audience" }).getByRole("button", { name: "Cultes" }).click();
    await page.getByRole("group", { name: "Cultes" }).getByRole("button", { name: "Culte Franco" }).click();
    await expect(aide).toHaveText("Ajoute un message.");
    await page.getByRole("textbox", { name: "Message" }).fill("Rendez-vous à 18 h au lieu de 17 h.");
    await expect(apercu).toContainText("Répétition déplacée");
    await expect(apercu).toContainText("Rendez-vous à 18 h au lieu de 17 h.");

    // bo-messages-planning-8 : « À qui » passe à la ligne ; chaque pilule est dans la carte, sans défilement horizontal.
    const aQui = page.getByRole("group", { name: "Audience" });
    const carteNotifier = (await aQui.locator("xpath=ancestor::div[contains(@class,'carte-groupe')][1]").boundingBox())!;
    for (const b of await aQui.getByRole("button").all()) {
      const r = (await b.boundingBox())!;
      expect(r.x + r.width, "pilule dans la carte").toBeLessThanOrEqual(carteNotifier.x + carteNotifier.width);
    }
    expect(await aQui.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // Audience en pilules : « Cultes » puis « Culte Franco » (un musicien et une présidence), choisie plus haut.
    await expect(page.getByRole("button", { name: "Envoyer à 2 personnes" })).toBeEnabled();
    await expect(aide).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Annuler" })).toHaveCount(0);
    await page.getByRole("button", { name: "Effacer" }).click();
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

  // Lot RS : le droit de notifier d'un non-admin vient de la responsabilité de gestionnaire (Q10), plus d'un rôle « Notifier ».
  test("Notifier seul (gestionnaire de Paix, sans être admin) : pas le sous-titre de Réception", async ({ page }) => {
    const notifieur: FakeProfile = { uid: "u-notifieur", email: "notifieur@example.com", firstName: "Noé", lastName: "T.", responsabilites: ["planning:paix"] };
    await ouvrir(page, "/back-office/messages/notifier", DOCS, notifieur);
    await expect(page.getByRole("region", { name: "Aperçu" })).toBeVisible();
    await expect(titre(page)).toHaveText("Messages");
    await expect(ongletsRail(page), "Notifier seul : pas de rail").toHaveCount(0);
    await expect(enTete(page)).not.toContainText("Ce que les membres signalent et proposent");
  });

  test("Notifier : « Tout le monde » compte aussi les personnes au pied", async ({ page }) => {
    await ouvrir(page, "/back-office/messages/notifier", DOCS);
    await page.getByRole("group", { name: "Audience" }).getByRole("button", { name: "Tout le monde" }).click();
    await expect(page.getByRole("button", { name: /^Envoyer à \d+ personnes$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer à tout le monde" })).toHaveCount(0);
  });

  test("Notifier : « Derniers envois » trouve les envois manuels derrière cinquante rappels, et ne lit qu'eux", async ({ page }) => {
    // Relecture : lire les 50 dernières notifications puis garder les `manual` ne voyait pas un
    // envoi plus ancien que cinquante rappels (« aucune » à tort), et coûtait 50 lectures.
    const docs: Record<string, Record<string, unknown>> = {
      ...DOCS,
      "notifications/ancien": {
        title: "Envoi ancien", body: "…", url: "/", kind: "manual", recipients: ["u-a"], everyone: false,
        createdAt: new Date("2026-08-01T10:00:00Z"),
      },
    };
    for (let i = 0; i < 50; i++) {
      docs[`notifications/rappel-${i}`] = {
        title: `Rappel ${i}`, body: "…", url: "/", kind: "reminder", recipients: ["u-a"], everyone: false,
        createdAt: new Date(Date.UTC(2026, 8, 1, 6, i)),
      };
    }
    const requetes: string[] = [];
    page.on("request", (r) => {
      const corps = r.postData() ?? "";
      if (/documents:runQuery/.test(r.url()) && /"collectionId":"notifications"/.test(corps)) requetes.push(corps);
    });
    await ouvrir(page, "/back-office/messages/notifier", docs);
    const envois = page.getByRole("region", { name: "Derniers envois" });
    await expect(envois.getByRole("listitem")).toHaveCount(1);
    await expect(envois).toContainText("Envoi ancien");
    await expect(envois).not.toContainText("Rappel");
    // Le filtre est dans la requête (Firestore ne renvoie que les envois manuels), sans tri : une
    // égalité seule ne demande pas d'index composite. (La cloche lit aussi `notifications`.)
    const requete = requetes.map((c) => JSON.parse(c).structuredQuery)
      .find((q) => q.where?.fieldFilter?.field?.fieldPath === "kind");
    expect(requete?.where).toEqual({
      fieldFilter: { field: { fieldPath: "kind" }, op: "EQUAL", value: { stringValue: "manual" } },
    });
    expect(requete?.orderBy).toBeUndefined();
  });

  test("Notifier : une lecture refusée se dit, au lieu de « aucun envoi »", async ({ page }) => {
    await ouvrir(page, "/back-office/messages/notifier", DOCS);
    await expect(page.getByRole("region", { name: "Derniers envois" })).toContainText("Aucune notification envoyée pour l'instant.");
    // Après la session simulée : cette route passe avant la sienne.
    await page.route(/documents:runQuery/, (route) =>
      /"collectionId":"notifications"/.test(route.request().postData() ?? "")
        ? route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
        : route.fallback());
    await page.goto("/back-office/messages/notifier");
    const envois = page.getByRole("region", { name: "Derniers envois" });
    await expect(envois).toContainText("Impossible de lire les derniers envois.");
    await expect(envois).not.toContainText("Aucune notification");
  });

  test("Questionnaire : supprimer une réponse demande confirmation dans le site", async ({ page }, info) => {
    interdireDialoguesNatifs(page);
    const db = await ouvrir(page, "/back-office/messages/questionnaire", SONDAGE);
    if (estGrandEcran(info)) await page.locator('[data-volet="liste"]').getByRole("button", { name: /Par personne/ }).click();
    else await page.getByRole("button", { name: "Détail par personne" }).click();
    await page.getByRole("button", { name: /Anouk T\./ }).click();
    await page.getByRole("button", { name: "Supprimer la réponse" }).click();
    await expect(fenetreDuSite(page)).toContainText("Anouk T.");
    await repondreDansLeSite(page, "Annuler");
    expect(db.doc("surveyResponses/u-a")).toBeDefined();
    await page.getByRole("button", { name: "Supprimer la réponse" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect.poll(() => db.doc("surveyResponses/u-a")).toBeUndefined();
    await expect(page.getByRole("button", { name: /Anouk T\./ })).toHaveCount(0);
  });

  test("Questionnaire : la première partie ouverte d'office", async ({ page }, info) => {
    await ouvrir(page, "/back-office/messages/questionnaire", SONDAGE);
    if (estGrandEcran(info)) {
      const partie = page.locator('[data-volet="detail"]');
      await expect(partie.getByRole("heading", { level: 2 })).toHaveText("Toi et ton usage");
      const sommaire = page.locator('[data-volet="liste"]');
      await expect(sommaire).toContainText("3 réponses");
      await sommaire.getByRole("button", { name: /Impression générale/ }).click();
      await expect(partie.getByRole("heading", { level: 2 })).toHaveText("Impression générale");
      await expect(partie).toContainText("moyenne 3,9 sur 5");
      // La moyenne d'une question s'écrit comme celle de la partie (planche : « 4,0 »).
      await expect(partie).toContainText("4,0/5 (3)");
      await expect(partie).not.toContainText("4.0/5");
      await expect(sommaire.getByRole("link", { name: "Ouvrir le questionnaire" })).toHaveAttribute("href", /\/questionnaire/);
    } else {
      // Un volet : les parties dépliables, la première ouverte.
      await expect(page.getByRole("button", { name: "Toi et ton usage" })).toHaveAttribute("aria-expanded", "true");
    }
  });
});

// ─── Captures, regardées à l'œil ─────────────────────────────────────────────

test("captures : Équipes et Messages", async ({ page }, info) => {
  const docs = { ...DOCS, ...MESSAGES_DOCS, ...SONDAGE };
  await ouvrir(page, "/back-office/equipes", docs);
  await expect(page.getByTestId("equipe-da")).toBeVisible();
  const dossier = "test-results/agencement-v18-t5";
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dossier}/organigramme-${info.project.name}.png` });
  await page.getByTestId("equipe-da").getByRole("button", { name: "Modifier DA" }).click();
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
  // Relecture : le Questionnaire avec des réponses, une partie notée choisie (moyenne, barres).
  if (estGrandEcran(info)) {
    await page.locator('[data-volet="liste"]').getByRole("button", { name: /Impression générale/ }).click();
    await expect(page.locator('[data-volet="detail"]')).toContainText("moyenne");
  } else {
    await page.getByRole("button", { name: "Impression générale" }).click();
    await expect(page.getByRole("button", { name: "Impression générale" })).toHaveAttribute("aria-expanded", "true");
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${dossier}/questionnaire-reponses-${info.project.name}.png`, fullPage: !estGrandEcran(info) });
});
