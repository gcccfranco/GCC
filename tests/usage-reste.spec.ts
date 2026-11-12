import { expect, test, type Page } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_EMAIL, musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { CLES_USAGE } from "../src/lib/usageCles";

// Comptage d'usage, T3 « Le reste » (docs/spec-comptage-usage.md) : planning, harmonie, compte, évènements, cloche,
// langue, couleur des accords. Une commande par domaine, déclenchée UNE fois par l'interface, retrouvée avec `n = 1`
// dans le commit suivant. Compte fictif ; `documents:commit` est interceptée (route posée après fakeFirestore).
//
// Testées par l'interface (7 commandes) :
//   cmd.planning.annee, cmd.harmonie.filtre, cmd.compte.absence.ajouter, cmd.evenement.inscrire,
//   cmd.cloche.ouvrir, cmd.general.langue, cmd.louange.couleurAccords.
//
// Couvertes seulement par le test de registre (chaque appel `compter("…")` cite une clé de CLES_USAGE ; chaque clé
// cmd.… du registre est comptée, voir usage-dimanche.spec.ts) :
//   accueil : cmd.accueil.pourMoi ;
//   planning : choisirNom, prevenir, petitDej, grille.copie, grille.historique, grille.ajouterDate, export, publier ;
//   harmonie : suggestion, idee.ajouter, idee.modifier, idee.supprimer, chapitre ;
//   compte : absence.supprimer, notifPrefs, push, onboarding ;
//   évènements : creer, modifier, compteRendu ; cmd.notifier.envoyer, cmd.questionnaire.envoyer, cmd.chant.signaler ;
//   général : theme, rafraichir.

type Commit = { writes: { updateTransforms: { fieldPath: string; increment: { integerValue: string } }[] }[] };

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["15/11", "Prési A.", "Chori B.", "Chori C.", "Piani D.", "", "Batte E.", "Sono F.", "Proj G.", "Ora H.", "", "", ""],
]);

const csvDe = (page: Page, culte = "") =>
  page.route(/docs\.google\.com\/spreadsheets/, (r) => {
    const feuille = new URL(r.request().url()).searchParams.get("sheet");
    return r.fulfill({ status: 200, contentType: "text/csv", body: feuille === "Franco_Louange" ? culte : "" });
  });

/** Connecté, sur `url`, l'envoi du jour déjà fait : rien ne part tant que `verifier` n'a pas rouvert l'envoi. */
async function preparer(page: Page, qui: FakeProfile, url: string, docs: Record<string, Record<string, unknown>> = {}, culte = "") {
  await csvDe(page, culte);
  await page.addInitScript(() => {
    try {
      const p = (n: number) => String(n).padStart(2, "0");
      const d = new Date();
      localStorage.setItem("gcc-usage-envoi", `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
      localStorage.setItem("accords-aide-vue", "1");
    } catch { /* ignore */ }
  });
  const db = await signInAs(page, qui, docs, url);
  const recus: Commit[] = [];
  await page.route("**/documents:commit", async (route) => {
    recus.push(JSON.parse(route.request().postData() ?? "{}"));
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ writeResults: [] }) });
  });
  return { db, recus };
}

/** Rouvre l'envoi, passe en arrière-plan, puis vérifie que le commit porte `increment` 1 sur la clé. */
async function verifier(page: Page, recus: Commit[], cle: string) {
  await page.evaluate(() => {
    localStorage.removeItem("gcc-usage-envoi");
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => recus.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const champs = recus.flatMap((c) => c.writes.flatMap((w) => w.updateTransforms));
  const n = champs.filter((t) => t.fieldPath === `\`${cle}\`.n`);
  expect(n, `${cle} absente du commit : ${champs.map((t) => t.fieldPath).join(", ")}`).toHaveLength(1);
  expect(n[0].increment.integerValue).toBe("1");
}

/** React a posé ses gestionnaires : un toucher avant l'hydratation ne ferait rien. */
const hydrate = (page: Page) =>
  page.waitForFunction(() => {
    const b = document.querySelector("button");
    return !!b && Object.keys(b).some((k) => k.startsWith("__reactProps"));
  });

const MEMBRE: FakeProfile = { uid: "uid-usage-t3-lierre", email: "oriane.lierre@example.com", firstName: "Oriane", lastName: "Lierre", serviceRoles: { "Culte Francophone": ["musicien"] } };

test("planning : changer d'année compte cmd.planning.annee", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
  const admin: FakeProfile = { uid: "uid-usage-t3-admin", email: ADMIN_EMAIL, firstName: "Cyprien", lastName: "Mauve" };
  const { recus } = await preparer(page, admin, "/back-office/planning/culte", {}, CULTE);
  await hydrate(page);
  const annees = page.getByTestId("barre-grille").filter({ visible: true }).getByRole("tablist", { name: "Année" });
  await annees.getByRole("tab", { name: "2027" }).click();
  await expect(annees.getByRole("tab", { name: "2027" })).toHaveAttribute("aria-selected", "true");
  await verifier(page, recus, "cmd.planning.annee");
});

test("harmonie : filtrer le catalogue compte cmd.harmonie.filtre", async ({ page }) => {
  const pianiste: FakeProfile = { uid: "uid-usage-t3-harmonie", email: "basile.tilleul@example.com", firstName: "Basile", lastName: "Tilleul", ...musicien("piano") };
  const { recus } = await preparer(page, pianiste, "/harmonie");
  await expect(page.locator("[data-harmonie]")).toBeVisible();
  await hydrate(page);
  await page.locator("[data-harmonie]").getByRole("group", { name: "Ressenti" }).getByRole("button", { name: "Chaleureux" }).click();
  await verifier(page, recus, "cmd.harmonie.filtre");
});

test("compte : ajouter une absence compte cmd.compte.absence.ajouter", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T10:00:00"));
  const { recus } = await preparer(page, MEMBRE, "/profil");
  const s = page.getByRole("region", { name: /Mes absences/ });
  await hydrate(page);
  await s.getByRole("button", { name: "Ajouter une absence" }).click();
  await s.getByLabel("Du", { exact: true }).fill("2026-12-20");
  await s.getByLabel("Au", { exact: true }).fill("2026-12-27");
  await s.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(s.getByText("Du 20/12/2026 au 27/12/2026")).toBeVisible();
  await verifier(page, recus, "cmd.compte.absence.ajouter");
});

test("évènements : s'inscrire compte cmd.evenement.inscrire", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  const sortie = {
    titre: "Sortie d'essai du comptage", type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "", dateFin: "",
    lieu: "Square fictif", description: "Rendez-vous d'essai.", liens: [], images: [], placesMax: 10, inscriptionOuverte: true,
    sansCompte: true, lienExterne: "", contact: "", organisateurUid: "uid-usage-t3-orga", organisateurNom: "Orga Fictif", epingle: false,
    expiresAt: null, inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
  };
  const { recus } = await preparer(page, MEMBRE, "/evenements/t3-sortie", { "evenements/t3-sortie": sortie });
  await page.route("**/api/evenements/inscription", (route) =>
    route.fulfill({ json: { ok: true, inscrits: 1, mine: { id: MEMBRE.uid, nom: "Oriane L.", invites: 0 } } }));
  await hydrate(page);
  await page.getByRole("button", { name: "S'inscrire" }).click();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByTestId("fiche-carte").getByText("Inscrit", { exact: true })).toBeVisible();
  await verifier(page, recus, "cmd.evenement.inscrire");
});

test("notifications : ouvrir la cloche compte cmd.cloche.ouvrir", async ({ page }) => {
  const { recus } = await preparer(page, MEMBRE, "/songs");
  await hydrate(page);
  await page.getByRole("button", { name: "Notifications", exact: true }).filter({ visible: true }).first().click();
  await verifier(page, recus, "cmd.cloche.ouvrir");
});

test("général : passer en 中文 compte cmd.general.langue", async ({ page }) => {
  const { recus } = await preparer(page, MEMBRE, "/moi");
  await hydrate(page);
  await page.getByRole("button", { name: /^Langue/ }).filter({ visible: true }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await verifier(page, recus, "cmd.general.langue");
});

test("louange : choisir une couleur d'accords compte cmd.louange.couleurAccords (une seule clé)", async ({ page }) => {
  const { recus } = await preparer(page, MEMBRE, "/songs/abba-pere");
  await hydrate(page);
  await page.getByRole("button", { name: /Plus d'actions/ }).filter({ visible: true }).first().click();
  await page.getByRole("menu").locator('[data-langue="fr"]').getByRole("radio", { name: "Violet" }).click();
  await verifier(page, recus, "cmd.louange.couleurAccords");
});

// ── Registre : chaque appel compter("…") du code cite une clé de CLES_USAGE (Node, sans page) ─────

test("registre : chaque compter(\"…\") de src/ cite une clé de CLES_USAGE ; aucun gabarit hors cmd.louange.affichage.${…}", () => {
  const fichiers: string[] = [];
  const parcourir = (dir: string) => {
    for (const nom of readdirSync(dir)) {
      const p = join(dir, nom);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/\.(ts|tsx)$/.test(nom)) fichiers.push(p);
    }
  };
  parcourir("src");
  let appels = 0;
  for (const f of fichiers) {
    const source = readFileSync(f, "utf8");
    for (const m of source.matchAll(/\bcompter\(\s*(["'`])((?:(?!\1).)*)\1?/g)) {
      appels++;
      const [, guillemet, contenu] = m;
      if (guillemet === "`") {
        expect(contenu.startsWith("cmd.louange.affichage.${"), `${f} : clé par gabarit inconnue : ${contenu}`).toBe(true);
      } else {
        expect(CLES_USAGE, `${f} : clé comptée absente du registre : ${contenu}`).toHaveProperty([contenu]);
      }
    }
  }
  expect(appels).toBeGreaterThan(60);
});
