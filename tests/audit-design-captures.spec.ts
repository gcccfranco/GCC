import { expect, test, type Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage } from "./helpers/louange";

// Audit du design (02/11/2026) : captures du site entier pour l'équipe design. Rien n'est vérifié ici,
// on photographie. Comptes et données fictifs. PW_CAPTURES=<dossier> obligatoire.
// Lancer avec playwright.audit-design.config.ts (cinq dispositions).

const DIR = process.env.PW_CAPTURES ?? "test-results/audit-design";

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", planningName: "Alix D.",
  dansEquipes: ["da", "louange"], referentDe: ["da"], plannings: ["culte"], lieuxLouange: ["culte"], joue: ["piano"],
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const tache = (titre: string, echeance: string) => ({
  equipe: "da", titre, responsableUid: null, responsableNom: "", echeance, repetition: null, lien: "", note: "",
  prevenir: null, evenement: null, auteurUid: "uid-admin", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z",
});
const EV = {
  titre: "Pique-nique de rentrée", type: "loisir", pour: "eglise", date: "2026-11-14", heure: "12:00", heureFin: "16:00", dateFin: "",
  lieu: "Parc de la Villette", description: "Chacun apporte un plat à partager.", liens: [], images: [], placesMax: 40,
  inscriptions: "auto", inscriptionOuverte: true, sansCompte: false, contact: "Alix D.", organisateurUid: "uid-admin",
  organisateurNom: "Alix D.", epingle: false, expiresAt: null, inscrits: 12, createdAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-20T10:00:00Z",
};
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da/taches/t1": tache("Préparer les affiches de Noël", "2026-11-08"),
  "equipes/da/taches/t2": tache("Fond PPT du culte", "2026-11-12"),
  "evenements/pique-nique": EV,
  "setlists/s1": {
    title: "Culte du 8 novembre", leader: "Gaspard T.", category: "Culte Francophone", date: "2026-11-08", language: "mixed",
    notes: "Intro douce, enchaîner sans pause.", ownerId: "uid-admin", isPrivate: false,
    items: [item("hosanna", 1), item("abba-pere", 2), item("一切歌颂赞美", 3)],
  },
};

const PAGES: [string, string][] = [
  ["accueil", "/"],
  ["chants", "/songs"],
  ["chant-fr", "/songs/abba-pere"],
  ["chant-zh", "/songs/一切歌颂赞美"],
  ["statistiques", "/songs/statistiques"],
  ["setlists", "/setlists"],
  ["setlist", "/setlists/s1"],
  ["setlist-edition", "/setlists/s1/edit"],
  ["planning", "/planning"],
  ["mes-services", "/mes-services"],
  ["moi", "/moi"],
  ["evenements", "/evenements"],
  ["evenement", "/evenements/pique-nique"],
  ["harmonie", "/harmonie"],
  ["accords", "/accords"],
  ["guide", "/guide"],
  ["back-office", "/back-office"],
  ["taches", "/back-office/taches/da"],
  ["equipes", "/equipes"],
];
const VARIANTES = [
  { nom: "fr-clair", langue: "fr", sombre: false },
  { nom: "fr-sombre", langue: "fr", sombre: true },
  { nom: "zh-clair", langue: "zh-CN", sombre: false },
] as const;

async function preparer(page: Page, langue: string, sombre: boolean) {
  await page.emulateMedia({ colorScheme: sombre ? "dark" : "light" });
  await page.addInitScript(([l, s]) => {
    localStorage.setItem("i18nextLng", l as string);
    localStorage.setItem("theme", s ? "dark" : "light");
    localStorage.setItem("perf-role-preset", "pianiste");
  }, [langue, sombre] as const);
  await page.clock.setFixedTime(new Date("2026-11-02T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
}

async function photographier(page: Page, nom: string) {
  // PW_EMAIL_CHECK=<fichier> : au lieu de photographier, note les pages qui affichent une adresse e-mail réelle
  // (le compte admin simulé porte une vraie adresse) — à ne pas recopier dans une planche du dépôt public.
  if (process.env.PW_EMAIL_CHECK) {
    await page.waitForTimeout(1500);
    const texte = await page.evaluate(() => document.body.innerText);
    const vues = [...new Set(texte.match(/[\w.+-]+@gmail\.com/g) ?? [])];
    if (vues.length) appendFileSync(process.env.PW_EMAIL_CHECK, `${test.info().project.name} ${nom}: ${vues.join(", ")}\n`);
    return;
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/${test.info().project.name}/${nom}.png`, fullPage: true });
}

for (const v of VARIANTES) {
  for (const [nom, chemin] of PAGES) {
    test(`${nom} ${v.nom}`, async ({ page }) => {
      await preparer(page, v.langue, v.sombre);
      test.setTimeout(90_000);
      await signInAs(page, ADMIN, DOCS, "/setlists");
      if (chemin !== "/setlists") await page.goto(chemin);
      await expect(page.locator("main, [data-performance-mode], body").first()).toBeVisible();
      await photographier(page, `${nom}-${v.nom}`);
    });
  }
  test(`mode-louange ${v.nom}`, async ({ page }) => {
    test.setTimeout(90_000);
    await preparer(page, v.langue, v.sombre);
    await signInAs(page, ADMIN, DOCS, "/setlists/s1");
    await page.getByRole("button", { name: /Mode Louange|敬拜模式|Louange/ }).first().click();
    await attendreMiseEnPage(page).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${DIR}/${test.info().project.name}/mode-louange-${v.nom}.png` });
  });
  test(`connexion ${v.nom}`, async ({ page }) => {
    await preparer(page, v.langue, v.sombre);
    await page.goto("/login");
    await photographier(page, `connexion-${v.nom}`);
  });
}
