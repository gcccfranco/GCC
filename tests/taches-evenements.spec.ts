import { expect, test, type Browser, type Page } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { tachesDupliquees } from "../src/lib/taches/echeances";
import type { Tache } from "../src/types/tache";

// Lot 14 « Tâches ↔ évènements » (go du 19/09/2026) : une tâche peut être
// rattachée à un évènement daté. La fiche de l'évènement montre les tâches de
// mes pôles, et dupliquer l'évènement propose de les copier aux mêmes délais.
// La duplication elle-même est dans tests/evenements.spec.ts.

function tache(over: Partial<Tache> = {}): Tache {
  return {
    id: "t1", pole: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-12-10",
    repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "uid-auteur",
    createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...over,
  };
}

test("tachesDupliquees glisse les échéances du même nombre de jours que l'évènement (Noël +365, Pâques 2026→2027), rattache au nouvel évènement, sans répétition ni fois", () => {
  const noel2026 = { id: "noel-2026", titre: "Noël 2026" };
  const noel2027 = { id: "noel-2027", titre: "Noël 2027" };
  const copies = tachesDupliquees([
    tache({
      id: "a", pole: "da", titre: "Fond PPT", echeance: "2026-12-10", responsableUid: "uid-da", responsableNom: "Ruth Kouassi",
      lien: "https://canva.com/fond", note: "Format 16:9", prevenir: { regie: "Culte Francophone" }, evenement: noel2026,
    }),
    // Une répétition (tâche d'avant la règle) ne suit jamais la copie.
    tache({ id: "b", pole: "media", titre: "Montage vidéo", echeance: "2026-12-23", repetition: { rythme: "an" }, evenement: noel2026 }),
  ], "2026-12-24", "2027-12-24", noel2027);
  // Égalité stricte : ni id, ni auteur, ni dates de création, ni fois.
  expect(copies).toEqual([
    { pole: "da", values: {
      titre: "Fond PPT", responsableUid: "uid-da", responsableNom: "Ruth Kouassi", echeance: "2027-12-10", repetition: null,
      lien: "https://canva.com/fond", note: "Format 16:9", prevenir: { regie: "Culte Francophone" }, evenement: noel2027,
    } },
    { pole: "media", values: {
      titre: "Montage vidéo", responsableUid: null, responsableNom: "", echeance: "2027-12-23", repetition: null,
      lien: "", note: "", prevenir: null, evenement: noel2027,
    } },
  ]);
  // Pâques : 5 avril 2026 → 28 mars 2027 (357 jours). Une tâche à J-14 reste à J-14.
  const paques = tachesDupliquees(
    [tache({ echeance: "2026-03-22", evenement: { id: "paques-2026", titre: "Pâques 2026" } })],
    "2026-04-05", "2027-03-28", { id: "paques-2027", titre: "Pâques 2027" },
  );
  expect(paques.map((c) => c.values.echeance)).toEqual(["2027-03-14"]);
});

// ── Interface ───────────────────────────────────────────────────────────────

const NOEL = {
  titre: "Noël 2026", type: "eglise", pour: "eglise", date: "2026-12-24", heure: "19:30", heureFin: "", dateFin: "",
  lieu: "Grande salle", description: "Culte de Noël.", liens: [], images: [], placesMax: null, inscriptions: "fermees",
  sansCompte: false, lienExterne: "", contact: "", organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false,
  expiresAt: null, inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const PAQUES = { ...NOEL, titre: "Pâques 2027", date: "2027-03-28", heure: "10:30" };
const LIE_A_NOEL = { id: "noel", titre: "Noël 2026" };

function tacheDoc(over: Record<string, unknown> = {}) {
  return {
    pole: "da", titre: "Fond PPT de Noël", responsableUid: null, responsableNom: "", echeance: "2026-12-10",
    repetition: null, lien: "", note: "", prevenir: null, evenement: LIE_A_NOEL, auteurUid: "uid-da",
    createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...over,
  };
}

const DOCS = {
  "evenements/noel": NOEL,
  "evenements/paques": PAQUES,
  "poles/da/taches/t1": tacheDoc(),
  "poles/da/taches/t2": tacheDoc({ titre: "Affiche de Pâques", echeance: "2027-03-14", evenement: { id: "paques", titre: "Pâques 2027" } }),
  "poles/da/taches/t3": tacheDoc({ titre: "Vidéo d'annonce", evenement: null }),
  "poles/media/taches/m1": tacheDoc({ pole: "media", titre: "Montage vidéo de Noël", echeance: "2026-12-20" }),
};

const RUTH_DA: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Ruth", lastName: "Kouassi", poles: ["da"] };
const PAUL_MEDIA: FakeProfile = { uid: "uid-media", email: "media@example.com", firstName: "Paul", lastName: "Media", poles: ["media"] };
const SANS_POLE: FakeProfile = { uid: "uid-rien", email: "rien@example.com", firstName: "Anne", lastName: "Nopole" };
const DEUX_POLES: FakeProfile = { uid: "uid-dm", email: "dm@example.com", firstName: "Léa", lastName: "Deux", poles: ["da", "media"] };
/** Coordination des évènements (elle peut dupliquer et supprimer) et membre de DA. */
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement", "da"] };

type Docs = Record<string, Record<string, unknown>>;

async function member(page: Page, who: FakeProfile, to: string, docs: Docs = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  return signInAs(page, who, docs, to);
}

/** Une autre personne dans le même test : un contexte neuf (mêmes réglages d'appareil). */
async function autrePage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

const carte = (page: Page) => page.getByTestId("taches-carte");

test("une tâche sans champ evenement se lit non liée", async ({ page }) => {
  // Document d'avant le lot 14 : aucun champ `evenement`, aucune migration.
  const { evenement, ...avant } = tacheDoc({ titre: "Fond PPT" });
  void evenement;
  const db = await signInAs(page, RUTH_DA, { "poles/da/taches/t1": avant }, "/taches/da");
  await expect(page.getByText("Fond PPT")).toBeVisible();
  await expect(page.getByText(/^pour /)).toHaveCount(0);
  await page.getByRole("button", { name: /^Fond PPT/ }).click();
  const form = page.getByRole("dialog", { name: "Modifier la tâche" });
  await expect(form.getByLabel("Répétition")).toBeVisible();
  await expect(form.getByRole("button", { name: "Détacher de l'évènement" })).toHaveCount(0);
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toHaveCount(0);
  // Relue non liée, elle est réécrite non liée.
  const ecrit = db.writes.find((w) => w.method === "PATCH" && w.path === "poles/da/taches/t1");
  expect(ecrit?.data).toHaveProperty("evenement", null);
});

test("fiche : un membre du pôle DA voit le bloc Tâches avec les tâches DA de cet évènement, pas celles d'un autre évènement ni les non liées", async ({ page }) => {
  await member(page, RUTH_DA, "/evenements/noel");
  await expect(carte(page).getByRole("heading", { name: "Tâches" })).toBeVisible();
  const ligne = carte(page).getByRole("checkbox", { name: /Fond PPT de Noël/ });
  await expect(ligne).toBeVisible();
  await expect(carte(page)).toContainText("DA");
  await expect(carte(page).getByRole("checkbox")).toHaveCount(1);
  await expect(carte(page)).not.toContainText("Affiche de Pâques");
  await expect(carte(page)).not.toContainText("Vidéo d'annonce");
  await expect(carte(page)).not.toContainText("Montage vidéo de Noël");
  // Sur la fiche de Noël, la ligne ne répète pas « pour Noël 2026 ».
  await expect(carte(page)).not.toContainText("pour Noël 2026");
  // Le bloc est sous la fiche, pas dedans.
  await expect(page.getByTestId("fiche-carte").getByTestId("taches-carte")).toHaveCount(0);
  const fiche = await page.getByTestId("fiche-carte").boundingBox();
  const bloc = await carte(page).boundingBox();
  expect(bloc!.y).toBeGreaterThanOrEqual(fiche!.y + fiche!.height);
});

test("fiche : sans tâche, le bloc le dit ; une info sans date n'a pas de bloc", async ({ page }) => {
  await member(page, RUTH_DA, "/evenements/paques", {
    "evenements/paques": PAQUES,
    "evenements/parking": { ...NOEL, titre: "Nouveau parking", type: "info", date: "", heure: "" },
  });
  await expect(carte(page)).toContainText("Aucune tâche pour cet évènement.");
  await page.goto("/evenements/parking");
  await expect(page.getByRole("heading", { name: "Nouveau parking" })).toBeVisible();
  await expect(carte(page)).toHaveCount(0);
});

test("fiche : une réunion de pôle a aussi son bloc Tâches", async ({ page }) => {
  await member(page, RUTH_DA, "/evenements/reunion", {
    "evenements/reunion": { ...NOEL, titre: "Réunion DA", type: "info", pour: "pole:da", date: "2026-10-10", heure: "20:00" },
    "poles/da/taches/t1": tacheDoc({ titre: "Ordre du jour", echeance: "2026-10-08", evenement: { id: "reunion", titre: "Réunion DA" } }),
  });
  await expect(carte(page).getByRole("checkbox", { name: /Ordre du jour/ })).toBeVisible();
});

test("fiche : un membre Média ne voit que les tâches Média ; un connecté sans pôle ne voit pas le bloc ; sans compte non plus", async ({ page, browser }) => {
  await member(page, PAUL_MEDIA, "/evenements/noel");
  await expect(carte(page).getByRole("checkbox", { name: /Montage vidéo de Noël/ })).toBeVisible();
  await expect(carte(page).getByRole("checkbox")).toHaveCount(1);
  await expect(carte(page)).not.toContainText("Fond PPT de Noël");

  const sansPole = await autrePage(browser);
  await member(sansPole, SANS_POLE, "/evenements/noel");
  await expect(sansPole.getByRole("heading", { name: "Noël 2026" })).toBeVisible();
  await expect(carte(sansPole)).toHaveCount(0);
  await expect(sansPole.getByText("Fond PPT de Noël")).toHaveCount(0);
  await sansPole.context().close();

  const sansCompte = await autrePage(browser);
  await sansCompte.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await fakeFirestore(sansCompte, DOCS);
  await sansCompte.goto("/evenements/noel");
  await expect(sansCompte.getByRole("heading", { name: "Noël 2026" })).toBeVisible();
  await expect(carte(sansCompte)).toHaveCount(0);
  await expect(sansCompte.getByText("Fond PPT de Noël")).toHaveCount(0);
  await sansCompte.context().close();
});

test("fiche : Nouvelle tâche crée une tâche liée dans le pôle choisi, à mon nom, sans répétition (db.writes)", async ({ page }) => {
  const db = await member(page, DEUX_POLES, "/evenements/noel");
  await carte(page).getByRole("button", { name: "Nouvelle tâche" }).click();
  const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
  await expect(form).toContainText("Noël 2026");
  await expect(form.getByLabel("Répétition")).toHaveCount(0);
  await expect(form.getByLabel("Échéance")).toHaveValue("");
  await form.getByLabel("Pôle").selectOption({ label: "Média" });
  await form.getByLabel("Titre").fill("Diaporama des enfants");
  await form.getByLabel("Échéance").fill("2026-12-17");
  await capture(page, "evenement-tache-nouvelle");
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toHaveCount(0);
  const cree = db.writes.filter((w) => w.method === "POST" && w.path.startsWith("poles/"));
  expect(cree).toHaveLength(1);
  expect(cree[0].path).toMatch(/^poles\/media\/taches\//);
  expect(cree[0].data).toMatchObject({
    titre: "Diaporama des enfants", pole: "media", echeance: "2026-12-17", repetition: null,
    evenement: LIE_A_NOEL, auteurUid: "uid-dm", responsableUid: null,
  });
  await expect(carte(page).getByRole("checkbox", { name: /Diaporama des enfants/ })).toBeVisible();
});

test("fiche : avec un seul pôle, le formulaire ne demande pas le pôle", async ({ page }) => {
  const db = await member(page, RUTH_DA, "/evenements/noel");
  await carte(page).getByRole("button", { name: "Nouvelle tâche" }).click();
  const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
  await expect(form.getByLabel("Titre")).toBeVisible();
  await expect(form.getByLabel("Pôle")).toHaveCount(0);
  await form.getByLabel("Titre").fill("Carte de vœux");
  await form.getByLabel("Échéance").fill("2026-12-01");
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toHaveCount(0);
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/"));
  expect(cree?.path).toMatch(/^poles\/da\/taches\//);
  expect(cree?.data).toMatchObject({ pole: "da", evenement: LIE_A_NOEL, repetition: null });
});

test("fiche : cocher depuis la fiche cycle À faire → En cours → Terminé et prévient à Terminé (route simulée)", async ({ page }) => {
  const appels: unknown[] = [];
  await page.route("**/api/taches/fait", (route) => {
    appels.push(route.request().postDataJSON());
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, notified: 1, linked: true, cible: "regie" }) });
  });
  const db = await member(page, RUTH_DA, "/evenements/noel", {
    ...DOCS, "poles/da/taches/t1": tacheDoc({ prevenir: { regie: "Culte Francophone" } }),
  });
  const chemin = "poles/da/taches/t1/fois/2026-12-10";
  const cercle = carte(page).getByRole("checkbox", { name: /Fond PPT de Noël/ });
  await expect(cercle).toHaveAttribute("aria-checked", "false");

  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "mixed");
  expect(db.doc(chemin)).toMatchObject({ etat: "encours", parUid: "uid-da", parNom: "Ruth Kouassi" });
  expect(appels, "on ne prévient personne sur une tâche seulement commencée").toEqual([]);

  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "true");
  await expect(carte(page).getByRole("status")).toHaveText("Régie prévenue.");
  expect(db.doc(chemin)).toMatchObject({ etat: "terminee" });
  expect(appels).toEqual([{ pole: "da", tacheId: "t1", date: "2026-12-10" }]);
});

test("ligne : une tâche liée dit “pour Noël 2026” sur la page du pôle et dans Mes tâches", async ({ page }) => {
  await signInAs(page, RUTH_DA, DOCS, "/taches/da");
  const liee = page.locator(".group-row", { hasText: "Fond PPT de Noël" });
  await expect(liee).toContainText("pour Noël 2026");
  await expect(page.locator(".group-row", { hasText: "Vidéo d'annonce" })).not.toContainText("pour ");
  await page.goto("/taches");
  await expect(page.locator(".group-row", { hasText: "Fond PPT de Noël" })).toContainText("pour Noël 2026");
});

test("formulaire : Détacher écrit evenement: null ; une tâche liée ne propose pas de répétition", async ({ page }) => {
  const db = await signInAs(page, RUTH_DA, DOCS, "/taches/da");
  await page.getByRole("button", { name: /^Fond PPT de Noël/ }).click();
  const form = page.getByRole("dialog", { name: "Modifier la tâche" });
  await expect(form).toContainText("Noël 2026");
  await expect(form.getByLabel("Répétition")).toHaveCount(0);
  await capture(page, "tache-liee-formulaire");
  await form.getByRole("button", { name: "Détacher de l'évènement" }).click();
  // Détachée, elle peut de nouveau se répéter.
  await expect(form.getByLabel("Répétition")).toBeVisible();
  await expect(form.getByRole("button", { name: "Détacher de l'évènement" })).toHaveCount(0);
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toHaveCount(0);
  const ecrit = db.writes.find((w) => w.method === "PATCH" && w.path === "poles/da/taches/t1");
  expect(ecrit?.data).toHaveProperty("evenement", null);
  expect(db.doc("poles/da/taches/t1")?.evenement).toBeNull();
  await expect(page.locator(".group-row", { hasText: "Fond PPT de Noël" })).not.toContainText("pour Noël 2026");
});

test("évènement supprimé : la tâche reste, avec le titre mémorisé", async ({ page }) => {
  const db = await member(page, ALICE, "/evenements/noel");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/evenements\/?$/);
  expect(db.doc("evenements/noel")).toBeUndefined();
  // Rien n'est écrit chez les tâches : ni suppression, ni détachement.
  expect(db.writes.filter((w) => w.path.startsWith("poles/"))).toEqual([]);
  expect(db.doc("poles/da/taches/t1")?.evenement).toEqual(LIE_A_NOEL);
  await page.goto("/taches/da");
  await expect(page.locator(".group-row", { hasText: "Fond PPT de Noël" })).toContainText("pour Noël 2026");
});

test("中文 : bloc, ligne et confirmation en chinois", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  await member(page, ALICE, "/evenements/noel", { ...DOCS, "evenements/pentecote": { ...NOEL, titre: "Pentecôte 2027", date: "2027-05-16" } });
  await expect(carte(page).getByRole("heading", { name: "任务" })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "新任务" })).toBeVisible();
  await expect(carte(page).locator(".group-row", { hasText: "Fond PPT de Noël" })).toContainText("美工");

  // Un évènement sans tâche le dit en chinois.
  await page.goto("/evenements/pentecote");
  await expect(carte(page)).toContainText("此活动还没有任务。");

  // La ligne, sur la page du pôle.
  await page.goto("/taches/da");
  await expect(page.locator(".group-row", { hasText: "Fond PPT de Noël" })).toContainText("用于 Noël 2026");

  // Dupliquer Noël : la question est posée en chinois, avec le nombre de tâches.
  const questions: string[] = [];
  page.on("dialog", (d) => { questions.push(d.message()); return d.dismiss(); });
  await page.goto("/evenements/noel");
  await page.getByRole("link", { name: "复制" }).click();
  await page.getByLabel("日期", { exact: true }).fill("2027-12-24");
  await page.getByRole("button", { name: "创建活动" }).click();
  await expect.poll(() => questions).toEqual(["是否同时复制它的 1 个任务（保持相同提前天数）？"]);
});

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(600); // la feuille du formulaire finit de monter
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test("capture : le bloc Tâches sous la fiche, avec les trois états", async ({ page }) => {
  await member(page, DEUX_POLES, "/evenements/noel", {
    "evenements/noel": NOEL,
    "poles/da/taches/t1": tacheDoc({ responsableUid: "uid-dm", responsableNom: "Léa Deux" }),
    "poles/da/taches/t1/fois/2026-12-10": {
      date: "2026-12-10", parUid: "uid-dm", parNom: "Léa Deux", le: "2026-09-28T09:00:00Z", etat: "encours", debutLe: "2026-09-28T09:00:00Z",
    },
    "poles/da/taches/t2": tacheDoc({ titre: "Affiche de Noël", echeance: "2026-11-29", lien: "https://canva.com/affiche" }),
    "poles/media/taches/m1": tacheDoc({ pole: "media", titre: "Montage vidéo de Noël", echeance: "2026-12-20" }),
    "poles/media/taches/m2": tacheDoc({ pole: "media", titre: "Réserver la caméra", echeance: "2026-09-30" }),
    "poles/media/taches/m2/fois/2026-09-30": {
      date: "2026-09-30", parUid: "uid-dm", parNom: "Léa Deux", le: "2026-09-30T18:00:00Z", etat: "terminee", debutLe: "",
    },
  });
  await expect(carte(page).getByRole("checkbox")).toHaveCount(4);
  await expect(carte(page)).toContainText("En cours depuis 3 jours");
  // Le bas de la page : le bloc entier, au-dessus de la barre d'onglets.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await capture(page, "evenement-taches");
});
