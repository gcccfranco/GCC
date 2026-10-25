import { expect, test, type Page } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreEditeur, boutonTonalite, groupeTonalites, reglerElement } from "./helpers/editeurSetlist";
import { interdireDialoguesNatifs } from "./helpers/agencement";

// Flux B, tranche B5a (docs/spec-corrections-audit.md) : en 中文, plus de français hors contenu des chants et
// noms de personnes sur Campus, Moi et Profil ; l'erreur de notification se lit en 中文 ; l'éditeur de setlist
// range une tonalité majeure d'ancienne setlist sur le relatif mineur. Fausse base, noms fictifs.

const MEMBRE: FakeProfile = {
  uid: "uid-mina", email: "mina@example.com", firstName: "Mina", lastName: "Rowan", planningName: "Mina R.",
  serviceRoles: { "Culte Francophone": ["chanteur", "musicien"] },
};

const FRANCAIS = /[éèêàçù]|\b(Piano|Guitare|Batterie|Choriste|Musicien|Aucune|donnée|Culte)\b/;

async function enZh(page: Page) {
  interdireDialoguesNatifs(page);
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
}

/** Le texte visible du <main>, sans ce qui suit un « : » (nom de personne d'une cellule « Poste: Nom »). */
async function texteDuMain(page: Page): Promise<string> {
  const texte = await page.locator("main").first().innerText();
  // « Français » : le nom de la langue, écrit dans sa langue, comme dans tout sélecteur de langue.
  return texte.replace(/[:：][^\n,]*/g, "").replace(/Français/g, "");
}

test("Campus en 中文 : postes traduits, aucun français hors noms", async ({ page }) => {
  await enZh(page);
  await signInAs(page, MEMBRE, {}, "/planning/campus");
  await expect(page.getByTestId("campus-cartes")).toBeVisible();
  await expect(page.getByTestId("campus-cartes")).toContainText("钢琴");
  const brut = await page.getByTestId("campus-cartes").innerText();
  expect(brut).not.toMatch(/\b(Piano|Guitare|Batterie|Sono|PPT)\b/);
  expect(await texteDuMain(page)).not.toMatch(/\b(Piano|Guitare|Batterie|Aucune|donnée|Matin|Soir)\b/);
});

test("Moi en 中文 : aucun français", async ({ page }) => {
  await enZh(page);
  await signInAs(page, MEMBRE, {}, "/moi");
  await expect(page.locator("main").first()).toContainText("Mina");
  await page.waitForTimeout(500);
  expect(await texteDuMain(page)).not.toMatch(FRANCAIS);
});

test("Profil en 中文 : aucun français", async ({ page }) => {
  await enZh(page);
  await signInAs(page, MEMBRE, {}, "/profil");
  await expect(page.locator("main").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(await texteDuMain(page)).not.toMatch(FRANCAIS);
});

test.describe("Profil, site en ligne (interrupteur coupé)", () => {
  test.use({ baseURL: BASE_URL_COUPE });

  test("les services et rôles à cocher se lisent en 中文", async ({ page }) => {
    await enZh(page);
    await signInAs(page, MEMBRE, {}, "/profil");
    await expect(page.getByText("法语崇拜").first()).toBeVisible();
    await expect(page.getByText("乐手").first()).toBeVisible();
    expect(await texteDuMain(page)).not.toMatch(FRANCAIS);
  });
});

test("erreur de notification en 中文 : permission refusée", async ({ page }) => {
  await enZh(page);
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { configurable: true, get: () => "default" });
    Notification.requestPermission = async () => "denied";
    Object.defineProperty(Navigator.prototype, "standalone", { configurable: true, get: () => true });
    const enregistrement = { pushManager: { getSubscription: async () => null } };
    Object.defineProperty(ServiceWorkerContainer.prototype, "ready", { configurable: true, get: () => Promise.resolve(enregistrement) });
  });
  await signInAs(page, MEMBRE, {}, "/profil");
  const activer = page.getByRole("switch", { name: "通知" });
  await expect(activer).toBeVisible();
  await activer.click();
  await expect(page.getByText("出现错误")).toBeVisible();
  await expect(page.getByText(/Permission refusée|Une erreur est survenue/)).toHaveCount(0);
});

test("éditeur : un chant mineur avec une tonalité majeure d'ancienne setlist montre 12 boutons, la relative mineure cochée", async ({ page }) => {
  interdireDialoguesNatifs(page);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const id = "sl-mineur";
  await signInAs(page, { ...MEMBRE, ...{ serviceRoles: { "Culte Francophone": ["musicien"] } } }, {
    [`setlists/${id}`]: {
      title: "Culte fictif", leader: "Mina R.", category: "Culte Francophone", date: "2026-10-04", language: "fr", notes: "",
      ownerId: MEMBRE.uid, isPrivate: false,
      items: [{ songSlug: "a-l-agneau", position: 1, keyOverride: "C", showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
    },
  }, `/setlists/${id}/edit`);
  const titre = "À l'agneau";
  await attendreEditeur(page, titre);
  await reglerElement(page, titre);
  const groupe = groupeTonalites(page, titre);
  await expect(groupe.getByRole("radio")).toHaveCount(12);
  await expect(boutonTonalite(groupe, "Am")).toHaveAttribute("aria-checked", "true");
});

// ─── B5b : le back-office et l'administration en 中文 ─────────────────────────────────────────
// Un admin fictif parcourt Notifier, Réception, Personnes, Questionnaire, Planning sans compte et
// Statistiques en 中文 (puis l'ancienne administration, sur le serveur coupé) : aucun français repérable,
// ni dans le texte du <main> et des dialogues ouverts, ni dans les placeholder, aria-label, title et
// labels d'optgroup. Seules les données fictives saisies (noms, titres, messages) sont écartées.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Ada", lastName: "Quill", planningName: "Ada Q." };

/** Les données saisies par les membres dans la base simulée : écartées du texte avant la recherche de français. */
const DONNEES = [
  "Mina Rowan", "Mina R.", "Ada Quill", "Ada Q.", "Probleme de partition", "Page blanche apres connexion",
  "Nouveau chant fictif", "Hymne fictif", "Essai de notification", "Message d'essai", "Alpha song", "Beta song",
  "Gamma song", "Delta song", "Auteur Un", "Auteur Deux", "Auteur Trois", "Auteur Quatre", "Reponse libre fictive",
  "Setlist fictive", "President fictif",
  // Prénom d'exemple des champs de profil (placeholder « 例如 Timothée »), un nom propre.
  "Timothée",
];

const FRANCAIS_BO = new RegExp(
  "[éèêëàâçùûîôœ]|\\b(" + [
    "Audience", "Planning", "Titre", "Destinataires", "Aperçu", "Annuler", "Envoyer", "Chargement", "Signalements?",
    "Propositions?", "Membres?", "Inscriptions?", "Tous", "Toutes", "Voir", "Marquer", "Setlists?", "Tendance",
    "Période", "Langue", "Présidence", "Jamais", "Réessayer", "personnes?", "réponses?", "répondants?",
    "Réception", "Notifier", "Questionnaire", "Statistiques", "Droits", "Modifier", "Nouveau", "Récents", "Trier",
    "Dernière", "Chant", "Piano", "Guitare", "Batterie", "Choriste", "Musicien", "Aucune?", "donnée", "Culte",
    "Tonalité", "Oui", "Enregistrer", "Supprimer", "Refuser", "Rouvrir", "Traité", "Refusé", "Ouvre", "clic",
    "Prévenir", "Cultes", "Groupes", "Autres", "Réunions", "Calcul", "Dates", "Depuis", "mois", "Ces", "noms",
  ].join("|") + ")\\b",
);

/** Texte du <main> et des dialogues ouverts, et leurs placeholder, aria-label, title, labels d'optgroup. */
async function lireEcran(page: Page): Promise<{ texte: string; attributs: string[] }> {
  const { texte, attributs } = await page.evaluate(() => {
    const zones = [document.querySelector("main"), ...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')]
      .filter((z): z is Element => !!z);
    const textes: string[] = [];
    const attrs: string[] = [];
    for (const z of zones) {
      textes.push((z as HTMLElement).innerText);
      for (const el of z.querySelectorAll("[placeholder], [aria-label], [title], optgroup[label]")) {
        for (const a of ["placeholder", "aria-label", "title", "label"]) {
          const v = el.getAttribute(a);
          if (v) attrs.push(v);
        }
      }
    }
    return { texte: textes.join("\n"), attributs: attrs };
  });
  const sansDonnees = (s: string) => DONNEES.reduce((acc, d) => acc.split(d).join(""), s).replace(/Français/g, "");
  return { texte: sansDonnees(texte), attributs: attributs.map(sansDonnees) };
}

/** Les noms des plannings (données du Sheet, en puces ambre) ne sont pas du texte de l'écran : retirés avant de lire. */
async function sansLesNomsDuPlanning(page: Page) {
  await expect(page.locator(".bg-amber-100:visible").first()).toBeVisible();
  await page.locator(".bg-amber-100").evaluateAll((puces) => puces.forEach((p) => p.remove()));
}

/** Aucun français dans l'écran affiché (texte et attributs), avec le fragment fautif dans le message. */
async function sansFrancais(page: Page, ecran: string) {
  await page.waitForTimeout(400);
  const { texte, attributs } = await lireEcran(page);
  const fautif = texte.split("\n").filter((l) => FRANCAIS_BO.test(l));
  expect(fautif, `${ecran} : texte en français`).toEqual([]);
  expect(attributs.filter((a) => FRANCAIS_BO.test(a)), `${ecran} : attributs en français`).toEqual([]);
  expect(texte + attributs.join(" "), `${ecran} : clé brute`).not.toMatch(/\b(admin|notifier|stats|backOffice|common|survey|groupes|equipes)\.[a-zA-Z]+\.?[a-zA-Z.]*\b/);
}

const TONS = ["C", "D", "E", "F", "G"];
const RECUEIL = [
  ...["Alpha song", "Beta song", "Gamma song", "Delta song"].map((titre, i) => ({
    slug: `chant-fr-${i + 1}`, title: titre, language: "fr", artist: `Auteur ${["Un", "Deux", "Trois", "Quatre"][i]}`, originalKey: TONS[i],
  })),
  { slug: "zh-1", title: "中文诗歌 一", language: "zh", artist: "作者", originalKey: "G" },
];
const chantSetlist = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlistFictive = (date: string, slugs: string[]) => ({
  title: `Setlist fictive ${date}`, date, category: "Culte Francophone", leader: "President fictif", language: "fr", notes: "",
  items: slugs.map(chantSetlist), isDraft: false, isPrivate: false,
});

const BASE_BO: Record<string, Record<string, unknown>> = {
  "users/uid-mina": {
    email: "mina@example.com", firstName: "Mina", lastName: "Rowan", planningName: "Mina R.",
    serviceRoles: { "Culte Francophone": ["chanteur", "musicien"] }, annonces: [], notify: [], equipes: false, plannings: [],
    createdAt: new Date("2026-10-01T10:00:00Z"),
  },
  "reports/r1": {
    kind: "song", title: "Probleme de partition", status: "pending", createdAt: new Date("2026-10-02T10:00:00Z"),
    description: "Page blanche apres connexion", songSlug: "chant-fr-1", songTitle: "Alpha song", pageUrl: "",
    authorName: "Mina Rowan", authorId: "uid-mina", authorEmail: "mina@example.com",
  },
  "songProposals/p1": {
    title: "Hymne fictif", youtubeUrl: "https://example.com/video", pdfUrl: "", status: "pending",
    createdAt: new Date("2026-09-29T10:00:00Z"), authorName: "Mina Rowan", authorId: "uid-mina",
  },
  "surveyResponses/uid-mina": {
    authorName: "Mina Rowan", authorEmail: "mina@example.com", submitted: true,
    answers: { frequency: "daily", device: ["phone", "computer"], used: ["songs", "planning"], language: "both", overall: 5, ease: 4, recommend: "yes" },
    createdAt: new Date("2026-10-02T10:00:00Z"), updatedAt: new Date("2026-10-02T10:00:00Z"),
  },
  "notifications/n1": {
    title: "Essai de notification", body: "Message d'essai", url: "/", kind: "manual", recipients: ["uid-mina"], everyone: false,
    createdAt: new Date("2026-10-03T10:00:00Z"),
  },
  "setlists/s1": setlistFictive("2026-01-04", ["chant-fr-1", "chant-fr-2"]),
  "setlists/s2": setlistFictive("2026-01-11", ["chant-fr-1", "zh-1"]),
  "setlists/s3": setlistFictive("2026-01-18", ["chant-fr-1", "chant-fr-2"]),
  "setlists/s4": setlistFictive("2026-09-06", ["chant-fr-2", "zh-1"]),
  "setlists/s5": setlistFictive("2026-09-13", ["chant-fr-2"]),
};

async function ouvrirAdmin(page: Page, chemin: string, langue: "zh-CN" | "fr") {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  return signInAs(page, ADMIN, BASE_BO, chemin);
}

test.describe("B5b : back-office en 中文", () => {
  test.use({ serviceWorkers: "block" });

  test("Notifier : audience, destinataires, aperçu, derniers envois, confirmation", async ({ page }) => {
    await ouvrirAdmin(page, "/notifier", "zh-CN");
    await expect(page).toHaveURL(/\/back-office\/messages\/notifier\/?$/);
    await expect(page.getByText("Essai de notification")).toBeVisible();
    await sansFrancais(page, "Notifier");
    await page.getByRole("button", { name: "所有人" }).first().click();
    await expect(page.getByPlaceholder("筛选名单…")).toBeVisible();
    await expect(page.getByText("Mina Rowan").first()).toBeVisible();
    await page.getByLabel("标题").fill("Essai de notification");
    await page.getByLabel("内容").fill("Message d'essai");
    await sansFrancais(page, "Notifier, audience choisie");
    await page.getByRole("button", { name: /^发送给/ }).click();
    await expect(page.getByText(/确定把这条通知发送给/)).toBeVisible();
    await sansFrancais(page, "Notifier, confirmation");
  });

  test("Réception : signalements et propositions", async ({ page }) => {
    await ouvrirAdmin(page, "/back-office/messages", "zh-CN");
    await expect(page.getByText("Probleme de partition").first()).toBeVisible();
    await sansFrancais(page, "Réception");
  });

  test("Questionnaire : parties, réponses, suppression d'une réponse", async ({ page }) => {
    await ouvrirAdmin(page, "/back-office/messages/questionnaire", "zh-CN");
    await expect(page.getByText(/1 条回答/).first()).toBeVisible();
    await sansFrancais(page, "Questionnaire");
    await page.getByRole("button", { name: /按人查看/ }).first().click();
    await page.getByRole("button", { name: /Mina Rowan/ }).first().click();
    await sansFrancais(page, "Questionnaire, par personne");
    await page.getByRole("button", { name: "删除回答" }).click();
    await expect(page.getByRole("alertdialog").or(page.getByRole("dialog"))).toBeVisible();
    await expect(page.getByText("删除 Mina Rowan 的回答吗？")).toBeVisible();
    await sansFrancais(page, "Questionnaire, confirmation");
  });

  test("Personnes : liste, fiche, formulaire, nouvelles inscriptions", async ({ page }) => {
    await ouvrirAdmin(page, "/back-office/equipes/personnes", "zh-CN");
    await expect(page.getByText("Mina Rowan").first()).toBeVisible();
    await sansFrancais(page, "Personnes");
    await page.getByRole("button", { name: /Mina Rowan/ }).first().click();
    await sansFrancais(page, "Personnes, fiche");
  });

  test("Planning sans compte", async ({ page }) => {
    await ouvrirAdmin(page, "/back-office/planning/sans-compte", "zh-CN");
    await expect(page.getByRole("heading", { name: /^排班表中无账号的人（\d+）$/ })).toBeVisible();
    await sansLesNomsDuPlanning(page);
    await sansFrancais(page, "Planning sans compte");
  });

  test("Statistiques : les plus joués, jamais joués, à redécouvrir", async ({ page }) => {
    await ouvrirAdmin(page, "/back-office/statistiques", "zh-CN");
    await expect(page.getByTestId("setlists-comptees")).toBeVisible();
    await sansFrancais(page, "Statistiques, les plus joués");
    await page.goto("/back-office/statistiques?vue=jamais-joues");
    await expect(page.getByTestId("jamais-fr")).toBeVisible();
    await sansFrancais(page, "Statistiques, jamais joués");
    await page.goto("/back-office/statistiques?vue=a-redecouvrir&periode=3");
    await expect(page.locator('[data-testid="ligne-redecouvrir"]:visible').first()).toBeVisible();
    await sansFrancais(page, "Statistiques, à redécouvrir");
    await page.goto("/back-office/statistiques?periode=libre&du=2026-01-01&au=2026-09-30");
    await expect(page.getByTestId("setlists-comptees")).toBeVisible();
    await sansFrancais(page, "Statistiques, dates libres");
  });
});

test.describe("B5b : ancienne administration en 中文 (interrupteur coupé)", () => {
  test.use({ baseURL: BASE_URL_COUPE, serviceWorkers: "block" });

  test("/notifier et les onglets de /admin", async ({ page }) => {
    await ouvrirAdmin(page, "/notifier", "zh-CN");
    await expect(page.getByRole("heading", { name: "发送通知" })).toBeVisible();
    await sansFrancais(page, "Notifier (ancien)");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "管理" })).toBeVisible();
    await sansFrancais(page, "Admin, Membres");
    await page.getByRole("button", { name: /Mina Rowan/ }).first().click();
    await sansFrancais(page, "Admin, membre déplié");
    for (const onglet of [/收件箱/, /注册/, /排班表/, /问卷/]) {
      await page.getByRole("button", { name: onglet }).first().click();
      if (String(onglet) === "/排班表/") await sansLesNomsDuPlanning(page);
      await sansFrancais(page, `Admin, onglet ${onglet}`);
    }
  });
});

test.describe("B5b : en français, les écrans gardent leurs libellés", () => {
  test.use({ serviceWorkers: "block" });

  test("Notifier et Statistiques", async ({ page }) => {
    await ouvrirAdmin(page, "/back-office/messages/notifier", "fr");
    await expect(page.getByText("À qui")).toBeVisible();
    await expect(page.getByText("Derniers envois").first()).toBeVisible();
    await expect(page.getByText("Aperçu").first()).toBeVisible();
    expect((await lireEcran(page)).texte).not.toMatch(/\b(notifier|admin|stats)\.[a-zA-Z]+/);
    await page.goto("/back-office/statistiques");
    await expect(page.getByRole("heading", { name: "Setlists comptées" })).toBeVisible();
    await expect(page.getByText(/setlists comptées, du /).first()).toBeVisible();
    expect((await lireEcran(page)).texte).not.toMatch(/\b(notifier|admin|stats)\.[a-zA-Z]+/);
  });
});

test.describe("B5b : en français, l'ancienne administration garde ses onglets", () => {
  test.use({ baseURL: BASE_URL_COUPE, serviceWorkers: "block" });

  test("/admin", async ({ page }) => {
    await ouvrirAdmin(page, "/admin", "fr");
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    for (const onglet of ["Réception", "Membres", "Inscriptions", "Planning", "Questionnaire"]) {
      await expect(page.getByRole("button", { name: new RegExp(onglet) }).first()).toBeVisible();
    }
    expect((await lireEcran(page)).texte).not.toMatch(/\b(notifier|admin|stats)\.[a-zA-Z]+/);
  });
});
