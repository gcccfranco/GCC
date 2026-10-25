import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, fenetreDuSite, repondreDansLeSite } from "./helpers/agencement";
import { entreesCalendrier, peutDeplacer, sourcesPermises, type DonneesCalendrier, type ProfilCalendrier } from "../src/lib/calendrier/entrees";
import { equipesAFaire } from "../src/lib/tableauDeBord/donnees";
import { groupesDeReglages } from "../src/lib/tableauDeBord/reglages";
import { cleRappelTache, ligneRappelTache, nouvelleTacheMessage, tacheFaiteMessage } from "../src/lib/taches/messages";
import { ciblesDuRappel, equipeDuChemin, tacheDeLAppelant } from "../src/lib/taches/serveur";
import { EQUIPES } from "../src/lib/equipes/table";
import { COMITES } from "../src/lib/groupes/table";
import type { Tache } from "../src/types/tache";
import type { UserProfile } from "../src/types/user";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-C : les tâches
// rangées par équipe (EQ6 à EQ16 ; décisions 2, 3, 5, 41). Les référents (et les admins) créent,
// modifient, suppriment et déplacent ; tous les membres voient ; un simple membre ne coche que les
// tâches dont il est le responsable ; une tâche « toute l'équipe » se coche par les référents et les
// admins, qui en reçoivent les rappels. Louange = TEAM LOUANGE + toute personne qui a un rôle de
// service. Base et routes simulées, noms fictifs. Horloge au vendredi 9 octobre 2026.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
/** Référente de TEAM MÉDIAS (Réussite 1). */
const LEA: FakeProfile = { uid: "u-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", dansEquipes: ["medias"], referentDe: ["medias"] };
/** Simple membre de TEAM MÉDIAS (Réussite 2). */
const JOEL: FakeProfile = { uid: "u-joel", email: "joel@example.com", firstName: "Joël", lastName: "F.", dansEquipes: ["medias"] };
/** Membre de TEAM DA (Réussite 3). */
const HUGO: FakeProfile = { uid: "u-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "L.", dansEquipes: ["da"] };
/** Musicien sans équipe : le public Louange (Réussite 4). */
const MAELLE: FakeProfile = {
  uid: "u-maelle", email: "maelle@example.com", firstName: "Maëlle", lastName: "T.", serviceRoles: { "Culte Francophone": ["musicien"] },
};
/** Référente de TEAM LOUANGE. */
const INES: FakeProfile = { uid: "u-ines", email: "ines@example.com", firstName: "Inès", lastName: "P.", dansEquipes: ["louange"], referentDe: ["louange"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], coordination: p.coordination,
    equipes: p.equipes ?? false, plannings: p.plannings ?? [], dansEquipes: p.dansEquipes, referentDe: p.referentDe,
  }) as UserProfile & ProfilCalendrier;
/** Le profil tel que la base le garde (`users/{uid}`), pour les responsables proposés. */
const docProfil = (p: FakeProfile) => ({
  email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: "", serviceRoles: p.serviceRoles ?? {},
  annonces: [], notify: [], dansEquipes: p.dansEquipes ?? [], referentDe: p.referentDe ?? [],
});

/** Vendredi 9 octobre 2026 : « Cette semaine » va jusqu'au dimanche 11. */
const AUJOURDHUI = "2026-10-09";

function tache(over: Partial<Tache> = {}): Tache {
  return {
    id: "photos", equipe: "medias", titre: "Photos du culte", responsableUid: "u-joel", responsableNom: "Joël F.",
    echeance: "2026-10-11", repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-lea",
    createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...over,
  };
}
const tacheDoc = (over: Record<string, unknown> = {}) => {
  const { id, ...doc } = tache();
  void id;
  return { ...doc, ...over };
};

/** TEAM MÉDIAS : la tâche de Joël F., une « toute l'équipe », celle de Léa M. ; Louange et TEAM DA. */
const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/medias/taches/photos": tacheDoc(),
  "equipes/medias/taches/regie": tacheDoc({ titre: "Ranger la régie", responsableUid: null, responsableNom: "", echeance: "2026-10-10" }),
  "equipes/medias/taches/montage": tacheDoc({ titre: "Montage vidéo", responsableUid: "u-lea", responsableNom: "Léa M.", echeance: "2026-10-16" }),
  "equipes/louange/taches/chants": tacheDoc({ equipe: "louange", titre: "Choisir les chants de Noël", responsableUid: null, responsableNom: "", auteurUid: "u-ines" }),
  "equipes/da/taches/affiche": tacheDoc({ equipe: "da", titre: "Affiche de Noël", responsableUid: "u-hugo", responsableNom: "Hugo L.", auteurUid: "u-hugo" }),
};

// ─── Pur : notifications ────────────────────────────────────────────────────

test.describe("pur : les notifications portent le nom de l'équipe (EQ13)", () => {
  test("nouvelle tâche, tâche faite, ligne du matin : « TEAM MÉDIAS », 媒体组 ; Louange : « Louange », 敬拜", () => {
    const t = tache({ echeance: "2026-10-16" });
    expect(nouvelleTacheMessage(t, "fr")).toEqual({ title: "Nouvelle tâche : Photos du culte", body: "TEAM MÉDIAS · pour vendredi 16 octobre" });
    expect(nouvelleTacheMessage(t, "zh-CN")).toEqual({ title: "新任务：Photos du culte", body: "媒体组 · 截止 10月16日星期五" });
    expect(tacheFaiteMessage(t, "Léa M.", "fr")).toEqual({ title: "Tâche faite : Photos du culte", body: "Léa M. (TEAM MÉDIAS) l'a terminée." });
    expect(tacheFaiteMessage(t, "Léa M.", "zh-CN").body).toBe("Léa M.（媒体组）已完成。");
    const r = { tache: t, date: "2026-10-16", quand: "J3" as const };
    expect(ligneRappelTache(r, "fr")).toBe("À faire : Photos du culte (TEAM MÉDIAS), vendredi 16 octobre");
    expect(ligneRappelTache(r, "zh-CN")).toBe("待办：Photos du culte（媒体组），10月16日星期五");
    const louange = tache({ equipe: "louange", titre: "Choisir les chants", echeance: "2026-10-16" });
    expect(nouvelleTacheMessage(louange, "fr").body).toBe("Louange · pour vendredi 16 octobre");
    expect(nouvelleTacheMessage(louange, "zh-CN").body).toBe("敬拜 · 截止 10月16日星期五");
    for (const lang of ["fr", "zh-CN"] as const) {
      expect(JSON.stringify([nouvelleTacheMessage(t, lang), tacheFaiteMessage(t, "Léa M.", lang), ligneRappelTache(r, lang)])).not.toMatch(/Pôle|部门/);
    }
  });
});

// ─── Pur : le cron et les routes (base simulée) ──────────────────────────────

/** Base Firestore simulée en mémoire, pour les fonctions du serveur (Admin SDK). */
function baseSimulee(docs: Record<string, Record<string, unknown>>) {
  const lireDoc = async (chemin: string) => ({ id: chemin.split("/").pop()!, exists: chemin in docs, data: () => docs[chemin] });
  type Collection = { doc: (id: string) => Ref; get: () => Promise<{ docs: { id: string; data: () => Record<string, unknown> }[] }> };
  type Ref = { path: string; get: () => ReturnType<typeof lireDoc>; collection: (c: string) => Collection };
  const collection = (chemin: string): Collection => ({
    doc: (id) => ref(`${chemin}/${id}`),
    get: async () => ({
      docs: Object.keys(docs)
        .filter((p) => p.startsWith(`${chemin}/`) && !p.slice(chemin.length + 1).includes("/"))
        .map((p) => ({ id: p.split("/").pop()!, data: () => docs[p] })),
    }),
  });
  const ref = (chemin: string): Ref => ({ path: chemin, get: () => lireDoc(chemin), collection: (c) => collection(`${chemin}/${c}`) });
  return { collection } as unknown as Parameters<typeof tacheDeLAppelant>[0];
}

const PROFILS = {
  "users/u-lea": docProfil(LEA),
  "users/u-joel": docProfil(JOEL),
  "users/u-hugo": docProfil(HUGO),
  "users/u-maelle": docProfil(MAELLE),
  "users/u-ines": docProfil(INES),
};

test.describe("pur : le cron des tâches (EQ12, décision 41)", () => {
  test("qui rappeler : le responsable ; sans responsable, les référents de l'équipe, pas ses simples membres", async () => {
    const db = baseSimulee(PROFILS);
    expect(await ciblesDuRappel(tache({ responsableUid: "u-joel" }), db)).toEqual(["u-joel"]);
    expect(await ciblesDuRappel(tache({ responsableUid: null }), db)).toEqual(["u-lea"]);
    // Louange : les référents de TEAM LOUANGE, pas un musicien du public Louange.
    expect(await ciblesDuRappel(tache({ equipe: "louange", responsableUid: null }), db)).toEqual(["u-ines"]);
    // Une équipe sans référent : personne.
    expect(await ciblesDuRappel(tache({ equipe: "da", responsableUid: null }), db)).toEqual([]);
  });

  test("clés notifLog par équipe ; une tâche restée sous « poles/ » n'est pas rappelée", () => {
    const t = tache();
    expect(cleRappelTache({ tache: t, date: "2026-10-12", quand: "J3" }, AUJOURDHUI)).toBe("rappel-tache-J3-medias-photos-2026-10-12");
    expect(cleRappelTache({ tache: t, date: "2026-10-08", quand: "retard" }, AUJOURDHUI)).toBe("rappel-tache-retard-medias-photos-2026-10-08");
    // « en cours » revient chaque matin : le jour d'envoi entre dans la clé.
    expect(cleRappelTache({ tache: t, date: "2026-10-05", quand: "encours", depuis: 4 }, AUJOURDHUI))
      .toBe("rappel-tache-encours-medias-photos-2026-10-05-2026-10-09");
    expect(equipeDuChemin("equipes/medias/taches/photos")).toBe("medias");
    expect(equipeDuChemin("equipes/louange/taches/chants")).toBe("louange");
    expect(equipeDuChemin("poles/media/taches/photos")).toBeNull();
  });
});

test.describe("pur : /api/taches/assigne et /fait revérifient l'appelant (EQ11, décision 41)", () => {
  const db = baseSimulee({ ...PROFILS, ...DOCS });
  const qui = (p: FakeProfile) => ({ uid: p.uid, email: p.email });

  test("/fait : un simple membre ne coche que la sienne ; « toute l'équipe » : 403 ; la référente oui", async () => {
    await expect(tacheDeLAppelant(db, qui(JOEL), "medias", "photos", "fait")).resolves.toMatchObject({ id: "photos", equipe: "medias", titre: "Photos du culte" });
    await expect(tacheDeLAppelant(db, qui(JOEL), "medias", "regie", "fait")).resolves.toEqual({ status: 403, error: "Tu ne peux pas cocher cette tâche" });
    await expect(tacheDeLAppelant(db, qui(JOEL), "medias", "montage", "fait")).resolves.toEqual({ status: 403, error: "Tu ne peux pas cocher cette tâche" });
    await expect(tacheDeLAppelant(db, qui(LEA), "medias", "regie", "fait")).resolves.toMatchObject({ id: "regie", responsableUid: null });
    await expect(tacheDeLAppelant(db, qui(ADMIN), "medias", "regie", "fait")).resolves.toMatchObject({ id: "regie" });
  });

  test("hors de l'équipe : 403 « Pas dans cette équipe » ; Louange élargi ; tâche absente : 404", async () => {
    await expect(tacheDeLAppelant(db, qui(HUGO), "medias", "photos", "fait")).resolves.toEqual({ status: 403, error: "Pas dans cette équipe" });
    await expect(tacheDeLAppelant(db, qui(MAELLE), "louange", "chants", "fait")).resolves.toEqual({ status: 403, error: "Tu ne peux pas cocher cette tâche" });
    await expect(tacheDeLAppelant(db, qui(INES), "louange", "chants", "fait")).resolves.toMatchObject({ id: "chants", equipe: "louange" });
    await expect(tacheDeLAppelant(db, qui(LEA), "medias", "absente", "fait")).resolves.toEqual({ status: 404, error: "Tâche introuvable" });
  });

  test("/assigne : seule une référente (ou un admin) nomme un responsable", async () => {
    await expect(tacheDeLAppelant(db, qui(JOEL), "medias", "photos", "assigne")).resolves.toEqual({ status: 403, error: "Réservé aux référents de l'équipe" });
    await expect(tacheDeLAppelant(db, qui(LEA), "medias", "photos", "assigne")).resolves.toMatchObject({ id: "photos" });
  });

  test("règles : equipes/{equipe}/taches lit l'équipe dans le chemin ; plus de tâches de pôle", () => {
    const rules = lire("firestore.rules");
    expect(rules).not.toMatch(/isTachePole|match \/poles\//);
    const bloc = rules.match(/match \/equipes\/\{equipe\}\/taches\/\{id\} \{[\s\S]*?\n {4}\}/)![0];
    expect(bloc).toMatch(/allow read: if signedIn\(\) && estDeLEquipe\(equipe\);/);
    expect(bloc).toMatch(/allow create: if signedIn\(\) && estReferentDe\(equipe\)\s*&& request\.resource\.data\.auteurUid == request\.auth\.uid\s*&& request\.resource\.data\.equipe == equipe;/);
    expect(bloc).toMatch(/allow update: if signedIn\(\) && estReferentDe\(equipe\) && request\.resource\.data\.equipe == equipe;/);
    expect(bloc).toMatch(/allow delete: if signedIn\(\) && estReferentDe\(equipe\);/);
    // Cocher (décision 41) : le responsable s'il est de l'équipe ; « toute l'équipe » : les référents.
    expect(bloc).toMatch(/match \/fois\/\{date\} \{\s*allow read: if signedIn\(\) && estDeLEquipe\(equipe\);\s*allow write: if signedIn\(\) && \(estReferentDe\(equipe\)\s*\|\| \(estDeLEquipe\(equipe\)\s*&& get\(\/databases\/\$\(database\)\/documents\/equipes\/\$\(equipe\)\/taches\/\$\(id\)\)\.data\.get\('responsableUid', null\)\s*== request\.auth\.uid\)\);/);
  });
});

// ─── Pur : calendrier et widget ─────────────────────────────────────────────

test.describe("pur : le calendrier et le widget « À faire » lisent les équipes (EQ14, EQ15)", () => {
  const donnees = (): DonneesCalendrier => ({
    seances: [], mesServices: [], sheet: [], evenements: [], mesInscriptions: [], scene: [], petitDej: [], setlists: [],
    taches: [
      { tache: tache(), fois: [] },
      { tache: tache({ id: "regie", titre: "Ranger la régie", responsableUid: null, responsableNom: "", echeance: "2026-10-10" }), fois: [] },
      { tache: tache({ id: "chants", equipe: "louange", titre: "Choisir les chants de Noël", responsableUid: null, responsableNom: "" }), fois: [] },
    ],
  });
  const ctx = (p: FakeProfile) => ({ user: user(p), profile: profil(p), lang: "fr" as const, today: AUJOURDHUI });
  const taches = (p: FakeProfile) => entreesCalendrier("2026-10-01", "2026-10-31", donnees(), ctx(p)).filter((e) => e.source === "taches");

  test("l'entrée porte le nom court de l'équipe et mène à /taches/<équipe> ; « à moi » suit peutCocher", () => {
    expect(taches(JOEL).map((e) => [e.titre, e.detail, e.lien, e.moi, e.deplacable])).toEqual([
      ["Ranger la régie", "Médias · échéance", "/taches/medias", false, false],
      ["Photos du culte", "Médias · Joël F.", "/taches/medias", true, false],
    ]);
    // La référente : la tâche « toute l'équipe » est à elle ; elle déplace.
    expect(taches(LEA).map((e) => [e.titre, e.moi, e.deplacable])).toEqual([
      ["Ranger la régie", true, true],
      ["Photos du culte", false, true],
    ]);
    // TEAM DA ne voit rien de TEAM MÉDIAS ; un musicien voit Louange.
    expect(taches(HUGO)).toEqual([]);
    expect(taches(MAELLE).map((e) => [e.titre, e.detail, e.lien])).toEqual([["Choisir les chants de Noël", "Louange · échéance", "/taches/louange"]]);
    expect(peutDeplacer(user(JOEL), profil(JOEL), { source: "taches", tache: tache(), date: "2026-10-11", fois: [] }, AUJOURDHUI)).toBe(false);
    expect(sourcesPermises(user(MAELLE), profil(MAELLE))).toContain("taches");
    expect(sourcesPermises(user(JOEL), profil({ uid: "u-x", email: "x@example.com" }))).not.toContain("taches");
  });

  test("widget « À faire » : le réglage « Équipes » propose ses équipes (les 13 et les 5 comités pour un admin)", () => {
    const [groupe] = groupesDeReglages("afaire", {}, user(LEA), profil(LEA));
    expect([groupe.cle, groupe.titre, groupe.choix, groupe.actifs])
      .toEqual(["equipes", "tableauDeBord.reglages.equipes", [{ valeur: "medias", i18n: "equipes.court.medias" }], ["medias"]]);
    const [tout] = groupesDeReglages("afaire", {}, user(ADMIN), null);
    expect(tout.choix.map((c) => c.valeur)).toEqual([...EQUIPES.map((e) => e.id), ...COMITES]);
    expect(tout.choix.find((c) => c.valeur === "louange")?.i18n).toBe("equipes.public.louange");
    expect(equipesAFaire({ equipes: ["louange", "da"] }, user(ADMIN), null)).toEqual(["da", "louange"]);
    expect(equipesAFaire({}, user(MAELLE), profil(MAELLE))).toEqual(["louange"]);
  });
});

// ─── Écrans ─────────────────────────────────────────────────────────────────

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

async function ouvrir(page: Page, qui: FakeProfile, vers: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.clock.setFixedTime(new Date(`${AUJOURDHUI}T10:00:00`));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route("**/api/taches/assigne", (route) => route.fulfill({ json: { ok: true, notified: 1 } }));
  return signInAs(page, qui, docs, vers);
}

// Piste A, BO-D : la liste d'une équipe est la section « Tâches » de sa page (`/equipes/<id>` ou `/back-office/equipes/<id>`).
const laListe = (page: Page) => page.getByRole("region", { name: "Tâches", exact: true });
const titreEquipe = (page: Page, nom: string) => expect(page.getByRole("heading", { name: nom, level: 1 })).toBeVisible();
const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");

/** « + Nouvelle tâche » (un lien vers le formulaire) : en grand, le formulaire dans la page ; sur un volet, la feuille. */
async function nouvelleTache(page: Page) {
  await page.getByRole("link", { name: "Nouvelle tâche" }).click();
  if (estGrandEcran(test.info())) {
    return { form: page.getByRole("form", { name: "Nouvelle tâche" }), creer: "Créer la tâche" };
  }
  return { form: page.getByRole("dialog", { name: "Nouvelle tâche" }), creer: "Enregistrer" };
}
const sansNouvelleTache = async (page: Page) => {
  await expect(page.getByRole("link", { name: "Nouvelle tâche" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nouvelle tâche" })).toHaveCount(0);
};

test.describe("écrans : une référente crée, un simple membre coche la sienne (Réussite 1 et 2)", () => {
  test("Léa M. crée « Photos du culte » pour Joël F. : rangée sous TEAM MÉDIAS, Joël F. prévenu", async ({ page }) => {
    let assigne: unknown = null;
    const db = await ouvrir(page, LEA, "/back-office/equipes/medias", { "users/u-joel": docProfil(JOEL) });
    await page.route("**/api/taches/assigne", async (route) => {
      assigne = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true, notified: 1 } });
    });
    await titreEquipe(page, "Médias");
    const { form, creer } = await nouvelleTache(page);
    await form.getByLabel("Titre").fill("Photos du culte");
    await form.getByLabel("Échéance").fill("2026-10-16");
    await form.getByLabel("Responsable").selectOption({ label: "Joël F." });
    await capture(page, "taches-nouvelle-referente");
    await form.getByRole("button", { name: creer }).click();
    await expect(form).toHaveCount(0);
    const cree = db.writes.find((w) => w.method === "POST" && /^equipes\/medias\/taches\/[^/]+$/.test(w.path));
    expect(cree?.data).toMatchObject({ titre: "Photos du culte", equipe: "medias", responsableUid: "u-joel", responsableNom: "Joël F.", auteurUid: "u-lea" });
    expect(cree?.data).not.toHaveProperty("pole");
    await expect.poll(() => assigne).toEqual({ equipe: "medias", tacheId: cree!.path.split("/").pop() });
  });

  test("Joël F. coche sa tâche ; celle d'un autre et « toute l'équipe » restent inertes ; ni « Nouvelle tâche », ni « Modifier », ni « Supprimer »", async ({ page }) => {
    const db = await ouvrir(page, JOEL, "/equipes/medias");
    await titreEquipe(page, "Médias");
    await expect(laListe(page).getByText("Ranger la régie")).toBeVisible();
    await sansNouvelleTache(page);
    await expect(laListe(page).getByRole("checkbox", { name: /Ranger la régie/ })).toBeDisabled();
    await expect(laListe(page).getByRole("checkbox", { name: /Montage vidéo/ })).toBeDisabled();
    const sienne = laListe(page).getByRole("checkbox", { name: /Photos du culte/ });
    await sienne.click();
    await expect(sienne).toHaveAttribute("aria-checked", "mixed");
    expect(db.doc("equipes/medias/taches/photos/fois/2026-10-11")).toMatchObject({ etat: "encours", parUid: "u-joel", parNom: "Joël F." });
    await capture(page, "taches-simple-membre");

    // Sa fiche : l'état se choisit, mais ni « Modifier » ni « ⋯ › Supprimer ».
    await laListe(page).getByRole("button", { name: /^Photos du culte/ }).click();
    await expect(page).toHaveURL(/\/taches\/medias\/photos/);
    await expect(page.getByRole("heading", { name: "Photos du culte" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Terminée" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Modifier", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Plus d'actions" })).toHaveCount(0);
    // « Toute l'équipe » : la fiche se lit, l'état ne se change pas.
    await page.goto("/taches/medias/regie");
    await expect(page.getByRole("heading", { name: "Ranger la régie" })).toBeVisible();
    await expect(page.getByText("Toute l'équipe").first()).toBeVisible();
    await expect(page.getByRole("radio", { name: "Terminée" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Modifier", exact: true })).toHaveCount(0);
    await capture(page, "taches-fiche-toute-equipe");
  });

  test("Léa M., référente : coche « Ranger la régie » (toute l'équipe), à faire pour elle ; pas pour Joël F.", async ({ page, browser }) => {
    const db = await ouvrir(page, LEA, "/back-office/equipes/medias");
    const regie = laListe(page).getByRole("checkbox", { name: /Ranger la régie/ });
    await expect(regie).toBeEnabled();
    await expect(laListe(page).getByRole("checkbox", { name: /Photos du culte/ })).toBeEnabled();
    await regie.click();
    await expect(regie).toHaveAttribute("aria-checked", "mixed");
    expect(db.doc("equipes/medias/taches/regie/fois/2026-10-10")).toMatchObject({ etat: "encours", parUid: "u-lea" });
    await page.goto("/taches");
    await expect(page.locator(".group-row", { hasText: "Ranger la régie" })).toBeVisible();
    await expect(page.locator(".group-row", { hasText: "Montage vidéo" })).toBeVisible();
    await expect(page.locator(".group-row", { hasText: "Photos du culte" })).toHaveCount(0);

    const autre = await (await browser.newContext()).newPage();
    await ouvrir(autre, JOEL, "/taches");
    await expect(autre.locator(".group-row", { hasText: "Photos du culte" })).toBeVisible();
    await expect(autre.locator(".group-row", { hasText: "Ranger la régie" })).toHaveCount(0);
    await autre.context().close();
  });

  test("ordinateur : la pastille Tâches de Joël F. ne compte pas « toute l'équipe » ; celle de Léa M., oui", async ({ page, browser }, info) => {
    test.skip(!estOrdinateur(info), "la pastille est dans la barre latérale, sur ordinateur");
    await ouvrir(page, JOEL, "/back-office/taches/medias");
    await expect(page.locator(".barre-entree", { hasText: "Tâches" }).getByTestId("pastille")).toHaveText("1");
    const autre = await (await browser.newContext()).newPage();
    await ouvrir(autre, LEA, "/back-office/taches/medias");
    await expect(autre.locator(".barre-entree", { hasText: "Tâches" }).getByTestId("pastille")).toHaveText("2");
    await autre.context().close();
  });

  test("Moi : « Mes tâches » de Joël F. n'a que la sienne ; celui de Léa M. a « toute l'équipe »", async ({ page, browser }) => {
    await ouvrir(page, JOEL, "/moi");
    const mes = page.getByRole("region", { name: "Mes tâches", exact: true });
    await expect(mes.getByTestId("apercu-ligne")).toHaveCount(1);
    await expect(mes.getByTestId("apercu-ligne")).toContainText(["Photos du culte"]);
    await expect(mes.getByTestId("apercu-ligne").first()).toContainText("Médias");
    await expect(mes.getByRole("link", { name: /1 à faire/ })).toBeVisible();
    await expect(mes.getByTestId("apercu-ligne").first().getByRole("link")).toHaveAttribute("href", /^\/taches\/medias\/photos\/?$/);
    const autre = await (await browser.newContext()).newPage();
    await ouvrir(autre, LEA, "/moi");
    const siennes = autre.getByRole("region", { name: "Mes tâches", exact: true });
    await expect(siennes.getByTestId("apercu-ligne")).toContainText(["Ranger la régie", "Montage vidéo"]);
    await autre.context().close();
  });
});

test.describe("écrans : chacun ses équipes (Réussite 3 et 4, EQ9)", () => {
  test("Hugo L. (TEAM DA) ne lit rien de TEAM MÉDIAS, et la page de TEAM MÉDIAS le lui dit", async ({ page }) => {
    const lues: string[] = [];
    page.on("request", (r) => {
      // La liste d'une équipe : `equipes/<id>:runQuery` ; les fois d'une tâche : `equipes/<id>/taches/<t>:runQuery`.
      const m = /documents\/equipes\/([^/:]+)[^:]*:runQuery/.exec(decodeURIComponent(r.url()));
      if (m) lues.push(m[1]);
    });
    await ouvrir(page, HUGO, "/equipes/da");
    await titreEquipe(page, "DA");
    await expect(laListe(page).getByText("Affiche de Noël")).toBeVisible();
    await page.goto("/equipes/medias");
    await expect(page.getByText("Réservé aux membres de l'équipe")).toBeVisible();
    await expect(page.getByText("Photos du culte")).toHaveCount(0);
    expect(lues).toContain("da");
    expect(lues).not.toContain("medias");
  });

  test("un musicien sans équipe voit les tâches de Louange, case inerte pour « toute l'équipe », et rien d'autre", async ({ page }) => {
    await ouvrir(page, MAELLE, "/equipes/louange");
    await titreEquipe(page, "Louange");
    await expect(laListe(page).getByRole("checkbox", { name: /Choisir les chants de Noël/ })).toBeDisabled();
    await expect(page.getByText("Photos du culte")).toHaveCount(0);
    await sansNouvelleTache(page);
  });

  test("un admin crée dans les 13 équipes et les 5 comités (le rail des équipes a disparu, BO7)", async ({ page }) => {
    // Un admin : les équipes qui ont des tâches, pas 13 onglets vides ; il crée dans les 13 et dans
    // les 5 comités des groupes (lot 2, OG17).
    await ouvrir(page, ADMIN, "/back-office/equipes/medias");
    const { form } = await nouvelleTache(page);
    const choix = estGrandEcran(test.info())
      ? form.getByRole("group", { name: "Équipe" }).getByRole("button")
      : form.getByLabel("Équipe").locator("option");
    await expect(choix).toHaveCount(EQUIPES.length + COMITES.length);
    await capture(page, "taches-admin-rail");
  });

  test("sans aucune tâche : « Pas encore de tâche pour tes équipes. », « + Nouvelle tâche » à qui crée quelque part", async ({ page, browser }) => {
    await ouvrir(page, JOEL, "/equipes/medias", {});
    await expect(page.getByText(/Aucune tâche pour l'instant/)).toBeVisible();
    await sansNouvelleTache(page);
    await capture(page, "taches-vide-membre");

    const admin = await (await browser.newContext()).newPage();
    await ouvrir(admin, ADMIN, "/back-office/equipes/orga", {});
    await expect(admin.getByText(/Aucune tâche pour l'instant/)).toBeVisible();
    // Le bouton mène au formulaire de l'équipe.
    await expect(admin.getByRole("link", { name: "Nouvelle tâche" })).toHaveAttribute("href", /^\/back-office\/taches\/orga\/nouvelle\/?$/);
    await admin.context().close();

    // Une référente garde « Nouvelle tâche » dans son équipe, vide, pour y créer la première.
    const lea = await (await browser.newContext()).newPage();
    await ouvrir(lea, LEA, "/back-office/equipes/medias", {});
    await expect(lea.getByRole("link", { name: "Nouvelle tâche" })).toHaveAttribute("href", /^\/back-office\/taches\/medias\/nouvelle\/?$/);
    await lea.context().close();
  });
});

test.describe("écrans : prévenir une autre équipe (EQ10, EQ11)", () => {
  test("« Quand c'est fait, prévenir » propose les autres équipes sous leur nom, puis les régies", async ({ page }) => {
    await ouvrir(page, LEA, "/back-office/equipes/medias");
    const { form } = await nouvelleTache(page);
    const options = form.getByLabel("Quand c'est fait, prévenir").locator("option");
    await expect(options.filter({ hasText: "TEAM DA" })).toHaveCount(1);
    await expect(options.filter({ hasText: /^Louange$/ })).toHaveCount(1);
    await expect(options.filter({ hasText: "TEAM MÉDIAS" })).toHaveCount(0);
    await expect(options.filter({ hasText: /Pôle/ })).toHaveCount(0);
    await expect(options.filter({ hasText: /^Régie / })).not.toHaveCount(0);
    await form.getByLabel("Quand c'est fait, prévenir").selectOption({ label: "TEAM DA" });
    await form.getByLabel("Titre").fill("Visuel");
    await form.getByLabel("Échéance").fill("2026-10-16");
  });

  test("Joël F. termine sa tâche : la route reçoit l'équipe, « Équipe prévenue : TEAM DA. »", async ({ page }) => {
    let recu: unknown = null;
    await page.route("**/api/taches/fait", async (route) => {
      recu = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true, notified: 2, linked: true, cible: "equipe" } });
    });
    await ouvrir(page, JOEL, "/equipes/medias", { ...DOCS, "equipes/medias/taches/photos": tacheDoc({ prevenir: { equipe: "da" } }) });
    const sienne = laListe(page).getByRole("checkbox", { name: /Photos du culte/ });
    await sienne.click();
    await expect(sienne).toHaveAttribute("aria-checked", "mixed");
    await sienne.click();
    await expect(page.getByRole("status")).toHaveText("Équipe prévenue : TEAM DA.");
    expect(recu).toEqual({ equipe: "medias", tacheId: "photos", date: "2026-10-11" });
  });
});

/** Soirée photo de TEAM MÉDIAS, organisée par Léa M. */
const SOIREE = {
  titre: "Soirée photo", type: "loisir", pour: "equipe:medias", reunion: false, date: "2026-10-24", heure: "19:00", heureFin: "",
  dateFin: "", lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "ouvertes",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "", organisateurUid: "u-lea",
  organisateurNom: "Léa M.", epingle: false, expiresAt: null, inscrits: 0, createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z",
};
const LIEE = { id: "soiree", titre: "Soirée photo" };

test.describe("écrans : les tâches d'un évènement (EQ16)", () => {
  const docs = {
    ...DOCS,
    "evenements/soiree": SOIREE,
    "equipes/medias/taches/expo": tacheDoc({ titre: "Imprimer l'expo", responsableUid: "u-joel", echeance: "2026-10-20", evenement: LIEE }),
  };

  test("fiche : la carte pour un membre qui a une tâche liée, sans « Nouvelle tâche » ; masquée sans tâche ni droit ; la référente crée", async ({ page, browser }) => {
    await ouvrir(page, JOEL, "/evenements/soiree", docs);
    const carte = page.getByTestId("taches-carte");
    await expect(carte.getByRole("checkbox", { name: /Imprimer l'expo/ })).toBeEnabled();
    await expect(carte.getByRole("button", { name: "Nouvelle tâche" })).toHaveCount(0);

    // Sans tâche liée et sans droit de créer : pas de carte.
    const sansLiee = await (await browser.newContext()).newPage();
    await ouvrir(sansLiee, JOEL, "/evenements/soiree", { ...DOCS, "evenements/soiree": SOIREE });
    await expect(sansLiee.getByRole("heading", { name: "Soirée photo" }).first()).toBeVisible();
    await expect(sansLiee.getByTestId("taches-carte")).toHaveCount(0);
    await sansLiee.context().close();

    const lea = await (await browser.newContext()).newPage();
    await ouvrir(lea, LEA, "/evenements/soiree", { ...DOCS, "evenements/soiree": SOIREE });
    await expect(lea.getByTestId("taches-carte").getByRole("button", { name: "Nouvelle tâche" })).toBeVisible();
    await lea.context().close();
  });

  test("dupliquer : seules les tâches des équipes où l'on crée suivent", async ({ page }) => {
    // Léa M. est référente de TEAM MÉDIAS et simple membre de TEAM DA : la tâche de TEAM DA liée à la
    // soirée n'est pas copiée.
    const LEA_DA: FakeProfile = { ...LEA, dansEquipes: ["da", "medias"] };
    await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
    const db = await ouvrir(page, LEA_DA, "/back-office/evenements/nouveau?from=soiree", {
      ...docs, "equipes/da/taches/deco": tacheDoc({ equipe: "da", titre: "Décor de la soirée", responsableUid: "u-hugo", evenement: LIEE }),
    });
    await expect(page.getByLabel("Nom de l'évènement")).toHaveValue("Soirée photo");
    await page.getByLabel("Date", { exact: true }).fill("2026-11-21");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(fenetreDuSite(page).getByRole("heading")).toHaveText("Copier aussi sa tâche, au même délai ?");
    await repondreDansLeSite(page, "Copier les tâches");
    await page.waitForURL(/\/evenements\/fake-\d+\/?$/);
    const copies = db.writes.filter((w) => w.method === "POST" && /\/taches\/[^/]+$/.test(w.path));
    expect(copies.map((w) => w.path.replace(/fake-\d+$/, "*"))).toEqual(["equipes/medias/taches/*"]);
    expect(copies[0].data).toMatchObject({ equipe: "medias", titre: "Imprimer l'expo", echeance: "2026-11-17", auteurUid: "u-lea" });
  });
});

test.describe("écrans : en 中文", () => {
  test("la page de l'équipe, la fiche et « toute l'équipe » en chinois", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, JOEL, "/equipes/medias");
    await titreEquipe(page, "媒体组");
    await expect(page.getByText("整个团队").first()).toBeVisible();
    await page.goto("/taches/medias/regie");
    await expect(page.getByRole("radio", { name: "已完成" })).toBeDisabled();
    await expect(page.getByText(/部门/)).toHaveCount(0);
    await capture(page, "taches-zh");
  });
});
