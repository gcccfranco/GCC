import { expect, test } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs, repondreDansLeSite } from "./helpers/agencement";
import { fermerFeuille, reglageSaison } from "./helpers/saisonScene";
import {
  archiveDate, programmeState, reservationsClosed, sundaysBetween,
} from "../src/lib/scene/dimanches";
import { conflictKey, conflictMessage } from "../src/lib/scene/conflit";
import { quiCategory, sceneReminder } from "../src/lib/scene/rappels";
import { reminderBody } from "../src/lib/push/reminderMessage";

// Lot 3 bis (docs/spec-programme-scene.md) : section Évènements, onglet
// unique « Scène » nommé comme le programme affiché (un seul à la fois), géré en haut
// de la même page par la coordination (rôle « événement » + admins).

const NOEL = {
  nom: "Noël",
  jourJ: "2026-12-24",
  debut: "2026-10-01",
  visible: true,
  passages: [],
  createdBy: "uid-alice",
  updatedAt: "2026-09-14T20:00:00Z",
};
/** Avant le `debut` de NOEL : une fois ses réservations ouvertes (le 01/10/2026
 *  en vrai), le programme s'affiche de lui-même, masqué ou non. */
const AVANT_OUVERTURE = new Date("2026-09-20T10:00:00");

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L." };
const ALICE: FakeProfile = {
  uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"],
};

// Lot U6, B3 (U1 Q12) : la gestion est au Back-Office ; l'App garde les réservations, celles de
// la coordination comprises. Pâques · Noël, P7 : au Back-Office, un onglet par fête (la saison,
// l'ordre de passage) ; les réservations s'y testent dans l'App, pour tous.
const SCENE_GESTION = "/back-office/evenements/scene";
const sceneDe = (_who: FakeProfile) => "/evenements/scene";
async function ongletApp(page: import("@playwright/test").Page, nom: string) {
  await page.goto("/evenements");
  return page.getByRole("link", { name: nom, exact: true });
}

test("dimanches réservables : du premier dimanche d'octobre au dernier avant le 24 décembre", () => {
  const dimanches = sundaysBetween("2026-10-01", "2026-12-24");
  expect(dimanches).toHaveLength(12);
  expect(dimanches[0]).toBe("2026-10-04");
  expect(dimanches[11]).toBe("2026-12-20");
  expect(dimanches).not.toContain("2026-12-24");
});

test("réservations closes le lendemain du dernier dimanche", () => {
  expect(reservationsClosed("2026-12-20", "2026-12-24")).toBe(false);
  expect(reservationsClosed("2026-12-21", "2026-12-24")).toBe(true);
});

test("section Évènements : entrée dans le menu principal, onglet nommé comme le programme affiché", async ({ page }) => {
  await signInAs(page, JO, { "programmes/noel": NOEL }, "/evenements/scene");
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Noël" })).toBeVisible();
  // Sur téléphone et tablette, l'entrée est dans le menu ☰ ; sur ordinateur, dans la barre.
  const entree = page.getByRole("link", { name: "Évènements", exact: true });
  if ((await entree.count()) === 0) await page.getByRole("button", { name: /menu/i }).first().click();
  await expect(entree.first()).toBeVisible();
});

test("section Évènements : un brouillon garde l'onglet Noël, qui annonce l'ouverture sans grille", async ({ page }) => {
  await page.clock.setFixedTime(AVANT_OUVERTURE);
  // Pâques · Noël (P4, Q17) : les onglets Pâques et Noël sont fixes ; un brouillon n'a pas de
  // grille, seule sa date d'ouverture prévue s'annonce.
  await signInAs(page, JO, { "programmes/noel": { ...NOEL, visible: false, ouvert: false } }, "/evenements/scene");
  await expect(page.getByText("Les réservations ouvriront le jeudi 1er octobre")).toBeVisible();
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Scène", exact: true })).toHaveCount(0);
});

test("coordination : sans aucun programme, l'onglet Noël du Back-Office crée l'édition au premier réglage, puis « Lancer » l'annonce dans l'App", async ({ page }) => {
  // Pâques · Noël, P7 (Q6) : plus de nom ni de formulaire ; l'édition `noel-2026` naît en
  // brouillon à la première action, « Lancer les réservations » la montre aux membres.
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00"));
  const db = await signInAs(page, ALICE, {}, SCENE_GESTION);
  await expect(page).toHaveURL(/\/back-office\/evenements\/scene\/noel\/?$/);
  await expect(page.getByRole("heading", { name: "Saison de Noël 2026" })).toBeVisible();
  expect(ecritures(db)).toHaveLength(0);
  await (await reglageSaison(page, "Un créneau dure")).getByRole("button", { name: "1 h 30", exact: true }).click();
  await expect.poll(() => ecritures(db).length).toBe(1);
  await fermerFeuille(page);
  expect(ecritures(db)[0]).toMatchObject({ method: "POST", path: "programmes/noel-2026" });
  expect(ecritures(db)[0].data).toMatchObject({ fete: "noel", annee: 2026, jourJ: "2026-12-24", ouvert: false, duree: 90, createdBy: "uid-alice" });
  await page.getByRole("button", { name: "Lancer les réservations", exact: true }).click();
  await expect(page.getByText("Réservations lancées")).toBeVisible();
  expect(ecritures(db, "PATCH").at(-1)?.data).toMatchObject({ ouvert: true });
  await (await ongletApp(page, "Noël")).click();
  await expect(page.getByText("Les réservations ouvriront le lundi 2 novembre")).toBeVisible();
});

// Pâques · Noël (P3, Q11) : l'épinglage (`visible`, « Masquer », « Afficher ») n'est plus lu ;
// P7 : plus de nom à modifier, de programme à créer, masquer ou supprimer.

test("membre : ni gestion du programme ni onglet Scène vide", async ({ page }) => {
  await signInAs(page, JO, { "programmes/noel": NOEL }, "/evenements/scene");
  await expect(page.getByRole("button", { name: /^Réserver \d/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Modifier le programme" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nouveau programme" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Masquer" })).toHaveCount(0);
});

test("la page du programme montre son titre (calculé, Q11) et son jour J", async ({ page }) => {
  await signInAs(page, JO, { "programmes/noel": NOEL }, "/evenements/scene");
  await expect(page.getByRole("heading", { name: "Noël 2026", exact: true })).toBeVisible();
  await expect(page.getByText(/^Jour J : jeudi 24 décembre/)).toBeVisible();
});

// ─── Tranche 2 : volet Entraînements ────────────────────────────────────────

const C_ALICE = {
  dimanche: "2026-10-04", debut: "17:00", fin: "18:30", quoi: "Chant", qui: ["EDD 中班"], note: "",
  auteurUid: "uid-alice", auteurNom: "Alice Q.", createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};

/** Pâques · Noël, P5 : une semaine à la fois ; on choisit la semaine dans la liste (ou les pastilles). */
const choisirSemaine = (page: import("@playwright/test").Page, debut: RegExp) =>
  page.getByRole("list", { name: "Semaines" }).getByRole("button", { name: debut }).click();

async function openNoel(page: import("@playwright/test").Page, who: FakeProfile, today: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date(`${today}T10:00:00`));
  return signInAs(page, who, { "programmes/noel": NOEL, ...docs }, sceneDe(who));
}

test("entraînements : une semaine par dimanche réservable (saison par défaut, lot U1), en créneaux d'1 h libres, jamais le jour J", async ({ page }) => {
  await openNoel(page, JO, "2026-10-01");
  await expect(page.getByRole("list", { name: "Semaines" }).getByRole("button")).toHaveCount(12);
  await expect(page.getByRole("region", { name: "Dimanche 4 octobre" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dimanche 4 octobre" }).getByRole("listitem")).toHaveText([
    /14:00\s*Libre/, /15:00\s*Libre/, /16:00\s*Libre/, /17:00\s*Libre/, /18:00\s*Libre/,
  ]);
  await expect(page.getByRole("button", { name: /^Réserver \d/ })).toHaveCount(5);
  await choisirSemaine(page, /^20 déc\./);
  await expect(page.getByRole("region", { name: "Dimanche 20 décembre" })).toBeVisible();
  await expect(page.getByRole("region", { name: /24 décembre/ })).toHaveCount(0);
});

test("entraînements : les semaines passées sont masquées, un lien les montre", async ({ page }) => {
  await openNoel(page, JO, "2026-11-10");
  await expect(page.getByRole("region", { name: "Dimanche 15 novembre" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dimanche 4 octobre" })).toHaveCount(0);
  await page.getByRole("button", { name: "Semaines passées (6)" }).click();
  await choisirSemaine(page, /^4 oct\./);
  await expect(page.getByRole("region", { name: "Dimanche 4 octobre" })).toBeVisible();
});

test("réserver : la feuille reprend le créneau choisi dans la grille (lot U1), écrit au nom de l'auteur puis affiché", async ({ page }) => {
  const db = await openNoel(page, JO, "2026-10-01");
  await choisirSemaine(page, /^11 oct\./);
  const dimanche = page.getByRole("region", { name: "Dimanche 11 octobre" });
  await dimanche.getByRole("button", { name: "Réserver 17:00 – 18:00" }).click();
  const feuille = page.getByRole("dialog");
  await expect(feuille).toContainText("Dimanche 11 octobre · 17:00 – 18:00");
  await feuille.getByRole("radio", { name: "Danse" }).check();
  await feuille.getByRole("checkbox", { name: "Gp Joie" }).check();
  await feuille.getByLabel("Note").fill("Avec la sono");
  await feuille.getByRole("button", { name: "Réserver", exact: true }).click();
  const ligne = dimanche.getByRole("listitem").filter({ hasText: "Danse · Gp Joie" });
  await expect(ligne).toContainText("17:00");
  // Pâques · Noël, P6 : sur sa propre réservation, « à moi » remplace son nom.
  await expect(ligne).toContainText("à moi");
  await expect(dimanche.getByRole("button", { name: "Réserver 17:00 – 18:00" })).toHaveCount(0);
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("programmes/noel/creneaux/"));
  expect(created?.data).toMatchObject({
    dimanche: "2026-10-11", debut: "17:00", fin: "18:00", quoi: "Danse", qui: ["Gp Joie"], note: "Avec la sono",
    auteurUid: "uid-jo", auteurNom: "Jo L.",
  });
});

test("réserver : un chevauchement est refusé à la relecture, rien n'est écrit", async ({ page }) => {
  const db = await openNoel(page, JO, "2026-10-01");
  await page.getByRole("region", { name: "Dimanche 4 octobre" }).getByRole("button", { name: "Réserver 18:00 – 19:00" }).click();
  // Alice réserve 17:00–18:30 pendant que la feuille de Jo est ouverte : la relecture le voit.
  db.set("programmes/noel/creneaux/c1", C_ALICE);
  const feuille = page.getByRole("dialog");
  await feuille.getByRole("radio", { name: "Sketch" }).check();
  await feuille.getByRole("checkbox", { name: "Gp Paix" }).check();
  await feuille.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(feuille.getByText(/chevauche/)).toContainText("17:00 – 18:30");
  expect(db.writes.filter((w) => w.method === "POST")).toHaveLength(0);
});

test("droits : l'auteur et la coordination modifient ou retirent un créneau, pas un autre membre", async ({ page }) => {
  await openNoel(page, JO, "2026-10-01", { "programmes/noel/creneaux/c1": C_ALICE });
  const bloc = page.getByRole("region", { name: "Dimanche 4 octobre" });
  await expect(bloc.getByText("Alice Q.")).toBeVisible();
  await expect(bloc.getByRole("button", { name: "Retirer" })).toHaveCount(0);
  await expect(bloc.getByRole("button", { name: /^Plus d'actions/ })).toHaveCount(0);
});

test("droits : la coordination retire le créneau d'un autre membre", async ({ page }) => {
  const db = await openNoel(page, ALICE, "2026-10-01", {
    "programmes/noel/creneaux/c1": { ...C_ALICE, auteurUid: "uid-jo", auteurNom: "Jo L." },
  });
  const bloc = page.getByRole("region", { name: "Dimanche 4 octobre" });
  // Pâques · Noël, P6 : « ⋯ » › Retirer, puis la confirmation du site (plus de fenêtre du navigateur).
  await bloc.getByRole("button", { name: /^Plus d'actions/ }).click();
  await page.getByRole("menuitem", { name: "Retirer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(bloc.getByText("Chant · EDD 中班")).toHaveCount(0);
  await expect(bloc.getByRole("button", { name: "Réserver 17:00 – 18:00" })).toBeVisible();
  expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("programmes/noel/creneaux/c1");
});

test("deux créneaux qui se chevauchent sont marqués pour tout le monde", async ({ page }) => {
  await openNoel(page, JO, "2026-10-01", {
    "programmes/noel/creneaux/c1": C_ALICE,
    "programmes/noel/creneaux/c2": { ...C_ALICE, debut: "18:00", fin: "19:00", quoi: "Danse", qui: ["Gp Joie"], auteurUid: "uid-esther", auteurNom: "Esther M." },
  });
  const bloc = page.getByRole("region", { name: "Dimanche 4 octobre" });
  await expect(bloc.getByText("Chevauchement")).toHaveCount(2);
});

test("après le dernier dimanche réservable, le volet Entraînements disparaît et le programme reste", async ({ page }) => {
  await openNoel(page, JO, "2026-12-21");
  await expect(page.getByRole("heading", { name: "Ordre de Passage jour J" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entraînements" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
});

// ─── Tranche 3 : l'ordre de passage (Pâques · Noël, Q16 : une entrée en bas de la fête) ──

const PASSAGES = [
  { quoi: "Séance louange", qui: ["敬拜团"], titre: "Ouverture" },
  { quoi: "Chant", qui: ["EDD 小班"], titre: "Jésus est né" },
];

test("programme : liste numérotée dans l'ordre de la brochure, sans horaire", async ({ page }) => {
  await openNoel(page, JO, "2026-10-01", { "programmes/noel": { ...NOEL, passages: PASSAGES } });
  await page.getByRole("button", { name: /Ordre de passage du jour J/ }).click();
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await expect(liste.getByRole("listitem")).toHaveCount(2);
  await expect(liste.getByRole("listitem").nth(0)).toContainText("Ouverture");
  await expect(liste.getByRole("listitem").nth(1)).toContainText("Jésus est né");
  await expect(page.getByRole("button", { name: "Ajouter un passage" })).toHaveCount(0);
});

test("programme : la coordination ajoute un passage, écrit dans le document du programme", async ({ page }) => {
  const db = await openNoel(page, ALICE, "2026-10-01", { "programmes/noel": { ...NOEL, passages: PASSAGES } });
  await page.goto(`${SCENE_GESTION}/noel?vue=ordre`);
  await page.getByRole("button", { name: "Ajouter un passage" }).click();
  await page.getByLabel("Titre").fill("La nuit de Bethléem");
  await page.getByLabel("Quoi").selectOption("Sketch");
  await page.getByLabel("Gp Paix").check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await expect(liste.getByRole("listitem").nth(2)).toContainText("La nuit de Bethléem");
  const write = db.writes.filter((w) => w.method === "PATCH" && w.path === "programmes/noel").pop();
  expect(write?.data.passages).toEqual([...PASSAGES, { quoi: "Sketch", qui: ["Gp Paix"], titre: "La nuit de Bethléem" }]);
});

test("programme : la coordination modifie puis retire un passage", async ({ page }) => {
  const db = await openNoel(page, ALICE, "2026-10-01", { "programmes/noel": { ...NOEL, passages: PASSAGES } });
  await page.goto(`${SCENE_GESTION}/noel?vue=ordre`);
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await liste.getByRole("listitem").nth(1).getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Titre").fill("Il est né le divin enfant");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(liste.getByRole("listitem").nth(1)).toContainText("Il est né le divin enfant");
  await liste.getByRole("listitem").nth(0).getByRole("button", { name: "Retirer" }).click();
  await repondreDansLeSite(page, "Retirer");
  await expect(liste.getByRole("listitem")).toHaveCount(1);
  await expect(liste.getByRole("listitem").nth(0)).toContainText("Il est né le divin enfant");
  const write = db.writes.filter((w) => w.method === "PATCH" && w.path === "programmes/noel").pop();
  expect(write?.data.passages).toEqual([{ quoi: "Chant", qui: ["EDD 小班"], titre: "Il est né le divin enfant" }]);
});

test("programme : la coordination réordonne en glissant un passage", async ({ page }) => {
  const db = await openNoel(page, ALICE, "2026-10-01", { "programmes/noel": { ...NOEL, passages: PASSAGES } });
  await page.goto(`${SCENE_GESTION}/noel?vue=ordre`);
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  const poignee = liste.getByRole("listitem").nth(1).getByRole("button", { name: "Déplacer" });
  // Sur une colonne, l'ordre est sous la colonne de la fête : on l'amène au milieu, loin de la barre du bas.
  await liste.getByRole("listitem").nth(1).evaluate((e) => e.scrollIntoView({ block: "center" }));
  const cible = liste.getByRole("listitem").nth(0);
  const from = (await poignee.boundingBox())!;
  const to = (await cible.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 4, { steps: 12 });
  await page.mouse.up();
  await expect(liste.getByRole("listitem").nth(0)).toContainText("Jésus est né");
  const write = db.writes.filter((w) => w.method === "PATCH" && w.path === "programmes/noel").pop();
  expect(write?.data.passages).toEqual([PASSAGES[1], PASSAGES[0]]);
});

// ─── Tranche 4 : conflit perdu et rappels ───────────────────────────────────

test("rappels : le « qui » d'un créneau se relie aux catégories de l'app quand elles existent", () => {
  expect(quiCategory("Franco")).toBe("Culte Francophone");
  expect(quiCategory("EDD 中班")).toBe("中班");
  expect(quiCategory("Gp Paix")).toBe("Groupe Paix");
  expect(quiCategory("Gp Joie")).toBeNull();
  expect(quiCategory("敬拜团")).toBeNull();
});

test("rappels : l'entraînement rejoint la ligne des services du même dimanche, en français et en 中文", () => {
  const services = [{ service: "Culte Franco", roles: ["Piano"] }, sceneReminder(C_ALICE)];
  expect(reminderBody("2026-12-13", "J1", services, "fr")).toBe(
    "Dimanche 13 décembre (demain) : Culte Franco (Piano) · Entraînement sur scène (Chant · EDD 中班) à 17:00–18:30",
  );
  expect(reminderBody("2026-12-13", "J1", services, "zh-CN")).toContain("舞台排练（Chant · EDD 中班） 17:00–18:30");
});

test("conflit : une clé par paire de créneaux, quel que soit l'ordre ; message aux deux auteurs", () => {
  expect(conflictKey("noel", ["b", "a"])).toBe(conflictKey("noel", ["a", "b"]));
  const other = { ...C_ALICE, id: "c2", debut: "18:00", fin: "19:00", quoi: "Danse", qui: ["Gp Joie"], auteurNom: "Jo L." };
  const fr = conflictMessage({ ...C_ALICE, id: "c1" }, other, "fr");
  expect(fr.title).toBe("Scène : chevauchement");
  expect(fr.body).toBe("Dimanche 4 octobre : 17:00–18:30 (Chant · EDD 中班, Alice Q.) et 18:00–19:00 (Danse · Gp Joie, Jo L.) se chevauchent sur scène. Mettez-vous d'accord.");
  expect(conflictMessage({ ...C_ALICE, id: "c1" }, other, "zh-CN").body).toContain("重叠");
});

test("course perdue : un créneau enregistré au même moment chevauche le mien → le serveur prévient les deux auteurs", async ({ page }) => {
  const db = await openNoel(page, JO, "2026-10-01");
  let sent: { body: { programmeId: string; creneauIds: string[] }; auth?: string } | null = null;
  await page.route("**/api/scene/conflit", (route) => {
    sent = { body: route.request().postDataJSON(), auth: route.request().headers()["authorization"] };
    return route.fulfill({ json: { ok: true, notified: 2 } });
  });
  // Alice enregistre un créneau qui chevauche pendant que Jo valide : il apparaît
  // juste avant l'écriture de Jo, après sa relecture.
  await page.route(/firestore\.googleapis\.com.*\/creneaux(\?|$)/, async (route) => {
    if (route.request().method() === "POST") db.set("programmes/noel/creneaux/race", { ...C_ALICE, dimanche: "2026-10-11" });
    await route.fallback();
  });
  await choisirSemaine(page, /^11 oct\./);
  const bloc = page.getByRole("region", { name: "Dimanche 11 octobre" });
  await bloc.getByRole("button", { name: "Réserver 17:00 – 18:00" }).click();
  const feuille = page.getByRole("dialog");
  await feuille.getByRole("radio", { name: "Danse" }).check();
  await feuille.getByRole("checkbox", { name: "Gp Joie" }).check();
  await feuille.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(bloc.getByText("Chevauchement")).toHaveCount(2);
  await expect.poll(() => sent).not.toBeNull();
  expect(sent!.auth).toMatch(/^Bearer /);
  expect(sent!.body.programmeId).toBe("noel");
  expect(sent!.body.creneauIds).toHaveLength(2);
  expect(sent!.body.creneauIds).toContain("race");
});

test("route de conflit : refusée sans jeton", async ({ request }) => {
  const res = await request.post("/api/scene/conflit", { data: { programmeId: "noel", creneauIds: ["a", "b"] } });
  expect(res.status()).toBe(401);
});

// ─── Lot 12 : archivage et bascule automatiques (docs/spec-programme-bascule.md) ──
// L'affichage est **calculé**, jamais écrit : après le jour J l'onglet remercie
// pendant sept jours, puis le programme s'archive et l'onglet bascule tout seul
// sur le suivant dès que ses réservations ouvrent. `visible` devient un
// épinglage de la coordination.

/** Noël, aucun épinglé (comme `listProgrammes`). */
const N = { debut: "2026-10-01", jourJ: "2026-12-24", visible: false };

const PAQUES = {
  nom: "Pâques", jourJ: "2027-04-05", debut: "2027-01-04", visible: false, passages: [],
  createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z",
};

/** La base de la « Réussite » de la spec : Noël (avec son ordre de passage) puis Pâques. */
const DEUX = {
  "programmes/noel": { ...NOEL, visible: false, passages: PASSAGES },
  "programmes/paques": PAQUES,
};

/** Écritures de la scène. La connexion écrit aussi `notifPrefs/{uid}` (la
 *  langue), qui ne regarde pas les programmes : on ne compte que ceux-ci. */
function ecritures(db: FakeDb, method?: string) {
  return db.writes.filter((w) => w.path.startsWith("programmes") && (!method || w.method === method));
}

async function ouvrirScene(
  page: import("@playwright/test").Page,
  who: FakeProfile,
  today: string,
  docs: Record<string, Record<string, unknown>>,
  chemin = sceneDe(who),
) {
  await page.clock.setFixedTime(new Date(`${today}T10:00:00`));
  return signInAs(page, who, docs, chemin);
}

test("état d'un programme : à venir, ouvert, passé, archivé", () => {
  expect(programmeState(N, "2026-09-30")).toBe("soon");
  expect(programmeState(N, "2026-10-01")).toBe("open");
  expect(programmeState(N, "2026-12-24")).toBe("open");
  expect(programmeState(N, "2026-12-25")).toBe("passed");
  expect(programmeState(N, "2026-12-31")).toBe("passed");
  expect(programmeState(N, "2027-01-01")).toBe("archived");
});

test("archivage sept jours après le jour J", () => {
  expect(archiveDate("2026-12-24")).toBe("2026-12-31");
});

// `currentProgramme` (lot 12) a disparu avec Pâques · Noël (P3) : l'édition affichée, la
// bascule et le brouillon se testent dans tests/scene-paques-noel.spec.ts
// (`editionCourante`, `editionsAffichees`, `editionProche`).

test("après le jour J : l'onglet Noël remercie et garde l'ordre de passage, sans réservation (Q17)", async ({ page }) => {
  const db = await ouvrirScene(page, JO, "2026-12-25", DEUX);
  const carte = page.getByRole("region", { name: "Noël 2026, c'est passé — merci à tous !" });
  await expect(carte).toBeVisible();
  await expect(carte).toContainText("Les réservations de la scène et le programme sont fermés.");
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Entraînements" })).toHaveCount(0);
  expect(ecritures(db)).toHaveLength(0);
});

test("le septième jour, le message est encore là", async ({ page }) => {
  await ouvrirScene(page, JO, "2026-12-31", DEUX);
  await expect(page.getByRole("region", { name: "Noël 2026, c'est passé — merci à tous !" })).toBeVisible();
});

/** Noël archivé le 01/01/2027 ; Pâques en brouillon (P3, Q10 : lancé, il s'afficherait avant son ouverture). */
const ARCHIVE = { ...DEUX, "programmes/paques": { ...PAQUES, ouvert: false } };

test("une fois archivé : `/evenements/scene` mène à la fête la plus proche (Pâques), Noël annonce Noël 2027", async ({ page }) => {
  await ouvrirScene(page, JO, "2027-01-01", ARCHIVE);
  await expect(page).toHaveURL(/\/evenements\/scene\/paques\/?$/);
  await expect(page.getByText("Les réservations ouvriront le lundi 4 janvier")).toBeVisible();
  await page.getByRole("link", { name: "Noël", exact: true }).click();
  await expect(page.getByText("Les réservations de Noël 2027 ne sont pas encore ouvertes.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Scène", exact: true })).toHaveCount(0);
});

test("bascule sur Pâques à l'ouverture de ses réservations, sans aucune écriture", async ({ page }) => {
  const db = await ouvrirScene(page, JO, "2027-01-04", DEUX);
  await expect(page.getByRole("link", { name: "Pâques", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dimanche 10 janvier" })).toBeVisible();
  expect(ecritures(db)).toHaveLength(0);
});

test("après le jour J en 中文 : le message est traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirScene(page, JO, "2026-12-25", DEUX);
  await expect(page.getByText("「圣诞节 2026」已经过去了——感谢大家！")).toBeVisible();
});

test("coordination pendant les sept jours : au Back-Office, « Terminé » et l'ordre de passage en lecture", async ({ page }) => {
  await ouvrirScene(page, ALICE, "2026-12-25", DEUX, `${SCENE_GESTION}/noel`);
  const colonne = page.getByRole("region", { name: "Cette fête" });
  await expect(colonne.getByTestId("etat-edition")).toHaveText("Terminé");
  await expect(page.getByRole("heading", { name: "Noël 2026 · ordre de passage" })).toBeVisible();
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await expect(liste.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Ajouter un passage" })).toHaveCount(0);
  for (const libelle of ["Modifier le programme", "Nouveau programme", "Masquer"]) {
    await expect(page.getByRole("button", { name: libelle, exact: true })).toHaveCount(0);
  }
});

test("coordination après l'archivage : l'onglet Noël prépare Noël 2027 ; Noël 2026 se relit dans les années passées", async ({ page }) => {
  await ouvrirScene(page, ALICE, "2027-01-01", ARCHIVE, `${SCENE_GESTION}/noel`);
  const colonne = page.getByRole("region", { name: "Cette fête" });
  await expect(colonne.getByRole("heading", { level: 2 })).toHaveText("Noël 2027");
  // Sur une colonne (P9), les années passées sont sous la saison, hors de la colonne.
  await page.getByRole("region", { name: "Les années passées" }).getByRole("button", { name: /Noël 2026/ }).click();
  await expect(colonne.getByRole("heading", { level: 2 })).toHaveText("Noël 2026");
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toHaveCount(2);
});
