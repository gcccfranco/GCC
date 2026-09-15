import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { reservationsClosed, sundaysBetween } from "../src/lib/scene/dimanches";
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

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L." };
const ALICE: FakeProfile = {
  uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"],
};

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

test("section Évènements : sans programme affiché, un membre n'a ni onglet ni programme", async ({ page }) => {
  await signInAs(page, JO, { "programmes/noel": { ...NOEL, visible: false } }, "/evenements/scene");
  await expect(page.getByText("Aucun programme en cours.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Scène", exact: true })).toHaveCount(0);
});

test("coordination : onglet « Scène » sans programme, formulaire direct, l'onglet prend le nom du programme créé", async ({ page }) => {
  const db = await signInAs(page, ALICE, {}, "/evenements/scene");
  await expect(page.getByRole("link", { name: "Scène", exact: true })).toBeVisible();
  await page.getByLabel("Nom").fill("Noël");
  await page.getByLabel("Jour J").fill("2026-12-24");
  await page.getByLabel("Début des réservations").fill("2026-10-01");
  await page.getByRole("button", { name: "Créer le programme" }).click();
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Réserver un créneau" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("programmes/"));
  expect(created?.data).toMatchObject({ nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: true, createdBy: "uid-alice" });
});

test("coordination : masquer rend l'onglet « Scène », le programme attend dans les masqués, Afficher le ramène", async ({ page }) => {
  const db = await signInAs(page, ALICE, { "programmes/noel": NOEL }, "/evenements/scene");
  await page.getByRole("button", { name: "Masquer" }).click();
  await expect(page.getByRole("link", { name: "Scène", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toHaveCount(0);
  expect(db.doc("programmes/noel")?.visible).toBe(false);
  const masques = page.getByRole("region", { name: "Programmes masqués" });
  await expect(masques).toContainText("Noël");
  await masques.getByRole("button", { name: "Afficher" }).click();
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toBeVisible();
});

test("coordination : afficher un programme masqué masque celui en cours (un seul à la fois)", async ({ page }) => {
  const db = await signInAs(page, ALICE, {
    "programmes/noel": NOEL,
    "programmes/paques": { ...NOEL, nom: "Pâques", jourJ: "2027-04-04", debut: "2027-03-01", visible: false },
  }, "/evenements/scene");
  await page.getByRole("region", { name: "Programmes masqués" }).getByRole("button", { name: "Afficher" }).click();
  await expect(page.getByRole("link", { name: "Pâques", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toHaveCount(0);
  expect(db.doc("programmes/noel")?.visible).toBe(false);
  expect(db.doc("programmes/paques")?.visible).toBe(true);
});

test("coordination : modifie le programme en place", async ({ page }) => {
  const db = await signInAs(page, ALICE, { "programmes/noel": NOEL }, "/evenements/scene");
  await page.getByRole("button", { name: "Modifier le programme" }).click();
  await page.getByLabel("Nom").fill("Noël 2026");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("link", { name: "Noël 2026", exact: true })).toBeVisible();
  expect(db.doc("programmes/noel")?.nom).toBe("Noël 2026");
});

test("membre : ni gestion du programme ni onglet Scène vide", async ({ page }) => {
  await signInAs(page, JO, { "programmes/noel": NOEL }, "/evenements/scene");
  await expect(page.getByRole("button", { name: "Réserver un créneau" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Modifier le programme" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nouveau programme" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Masquer" })).toHaveCount(0);
});

test("la page du programme montre son nom et son jour J", async ({ page }) => {
  await signInAs(page, JO, { "programmes/noel": NOEL }, "/evenements/scene");
  await expect(page.getByRole("heading", { name: "Noël" })).toBeVisible();
  await expect(page.getByText("24 décembre")).toBeVisible();
});

// ─── Tranche 2 : volet Entraînements ────────────────────────────────────────

const C_ALICE = {
  dimanche: "2026-10-04", debut: "17:00", fin: "18:30", quoi: "Chant", qui: ["EDD 中班"], note: "",
  auteurUid: "uid-alice", auteurNom: "Alice Q.", createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};

async function openNoel(page: import("@playwright/test").Page, who: FakeProfile, today: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date(`${today}T10:00:00`));
  return signInAs(page, who, { "programmes/noel": NOEL, ...docs }, "/evenements/scene");
}

test("entraînements : un bloc par dimanche réservable, « Scène libre » quand il est vide, jamais le jour J", async ({ page }) => {
  await openNoel(page, JO, "2026-10-01");
  await expect(page.getByRole("region", { name: "Dimanche 4 octobre" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dimanche 20 décembre" })).toBeVisible();
  await expect(page.getByRole("region", { name: /24 décembre/ })).toHaveCount(0);
  await expect(page.getByText("Scène libre")).toHaveCount(12);
});

test("entraînements : les dimanches passés sont masqués, un lien les montre", async ({ page }) => {
  await openNoel(page, JO, "2026-11-10");
  await expect(page.getByRole("region", { name: "Dimanche 15 novembre" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dimanche 4 octobre" })).toHaveCount(0);
  await page.getByRole("button", { name: /Voir les dimanches passés/ }).click();
  await expect(page.getByRole("region", { name: "Dimanche 4 octobre" })).toBeVisible();
});

test("réserver : formulaire pré-rempli 17:00–18:00, créneau écrit au nom de l'auteur puis affiché", async ({ page }) => {
  const db = await openNoel(page, JO, "2026-10-01");
  await page.getByRole("button", { name: "Réserver un créneau" }).click();
  await expect(page.getByLabel("Début")).toHaveValue("17:00");
  await expect(page.getByLabel("Fin")).toHaveValue("18:00");
  await page.getByLabel("Dimanche", { exact: true }).selectOption("2026-10-11");
  await page.getByLabel("Quoi").selectOption("Danse");
  await page.getByLabel("Gp Joie").check();
  await page.getByLabel("Note").fill("Avec la sono");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  const dimanche = page.getByRole("region", { name: "Dimanche 11 octobre" });
  await expect(dimanche.getByText("17:00 – 18:00")).toBeVisible();
  await expect(dimanche.getByText("Jo L.")).toBeVisible();
  await expect(dimanche.getByText("Scène libre")).toHaveCount(0);
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("programmes/noel/creneaux/"));
  expect(created?.data).toMatchObject({
    dimanche: "2026-10-11", debut: "17:00", fin: "18:00", quoi: "Danse", qui: ["Gp Joie"], note: "Avec la sono",
    auteurUid: "uid-jo", auteurNom: "Jo L.",
  });
});

test("réserver : un chevauchement est refusé, rien n'est écrit", async ({ page }) => {
  const db = await openNoel(page, JO, "2026-10-01", { "programmes/noel/creneaux/c1": C_ALICE });
  await page.getByRole("button", { name: "Réserver un créneau" }).click();
  await page.getByLabel("Dimanche", { exact: true }).selectOption("2026-10-04");
  await page.getByLabel("Début").fill("18:00");
  await page.getByLabel("Fin").fill("19:00");
  await page.getByLabel("Quoi").selectOption("Sketch");
  await page.getByLabel("Gp Paix").check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(/chevauche/)).toContainText("17:00 – 18:30");
  expect(db.writes.filter((w) => w.method === "POST")).toHaveLength(0);
});

test("droits : l'auteur et la coordination modifient ou retirent un créneau, pas un autre membre", async ({ page }) => {
  await openNoel(page, JO, "2026-10-01", { "programmes/noel/creneaux/c1": C_ALICE });
  const bloc = page.getByRole("region", { name: "Dimanche 4 octobre" });
  await expect(bloc.getByText("Alice Q.")).toBeVisible();
  await expect(bloc.getByRole("button", { name: "Retirer" })).toHaveCount(0);
});

test("droits : la coordination retire le créneau d'un autre membre", async ({ page }) => {
  const db = await openNoel(page, ALICE, "2026-10-01", {
    "programmes/noel/creneaux/c1": { ...C_ALICE, auteurUid: "uid-jo", auteurNom: "Jo L." },
  });
  page.on("dialog", (d) => d.accept());
  const bloc = page.getByRole("region", { name: "Dimanche 4 octobre" });
  await bloc.getByRole("button", { name: "Retirer" }).click();
  await expect(bloc.getByText("Scène libre")).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Réserver un créneau" })).toHaveCount(0);
});

// ─── Tranche 3 : volet « Programme Noël » (ordre de passage) ────────────────

const PASSAGES = [
  { quoi: "Séance louange", qui: ["敬拜团"], titre: "Ouverture" },
  { quoi: "Chant", qui: ["EDD 小班"], titre: "Jésus est né" },
];

test("programme : liste numérotée dans l'ordre de la brochure, sans horaire", async ({ page }) => {
  await openNoel(page, JO, "2026-10-01", { "programmes/noel": { ...NOEL, passages: PASSAGES } });
  await page.getByRole("button", { name: "Programme Noël" }).click();
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await expect(liste.getByRole("listitem")).toHaveCount(2);
  await expect(liste.getByRole("listitem").nth(0)).toContainText("Ouverture");
  await expect(liste.getByRole("listitem").nth(1)).toContainText("Jésus est né");
  await expect(page.getByRole("button", { name: "Ajouter un passage" })).toHaveCount(0);
});

test("programme : la coordination ajoute un passage, écrit dans le document du programme", async ({ page }) => {
  const db = await openNoel(page, ALICE, "2026-10-01", { "programmes/noel": { ...NOEL, passages: PASSAGES } });
  await page.getByRole("button", { name: "Programme Noël" }).click();
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
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Programme Noël" }).click();
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await liste.getByRole("listitem").nth(1).getByRole("button", { name: "Modifier" }).click();
  await page.getByLabel("Titre").fill("Il est né le divin enfant");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(liste.getByRole("listitem").nth(1)).toContainText("Il est né le divin enfant");
  await liste.getByRole("listitem").nth(0).getByRole("button", { name: "Retirer" }).click();
  await expect(liste.getByRole("listitem")).toHaveCount(1);
  await expect(liste.getByRole("listitem").nth(0)).toContainText("Il est né le divin enfant");
  const write = db.writes.filter((w) => w.method === "PATCH" && w.path === "programmes/noel").pop();
  expect(write?.data.passages).toEqual([{ quoi: "Chant", qui: ["EDD 小班"], titre: "Il est né le divin enfant" }]);
});

test("programme : la coordination réordonne en glissant un passage", async ({ page }) => {
  const db = await openNoel(page, ALICE, "2026-10-01", { "programmes/noel": { ...NOEL, passages: PASSAGES } });
  await page.getByRole("button", { name: "Programme Noël" }).click();
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  const poignee = liste.getByRole("listitem").nth(1).getByRole("button", { name: "Déplacer" });
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
  await page.getByRole("button", { name: "Réserver un créneau" }).click();
  await page.getByLabel("Dimanche", { exact: true }).selectOption("2026-10-11");
  await page.getByLabel("Quoi").selectOption("Danse");
  await page.getByLabel("Gp Joie").check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  const bloc = page.getByRole("region", { name: "Dimanche 11 octobre" });
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
