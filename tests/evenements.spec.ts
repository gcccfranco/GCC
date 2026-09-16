import { expect, test, type Page } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { groupByMonth, isPast, placesRestantes, refusInscription } from "../src/lib/evenements/agenda";
import type { Evenement } from "../src/types/evenement";
import { evenementReminder } from "../src/lib/evenements/rappel";

// Lot 6 (docs/spec-evenements.md), tranche E1 : calendrier public de la section
// Évènements (agenda par mois, infos épinglées, passés), fiche en lecture,
// onglets « Calendrier » (tous) et programme de scène (connectés).

const base: Omit<Evenement, "id" | "titre"> = {
  type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "", dateFin: "", lieu: "Parc de Bercy",
  description: "Match amical, venez nombreux.", liens: [], images: [], placesMax: 10, inscriptionOuverte: true, sansCompte: true,
  contact: "", organisateurUid: "uid-steph", organisateurNom: "Steph", epingle: false, expiresAt: null, inscrits: 4,
  createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const FOOT: Omit<Evenement, "id"> = { ...base, titre: "Foot au parc" };
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PAIX: Omit<Evenement, "id"> = { ...base, titre: "Repas Groupe Paix", type: "loisir", pour: "Groupe Paix", date: "2026-10-17", placesMax: null };
const CULTE_NOEL: Omit<Evenement, "id"> = { ...base, titre: "Culte de Noël", type: "eglise", date: "2026-12-24", heure: "19:30", placesMax: null, inscriptionOuverte: false };
const INFO: Omit<Evenement, "id"> = { ...base, titre: "Nouveau parking", type: "info", date: "", heure: "", epingle: true, placesMax: null, inscriptionOuverte: false };
const PASSE: Omit<Evenement, "id"> = { ...base, titre: "Pique-nique de rentrée", date: "2026-09-06" };
const DOCS = {
  "evenements/foot": FOOT, "evenements/paix": PAIX, "evenements/culte-noel": CULTE_NOEL,
  "evenements/parking": INFO, "evenements/rentree": PASSE,
};
const NOEL = { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: true, passages: [], createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z" };

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L.", serviceRoles: { "Groupe Paix": ["chanteur"] } };
const EVA: FakeProfile = { uid: "uid-eva", email: "eva@example.com", firstName: "Eva", lastName: "C.", serviceRoles: { "Groupe Bonté": ["musicien"] } };

async function visitor(page: Page, to: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await fakeFirestore(page, docs);
  await page.goto(to);
}

test("agenda : groupés par mois, à venir d'abord, infos épinglées à part", () => {
  const groups = groupByMonth([FOOT, CULTE_NOEL, PAIX].map((e, i) => ({ ...e, id: String(i) })), "fr");
  expect(groups.map((g) => g.label)).toEqual(["Octobre 2026", "Décembre 2026"]);
  expect(groups[0].evenements.map((e) => e.titre)).toEqual(["Foot au parc", "Repas Groupe Paix"]);
  expect(isPast(PASSE, "2026-10-01")).toBe(true);
  expect(isPast(FOOT, "2026-10-10")).toBe(false);
  expect(isPast(INFO, "2026-10-01")).toBe(false);
  expect(placesRestantes(FOOT)).toBe(6);
  expect(placesRestantes(PAIX)).toBeNull();
});

test("sans compte : le calendrier montre les évènements de toute l'église, infos en tête, jamais ceux d'une section", async ({ page }) => {
  await visitor(page, "/evenements");
  await expect(page.getByRole("heading", { name: "Octobre 2026" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Décembre 2026" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Foot au parc/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Culte de Noël/ })).toBeVisible();
  await expect(page.getByText("Repas Groupe Paix")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Nouveau parking/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "À la une" }).getByRole("link").first()).toContainText("Nouveau parking");
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Calendrier", exact: true })).toBeVisible();
});

test("membre du Groupe Paix : voit en plus le repas de son groupe ; un membre d'un autre groupe non", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, JO, DOCS, "/evenements");
  await expect(page.getByRole("link", { name: /Repas Groupe Paix/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Foot au parc/ })).toBeVisible();
});

test("membre du Groupe Bonté : ne voit pas le repas du Groupe Paix", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, EVA, DOCS, "/evenements");
  await expect(page.getByRole("link", { name: /Foot au parc/ })).toBeVisible();
  await expect(page.getByText("Repas Groupe Paix")).toHaveCount(0);
});

test("passés : masqués, un lien montre les trois derniers mois", async ({ page }) => {
  await visitor(page, "/evenements");
  await expect(page.getByText("Pique-nique de rentrée")).toHaveCount(0);
  await page.getByRole("button", { name: "Évènements passés" }).click();
  await expect(page.getByRole("link", { name: /Pique-nique de rentrée/ })).toBeVisible();
});

test("fiche sans compte : détails, places restantes, formulaire sans compte, aucun nom d'inscrit", async ({ page }) => {
  await visitor(page, "/evenements/foot", { ...DOCS, "evenements/foot/inscriptions/uid-jo": { uid: "uid-jo", nom: "Jo L.", invites: 1, createdAt: "2026-09-21T10:00:00Z" } });
  await expect(page.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(page.getByText("Parc de Bercy")).toBeVisible();
  await expect(page.getByText(/samedi 10 octobre 2026/)).toBeVisible();
  await expect(page.getByText("19:00")).toBeVisible();
  await expect(page.getByText("Match amical, venez nombreux.")).toBeVisible();
  await expect(page.getByText("6 places restantes")).toBeVisible();
  await expect(page.getByText("Pour plus d'infos : Steph")).toBeVisible();
  await page.getByRole("button", { name: "S'inscrire" }).click();
  await expect(page.getByLabel("Ton nom")).toBeVisible();
  await expect(page.getByText("Jo L.")).toHaveCount(0);
});

test("fiche : « Complet » quand les places sont prises", async ({ page }) => {
  await visitor(page, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, inscrits: 10 } });
  await expect(page.getByText("Complet")).toBeVisible();
  await expect(page.getByText(/places restantes/)).toHaveCount(0);
});

test("fiche d'une info épinglée : pas de date ni de places, section affichée", async ({ page }) => {
  await visitor(page, "/evenements/parking");
  await expect(page.getByRole("heading", { name: "Nouveau parking" })).toBeVisible();
  await expect(page.getByText(/places/)).toHaveCount(0);
  await expect(page.getByText("Toute l'église")).toBeVisible();
});

test("fiche d'une section sans compte : introuvable", async ({ page }) => {
  await visitor(page, "/evenements/paix");
  await expect(page.getByText("Évènement introuvable")).toBeVisible();
  await expect(page.getByText("Repas Groupe Paix")).toHaveCount(0);
});

test("onglets : un connecté voit le programme de scène à côté du calendrier", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, JO, { ...DOCS, "programmes/noel": NOEL }, "/evenements");
  await expect(page.getByRole("link", { name: "Calendrier", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Noël", exact: true }).click();
  await expect(page).toHaveURL(/\/evenements\/scene/);
  await expect(page.getByRole("heading", { name: "Noël" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Réserver un créneau" })).toBeVisible();
});

// ─── Tranche E2 : créer, modifier, dupliquer, supprimer, push à la création ──

const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
const STEPH: FakeProfile = { uid: "uid-steph", email: "steph@example.com", firstName: "Steph", lastName: "R." };
const RESP_PAIX: FakeProfile = { uid: "uid-resp", email: "resp@example.com", firstName: "Ruth", lastName: "K.", serviceRoles: { "Groupe Paix": ["presidence"] }, annonces: ["Groupe Paix"] };

async function member(page: Page, who: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  return signInAs(page, who, docs, to);
}

test("créer : la coordination remplit la fiche ; écriture à son nom, compteur à zéro, puis push demandé", async ({ page }) => {
  const db = await member(page, ALICE, "/evenements");
  let pushed: { evenementId?: string } | null = null;
  await page.route("**/api/push/notify-evenement", (route) => {
    pushed = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true, sent: 3 } });
  });
  await page.getByRole("link", { name: "Nouvel évènement" }).click();
  await page.getByLabel("Nom de l'évènement").fill("Soirée jeux");
  await page.getByLabel("Catégorie").selectOption("loisir");
  await page.getByLabel("Public").selectOption("eglise");
  await page.getByLabel("Date", { exact: true }).fill("2026-11-07");
  await page.getByLabel("Horaire", { exact: true }).fill("19:30");
  await page.getByLabel("Lieu").fill("Salle du bas");
  await page.getByLabel("Description").fill("Apportez vos jeux.");
  await page.getByText("Plus d'options").click();
  await page.getByLabel("Places").fill("20");
  await page.getByLabel("Responsable").fill("Alice 06 00 00 00 00");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Soirée jeux" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({
    titre: "Soirée jeux", type: "loisir", pour: "eglise", date: "2026-11-07", heure: "19:30", lieu: "Salle du bas",
    placesMax: 20, inscriptionOuverte: true, inscrits: 0, organisateurUid: "uid-alice", organisateurNom: "Alice Q.",
  });
  await expect.poll(() => pushed).not.toBeNull();
  expect(pushed!.evenementId).toBe(created!.path.split("/").pop());
});

test("créer : un responsable avec le droit d'annonces ne crée que pour sa section, sans push si décoché", async ({ page }) => {
  const db = await member(page, RESP_PAIX, "/evenements");
  let pushed = false;
  await page.route("**/api/push/notify-evenement", (route) => { pushed = true; return route.fulfill({ json: { ok: true } }); });
  await page.getByRole("link", { name: "Nouvel évènement" }).click();
  // Sa section, puis la réunion du pôle Louange (lot 7 : un rôle de service = pôle Louange).
  await expect(page.getByLabel("Public").locator("option")).toHaveText(["Groupe Paix", "Pôle Louange"]);
  await expect(page.getByLabel("Public")).toHaveValue("Groupe Paix");
  await page.getByLabel("Nom de l'évènement").fill("Prière du groupe");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-20");
  await page.getByLabel("Prévenir les membres").uncheck();
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Prière du groupe" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({ pour: "Groupe Paix", organisateurUid: "uid-resp" });
  await page.waitForTimeout(300);
  expect(pushed).toBe(false);
});

test("créer : un membre sans droit n'a pas de bouton et la page de création lui est refusée", async ({ page }) => {
  // Sans rôle de service ni pôle : un rôle de service donnerait le pôle Louange (lot 7).
  await member(page, { uid: "uid-sans", email: "sans@example.com", firstName: "Sam", lastName: "S." }, "/evenements");
  await expect(page.getByRole("link", { name: "Nouvel évènement" })).toHaveCount(0);
  await page.goto("/evenements/nouveau");
  await expect(page.getByText("réservée")).toBeVisible();
  await expect(page.getByLabel("Nom de l'évènement")).toHaveCount(0);
});

test("créer une info : pas de date, épinglée, avec une date d'expiration", async ({ page }) => {
  const db = await member(page, ALICE, "/evenements/nouveau");
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  await page.getByLabel("Nom de l'évènement").fill("Travaux dans le hall");
  await page.getByLabel("Catégorie").selectOption("info");
  await expect(page.getByLabel("Date", { exact: true })).toHaveCount(0);
  await page.getByLabel("Épinglée").check();
  await page.getByLabel("Visible jusqu'au").fill("2026-11-30");
  await page.getByLabel("Description").fill("Entrée par le côté.");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Travaux dans le hall" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({ type: "info", date: "", epingle: true, expiresAt: "2026-11-30", inscriptionOuverte: false });
});

test("modifier : l'organisateur change le lieu, sans toucher au compteur", async ({ page }) => {
  const db = await member(page, STEPH, "/evenements/foot");
  await page.getByRole("link", { name: "Modifier" }).click();
  await expect(page.getByLabel("Nom de l'évènement")).toHaveValue("Foot au parc");
  await page.getByLabel("Lieu").fill("Stade Charléty");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Stade Charléty")).toBeVisible();
  const write = db.writes.find((w) => w.method === "PATCH" && w.path === "evenements/foot");
  expect(write?.data.lieu).toBe("Stade Charléty");
  expect(write?.data).not.toHaveProperty("inscrits");
  expect(db.doc("evenements/foot")?.inscrits).toBe(4);
});

test("dupliquer : formulaire pré-rempli sans date, nouvel évènement écrit avec un compteur à zéro", async ({ page }) => {
  const db = await member(page, ALICE, "/evenements/culte-noel");
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  await page.getByRole("link", { name: "Dupliquer" }).click();
  await expect(page.getByLabel("Nom de l'évènement")).toHaveValue("Culte de Noël");
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("");
  await page.getByLabel("Date", { exact: true }).fill("2027-12-24");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Culte de Noël" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({ titre: "Culte de Noël", type: "eglise", date: "2027-12-24", inscrits: 0, organisateurUid: "uid-alice" });
});

test("supprimer : l'organisateur confirme, la fiche disparaît", async ({ page }) => {
  const db = await member(page, STEPH, "/evenements/foot");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/evenements\/?$/);
  expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("evenements/foot");
});

test("droits : un autre membre n'a ni Modifier, ni Dupliquer, ni Supprimer", async ({ page }) => {
  await member(page, JO, "/evenements/foot");
  await expect(page.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Dupliquer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Supprimer" })).toHaveCount(0);
});

test("route de push à la création : refusée sans jeton", async ({ request }) => {
  const res = await request.post("/api/push/notify-evenement", { data: { evenementId: "foot" } });
  expect(res.status()).toBe(401);
});

// ─── Tranche E3 : inscriptions ───────────────────────────────────────────────

const INSCRIPTION = "**/api/evenements/inscription";
const DESINSCRIPTION = "**/api/evenements/desinscription";
const MA_PLACE = { uid: "uid-jo", nom: "Jo L.", invites: 1, createdAt: "2026-09-21T10:00:00Z" };

test("refus d'inscription : fermée, commencée, complète, sinon acceptée", () => {
  const now = "2026-10-01T10:00";
  expect(refusInscription(FOOT, 0, now)).toBeNull();
  expect(refusInscription({ ...FOOT, inscriptionOuverte: false }, 0, now)).toBe("fermee");
  expect(refusInscription(FOOT, 0, "2026-10-10T19:00")).toBe("commencee");
  expect(refusInscription(FOOT, 5, now)).toBeNull();
  expect(refusInscription(FOOT, 6, now)).toBe("complet");
  expect(refusInscription({ ...FOOT, inscrits: 10 }, 0, now)).toBe("complet");
  expect(refusInscription(PAIX, 5, now)).toBeNull();
  expect(refusInscription(INFO, 0, now)).toBe("fermee");
});

test("membre : « S'inscrire » puis invités et « Confirmer » envoie au serveur avec son jeton, puis affiche « Inscrit »", async ({ page }) => {
  await member(page, JO, "/evenements/foot");
  let sent: { body: { evenementId: string; invites: number }; auth?: string } | null = null;
  await page.route(INSCRIPTION, (route) => {
    sent = { body: route.request().postDataJSON(), auth: route.request().headers()["authorization"] };
    return route.fulfill({ json: { ok: true, inscrits: 7, mine: { id: "uid-jo", nom: "Jo L.", invites: 2 } } });
  });
  await page.getByRole("button", { name: "S'inscrire" }).click();
  await page.getByLabel("Invités").selectOption("2");
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Inscrit", { exact: true })).toBeVisible();
  await expect(page.getByText("2 invités")).toBeVisible();
  await expect(page.getByText("3 places restantes")).toBeVisible();
  await expect(page.getByRole("button", { name: "Me désinscrire" })).toBeVisible();
  expect(sent!.auth).toMatch(/^Bearer /);
  expect(sent!.body).toEqual({ evenementId: "foot", invites: 2 });
});

test("membre déjà inscrit : voit sa place et se désinscrit", async ({ page }) => {
  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot/inscriptions/uid-jo": MA_PLACE });
  let sent: { evenementId: string } | null = null;
  await page.route(DESINSCRIPTION, (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true, inscrits: 2 } });
  });
  await expect(page.getByText("Inscrit", { exact: true })).toBeVisible();
  await expect(page.getByText("1 invité")).toBeVisible();
  await page.getByRole("button", { name: "Me désinscrire" }).click();
  await expect(page.getByRole("button", { name: "S'inscrire" })).toBeVisible();
  await expect(page.getByText("8 places restantes")).toBeVisible();
  expect(sent).toEqual({ evenementId: "foot" });
});

test("sans compte, autorisé : nom + invités, envoyé sans jeton, confirmation affichée", async ({ page }) => {
  await visitor(page, "/evenements/foot");
  let sent: { body: { evenementId: string; nom: string; invites: number }; auth?: string } | null = null;
  await page.route(INSCRIPTION, (route) => {
    sent = { body: route.request().postDataJSON(), auth: route.request().headers()["authorization"] };
    return route.fulfill({ json: { ok: true, inscrits: 6, mine: { id: "x1", nom: "Marie", invites: 1 } } });
  });
  await page.getByRole("button", { name: "S'inscrire" }).click();
  await page.getByLabel("Ton nom").fill("Marie");
  await page.getByLabel("Invités").selectOption("1");
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByText("Inscription enregistrée")).toBeVisible();
  await expect(page.getByText("4 places restantes")).toBeVisible();
  expect(sent!.auth).toBeUndefined();
  expect(sent!.body).toEqual({ evenementId: "foot", nom: "Marie", invites: 1 });
});

test("sans compte, non autorisé : pas de formulaire, invitation à se connecter", async ({ page }) => {
  await visitor(page, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, sansCompte: false } });
  await expect(page.getByLabel("Ton nom")).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: "Connexion" })).toBeVisible();
});

test("complet : ni bouton ni formulaire", async ({ page }) => {
  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, inscrits: 10 } });
  await expect(page.getByText("Complet")).toBeVisible();
  await expect(page.getByRole("button", { name: "S'inscrire" })).toHaveCount(0);
});

test("fermées ou commencées : « Inscriptions fermées », sans bouton", async ({ page }) => {
  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, inscriptionOuverte: false } });
  await expect(page.getByText("Inscriptions fermées")).toBeVisible();
  await expect(page.getByRole("button", { name: "S'inscrire" })).toHaveCount(0);
  await page.clock.setFixedTime(new Date("2026-10-10T19:30:00"));
  await page.reload();
  await expect(page.getByText("Inscriptions fermées")).toBeVisible();
});

test("organisateur : liste des inscrits avec invités, retrait, fermeture des inscriptions", async ({ page }) => {
  const db = await member(page, STEPH, "/evenements/foot", {
    ...DOCS,
    "evenements/foot/inscriptions/uid-jo": MA_PLACE,
    "evenements/foot/inscriptions/x1": { uid: null, nom: "Marie", invites: 0, createdAt: "2026-09-22T10:00:00Z" },
  });
  let sent: { evenementId: string; inscriptionId?: string } | null = null;
  await page.route(DESINSCRIPTION, (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true, inscrits: 2 } });
  });
  await page.getByRole("button", { name: "Voir les inscrits (2)" }).click();
  const liste = page.getByRole("list", { name: "Inscrits" });
  await expect(liste.getByRole("listitem")).toHaveCount(2);
  await expect(liste).toContainText("Jo L.");
  await expect(liste).toContainText("Marie");
  page.on("dialog", (d) => d.accept());
  await liste.getByRole("listitem").filter({ hasText: "Marie" }).getByRole("button", { name: "Retirer" }).click();
  await expect(liste.getByRole("listitem")).toHaveCount(1);
  expect(sent).toEqual({ evenementId: "foot", inscriptionId: "x1" });
  await page.getByRole("button", { name: "Fermer les inscriptions" }).click();
  await expect(page.getByRole("button", { name: "Ouvrir les inscriptions" })).toBeVisible();
  expect(db.doc("evenements/foot")?.inscriptionOuverte).toBe(false);
});

test("membre : aucun nom d'inscrit visible", async ({ page }) => {
  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot/inscriptions/x1": { uid: null, nom: "Marie", invites: 0, createdAt: "2026-09-22T10:00:00Z" } });
  await expect(page.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(page.getByText("Marie")).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Inscrits" })).toHaveCount(0);
});

test("routes d'inscription : refusées sans jeton ni nom", async ({ request }) => {
  const a = await request.post("/api/evenements/inscription", { data: { evenementId: "foot", invites: 0 } });
  expect(a.status()).toBe(401);
  const b = await request.post("/api/evenements/desinscription", { data: { evenementId: "foot" } });
  expect(b.status()).toBe(401);
});

// ─── Tranche E4 : fusion des annonces, cloche, QR code, rappel de la veille ──

const TIM: FakeProfile = { uid: "uid-tim", email: "tc328829@gmail.com", firstName: "Timothée", lastName: "C." };

test("rappel de la veille : message en français et en 中文", () => {
  const e = { ...FOOT, id: "foot" };
  expect(evenementReminder(e, "fr")).toEqual({ title: "Rappel — Foot au parc", body: "Demain : Foot au parc à 19:00, Parc de Bercy" });
  expect(evenementReminder({ ...e, heure: "", lieu: "" }, "fr").body).toBe("Demain : Foot au parc");
  expect(evenementReminder(e, "zh-CN")).toEqual({ title: "提醒 — Foot au parc", body: "明天：Foot au parc 19:00，Parc de Bercy" });
});

test("annonces : l'ancienne adresse redirige vers le calendrier et le menu n'a plus d'entrée Annonces", async ({ page }) => {
  await member(page, JO, "/evenements");
  await expect(page.getByRole("link", { name: "Annonces", exact: true })).toHaveCount(0);
  await page.goto("/annonces");
  await expect(page).toHaveURL(/\/evenements\/?$/);
});

test("cloche : un nouvel évènement d'une autre personne apparaît comme non lu, avec sa sorte", async ({ page }) => {
  await member(page, JO, "/evenements", { "evenements/foot": FOOT });
  const cloche = page.getByRole("button", { name: /notification/i });
  await expect(cloche).toContainText("1");
  await cloche.click();
  await expect(page.getByRole("menuitem", { name: /Foot au parc/ })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /Foot au parc/ })).toContainText("Évènement");
});

test("QR code : l'organisateur voit le QR de sa fiche à côté du lien", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot");
  const qr = page.getByRole("img", { name: /QR code/ });
  await expect(qr).toBeVisible();
  await expect(qr).toHaveAttribute("src", /^data:image\/png/);
  await expect(page.getByText(/\/evenements\/foot/)).toBeVisible();
});

// 16/09/2026 : plus de QR code sur l'onglet Évènements (demande de Timothée).
test("QR code : aucun bouton sur le calendrier, même pour la coordination", async ({ page }) => {
  await member(page, ALICE, "/evenements");
  await expect(page.getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
  await expect(page.getByRole("button", { name: "QR code" })).toHaveCount(0);
});

test("QR code : un simple membre n'a pas le bouton", async ({ page }) => {
  await member(page, JO, "/evenements/foot");
  await expect(page.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/ })).toHaveCount(0);
});

test("migration : l'admin lance la migration des annonces depuis l'administration", async ({ page }) => {
  await member(page, TIM, "/admin");
  let called: string | undefined;
  await page.route("**/api/admin/migrer-annonces", (route) => {
    called = route.request().headers()["authorization"];
    return route.fulfill({ json: { ok: true, migrated: 3, skipped: 1 } });
  });
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Inscriptions", exact: true }).click();
  await page.getByRole("button", { name: "Migrer les annonces vers le calendrier" }).click();
  await expect(page.getByText("3 annonces migrées")).toBeVisible();
  expect(called).toMatch(/^Bearer /);
});

test("route de migration : refusée sans jeton", async ({ request }) => {
  const res = await request.post("/api/admin/migrer-annonces");
  expect(res.status()).toBe(401);
});

// ─── Lot 6 bis : look de la maquette de Timothée (16/09/2026, spec-evenements-look.md) ──

test("L1 calendrier : la carte porte l'état d'inscription, sans badge de type ni de public ; « S'inscrire » ouvre la fiche", async ({ page }) => {
  await member(page, JO, "/evenements", {
    ...DOCS,
    "evenements/foot/inscriptions/uid-jo": MA_PLACE,
    "evenements/culte-noel": { ...CULTE_NOEL, inscriptionOuverte: true, placesMax: 10, inscrits: 10 },
  });
  const foot = page.getByRole("link", { name: /Foot au parc/ });
  await expect(foot).toContainText("Inscrit");
  await expect(foot).not.toContainText("Sport");
  await expect(foot).not.toContainText("Toute l'église");
  await expect(foot).toContainText("19:00");
  await expect(foot).toContainText("Parc de Bercy");
  await expect(page.getByRole("link", { name: /Culte de Noël/ })).toContainText("Complet");
  const paix = page.getByRole("link", { name: /Repas Groupe Paix/ });
  await expect(paix).toContainText("S'inscrire");
  await paix.click();
  await expect(page).toHaveURL(/\/evenements\/paix\/?$/);
});

test("L1 calendrier sans compte : « S'inscrire » sur les cartes ouvertes, rien sur une info", async ({ page }) => {
  await visitor(page, "/evenements");
  await expect(page.getByRole("link", { name: /Foot au parc/ })).toContainText("S'inscrire");
  await expect(page.getByRole("link", { name: /Nouveau parking/ })).not.toContainText("S'inscrire");
});

test("L2 fiche : bannière, lignes date · horaire · lieu, « Pour plus d'infos », bouton plein « S'inscrire », invités derrière, compteur", async ({ page }) => {
  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, heureFin: "21:00", images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="], contact: "Steph 06 00 00 00 00" } });
  await expect(page.getByRole("img", { name: "Foot au parc" })).toBeVisible();
  await expect(page.getByText("19:00 – 21:00")).toBeVisible();
  await expect(page.getByText("Pour plus d'infos : Steph 06 00 00 00 00")).toBeVisible();
  await expect(page.getByText("4 déjà inscrits")).toBeVisible();
  await expect(page.getByLabel("Invités")).toHaveCount(0);
  const sinscrire = page.getByRole("button", { name: "S'inscrire" });
  const box = (await sinscrire.boundingBox())!;
  expect(box.height, "bouton plein, haut").toBeGreaterThanOrEqual(44);
  await sinscrire.click();
  await expect(page.getByLabel("Invités")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmer" })).toBeVisible();
  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByLabel("Invités")).toHaveCount(0);
});

test("L3 organisateur : panneau des inscriptions avec compteur et état, lien de la fiche avec QR visible, inscrits repliés", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot", {
    ...DOCS,
    "evenements/foot/inscriptions/uid-jo": MA_PLACE,
    "evenements/foot/inscriptions/x1": { uid: null, nom: "Marie", invites: 0, createdAt: "2026-09-22T10:00:00Z" },
  });
  await expect(page.getByRole("link", { name: "Modifier" })).toBeVisible();
  const panneau = page.getByRole("region", { name: "Inscriptions", exact: true });
  await expect(panneau).toContainText("Ouvertes");
  await expect(panneau.getByText("4", { exact: true })).toBeVisible();
  const qr = page.getByRole("img", { name: /QR code/ });
  await expect(qr).toBeVisible();
  await expect(qr).toHaveAttribute("src", /^data:image\/png/);
  await expect(page.getByText("Lien de la fiche")).toBeVisible();
  await expect(page.getByText(/\/evenements\/foot/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Inscrits" })).toHaveCount(0);
  await page.getByRole("button", { name: "Voir les inscrits (2)" }).click();
  await expect(page.getByRole("list", { name: "Inscrits" })).toBeVisible();
  await page.getByRole("button", { name: "Fermer les inscriptions" }).click();
  await expect(panneau).toContainText("Fermées");
});

test("L4 formulaire : champs courants dans l'ordre de la maquette, responsable pré-rempli, bannière, champs rares sous « Plus d'options »", async ({ page }) => {
  await member(page, ALICE, "/evenements/nouveau");
  await page.getByLabel("Nom de l'évènement").waitFor();
  const labels = await page.locator("form label[for]").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
  expect(labels.slice(0, 8)).toEqual(["Nom de l'évènement", "Catégorie", "Public", "Date", "Horaire", "Lieu", "Responsable", "Description"]);
  await expect(page.getByLabel("Responsable")).toHaveValue("Alice Q.");
  await expect(page.getByText("Ajouter une bannière")).toBeVisible();
  await expect(page.getByLabel("Inscriptions ouvertes")).toBeChecked();
  await expect(page.getByLabel("Heure de fin")).toBeHidden();
  await expect(page.getByLabel("Places")).toBeHidden();
  await page.getByText("Plus d'options").click();
  await expect(page.getByLabel("Heure de fin")).toBeVisible();
  await expect(page.getByLabel("Places")).toBeVisible();
  await expect(page.getByLabel("Les personnes sans compte peuvent s'inscrire")).toBeVisible();
});

// ─── L6 : même carte blanche partout (ordinateur, téléphone, tablette) ──────

const BLANC = "rgb(255, 255, 255)";

test("L6 fiche : tout le contenu dans une carte blanche, zone d'attente quand il n'y a pas de bannière", async ({ page }) => {
  await member(page, JO, "/evenements/paix");
  const carte = page.getByTestId("fiche-carte");
  await expect(carte).toBeVisible();
  expect(await carte.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(BLANC);
  await expect(carte.getByTestId("banniere")).toBeVisible();
  await expect(carte.getByRole("heading", { name: "Repas Groupe Paix" })).toBeVisible();
  await expect(carte.getByText("Parc de Bercy")).toBeVisible();
  await expect(carte.getByRole("button", { name: "S'inscrire" })).toBeVisible();
});

test("L6 fiche : la bannière montre l'image quand il y en a une", async ({ page }) => {
  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, images: [PIXEL] } });
  await expect(page.getByTestId("banniere").getByRole("img", { name: "Foot au parc" })).toBeVisible();
});

test("L6 formulaire : champs, bannière et interrupteur dans une seule carte blanche", async ({ page }) => {
  await member(page, ALICE, "/evenements/nouveau");
  const carte = page.getByTestId("form-carte");
  await expect(carte).toBeVisible();
  expect(await carte.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(BLANC);
  await expect(carte.getByLabel("Nom de l'évènement")).toBeVisible();
  await expect(carte.getByText("Ajouter une bannière")).toBeVisible();
  await expect(carte.getByLabel("Inscriptions ouvertes")).toBeVisible();
  await expect(carte.getByText("Plus d'options")).toBeVisible();
});

test("L6 organisateur : le compteur n'est écrit qu'une fois", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot", { ...DOCS, "evenements/foot/inscriptions/uid-jo": MA_PLACE });
  await expect(page.getByRole("region", { name: "Inscriptions", exact: true })).toBeVisible();
  await expect(page.getByText(/déjà inscrits/)).toHaveCount(0);
});

