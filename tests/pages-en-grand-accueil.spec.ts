import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { choisirSetlist, joursAvant, porteLeNom, pourMoi } from "../src/lib/planning/accueil";

// Lot U4 bis, tranche B1 — Accueil A (docs/spec-pages-en-grand.md, Q14 ; planches
// `accueil-a-*`). En grand (ordinateur, iPad paysage) : « Ce dimanche » à gauche, « Pour
// moi » à droite. Tablette portrait : « Pour moi » en deux cartes côte à côte, puis « Ce
// dimanche ». Téléphone : une carte « Pour moi », puis « Ce dimanche », dont le début
// entre dans le premier écran. Feuilles Google, Firestore et date simulés ; personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, piano: string) =>
  [date, "Léa M.", "Noé T.", "Inès V.", piano, "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""];
const CULTE = csv([
  ENTETE_CULTE,
  culte("04/10", "Ruth K."),
  culte("11/10", "Yann B."),
  culte("18/10", "Ruth K."),
  culte("25/10", "Ruth K."),
  culte("08/11", "Ruth K."),
  culte("15/11", "Ruth K."),
]);
const groupe = (pres: string, musiciens: string) => csv([["DATE", "Présidence", "Musiciens", "Orateur"], ["04/10", pres, musiciens, "Orateur Z."]]);
const EDD = csv([
  ["DATE", "Présidence", "Suppléant", "Piano", "Cajon", "Guitare", "", "Classe"],
  ["04/10", "Sarah Y.", "", "", "", "", "", "中班"],
  ["04/10", "Daniel H.", "", "", "", "", "", "大班"],
  ["04/10", "Mei Z.", "", "", "", "", "", "高班"],
]);
const table = () => {
  const r = Array(21).fill("");
  r[1] = "04/10";
  r[2] = "Famille Lam";
  return csv([r]);
};
const FEUILLES: Record<string, string> = {
  Franco_Louange: CULTE,
  Paix_T4: groupe("Clara B.", "Joël F."),
  "Fidélité_T4": groupe("Wang L.", ""),
  "Bonté_T4": groupe("Marc A.", "Lina P."),
  EDD,
  Franco_Table_PtD: table(),
};

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K.", serviceRoles: { "Culte Francophone": ["musicien"] } };
const SANS_SERVICE: FakeProfile = { uid: "uid-sans", email: "sans@example.com", planningName: "Personne Z." };

const item = (songSlug: string, position: number, keyOverride: string | null = null) => ({
  songSlug, position, keyOverride, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const SETLIST = {
  title: "Culte du 4 octobre", leader: "Léa M.", category: "Culte Francophone", date: "2026-10-04",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
  items: [item("hosanna", 1), item("abba-pere", 2), item("一生爱你", 3), item("a-la-croix", 4, "D"), item("向主欢呼", 5)],
};
const EVENEMENT = {
  titre: "Soirée louange", type: "musique", pour: "eglise", date: "2026-10-09", heure: "20:00", heureFin: "",
  dateFin: "", lieu: "Grande salle", description: "", liens: [], images: [], placesMax: null, sansCompte: false,
  lienExterne: "", contact: "", organisateurUid: "uid-org", organisateurNom: "Org", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "",
};
const DOCS = { "setlists/sl-1": SETLIST, "evenements/ev-1": EVENEMENT };

/** Jeudi 1er octobre 2026 : « Ce dimanche » est le 4 octobre. */
async function ouvrir(page: Page, profil: FakeProfile = RUTH) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  await signInAs(page, profil, DOCS, "/planning");
}

/** Les requêtes sur la collection des setlists (`runQuery`), relevées pendant le test : leur
 *  filtre (`where`) et leur borne (`limit`). Sans l'un ni l'autre, toute la collection est lue. */
function lecturesDesSetlists(page: Page) {
  const lues: { where?: unknown; limit?: number }[] = [];
  page.on("request", (r) => {
    if (!r.url().includes(":runQuery")) return;
    const q = (r.postDataJSON() as { structuredQuery?: { from?: { collectionId: string }[]; where?: unknown; limit?: number } } | null)?.structuredQuery;
    if (q?.from?.[0]?.collectionId === "setlists") lues.push({ where: q.where, limit: q.limit });
  });
  return lues;
}

const ceDimanche = (page: Page) => page.getByRole("region", { name: /Ce dimanche/ });
const cePourMoi = (page: Page) => page.getByRole("region", { name: "Pour moi" });
const boite = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!;

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand"; // ordinateur (1 280 px), ordinateur-1440, tablette-paysage
}

test.describe("Pour moi : la règle, sans navigateur", () => {
  const e = (date: string, service: string, role: string) => ({ date, service, role });

  test("le prochain jour de service, ses services réunis, puis les suivants bornés", () => {
    const r = pourMoi([
      e("2026-09-27", "Culte Franco", "Piano"),
      e("2026-10-04", "Culte Franco", "Piano"),
      e("2026-10-04", "Culte Franco", "Choristes"),
      e("2026-10-04", "EDD 中班", "Piano"),
      e("2026-10-18", "Groupe Fidélité", "Piano"),
      e("2026-10-25", "Culte Franco", "Piano"),
      e("2026-11-08", "Culte Franco", "Piano"),
    ], "2026-10-01", 2)!;
    expect(r.prochain.map((s) => [s.service, s.roles])).toEqual([["Culte Franco", ["Piano", "Choristes"]], ["EDD 中班", ["Piano"]]]);
    expect(r.ensuite.map((s) => s.date)).toEqual(["2026-10-18", "2026-10-25"]);
  });

  test("sans service à venir, rien (le bloc disparaît) ; aujourd'hui compte", () => {
    expect(pourMoi([e("2026-09-27", "Culte Franco", "Piano")], "2026-10-01", 2)).toBeNull();
    expect(pourMoi([e("2026-10-04", "Culte Franco", "Piano")], "2026-10-04", 2)?.prochain).toHaveLength(1);
  });

  test("la setlist du service : une seule, la prendre ; plusieurs, départager ; un doute, aucune", () => {
    const a = { leader: "Léa M.", moment: undefined };
    const b = { leader: "Paul D.", moment: undefined };
    expect(choisirSetlist([a], "Culte Francophone")).toBe(a);
    expect(choisirSetlist([a, b], "Culte Francophone", "paul d.")).toBe(b);
    expect(choisirSetlist([a, b], "Culte Francophone")).toBeUndefined();
    const matin = { leader: "Léa M.", moment: "matin" as const };
    expect(choisirSetlist([matin], "Campus"), "Campus : jamais au hasard").toBeUndefined();
    expect(choisirSetlist([matin], "Campus", undefined, "matin")).toBe(matin);
  });

  test("jours avant le service, et le nom de la personne dans une case", () => {
    expect(joursAvant("2026-10-04", "2026-10-01")).toBe(3);
    expect(joursAvant("2026-11-01", "2026-10-25"), "passage à l'heure d'hiver").toBe(7);
    expect(porteLeNom("Noé T., Ruth K.", "Ruth K.")).toBe(true);
    expect(porteLeNom("Ruthy K.", "Ruth K.")).toBe(false);
    expect(porteLeNom("Ruth K.", "")).toBe(false);
  });
});

test.describe("Accueil A : les quatre dispositions", () => {
  test("« Pour moi » : le prochain service, sa setlist, « Ouvrir » et « Mode louange »", async ({ page }, info) => {
    await ouvrir(page);
    const pm = cePourMoi(page);
    await expect(pm.getByText("Culte Franco").first()).toBeVisible();
    await expect(pm.getByText("Piano").first()).toBeVisible();
    await expect(pm.getByText(/dans 3 jours/)).toBeVisible();
    await expect(pm.getByText("Présidence : Léa M.")).toBeVisible();
    for (const titre of ["Hosanna", "Abba Père", "一生爱你", "À la croix", "向主欢呼"]) await expect(pm.getByText(titre, { exact: true })).toBeVisible();
    await expect(pm.getByTestId("tonalite")).toHaveText(["D", "A", "E", "D", "G"]);
    await expect(pm.getByRole("link", { name: "Ouvrir" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?$/);
    await expect(pm.getByRole("link", { name: "Mode Louange" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?\?louange=1$/);
    // « Ensuite » : deux services en grand, trois sur tablette portrait, aucun sur téléphone (il reste dans Mes services).
    const attendus = { grand: 2, tablette: 3, telephone: 0 }[disposition(info)];
    await expect(pm.getByTestId("ensuite")).toHaveCount(attendus);
    if (attendus) await expect(pm.getByTestId("ensuite").first()).toContainText("18 oct.");
    await expect(pm.locator('a[href^="/mes-services"]').first()).toBeVisible();
  });

  test("« Mode louange » ouvre la setlist en mode louange", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await ouvrir(page);
    await cePourMoi(page).getByRole("link", { name: "Mode Louange" }).click();
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
    await expect.poll(() => new URL(page.url()).search, "l'adresse perd ?louange=1 : retour arrière ne le relance pas").toBe("");
  });

  test("une setlist que la personne ne peut pas ouvrir n'est pas proposée", async ({ page }) => {
    await ouvrir(page, { ...RUTH, serviceRoles: {} });
    await expect(cePourMoi(page).getByText("Culte Franco").first()).toBeVisible();
    await expect(ceDimanche(page).getByTestId("ligne-edd").first()).toBeVisible();
    await expect(cePourMoi(page).getByRole("link", { name: "Ouvrir" })).toHaveCount(0);
  });

  test("sans service à venir, « Pour moi » disparaît ; « Ce dimanche » reste", async ({ page }) => {
    await ouvrir(page, SANS_SERVICE);
    // Le planning est lu (la feuille du Culte aussi) : l'absence n'est pas un chargement.
    await expect(ceDimanche(page).getByText("Noé T., Inès V.")).toBeVisible();
    await expect(cePourMoi(page)).toHaveCount(0);
  });

  // Relecture du lot : l'accueil, page la plus visitée, ne relit jamais toute la collection des
  // setlists ; il lit seulement celles du prochain service et après (bornées), et rien sans service.
  test("les setlists : une lecture bornée depuis le prochain service, aucune sans service", async ({ page }) => {
    const lues = lecturesDesSetlists(page);
    await ouvrir(page);
    await expect(cePourMoi(page).getByText("向主欢呼")).toBeVisible();
    // Une lecture en trop partirait dès le montage : une seconde suffit à la voir (le réseau
    // n'est jamais au repos sous charge, `networkidle` n'est pas fiable ici).
    await page.waitForTimeout(1000);
    expect(lues.filter((q) => !q.where && !q.limit), "jamais toute la collection").toEqual([]);
    const bornees = lues.filter((q) => JSON.stringify(q.where ?? null).includes('"stringValue":"2026-10-04"'));
    expect([...new Set(bornees.map((q) => q.limit))], "depuis le prochain service, 30 au plus").toEqual([30]);
  });

  test("sans service à venir, aucune setlist lue", async ({ page }) => {
    const lues = lecturesDesSetlists(page);
    await ouvrir(page, SANS_SERVICE);
    await expect(ceDimanche(page).getByText("Noé T., Inès V.")).toBeVisible();
    // Une lecture en trop partirait dès le montage : une seconde suffit à la voir (le réseau
    // n'est jamais au repos sous charge, `networkidle` n'est pas fiable ici).
    await page.waitForTimeout(1000);
    expect(lues.filter((q) => !q.limit || JSON.stringify(q.where ?? null).includes('"fieldPath":"date"'))).toEqual([]);
  });

  test("« Ce dimanche » : le Culte avec ses rôles et la personne en évidence, Groupes et EDD en une ligne par groupe", async ({ page }, info) => {
    await ouvrir(page);
    const cd = ceDimanche(page);
    const culteCarte = cd.getByTestId("carte-culte");
    await expect(culteCarte.getByTestId("moi")).toHaveText("Ruth K.");
    await expect(culteCarte.getByText("Noé T., Inès V.")).toBeVisible();
    // Deux colonnes de rôles en grand et sur tablette, une sur téléphone.
    const pres = await boite(culteCarte.getByText("Présidence", { exact: true }));
    const chor = await boite(culteCarte.getByText("Choristes", { exact: true }));
    if (disposition(info) === "telephone") expect(chor.y).toBeGreaterThan(pres.y + 10);
    else {
      expect(Math.abs(chor.y - pres.y)).toBeLessThan(4);
      expect(chor.x).toBeGreaterThan(pres.x + 100);
    }
    const groupes = cd.getByTestId("ligne-groupe");
    await expect(groupes).toHaveCount(3);
    await expect(groupes.nth(0)).toContainText("Paix");
    await expect(groupes.nth(0)).toContainText("Clara B.");
    await expect(groupes.nth(0)).toContainText("Joël F.");
    await expect(groupes.nth(1)).toContainText("Fidélité");
    await expect(groupes.nth(2)).toContainText("Bonté");
    const edd = cd.getByTestId("ligne-edd");
    await expect(edd).toHaveCount(3);
    await expect(edd).toContainText(["中班", "大班", "高班"]);
    await expect(edd.nth(1)).toContainText("Daniel H.");
    await expect(cd.getByText("Famille Lam")).toBeVisible();
    // Interrupteur ouvert : petit déj libre (« Je m'inscris » mène à Planning › Table) et évènements.
    await expect(cd.getByRole("link", { name: "Je m'inscris" })).toHaveAttribute("href", /^\/planning\/table/);
    await expect(cd.getByText("Soirée louange")).toBeVisible();
    // Le verset reste en bas (question 1).
    await expect(page.getByText("— Colossiens 3 : 23-24")).toBeVisible();
  });

  test("disposition : ce dimanche à gauche et pour moi à droite en grand ; pour moi d'abord ailleurs", async ({ page }, info) => {
    await ouvrir(page);
    // La setlist arrive après le planning : attendre que « Pour moi » soit complet avant de mesurer.
    await expect(cePourMoi(page).getByText("向主欢呼")).toBeVisible();
    await expect(ceDimanche(page).getByTestId("ligne-edd").first()).toBeVisible();
    const cd = await boite(ceDimanche(page));
    const pm = await boite(cePourMoi(page));
    const cartes = cePourMoi(page).locator("[data-carte]");
    const d = disposition(info);
    if (d === "grand") {
      expect(pm.x, "« Pour moi » à droite").toBeGreaterThan(cd.x + cd.width - 1);
      expect(Math.abs(pm.y - cd.y), "les deux colonnes partent ensemble").toBeLessThan(4);
      await expect(cartes).toHaveCount(2);
      const [a, b] = [await boite(cartes.nth(0)), await boite(cartes.nth(1))];
      expect(b.y, "prochain service, puis la setlist dessous").toBeGreaterThan(a.y + a.height - 1);
    } else {
      expect(cd.y, "« Pour moi » au-dessus de « Ce dimanche »").toBeGreaterThan(pm.y + pm.height - 1);
      if (d === "tablette") {
        await expect(cartes).toHaveCount(2);
        const [a, b] = [await boite(cartes.nth(0)), await boite(cartes.nth(1))];
        expect(Math.abs(a.y - b.y), "deux cartes côte à côte").toBeLessThan(2);
        expect(b.x).toBeGreaterThan(a.x + a.width - 1);
      } else {
        await expect(cartes, "une seule carte sur téléphone").toHaveCount(1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "pas de défilement horizontal").toBe(true);
  });

  test("téléphone : le premier écran montre le début de « Ce dimanche »", async ({ page }, info) => {
    test.skip(disposition(info) !== "telephone", "téléphone seulement");
    await ouvrir(page);
    await expect(cePourMoi(page).getByText("向主欢呼")).toBeVisible();
    const titre = await boite(ceDimanche(page).getByRole("heading", { name: /Ce dimanche/ }));
    const barre = await boite(page.getByRole("navigation", { name: "Navigation principale" }));
    expect(titre.y + titre.height, "le titre « Ce dimanche » est au-dessus de la barre du bas").toBeLessThanOrEqual(barre.y);
    expect(titre.y).toBeGreaterThan(0);
  });

  test("en 中文 : les titres traduits", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page);
    await expect(page.getByRole("region", { name: /本主日/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "我的安排" })).toBeVisible();
  });
});

test.describe("Accueil A, back-office coupé", () => {
  test.use({ baseURL: BASE_URL_COUPE });

  test("ni évènements, ni « Je m'inscris » : le petit déj ne paraît que s'il est rempli", async ({ page }) => {
    await ouvrir(page);
    const cd = ceDimanche(page);
    await expect(cd.getByText("Famille Lam")).toBeVisible();
    await expect(cePourMoi(page).getByText("Présidence : Léa M.")).toBeVisible();
    await expect(cd.getByText("Soirée louange")).toHaveCount(0);
    await expect(cd.getByText("Je m'inscris")).toHaveCount(0);
    await expect(cd.getByText("Libre", { exact: true })).toHaveCount(0);
  });
});
