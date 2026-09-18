import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { echeancesDe, lignesDeTache, grouperLignes, dimancheApres, aFairePour } from "../src/lib/taches/echeances";
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
const fait = (date: string, le = `${date}T09:00:00Z`): Fois =>
  ({ date, parUid: "u", parNom: "Ruth K.", le, etat: "terminee", debutLe: "" });
/** Une fois commencée mais pas terminée (lot 13). */
const enCours = (date: string, debutLe = `${date}T09:00:00Z`): Fois =>
  ({ date, parUid: "u", parNom: "Ruth K.", le: debutLe, etat: "encours", debutLe });

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

  // Deux touches depuis le lot 13 : En cours, puis Terminé.
  const cercle = groupe(page, "Cette semaine").getByRole("checkbox", { name: /Fond PPT/ });
  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "mixed");
  await cercle.click();
  await expect(groupe(page, "Faites").getByText("Fond PPT")).toBeVisible();
  expect(db.doc(`poles/da/taches/t1/fois/${jour(0)}`))
    .toMatchObject({ date: jour(0), parUid: "uid-da", parNom: "Ruth Kouassi", etat: "terminee" });
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
  const cercle = groupe(page, "Cette semaine").getByRole("checkbox", { name: /Fond PPT/ });
  await expect(cercle).toHaveAttribute("aria-checked", "false");
  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "mixed");
  await cercle.click();
  await expect(groupe(page, "Faites").getByText("Fond PPT")).toBeVisible();
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
  const cercle = groupe(page, "Cette semaine").getByRole("checkbox", { name: /Fond PPT/ });
  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "mixed");
  await cercle.click();
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
  const terminer = async (titre: RegExp) => {
    const cercle = groupe(page, "Cette semaine").getByRole("checkbox", { name: titre });
    await cercle.click();
    await expect(cercle).toHaveAttribute("aria-checked", "mixed");
    await cercle.click();
  };
  await terminer(/Fond PPT/);
  await expect(page.getByRole("status")).toHaveText("Personne n'a été prévenu : aucune régie reliée à un compte.");
  reponse = { ok: true, notified: 2, linked: true, cible: "pole" };
  await terminer(/Visuel/);
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
  await expect(page.getByRole("radiogroup", { name: "Inscriptions" })).toHaveCount(0);
  await page.getByLabel("Nom de l'évènement").fill("Réunion DA");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-10");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Réunion DA" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({ pour: "pole:da", inscriptions: "fermees", sansCompte: false, placesMax: null });
  await expect.poll(() => pushed).toBe(true);
});

// ── Lot 13 : rythme annuel, « en cours », relances (docs/spec-taches-annuelles.md) ──

test("échéances : chaque année, le même jour du même mois", () => {
  const an = tache({ echeance: "2026-12-10", repetition: { rythme: "an" } });
  expect(echeancesDe(an, "2026-01-01", "2029-01-01")).toEqual(["2026-12-10", "2027-12-10", "2028-12-10"]);
  // Jamais avant la première échéance, et le calcul repart toujours d'elle.
  expect(echeancesDe(an, "2027-01-01", "2029-12-31")).toEqual(["2027-12-10", "2028-12-10", "2029-12-10"]);
  expect(echeancesDe(an, "2024-01-01", "2026-06-30")).toEqual([]);
});

test("échéances : le 29 février se replie sur le 28 les années non bissextiles", () => {
  const bissextile = tache({ echeance: "2028-02-29", repetition: { rythme: "an" } });
  expect(echeancesDe(bissextile, "2028-01-01", "2032-12-31"))
    .toEqual(["2028-02-29", "2029-02-28", "2030-02-28", "2031-02-28", "2032-02-29"]);
  // Le 31 janvier ne déborde pas sur février : aucune dérive d'année en année.
  const trenteEtUn = tache({ echeance: "2026-01-31", repetition: { rythme: "an" } });
  expect(echeancesDe(trenteEtUn, "2026-01-01", "2028-12-31")).toEqual(["2026-01-31", "2027-01-31", "2028-01-31"]);
});

test("une échéance annuelle oubliée reste en retard, puis laisse la place 7 jours avant la suivante", () => {
  const an = tache({ echeance: "2026-12-10", repetition: { rythme: "an" } });
  expect(lignesDeTache(an, [], "2027-06-10").map((l) => l.date)).toEqual(["2026-12-10"]);
  expect(lignesDeTache(an, [], "2027-12-02").map((l) => l.date)).toEqual(["2026-12-10"]);
  expect(lignesDeTache(an, [], "2027-12-03").map((l) => l.date)).toEqual(["2027-12-10"]);
});

test("une fois en cours n'est pas faite : elle reste dans son groupe de date", () => {
  const today = "2026-12-14";
  const t1 = tache({ id: "a", echeance: "2026-12-10" });
  const lignes = lignesDeTache(t1, [enCours("2026-12-10", "2026-12-11T09:00:00Z")], today);
  expect(lignes.map((l) => l.fois?.etat)).toEqual(["encours"]);
  const g = grouperLignes(lignes, today);
  expect(g.enRetard.map((l) => l.tache.id)).toEqual(["a"]);
  expect(g.faites).toEqual([]);
});

test("une fois en cours ne disparaît jamais ; une fois terminée sort après 30 jours", () => {
  const hebdo = tache({ echeance: "2026-09-18", repetition: { rythme: "semaine" } });
  const commencee = lignesDeTache(hebdo, [enCours("2026-09-18", "2026-09-19T09:00:00Z")], "2026-11-20");
  expect(commencee.filter((l) => l.fois).map((l) => l.date)).toEqual(["2026-09-18"]);
  expect(lignesDeTache(hebdo, [fait("2026-09-18", "2026-09-19T09:00:00Z")], "2026-11-20").filter((l) => l.fois)).toEqual([]);
});

test("« Mes tâches » compte une fois en cours, pas une fois terminée", () => {
  const today = "2026-12-14";
  const mienne = tache({ id: "m", responsableUid: "uid-da", responsableNom: "Ruth", echeance: "2026-12-10" });
  expect(aFairePour(lignesDeTache(mienne, [enCours("2026-12-10")], today), "uid-da").map((l) => l.date))
    .toEqual(["2026-12-10"]);
  expect(aFairePour(lignesDeTache(mienne, [fait("2026-12-10", "2026-12-13T09:00:00Z")], today), "uid-da")).toEqual([]);
});

test("rappel « en cours » : rien avant l'échéance, puis une ligne chaque matin", () => {
  const ppt = tache({ id: "ppt", echeance: "2026-12-10" });
  const items = (fois: Fois[]) => [{ tache: ppt, fois }];
  const debut = enCours("2026-12-10", "2026-12-08T09:00:00Z");
  // Commencée : plus de « À faire » à J-1, et rien le jour même.
  expect(rappelsDuJour(items([debut]), "2026-12-09")).toEqual([]);
  expect(rappelsDuJour(items([debut]), "2026-12-10")).toEqual([]);
  // Le lendemain puis le surlendemain : une ligne « en cours », jamais « En retard ».
  expect(rappelsDuJour(items([debut]), "2026-12-11").map((r) => `${r.quand}:${r.depuis}`)).toEqual(["encours:3"]);
  expect(rappelsDuJour(items([debut]), "2026-12-12").map((r) => `${r.quand}:${r.depuis}`)).toEqual(["encours:4"]);
  // Une fois d'avant le lot 13, sans debutLe : la ligne part quand même, sans durée.
  expect(rappelsDuJour(items([{ ...debut, debutLe: "" }]), "2026-12-11").map((r) => r.depuis)).toEqual([undefined]);
  // Sans document, le rappel « En retard » part comme avant.
  expect(rappelsDuJour(items([]), "2026-12-11").map((r) => r.quand)).toEqual(["retard"]);
  // Terminée : plus rien.
  expect(rappelsDuJour(items([fait("2026-12-10")]), "2026-12-11")).toEqual([]);
});

test("ligne « en cours » : depuis n jours, aujourd'hui ou sans date, en français et en 中文", () => {
  const base = { tache: tache({ titre: "Fond PPT", pole: "da" as const }), date: "2026-12-10", quand: "encours" as const };
  expect(ligneRappelTache({ ...base, depuis: 3 }, "fr")).toBe("En cours depuis 3 jours : Fond PPT (DA)");
  expect(ligneRappelTache({ ...base, depuis: 1 }, "fr")).toBe("En cours depuis 1 jour : Fond PPT (DA)");
  expect(ligneRappelTache({ ...base, depuis: 0 }, "fr")).toBe("En cours depuis aujourd'hui : Fond PPT (DA)");
  expect(ligneRappelTache(base, "fr")).toBe("En cours : Fond PPT (DA)");
  expect(ligneRappelTache({ ...base, depuis: 3 }, "zh-CN")).toBe("进行中 3 天：Fond PPT（美工）");
  expect(ligneRappelTache({ ...base, depuis: 0 }, "zh-CN")).toBe("今天开始：Fond PPT（美工）");
  expect(ligneRappelTache(base, "zh-CN")).toBe("进行中：Fond PPT（美工）");
  // Une seule notification : la ligne s'ajoute au rappel de service du jour.
  expect(corpsAvecTaches("Dimanche 13 décembre (dans 3 jours) : Culte Franco (Piano)", [{ ...base, depuis: 3 }], "fr"))
    .toBe("Dimanche 13 décembre (dans 3 jours) : Culte Franco (Piano)\nEn cours depuis 3 jours : Fond PPT (DA)");
});

test("le cercle cycle À faire → En cours → Terminé → À faire", async ({ page }) => {
  let appels = 0;
  await page.route("**/api/taches/fait", (route) => {
    appels++;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, notified: 1, linked: true, cible: "regie" }) });
  });
  const db = await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc({ prevenir: { regie: "Culte Francophone" } }),
  }, "/taches/da");
  const chemin = `poles/da/taches/t1/fois/${jour(0)}`;
  const cercle = page.getByRole("checkbox", { name: /Fond PPT/ });
  await expect(cercle).toHaveAttribute("aria-checked", "false");

  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "mixed");
  await expect(groupe(page, "Cette semaine").getByText(/En cours/)).toBeVisible();
  expect(db.doc(chemin)).toMatchObject({ etat: "encours", parNom: "Ruth Kouassi" });
  expect(appels, "on ne prévient personne sur une tâche seulement commencée").toBe(0);

  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("status")).toHaveText("Régie prévenue.");
  expect(db.doc(chemin)).toMatchObject({ etat: "terminee" });
  expect(appels).toBe(1);

  await cercle.click();
  await expect(cercle).toHaveAttribute("aria-checked", "false");
  expect(db.doc(chemin)).toBeUndefined();
  expect(appels).toBe(1);
});

test("la ligne d'une fois en cours dit depuis quand et par qui", async ({ page }) => {
  await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc({ echeance: jour(-3) }),
    [`poles/da/taches/t1/fois/${jour(-3)}`]: {
      date: jour(-3), parUid: "uid-da", parNom: "Ruth Kouassi", le: `${jour(-2)}T09:00:00Z`,
      etat: "encours", debutLe: `${jour(-2)}T09:00:00Z`,
    },
  }, "/taches/da");
  const retard = groupe(page, "En retard");
  await expect(retard.getByText("En cours depuis 2 jours")).toBeVisible();
  await expect(retard.getByText("Commencée par Ruth Kouassi")).toBeVisible();
  await expect(groupe(page, "Faites")).toHaveCount(0);
});

test("le formulaire propose « Chaque année », sans semaine du mois", async ({ page }) => {
  const db = await signInAs(page, MEMBRE_DA, {}, "/taches/da");
  await page.getByRole("button", { name: "Nouvelle tâche" }).click();
  const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
  await form.getByLabel("Titre").fill("Fond PPT de Noël");
  await form.getByLabel("Échéance").fill(jour(2));
  await form.getByLabel("Répétition").selectOption({ label: "Chaque année" });
  await expect(form.getByText("Chaque année à la même date.")).toBeVisible();
  await expect(form.getByLabel("Quelle semaine du mois")).toHaveCount(0);
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toHaveCount(0);
  await expect(page.getByText("Fond PPT de Noël")).toBeVisible();
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/da/taches/"));
  expect(cree?.data).toMatchObject({ titre: "Fond PPT de Noël", echeance: jour(2), repetition: { rythme: "an" } });
});

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test("capture : les trois états sur la page d'un pôle", async ({ page }) => {
  await signInAs(page, MEMBRE_DA, {
    "poles/da/taches/t1": tacheDoc({ titre: "Fond PPT de Noël", echeance: jour(-4), repetition: { rythme: "an" } }),
    [`poles/da/taches/t1/fois/${jour(-4)}`]: {
      date: jour(-4), parUid: "uid-da", parNom: "Ruth Kouassi", le: `${jour(-1)}T09:00:00Z`,
      etat: "encours", debutLe: `${jour(-1)}T09:00:00Z`,
    },
    "poles/da/taches/t2": tacheDoc({ titre: "Affiche de la retraite", echeance: jour(1) }),
    "poles/da/taches/t3": tacheDoc({ titre: "Vidéo d'annonce", echeance: jour(-2) }),
    [`poles/da/taches/t3/fois/${jour(-2)}`]: {
      date: jour(-2), parUid: "uid-da", parNom: "Ruth Kouassi", le: `${jour(-1)}T18:00:00Z`,
      etat: "terminee", debutLe: `${jour(-2)}T09:00:00Z`,
    },
  }, "/taches/da");
  await expect(groupe(page, "En retard").getByText("En cours depuis 1 jour")).toBeVisible();
  await expect(groupe(page, "Faites").getByText("Vidéo d'annonce")).toBeVisible();
  await capture(page, "taches-trois-etats");
});
