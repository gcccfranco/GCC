import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { echeancesDe, lignesDeTache, grouperLignes, dimancheApres } from "../src/lib/taches/echeances";
import { polesDe, isPoleMember, canSeeEvenement, canCreateEvenement, creatableEvenementPours } from "../src/lib/access";
import type { Tache, Fois } from "../src/types/tache";
import { nouvelleTacheMessage, tacheFaiteMessage, rappelsDuJour, ligneRappelTache, corpsAvecTaches } from "../src/lib/taches/messages";

// Lot 7 « Tâches par pôle » (docs/spec-taches.md) — fonctions pures.

function tache(over: Partial<Tache> = {}): Tache {
  return {
    id: "t1",
    pole: "da",
    titre: "Fond PPT",
    responsableUid: null,
    responsableNom: "",
    echeance: "2026-09-18",
    repetition: null,
    lien: "",
    note: "",
    prevenir: null,
    auteurUid: "uid-auteur",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
    ...over,
  };
}
const fait = (date: string, le = `${date}T09:00:00Z`): Fois => ({ date, parUid: "u", parNom: "Ruth K.", le });

// ── Échéances ───────────────────────────────────────────────────────────────

test("échéances : chaque semaine et toutes les deux semaines, à partir de la première", () => {
  const hebdo = tache({ echeance: "2026-09-18", repetition: { rythme: "semaine" } });
  expect(echeancesDe(hebdo, "2026-09-01", "2026-10-03")).toEqual(["2026-09-18", "2026-09-25", "2026-10-02"]);
  const quinze = tache({ echeance: "2026-09-18", repetition: { rythme: "2semaines" } });
  expect(echeancesDe(quinze, "2026-09-19", "2026-10-31")).toEqual(["2026-10-02", "2026-10-16", "2026-10-30"]);
});

test("échéances : chaque mois, le 1er ou le dernier dimanche, en changeant de mois", () => {
  // 6 septembre 2026 = 1er dimanche.
  const premier = tache({ echeance: "2026-09-06", repetition: { rythme: "mois", rang: 1 } });
  expect(echeancesDe(premier, "2026-09-01", "2026-12-31")).toEqual(["2026-09-06", "2026-10-04", "2026-11-01", "2026-12-06"]);
  // 27 septembre 2026 = dernier dimanche.
  const dernier = tache({ echeance: "2026-09-27", repetition: { rythme: "mois", rang: -1 } });
  expect(echeancesDe(dernier, "2026-09-01", "2026-11-30")).toEqual(["2026-09-27", "2026-10-25", "2026-11-29"]);
});

test("échéances : une tâche unique n'a qu'une échéance", () => {
  expect(echeancesDe(tache(), "2026-09-01", "2026-12-31")).toEqual(["2026-09-18"]);
  expect(echeancesDe(tache(), "2026-09-19", "2026-12-31")).toEqual([]);
});

// ── Fois visibles ───────────────────────────────────────────────────────────

test("une tâche répétée apparaît 7 jours avant son échéance", () => {
  const hebdo = tache({ echeance: "2026-09-18", repetition: { rythme: "semaine" } });
  // Mercredi 16 : vendredi 18 visible, vendredi 25 pas encore.
  expect(lignesDeTache(hebdo, [], "2026-09-16").map((l) => l.date)).toEqual(["2026-09-18"]);
  // Faite le 16 : la suivante (25) n'apparaît que le 18.
  expect(lignesDeTache(hebdo, [fait("2026-09-18", "2026-09-16T20:00:00Z")], "2026-09-16").filter((l) => !l.fois)).toEqual([]);
  expect(lignesDeTache(hebdo, [fait("2026-09-18")], "2026-09-18").filter((l) => !l.fois).map((l) => l.date)).toEqual(["2026-09-25"]);
});

test("une fois hebdomadaire ratée reste en retard le lendemain, puis disparaît", () => {
  const hebdo = tache({ echeance: "2026-09-18", repetition: { rythme: "semaine" } });
  expect(lignesDeTache(hebdo, [], "2026-09-19").map((l) => l.date)).toEqual(["2026-09-18", "2026-09-25"]);
  expect(lignesDeTache(hebdo, [], "2026-09-20").map((l) => l.date)).toEqual(["2026-09-25"]);
});

test("une fois mensuelle ratée reste en retard jusqu'à ce que la suivante apparaisse", () => {
  const mois = tache({ echeance: "2026-09-06", repetition: { rythme: "mois", rang: 1 } });
  expect(lignesDeTache(mois, [], "2026-09-20").map((l) => l.date)).toEqual(["2026-09-06"]);
  // La suivante (4 octobre) apparaît le 27 septembre : la ratée disparaît.
  expect(lignesDeTache(mois, [], "2026-09-27").map((l) => l.date)).toEqual(["2026-10-04"]);
});

test("une tâche unique reste en retard jusqu'à ce qu'on la coche, et reste 30 jours dans « Faites »", () => {
  expect(lignesDeTache(tache(), [], "2026-11-01").map((l) => l.date)).toEqual(["2026-09-18"]);
  const cochee = lignesDeTache(tache(), [fait("2026-09-18", "2026-09-17T10:00:00Z")], "2026-10-10");
  expect(cochee).toHaveLength(1);
  expect(cochee[0].fois?.parNom).toBe("Ruth K.");
  expect(lignesDeTache(tache(), [fait("2026-09-18", "2026-09-17T10:00:00Z")], "2026-10-20")).toEqual([]);
});

test("groupes : en retard, cette semaine (jusqu'à dimanche), plus tard, faites", () => {
  const today = "2026-09-16"; // mercredi
  const lignes = [
    ...lignesDeTache(tache({ id: "a", echeance: "2026-09-14" }), [], today),
    ...lignesDeTache(tache({ id: "b", echeance: "2026-09-20" }), [], today),
    ...lignesDeTache(tache({ id: "c", echeance: "2026-09-21" }), [], today),
    ...lignesDeTache(tache({ id: "d", echeance: "2026-09-15" }), [fait("2026-09-15")], today),
  ];
  const g = grouperLignes(lignes, today);
  expect(g.enRetard.map((l) => l.tache.id)).toEqual(["a"]);
  expect(g.cetteSemaine.map((l) => l.tache.id)).toEqual(["b"]);
  expect(g.plusTard.map((l) => l.tache.id)).toEqual(["c"]);
  expect(g.faites.map((l) => l.tache.id)).toEqual(["d"]);
});

// ── Membres et régie ────────────────────────────────────────────────────────

test("pôles : cochés dans le profil, Louange = avoir un rôle de service ; un admin voit tout", () => {
  expect(polesDe({ poles: ["da"], serviceRoles: {} })).toEqual(["da"]);
  expect(polesDe({ poles: ["media"], serviceRoles: { "Culte Francophone": ["musicien"] } })).toEqual(["media", "louange"]);
  expect(polesDe(null)).toEqual([]);
  const membre = { email: "membre@example.com" };
  expect(isPoleMember(membre, { poles: ["da"] }, "da")).toBe(true);
  expect(isPoleMember(membre, { poles: ["da"] }, "media")).toBe(false);
  expect(isPoleMember(membre, { serviceRoles: { "Groupe Paix": ["chanteur"] } }, "louange")).toBe(true);
  expect(isPoleMember({ email: "tc328829@gmail.com" }, null, "orga")).toBe(true);
  expect(isPoleMember(null, { poles: ["da"] }, "da")).toBe(false);
});

test("régie à prévenir : le dimanche qui suit l'échéance", () => {
  expect(dimancheApres("2026-09-18")).toBe("2026-09-20"); // vendredi
  expect(dimancheApres("2026-09-19")).toBe("2026-09-20"); // samedi
  expect(dimancheApres("2026-09-20")).toBe("2026-09-27"); // dimanche
});

// ── Interface : page d'un pôle, création, coche, visibilité, Moi ────────────

/** Date locale d'aujourd'hui décalée de `n` jours (le navigateur des tests
 *  tourne sur la même horloge). */
function jour(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MEMBRE_DA: FakeProfile = {
  uid: "uid-da", email: "da@example.com", firstName: "Ruth", lastName: "Kouassi", poles: ["da"],
};
const MEMBRE_MEDIA: FakeProfile = {
  uid: "uid-media", email: "media@example.com", firstName: "Paul", lastName: "Media", poles: ["media"],
};
const SANS_POLE: FakeProfile = { uid: "uid-rien", email: "rien@example.com", firstName: "Anne", lastName: "Nopole" };

function tacheDoc(over: Record<string, unknown> = {}) {
  return {
    pole: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: jour(0),
    repetition: null, lien: "", note: "", prevenir: null, auteurUid: "uid-da",
    createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...over,
  };
}

const groupe = (page: Page, titre: string) =>
  page.locator("section", { has: page.getByRole("heading", { name: titre, exact: true }) });

test("un membre du pôle voit ses tâches rangées et en coche une, qui passe dans « Faites »", async ({ page }) => {
  const db = await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc(),
    "poles/da/taches/t2": tacheDoc({ titre: "Affiche Noël", echeance: jour(-3) }),
  }, "/taches/da");
  await expect(page.getByRole("heading", { name: "DA", level: 1 })).toBeVisible();
  await expect(groupe(page, "En retard").getByText("Affiche Noël")).toBeVisible();
  await expect(groupe(page, "Cette semaine").getByText("Fond PPT")).toBeVisible();

  await groupe(page, "Cette semaine").getByRole("checkbox", { name: /Fond PPT/ }).click();
  await expect(groupe(page, "Faites").getByText("Fond PPT")).toBeVisible();
  const ecrit = db.writes.find((w) => w.path === `poles/da/taches/t1/fois/${jour(0)}`);
  expect(ecrit?.data).toMatchObject({ date: jour(0), parUid: "uid-da", parNom: "Ruth Kouassi" });
});

test("créer une tâche pour tout le pôle", async ({ page }) => {
  const db = await signInAs(page, MEMBRE_DA, {}, "/taches/da");
  await page.getByRole("button", { name: "Nouvelle tâche" }).click();
  const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
  await form.getByLabel("Titre").fill("Vidéo d'annonce");
  await form.getByLabel("Échéance").fill(jour(1));
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toHaveCount(0);
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/da/taches/"));
  expect(cree?.data).toMatchObject({ titre: "Vidéo d'annonce", pole: "da", echeance: jour(1), responsableUid: null, repetition: null, auteurUid: "uid-da" });
  await expect(page.getByText("Vidéo d'annonce")).toBeVisible();
});

test("une tâche répétée chaque semaine : cochée, la fois suivante apparaît", async ({ page }) => {
  await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc({ echeance: jour(-7), repetition: { rythme: "semaine" } }),
    [`poles/da/taches/t1/fois/${jour(-7)}`]: { date: jour(-7), parUid: "uid-da", parNom: "Ruth Kouassi", le: new Date().toISOString() },
  }, "/taches/da");
  await expect(groupe(page, "Plus tard")).toHaveCount(0);
  await groupe(page, "Cette semaine").getByRole("checkbox", { name: /Fond PPT/ }).click();
  await expect(groupe(page, "Plus tard").getByText("Fond PPT")).toBeVisible();
});

test("un membre d'un autre pôle ne voit pas les tâches du pôle", async ({ page }) => {
  await signInAs(page, MEMBRE_MEDIA, { "poles/da/taches/t1": tacheDoc() }, "/taches/da");
  await expect(page.getByText("Tu ne fais pas partie de ce pôle.")).toBeVisible();
  await expect(page.getByText("Fond PPT")).toHaveCount(0);
});

test("Tâches : chacun voit la liste de ses pôles, et rien hors pôle", async ({ page }) => {
  await signInAs(page, { ...MEMBRE_DA, serviceRoles: { "Culte Francophone": ["musicien"] } }, {}, "/taches");
  await expect(page.getByRole("link", { name: /DA/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Louange/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Média/ })).toHaveCount(0);
});

test("Moi : « Mes tâches » compte mes tâches et celles de mon pôle sans responsable", async ({ page }) => {
  await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc(),
    "poles/da/taches/t2": tacheDoc({ titre: "Pour Paul", responsableUid: "uid-paul", responsableNom: "Paul" }),
    "poles/da/taches/t3": tacheDoc({ titre: "Pour moi", responsableUid: "uid-da", responsableNom: "Ruth Kouassi", echeance: jour(20) }),
  }, "/moi");
  const ligne = page.getByRole("link", { name: /Mes tâches/ });
  await expect(ligne).toBeVisible();
  await expect(ligne).toContainText("2");
});

test("Moi : pas de « Mes tâches » hors pôle", async ({ page }) => {
  await signInAs(page, SANS_POLE, {}, "/moi");
  await expect(page.getByRole("link", { name: /profil/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mes tâches/ })).toHaveCount(0);
});

// ── Notifications (T3) ──────────────────────────────────────────────────────

test("messages : nouvelle tâche et tâche faite, en français et en chinois", () => {
  const t = tache({ titre: "Fond PPT", pole: "da", echeance: "2026-09-18" });
  expect(nouvelleTacheMessage(t, "fr")).toEqual({ title: "Nouvelle tâche : Fond PPT", body: "Pôle DA · pour vendredi 18 septembre" });
  expect(nouvelleTacheMessage(t, "zh-CN").title).toBe("新任务：Fond PPT");
  expect(tacheFaiteMessage(t, "Ruth Kouassi", "fr")).toEqual({ title: "Tâche faite : Fond PPT", body: "Ruth Kouassi (DA) l'a terminée." });
  expect(tacheFaiteMessage(t, "Ruth Kouassi", "zh-CN").body).toBe("Ruth Kouassi（美工）已完成。");
});

test("rappels du jour : J-3, J-1 et le lendemain de l'échéance, jamais une fois cochée", () => {
  const today = "2026-09-15";
  const items = [
    { tache: tache({ id: "j3", echeance: "2026-09-18" }), fois: [] },
    { tache: tache({ id: "j1", echeance: "2026-09-16" }), fois: [] },
    { tache: tache({ id: "retard", echeance: "2026-09-14" }), fois: [] },
    { tache: tache({ id: "faite", echeance: "2026-09-16" }), fois: [fait("2026-09-16")] },
    { tache: tache({ id: "loin", echeance: "2026-09-25" }), fois: [] },
    { tache: tache({ id: "hebdo", echeance: "2026-09-04", repetition: { rythme: "semaine" } }), fois: [] },
  ];
  expect(rappelsDuJour(items, today).map((r) => `${r.tache.id}:${r.quand}`)).toEqual(["j3:J3", "j1:J1", "retard:retard", "hebdo:J3"]);
});

test("rappel : les tâches s'ajoutent à la notification de service du jour", () => {
  const r = { tache: tache({ titre: "Fond PPT", pole: "da" }), date: "2026-09-18", quand: "J3" as const };
  expect(ligneRappelTache(r, "fr")).toBe("À faire : Fond PPT (DA), vendredi 18 septembre");
  expect(ligneRappelTache({ ...r, quand: "retard" }, "fr")).toBe("En retard : Fond PPT (DA), pour hier");
  expect(ligneRappelTache(r, "zh-CN")).toBe("待办：Fond PPT（美工），9月18日星期五");
  expect(corpsAvecTaches("Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano)", [r], "fr"))
    .toBe("Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano)\nÀ faire : Fond PPT (DA), vendredi 18 septembre");
});

test("cocher une tâche qui prévient la régie : la route part, la régie est dite prévenue", async ({ page }) => {
  let recu: unknown = null;
  await page.route("**/api/taches/fait", async (route) => {
    recu = route.request().postDataJSON();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, notified: 1, linked: true, cible: "regie" }) });
  });
  await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc({ prevenir: { regie: "Culte Francophone" } }),
  }, "/taches/da");
  await groupe(page, "Cette semaine").getByRole("checkbox", { name: /Fond PPT/ }).click();
  await expect(page.getByRole("status")).toHaveText("Régie prévenue.");
  expect(recu).toEqual({ pole: "da", tacheId: "t1", date: jour(0) });
});

test("cocher : sans régie reliée à un compte, on le dit ; un pôle prévenu est nommé", async ({ page }) => {
  let reponse = { ok: true, notified: 0, linked: false, cible: "regie" };
  await page.route("**/api/taches/fait", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(reponse) }));
  await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc({ prevenir: { regie: "Culte Francophone" } }),
    "poles/da/taches/t2": tacheDoc({ titre: "Visuel", prevenir: { pole: "media" } }),
  }, "/taches/da");
  await groupe(page, "Cette semaine").getByRole("checkbox", { name: /Fond PPT/ }).click();
  await expect(page.getByRole("status")).toHaveText("Personne n'a été prévenu : aucune régie reliée à un compte.");
  reponse = { ok: true, notified: 2, linked: true, cible: "pole" };
  await groupe(page, "Cette semaine").getByRole("checkbox", { name: /Visuel/ }).click();
  await expect(page.getByRole("status")).toHaveText("Pôle Média prévenu.");
});

test("nommer quelqu'un d'autre responsable le prévient", async ({ page }) => {
  let recu: { pole?: string; tacheId?: string } | null = null;
  await page.route("**/api/taches/assigne", async (route) => {
    recu = route.request().postDataJSON();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, notified: 1 }) });
  });
  const db = await signInAs(page, MEMBRE_DA, {
    "users/uid-paul": { email: "paul@example.com", firstName: "Paul", lastName: "Dupont", planningName: "", serviceRoles: {}, annonces: [], notify: [], poles: ["da"] },
  }, "/taches/da");
  await page.getByRole("button", { name: "Nouvelle tâche" }).click();
  const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
  await form.getByLabel("Titre").fill("Affiche");
  await form.getByLabel("Échéance").fill(jour(2));
  await form.getByLabel("Responsable").selectOption({ label: "Paul Dupont" });
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toHaveCount(0);
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/da/taches/"));
  expect(cree?.data).toMatchObject({ responsableUid: "uid-paul", responsableNom: "Paul Dupont" });
  await expect.poll(() => recu).toEqual({ pole: "da", tacheId: cree!.path.split("/").pop() });
});

// ── Réunions de pôle dans le calendrier (T4) ────────────────────────────────

test("réunion de pôle : visible et créée par les membres du pôle, jamais sans compte", () => {
  const reunion = { pour: "pole:da", organisateurUid: "uid-x" };
  const membre = { uid: "u1", email: "da@example.com" };
  expect(canSeeEvenement(membre, { poles: ["da"] }, reunion)).toBe(true);
  expect(canSeeEvenement(membre, { poles: ["media"] }, reunion)).toBe(false);
  expect(canSeeEvenement(null, null, reunion)).toBe(false);
  expect(canSeeEvenement({ uid: "a", email: "tc328829@gmail.com" }, null, reunion)).toBe(true);
  expect(canCreateEvenement(membre, { poles: ["da"] }, "pole:da")).toBe(true);
  expect(canCreateEvenement(membre, { poles: ["da"] }, "pole:media")).toBe(false);
  expect(creatableEvenementPours(membre, { poles: ["da"], serviceRoles: { "Groupe Paix": ["chanteur"] } }, ["Groupe Paix"]))
    .toEqual(["pole:da", "pole:louange"]);
});

const REUNION = {
  titre: "Réunion DA", type: "info", pour: "pole:da", date: "2026-10-10", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "Bilan du trimestre", liens: [], images: [], placesMax: null, inscriptionOuverte: false,
  sansCompte: false, contact: "", organisateurUid: "uid-autre", organisateurNom: "Marc Autre", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};

test("calendrier : la réunion du pôle DA se voit du pôle DA, pas du pôle Média", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, MEMBRE_DA, { "evenements/reunion": { ...REUNION, type: "eglise" } }, "/evenements");
  await expect(page.getByRole("link", { name: /Réunion DA/ })).toBeVisible();
});

test("calendrier : un membre d'un autre pôle ne voit pas la réunion", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, MEMBRE_MEDIA, { "evenements/reunion": { ...REUNION, type: "eglise" } }, "/evenements");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Réunion DA/ })).toHaveCount(0);
});

test("créer une réunion de pôle : pas d'inscriptions", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  let pushed = false;
  await page.route("**/api/push/notify-evenement", (route) => { pushed = true; return route.fulfill({ json: { ok: true } }); });
  const db = await signInAs(page, MEMBRE_DA, {}, "/evenements/nouveau");
  await page.getByLabel("Public").selectOption({ label: "Pôle DA" });
  await expect(page.getByLabel("Inscriptions ouvertes")).toHaveCount(0);
  await page.getByLabel("Nom de l'évènement").fill("Réunion DA");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-10");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Réunion DA" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({ pour: "pole:da", inscriptionOuverte: false, sansCompte: false, placesMax: null });
  await expect.poll(() => pushed).toBe(true);
});
