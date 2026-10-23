import { expect, test, type Page } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estTelephone, interdireDialoguesNatifs, verifierAgencement } from "./helpers/agencement";

// Lot AO, tranches AO-B et AO-F (docs/spec-acces-organigramme.md, « Ce que tu peux faire dans Moi ») :
//  - Moi : « Mes équipes » (depuis l'organigramme) et « Ce que tu peux faire » à la place des services et rôles
//    déclarés ; sans équipe, une phrase sobre et la même invitation ; admin : il a tout.
//  - La grille du planning respecte les colonnes qu'on remplit : le référent Régie édite Sono et PPT, pas Piano,
//    et son écriture ne porte que sa colonne.
//  - Le profil et l'inscription n'affichent ni n'écrivent plus de rôles de service.
// Interrupteur ouvert (serveur de test ordinaire). Fausse base, noms fictifs. Cinq projets (SPECS_GRAND_ECRAN).
// Les profils recopient ce que le serveur écrit depuis l'organigramme : `dansEquipes`, `sousEquipes`, `lieuxLouange`…

/** Référent des Musiciens de Louange : sert à Interfranco et au Campus, joue de la guitare. Son vieux
 *  `serviceRoles` (Culte Francophone) ne doit plus rien changer. */
const REFERENT_MUSICIENS: FakeProfile = {
  uid: "uid-mathis", email: "mathis@example.com", firstName: "Mathis", lastName: "Verdier", planningName: "Mathis V.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
  dansEquipes: ["louange"], sousEquipes: ["musiciens", "choristes"], referentSous: ["musiciens"],
  lieuxLouange: ["Interfranco", "Campus"], joue: ["guitare"],
};
/** Aucune équipe, mais un ancien rôle déclaré : il n'ouvre plus rien. */
const SANS_EQUIPE: FakeProfile = {
  uid: "uid-lise", email: "lise@example.com", firstName: "Lise", lastName: "Garnier", planningName: "Lise G.",
  serviceRoles: { "Culte Francophone": ["chanteur"] },
  // L'ancien rôle déclaré, tel quel : il ne doit plus rien ouvrir (pas de traduction comme la migration).
  organigramme: false,
};
/** Référent de la Régie : remplit Sono, Sono Live et PPT des plannings du culte, rien d'autre. */
const REFERENT_REGIE: FakeProfile = {
  uid: "uid-regis", email: "regis@example.com", firstName: "Régis", lastName: "Moulin", planningName: "Régis M.",
  dansEquipes: ["regie"], referentDe: ["regie"], lieuxRegie: ["Culte Francophone"],
};
const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Noé", lastName: "T.", planningName: "Noé T." };

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, to);
}

const carte = (page: Page, nom: string) => page.getByRole("region", { name: nom, exact: true });

// ── Moi ─────────────────────────────────────────────────────────────────────────────────────

test.describe("Moi : Mes équipes et Ce que tu peux faire", () => {
  test("le référent Musiciens : ses équipes, ce qu'il sert, la liste de ses accès avec leur raison", async ({ page }) => {
    await ouvrir(page, REFERENT_MUSICIENS, "/moi");
    await expect(page.getByRole("heading", { level: 1, name: "Moi" })).toBeVisible();

    const equipes = carte(page, "Mes équipes");
    const lignes = equipes.getByTestId("equipe-ligne");
    await expect(lignes).toHaveCount(2);
    await expect(lignes.nth(0)).toHaveText("Louange · Musiciens — Référent");
    await expect(lignes.nth(1)).toHaveText("Louange · Choristes");
    await expect(equipes.getByText("Tu sers : Interfranco, Campus · Guitare", { exact: true })).toBeVisible();
    await expect(equipes.getByRole("link", { name: /Organigramme/ })).toHaveAttribute("href", /^\/equipes\/?$/);

    const faire = carte(page, "Ce que tu peux faire");
    const acces = faire.getByTestId("acces-ligne");
    await expect(acces).toHaveText([
      "Voir et créer les setlists de Interfranco, CampusLouange, là où tu sers",
      "Idées d'harmonie et coursMusiciens, guitare",
      "Envoyer une notification aux musiciensRéférent Musiciens",
      "Placer les musiciens dans l'organigrammeRéférent Musiciens",
    ]);
    await expect(faire.getByText("Un accès te manque ? Demande à ton référent de te placer dans l'organigramme.")).toBeVisible();

    // L'ancienne liste « services et rôles » de la carte du compte a disparu : son rôle déclaré n'ouvre plus rien.
    await expect(page.getByTestId("service-role")).toHaveCount(0);
    await expect(carte(page, "Mon compte").getByText("Culte Franco")).toHaveCount(0);
    // Mes services reste tel quel.
    await expect(carte(page, "Mes services")).toBeVisible();
    await verifierAgencement(page, { onglets: { rail: 0, pilules: 0 } });
    await capture(page, "moi-referent-musiciens");
  });

  test("un compte sans équipe : une phrase sobre et la même invitation, rien de l'ancien rôle déclaré", async ({ page }) => {
    await ouvrir(page, SANS_EQUIPE, "/moi");
    const equipes = carte(page, "Mes équipes");
    await expect(equipes.getByText("Tu n'es dans aucune équipe.")).toBeVisible();
    await expect(equipes.getByTestId("equipe-ligne")).toHaveCount(0);
    const faire = carte(page, "Ce que tu peux faire");
    await expect(faire.getByText("Tu as les chants, les accords, le planning, Mes services et tes setlists.")).toBeVisible();
    await expect(faire.getByTestId("acces-ligne")).toHaveCount(0);
    await expect(faire.getByText("Un accès te manque ? Demande à ton référent de te placer dans l'organigramme.")).toBeVisible();
    await expect(page.getByTestId("service-role")).toHaveCount(0);
    await capture(page, "moi-sans-equipe");
  });

  test("un admin : la carte dit qu'il a tout", async ({ page }) => {
    await ouvrir(page, ADMIN, "/moi");
    const faire = carte(page, "Ce que tu peux faire");
    await expect(faire.getByText("Tu as tous les accès : tu es admin.")).toBeVisible();
    await expect(faire.getByTestId("acces-ligne")).toHaveCount(0);
    await expect(faire.getByText(/Un accès te manque/)).toHaveCount(0);
  });

  test("en 中文 : les titres et les lieux sont traduits", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, REFERENT_MUSICIENS, "/moi");
    await expect(carte(page, "我的团队")).toBeVisible();
    await expect(carte(page, "你可以做什么").getByTestId("acces-ligne").first()).toContainText("夏令营");
  });
});

// ── La grille du planning : les colonnes du référent Régie ──────────────────────────────────

test.describe("Grille du culte : le référent Régie", () => {
  const DOCS = {
    "plannings/culte/dimanches/2027-01-24": { date: "2027-01-24", piano: "Yann Lorin", sono: "Anyi Pelle", ppt: "" },
  };
  const laCase = (page: Page, colonne: string) => page.locator(`[data-case="2027-01-24|${colonne}"]`).filter({ visible: true });

  async function ouvrirCulte2027(page: Page) {
    await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    const db = await signInAs(page, REFERENT_REGIE, DOCS, "/back-office/planning/culte");
    await page.getByRole("tab", { name: "2027", exact: true }).click();
    await expect(page.locator("[data-date-cell='2027-01-24'], [data-date-carte='2027-01-24']").filter({ visible: true })).toHaveCount(1);
    return db;
  }

  test("il édite Sono et PPT, pas Piano ; son écriture ne porte que sa colonne", async ({ page }) => {
    const db = await ouvrirCulte2027(page);
    // Piano : du texte, ni bouton ni champ.
    await expect(laCase(page, "piano")).toContainText("Yann Lorin");
    await expect(laCase(page, "piano").getByRole("button")).toHaveCount(0);
    // Sono et PPT : des cases à remplir.
    await expect(laCase(page, "sono").getByRole("button")).toHaveCount(1);
    await expect(laCase(page, "ppt").getByRole("button")).toHaveCount(1);
    await capture(page, "regie-grille-culte");

    // Son nom, dans la case PPT.
    await laCase(page, "ppt").getByRole("button").click();
    await page.getByRole("dialog").getByRole("option", { name: /^Régis M\./ }).click();
    await expect(laCase(page, "ppt")).toContainText("Régis M.");
    await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.ppt).toBe("Régis M.");
    const ecritures = db.writes.filter((w) => w.method === "PATCH" && w.path === "plannings/culte/dimanches/2027-01-24");
    expect(ecritures).toHaveLength(1);
    expect(Object.keys(ecritures[0].data).sort()).toEqual(["date", "modifieLe", "modifiePar", "ppt"]);
    expect(db.doc("plannings/culte/dimanches/2027-01-24")?.piano).toBe("Yann Lorin");
  });

  test("une date encore au Sheet, ou « retirer une date » : rien à éditer pour lui", async ({ page }) => {
    // 2026 : les dates viennent du Sheet, une première écriture recopierait toutes les colonnes.
    await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
    const csv = '"2026 DATE","Présidence","Choristes","","Pianiste","Guitariste","Batterie","Sono + Live","PPT","Orateur","Traducteur","Sainte cène","Notes"\n"20/09","Marc A.","Zoé P.","","Yann L.","Ruth K.","Paul D.","Anyi P.","Denis F.","Hélène W.","","",""';
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({
      status: 200, contentType: "text/csv", body: new URL(route.request().url()).searchParams.get("sheet") === "Franco_Louange" ? csv : "",
    }));
    await signInAs(page, REFERENT_REGIE, {}, "/back-office/planning/culte");
    const sono = page.locator('[data-case="2026-09-20|sono"]').filter({ visible: true });
    await expect(sono).toContainText("Anyi P.");
    await expect(sono.getByRole("button")).toHaveCount(0);
    await expect(page.locator('[data-case="2026-09-20|piano"]').filter({ visible: true }).getByRole("button")).toHaveCount(0);
  });
});

// ── Profil et inscription sans rôles de service ──────────────────────────────────────────────

test.describe("Profil et inscription : plus de rôles de service", () => {
  test("le profil n'a plus de grille de services ; enregistrer n'écrit pas `serviceRoles`", async ({ page }, info) => {
    // Un compte déjà créé ne se modifie que par un admin (canEditProfile) : un admin qui est aussi référent des Musiciens.
    const db = await ouvrir(page, { ...REFERENT_MUSICIENS, uid: "uid-admin", email: ADMIN.email }, "/profil");
    await expect(page.getByRole("group", { name: "Tes services et rôles" })).toHaveCount(0);
    await expect(page.getByText("Où sers-tu")).toHaveCount(0);
    // À la place, les équipes où l'organigramme le place (lecture seule).
    await expect(carte(page, "Mes équipes").getByTestId("equipe-ligne").first()).toHaveText("Louange · Musiciens — Référent");
    await capture(page, "profil-sans-roles");

    await page.getByLabel("Prénom").fill("Matthias");
    await (estTelephone(info)
      ? page.locator("form").getByRole("button", { name: "Enregistrer mon profil" })
      : enTete(page).getByRole("button", { name: "Enregistrer mon profil" })).click();
    await expect.poll(() => db.doc("users/uid-admin")?.firstName).toBe("Matthias");
    const ecriture = db.writes.find((w) => w.method === "PATCH" && w.path === "users/uid-admin");
    expect(ecriture, "le profil a été écrit").toBeTruthy();
    expect(Object.keys(ecriture!.data)).not.toContain("serviceRoles");
    expect(Object.keys(ecriture!.data)).toContain("planningName");
    // Ce que le serveur recopie n'est jamais envoyé par la personne.
    for (const k of ["sousEquipes", "referentSous", "lieuxLouange", "lieuxRegie", "joue", "dansEquipes"]) expect(Object.keys(ecriture!.data)).not.toContain(k);
  });

  test("l'inscription : trois étapes dont « Planning » sans rôles ; le compte créé n'a pas `serviceRoles`", async ({ page }) => {
    interdireDialoguesNatifs(page);
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    const db = await fakeFirestore(page, {});
    // Création du compte : une réponse d'Identity Toolkit simulée, jamais la vraie.
    const jeton = (uid: string) => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const now = Math.floor(Date.now() / 1000);
      return `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: "https://securetoken.google.com/gcclouange", aud: "gcclouange", user_id: uid, sub: uid, iat: now, exp: now + 3600, email: "nouvelle@example.com", firebase: { identities: {}, sign_in_provider: "password" } })}.sig`;
    };
    await page.route(/identitytoolkit\.googleapis\.com/, (route) => {
      const corps = route.request().url().includes("accounts:lookup")
        ? { users: [{ localId: "uid-nouvelle", email: "nouvelle@example.com", emailVerified: false, providerUserInfo: [{ providerId: "password", email: "nouvelle@example.com", federatedId: "nouvelle@example.com", rawId: "nouvelle@example.com" }], createdAt: "1767225600000", lastLoginAt: String(Date.now()) }] }
        : { kind: "identitytoolkit#SignupNewUserResponse", localId: "uid-nouvelle", email: "nouvelle@example.com", idToken: jeton("uid-nouvelle"), refreshToken: "fake-refresh", expiresIn: "3600" };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corps) });
    });
    await page.route(/securetoken\.googleapis\.com/, (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ access_token: jeton("uid-nouvelle"), expires_in: "3600", token_type: "Bearer", refresh_token: "fake-refresh", id_token: jeton("uid-nouvelle"), user_id: "uid-nouvelle", project_id: "gcclouange" }),
    }));

    await page.goto("/signup");
    const etapes = page.getByTestId("panneau-marque").getByTestId("etape");
    await expect(etapes).toHaveText(["1Compte", "2Identité", "3Planning"]);
    await page.getByLabel(/^Email/).fill("nouvelle@example.com");
    await page.getByLabel(/^Mot de passe/).fill("secret1");
    await page.getByLabel(/^Confirmer/).fill("secret1");
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByLabel("Prénom").fill("Nadia");
    await page.locator("#profile-lastname").fill("Perrin");
    await page.getByRole("button", { name: "Suivant" }).click();
    // La dernière étape : le nom du planning, plus aucune case de service ni de rôle.
    await expect(page.getByText("Ton nom dans les plannings")).toBeVisible();
    await expect(page.locator(".grille-services")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Présidence|Musicien|Régie/ })).toHaveCount(0);
    await capture(page, "inscription-sans-roles");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect.poll(() => db.writes.find((w) => w.method === "PATCH" && w.path === "users/uid-nouvelle")).toBeTruthy();
    const ecriture = db.writes.find((w) => w.method === "PATCH" && w.path === "users/uid-nouvelle")!;
    expect(Object.keys(ecriture.data)).not.toContain("serviceRoles");
    expect(ecriture.data.firstName).toBe("Nadia");
  });
});
