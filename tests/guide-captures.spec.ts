import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE_URL_COUPE } from "../playwright.config";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage } from "./helpers/louange";
import { FIGURES } from "../src/lib/guide/figures";

// Captures du guide d'utilisation (/guide) : refaites par ce script, pas à la main.
//
//   GUIDE_CAPTURES=1 npx playwright test tests/guide-captures.spec.ts --project=ordinateur
//
// Sans GUIDE_CAPTURES=1, la spec ne fait rien (elle écrase les PNG de public/guide/).
// Ordinateur 1280×800, ×2 (les PNG font 2560×1600), thème clair, français, contre le SERVEUR COUPÉ
// (PW_PORT + 1, interrupteur du back-office coupé) : le site tel que les membres le voient en ligne.
// Profil et base fictifs (jamais le vrai Firestore) ; le Google Sheet du planning est simulé avec des
// noms inventés (les lignes de src/lib/planning/data.ts sont de vrais noms) ; l'adresse de l'admin
// n'apparaît dans aucune capture (le document users/<uid> affiche une adresse fictive).
//
// Une capture par id de src/lib/guide/figures.ts. Le script MESURE aussi les cibles des annotations
// (getBoundingClientRect, en % du cadre 1280×800) et les écrit dans scripts/guide/mesures.json :
// c'est de là que viennent les coordonnées de figures.ts (cercle = centre + demi-axes, légende posée
// contre la cible). Après un changement d'interface : relancer, puis reporter les valeurs.
// Les PNG sont ensuite passés par PIL (`python3 scripts/guide/optimiser.py`, si PIL est là).

test.skip(process.env.GUIDE_CAPTURES !== "1", "GUIDE_CAPTURES=1 pour refaire les captures du guide");
test.use({
  baseURL: BASE_URL_COUPE,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  locale: "fr-FR",
  permissions: ["notifications"],
  actionTimeout: 20_000,
});

const L = 1280;
const H = 800;
const SORTIE = "public/guide";

// Profil fictif, membre ordinaire (son adresse s'affiche dans Moi et Mon profil).
const MOI: FakeProfile = {
  uid: "uid-guide",
  email: "lea.martin@example.com",
  firstName: "Léa",
  lastName: "Martin",
  planningName: "Léa",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
// Pour la seule capture d'Admin : l'adresse de l'admin ne sert qu'au jeton (droit d'admin) ; l'écran lit
// le document users/<uid>, qui porte une adresse fictive.
const ADMIN: FakeProfile = { ...MOI, uid: "uid-guide-admin", email: ADMIN_EMAIL };
const ADRESSE_FICTIVE = "lea.martin@example.com";

// ── Dimanches à venir, d'après la date du jour ──────────────────────────────────────────────────
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fr = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
function dimanches(n: number): Date[] {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return Array.from({ length: n }, (_, i) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * i, 12));
}
const DIM = dimanches(6);

// Franco_Louange : date, présidence, choristes ×2, piano, guitare, batterie, sono, PPT, orateur, —, cène.
// Léa est au piano deux dimanches sur trois (« Mes services »). Tous les noms sont inventés.
const PRESIDENTS = ["Océane R.", "Gaspard T.", "Mireille V.", "Basile D.", "Yaëlle N.", "Octave F."];
const CULTE_CSV = DIM.map((d, i) =>
  [fr(d), PRESIDENTS[i % 6], "Solène K.", "Hugo L.", i % 3 === 2 ? "Noé P." : "Léa", "Octave F.", "Marius C.", "Basile D.", "Yaëlle N.", "Pasteur Marchand", "", ""].join(","),
).join("\n");

async function sheetSimule(page: Page) {
  await page.context().route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = decodeURIComponent(new URL(route.request().url()).searchParams.get("sheet") ?? "");
    return route.fulfill({ status: 200, contentType: "text/csv", body: feuille === "Franco_Louange" ? CULTE_CSV : "" });
  });
}

// ── Base simulée ────────────────────────────────────────────────────────────────────────────────
const item = (o: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", ...o,
});
const SETLIST = {
  title: `Culte du ${DIM[1].getDate()} ${DIM[1].toLocaleDateString("fr-FR", { month: "long" })}`,
  leader: "Océane R.", category: "Culte Francophone", date: iso(DIM[1]), language: "mixed", notes: "",
  ownerId: MOI.uid, isPrivate: false,
  items: [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "abrite-moi", position: 2 })],
};
const membre = (prenom: string, nom: string, roles: Record<string, string[]>, planningName: string) => ({
  email: `${prenom.toLowerCase()}.${nom.toLowerCase()}@example.com`, firstName: prenom, lastName: nom, planningName,
  serviceRoles: roles, annonces: [], notify: [], equipes: false, plannings: [], createdAt: "2026-09-01T10:00:00Z",
});
const DOCS: Record<string, Record<string, unknown>> = {
  "setlists/sl-guide": SETLIST,
  // Mon propre document : même contenu que celui de signInAs, avec une adresse fictive à l'écran.
  [`users/${ADMIN.uid}`]: { ...membre("Léa", "Martin", MOI.serviceRoles!, "Léa"), email: ADRESSE_FICTIVE, createdAt: "2026-01-01T00:00:00Z" },
  "users/u-camille": membre("Camille", "Roche", { "Culte Francophone": ["presidence"] }, "Océane R."),
  "users/u-noe": membre("Noé", "Perrin", { "Culte Francophone": ["musicien"], Campus: ["musicien"] }, "Noé P."),
  "users/u-mireille": membre("Mireille", "Vasseur", { "Culte Francophone": ["chanteur"] }, "Mireille V."),
};

// ── Mesures ─────────────────────────────────────────────────────────────────────────────────────
type Mesure = { x: number; y: number; rx: number; ry: number; gauche: number; droite: number; haut: number; bas: number };
const mesures: Record<string, Record<string, Mesure>> = {};
const arrondi = (v: number) => Math.round(v * 10) / 10;

async function mesurer(cible: Locator): Promise<Mesure> {
  await expect(cible.first()).toBeVisible();
  const b = await cible.first().boundingBox();
  if (!b) throw new Error("cible sans boîte");
  const pct = (px: number, total: number) => arrondi((px / total) * 100);
  return {
    x: pct(b.x + b.width / 2, L), y: pct(b.y + b.height / 2, H),
    rx: pct(b.width / 2, L), ry: pct(b.height / 2, H),
    gauche: pct(b.x, L), droite: pct(b.x + b.width, L), haut: pct(b.y, H), bas: pct(b.y + b.height, H),
  };
}

/** Capture `id` (public/guide/<id>.png) et mesure ses cibles. Aucune adresse réelle à l'écran. */
async function figure(page: Page, id: string, cibles: Record<string, Locator> = {}) {
  // Ni pastille de développement de Next, ni survol, ni infobulle dans le cadre.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.mouse.move(L - 2, H - 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.()); // pas d'anneau de focus
  await page.waitForTimeout(500);
  await expect(page.locator("body")).not.toContainText(ADMIN_EMAIL);
  mesures[id] ??= {};
  for (const [nom, cible] of Object.entries(cibles)) mesures[id][nom] = await mesurer(cible);
  await page.screenshot({ path: `${SORTIE}/${id}.png`, animations: "disabled" });
}

async function aller(page: Page, url: string, attendre: Locator) {
  await page.goto(url);
  await attendre.first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
}

/** La bulle d'aide « Clique sur un accord… » (première visite d'un chant) masquerait la partition. */
async function fermerBulle(page: Page) {
  await page.getByRole("button", { name: "OK", exact: true }).click({ timeout: 4_000 }).catch(() => {});
  await page.waitForTimeout(300);
}

const lienNav = (page: Page, nom: string) => page.getByRole("link", { name: nom, exact: true }).first();

test.describe.configure({ mode: "serial" });

test("captures du guide", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "projet ordinateur seulement");
  test.setTimeout(480_000);
  // Le mode louange s'ouvre avec le rôle déjà choisi (sinon la feuille « Quel est ton rôle ? » masque la page).
  await page.addInitScript(() => {
    try { localStorage.setItem("perf-role-preset", "pianiste"); } catch { /* sans stockage */ }
    // Chromium sans interface refuse les notifications : on montre l'interrupteur, resté sur « désactivé ».
    try { Object.defineProperty(Notification, "permission", { get: () => "default" }); } catch { /* sans Notification */ }
  });
  await sheetSimule(page);
  await signInAs(page, MOI, DOCS, "/songs");
  await page.getByRole("searchbox").first().waitFor();

  // songs : la liste, avec « Récemment consultés » (un chant déjà ouvert).
  await aller(page, "/songs/abba-pere", page.getByRole("heading", { name: /Abba/i }));
  await fermerBulle(page);

  await aller(page, "/songs", page.getByRole("searchbox"));
  await figure(page, "songs", {
    tab: lienNav(page, "Chants"),
    search: page.getByRole("searchbox").first(),
    dot: page.getByRole("link", { name: /Abrite-moi/ }).first().locator("span").last(),
  });

  // song : la barre du chant et le menu ⋯.
  await aller(page, "/songs/abba-pere", page.getByRole("heading", { name: /Abba/i }));
  await fermerBulle(page);
  const barre = page.getByRole("button", { name: "Plus d'actions" }).first();
  // Menu ouvert, Radix masque le reste de la page aux rôles : on mesure avant d'ouvrir.
  mesures.song = {
    tonalite: await mesurer(page.getByTestId("pilule-tonalite")),
    menu: await mesurer(barre),
  };
  await barre.click();
  const personnaliser = page.getByRole("menuitem", { name: "Personnaliser" });
  await personnaliser.waitFor();
  await figure(page, "song", { customize: personnaliser });

  // customize : le panneau Personnaliser.
  await personnaliser.click();
  const panneau = page.getByRole("dialog", { name: "Personnaliser" });
  await panneau.waitFor();
  await page.waitForTimeout(600);
  await figure(page, "customize", {
    transpose: page.getByTestId("pilule-tonalite"),
    sections: panneau.getByText("Structure", { exact: true }),
    reinit: panneau.getByRole("button", { name: "Réinitialiser" }),
  });
  await page.keyboard.press("Escape");

  // performance : le mode louange, barre rappelée.
  await aller(page, "/setlists/sl-guide", page.getByRole("button", { name: /Mode Louange/ }));
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await page.waitForTimeout(1500); // fin de la transition d'ouverture
  // La barre s'escamote après 3 s : un toucher au centre la rappelle.
  const reglages = page.getByRole("button", { name: "Réglages" });
  await expect(async () => {
    if (!(await reglages.isVisible())) await page.mouse.click(L / 2, H / 2);
    await expect(reglages).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 20_000 });
  await figure(page, "performance", {
    annoter: page.getByRole("button", { name: "Annoter" }),
    reglages,
    page: page.getByRole("button", { name: "Page suivante" }),
    quitter: page.getByRole("button", { name: "Quitter" }),
  });

  // setlists : la liste « À venir ».
  await aller(page, "/setlists", page.getByText("Nouvelle setlist", { exact: true }));
  await figure(page, "setlists", {
    open: page.getByRole("link", { name: new RegExp(SETLIST.title) }).first(),
    nouvelle: page.getByText("Nouvelle setlist", { exact: true }),
  });

  // composeInfos : le cadre (titre, catégorie, visibilité).
  await aller(page, "/setlists/new", page.getByText("Autre setlist"));
  await page.getByText("Autre setlist").click();
  const titre = page.getByRole("textbox").first();
  await titre.waitFor();
  await titre.fill("Culte du 8 novembre");
  const categorie = page.locator("select").filter({ hasText: "Choisir une catégorie" }).first();
  await categorie.selectOption({ label: "Culte Francophone" });
  await page.waitForTimeout(400);
  await figure(page, "composeInfos", {
    titre,
    categorie,
    publier: page.getByRole("button", { name: "Publier" }),
  });

  // composeSongs : ajouter des chants.
  const ajouter = page.getByRole("button", { name: /^Ajouter (Abba|Abrite)/ });
  await ajouter.first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /^Ajouter Abrite-moi/ }).click().catch(() => {});
  await page.waitForTimeout(500);
  await figure(page, "composeSongs", {
    recherche: page.getByRole("searchbox").or(page.getByPlaceholder("Chercher un chant à ajouter…")).first(),
    plus: page.getByRole("button", { name: /^Ajouter 爱的约定/ }),
  });

  // composeAdvanced : les réglages d'un chant d'une setlist (tonalité, structure, fusion).
  await aller(page, "/setlists/sl-guide/edit", page.getByText("Réglages du chant"));
  const fusionner = page.getByRole("button", { name: "Fusionner", exact: true });
  await fusionner.scrollIntoViewIfNeeded();
  // Remonte un peu le volet : « Tonalité » reste lisible en haut, « Fusionner » encore en bas.
  await fusionner.evaluate((el) => {
    let parent = el.parentElement;
    while (parent && parent.scrollHeight <= parent.clientHeight + 1) parent = parent.parentElement;
    parent?.scrollBy(0, -26);
  });
  await page.waitForTimeout(500);
  await figure(page, "composeAdvanced", {
    tonalites: page.getByRole("radiogroup", { name: /Tonalité/ }).first(),
    structure: page.getByText("Structure", { exact: true }).first(),
    derniere: page.getByRole("button", { name: /Dernière phrase/ }),
    fusionner,
  });

  // planning : l'accueil du planning.
  await aller(page, "/planning", page.getByRole("heading", { name: "Planning", level: 1 }));
  await page.waitForTimeout(1200);
  await figure(page, "planning", {
    premier: page.getByText("Accueil", { exact: true }).first(),
    dernier: page.getByText("Interfranco", { exact: true }).first(),
    tab: lienNav(page, "Planning"),
    pourMoi: page.getByRole("link", { name: /Mes services/ }).filter({ visible: true }).first(),
  });

  // services : Mes services (page ouverte depuis Moi).
  await aller(page, "/mes-services", page.getByRole("heading", { name: "Mes services", level: 1 }));
  await page.waitForTimeout(1000);
  await figure(page, "services", {
    moi: lienNav(page, "Moi"),
    titre: page.getByRole("heading", { name: "Mes services", level: 1 }),
    onglets: page.getByText("À venir", { exact: true }).first(),
    ligne: page.getByText(/^Dim\. \d+ /).first(),
  });

  // notifications : la feuille Notifications de Moi.
  await aller(page, "/moi", page.getByRole("heading", { name: "Moi", level: 1 }));
  await page.getByText("Notifications", { exact: true }).first().click();
  const interrupteur = page.getByRole("switch").first();
  await interrupteur.waitFor();
  await figure(page, "notifications", { toggle: interrupteur });
  await page.keyboard.press("Escape");

  // profile : Mon profil, avec « Ton nom dans les plannings ».
  await aller(page, "/profil", page.getByText("Ton nom dans les plannings").first());
  await figure(page, "profile", {
    planningName: page.getByText("Ton nom dans les plannings").first(),
  });

});

test("captures du guide : Admin (compte admin, adresse fictive à l'écran)", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "ordinateur", "projet ordinateur seulement");
  test.setTimeout(120_000);
  await sheetSimule(page);
  await signInAs(page, ADMIN, DOCS, "/songs");
  await page.getByRole("searchbox").first().waitFor();
  // admin : les comptes et rôles.
  await aller(page, "/admin", page.getByRole("heading", { name: /Administration/ }));
  await page.waitForTimeout(800);
  await figure(page, "admin", {
    membres: page.getByRole("tab", { name: /Membres/ }).or(page.getByRole("button", { name: /Membres/ })).first(),
    liste: page.getByText("Mireille Vasseur").first(),
  });
});

test.afterAll(({}, testInfo) => {
  if (process.env.GUIDE_CAPTURES !== "1" || testInfo.project.name !== "ordinateur") return;
  // Chaque figure de figures.ts a sa capture.
  const attendues = Object.values(FIGURES).flat().map((f) => f.id);
  for (const id of attendues) if (!mesures[id]) throw new Error(`capture manquante : ${id}`);
  mkdirSync("scripts/guide", { recursive: true });
  writeFileSync("scripts/guide/mesures.json", JSON.stringify(mesures, null, 2) + "\n");
});
