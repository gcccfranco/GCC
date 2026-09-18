import { expect, test, type Page } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { groupByMonth, isPast, modeInscriptions, placesRestantes, refusInscription } from "../src/lib/evenements/agenda";
import type { Evenement } from "../src/types/evenement";
import { avecLignes, evenementReminder, ligneOuverture, ouvertureDuJour, ouverturesTitre } from "../src/lib/evenements/rappel";
import { canSeeInscrits } from "../src/lib/access";

// Lot 6 (docs/spec-evenements.md), tranche E1 : calendrier public de la section
// Évènements (agenda par mois, infos épinglées, passés), fiche en lecture,
// onglets « Calendrier » (tous) et programme de scène (connectés).

const base: Omit<Evenement, "id" | "titre"> = {
  type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "", dateFin: "", lieu: "Parc de Bercy",
  description: "Match amical, venez nombreux.", liens: [], images: [], placesMax: 10, inscriptionOuverte: true, sansCompte: true, lienExterne: "",
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
    placesMax: 20, inscriptions: "auto", inscriptionDebut: "", inscriptionFin: "", inscrits: 0, organisateurUid: "uid-alice", organisateurNom: "Alice Q.",
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
  expect(created?.data).toMatchObject({ type: "info", date: "", epingle: true, expiresAt: "2026-11-30", inscriptions: "fermees" });
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

// ─── Période d'inscription (docs/spec-inscriptions-periode.md, 17/09/2026) ──

test("période P1 : pas encore avant l'ouverture, ouvertes pendant, terminées après la fin", () => {
  const e = { ...FOOT, inscriptions: "auto" as const, inscriptionDebut: "2026-10-01T10:00", inscriptionFin: "2026-10-05T18:00" };
  expect(refusInscription(e, 0, "2026-10-01T09:59")).toBe("pasEncore");
  expect(refusInscription(e, 0, "2026-10-01T10:00")).toBeNull();
  expect(refusInscription(e, 0, "2026-10-05T18:00")).toBeNull();
  expect(refusInscription(e, 0, "2026-10-05T18:01")).toBe("terminee");
});

test("période P1 : sans heure, ouverture à 00:00 et fin à 23:59 ; sans fin, fermeture au début de l'évènement", () => {
  const e = { ...FOOT, inscriptions: "auto" as const, inscriptionDebut: "2026-10-01", inscriptionFin: "2026-10-05" };
  expect(refusInscription(e, 0, "2026-09-30T23:59")).toBe("pasEncore");
  expect(refusInscription(e, 0, "2026-10-01T00:00")).toBeNull();
  expect(refusInscription(e, 0, "2026-10-05T23:59")).toBeNull();
  expect(refusInscription(e, 0, "2026-10-06T00:00")).toBe("terminee");
  const sansFin = { ...e, inscriptionFin: "" };
  expect(refusInscription(sansFin, 0, "2026-10-10T18:59")).toBeNull();
  expect(refusInscription(sansFin, 0, "2026-10-10T19:00")).toBe("commencee");
});

test("période P1 : « Ouvertes » forcées hors dates et après le début, jamais au-delà des places ; « Fermées » forcées", () => {
  const forcees = { ...FOOT, inscriptions: "ouvertes" as const, inscriptionDebut: "2026-12-01", inscriptionFin: "2026-12-02" };
  expect(refusInscription(forcees, 0, "2026-10-01T10:00")).toBeNull();
  expect(refusInscription(forcees, 0, "2026-10-10T20:00")).toBeNull();
  expect(refusInscription({ ...forcees, inscrits: 10 }, 0, "2026-10-10T20:00")).toBe("complet");
  expect(refusInscription({ ...FOOT, inscriptions: "fermees" as const }, 0, "2026-10-01T10:00")).toBe("fermee");
});

test("période P1 : un évènement d'avant la période se lit avec l'ancien interrupteur", () => {
  expect(modeInscriptions({ inscriptionOuverte: true })).toBe("auto");
  expect(modeInscriptions({ inscriptionOuverte: false })).toBe("fermees");
  expect(modeInscriptions({ inscriptionOuverte: false, inscriptions: "ouvertes" })).toBe("ouvertes");
  expect(refusInscription({ ...FOOT, inscriptionOuverte: true }, 0, "2026-10-01T10:00")).toBeNull();
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
  await page.getByRole("region", { name: "Inscriptions", exact: true }).getByRole("radio", { name: "Fermées" }).click();
  await expect(page.getByTestId("etat-inscriptions")).toHaveText("Fermées");
  await expect.poll(() => db.doc("evenements/foot")?.inscriptions).toBe("fermees");
});

// 17/09/2026 (Timothée) : les noms des inscrits sont visibles de tout membre
// connecté, plus seulement de l'organisateur ; sans compte, le nombre seul.
test("membre connecté : voit qui est inscrit, avec les invités, sans pouvoir retirer personne", async ({ page }) => {
  await member(page, EVA, "/evenements/foot", {
    ...DOCS,
    "evenements/foot/inscriptions/uid-jo": MA_PLACE,
    "evenements/foot/inscriptions/x1": { uid: null, nom: "Marie", invites: 0, createdAt: "2026-09-22T10:00:00Z" },
  });
  await expect(page.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(page.getByText("4 déjà inscrits")).toBeVisible();
  await page.getByRole("button", { name: "Voir les inscrits (2)" }).click();
  const liste = page.getByRole("list", { name: "Inscrits" });
  await expect(liste.getByRole("listitem")).toHaveCount(2);
  await expect(liste).toContainText("Jo L.");
  await expect(liste).toContainText("1 invité");
  await expect(liste).toContainText("Marie");
  await expect(liste.getByRole("button", { name: "Retirer" })).toHaveCount(0);
});

test("droits : voir les inscrits = être connecté ; les modifier = organisateur ou coordination", () => {
  expect(canSeeInscrits(null)).toBe(false);
  expect(canSeeInscrits({ uid: "uid-eva", email: "eva@example.com" })).toBe(true);
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

test("L1 calendrier : la carte porte l'état d'inscription ; « S'inscrire » ouvre la fiche", async ({ page }) => {
  await member(page, JO, "/evenements", {
    ...DOCS,
    "evenements/foot/inscriptions/uid-jo": MA_PLACE,
    "evenements/culte-noel": { ...CULTE_NOEL, inscriptionOuverte: true, placesMax: 10, inscrits: 10 },
  });
  const foot = page.getByRole("link", { name: /Foot au parc/ });
  await expect(foot).toContainText("Inscrit");
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
  await expect(panneau.getByTestId("etat-inscriptions")).toHaveText("Ouvertes");
  await expect(panneau.getByText("4", { exact: true })).toBeVisible();
  const qr = page.getByRole("img", { name: /QR code/ });
  await expect(qr).toBeVisible();
  await expect(qr).toHaveAttribute("src", /^data:image\/png/);
  await expect(page.getByText("Lien d'inscription")).toBeVisible();
  await expect(page.getByText(/\/evenements\/foot/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Inscrits" })).toHaveCount(0);
  await page.getByRole("button", { name: "Voir les inscrits (2)" }).click();
  await expect(page.getByRole("list", { name: "Inscrits" })).toBeVisible();
  await panneau.getByRole("radio", { name: "Fermées" }).click();
  await expect(panneau.getByTestId("etat-inscriptions")).toHaveText("Fermées");
});

test("L4 formulaire : champs courants dans l'ordre de la maquette, responsable pré-rempli, bannière, champs rares sous « Plus d'options »", async ({ page }) => {
  await member(page, ALICE, "/evenements/nouveau");
  await page.getByLabel("Nom de l'évènement").waitFor();
  const labels = await page.locator("form label[for]").evaluateAll((els) => els.map((el) => el.textContent?.trim()));
  expect(labels.slice(0, 8)).toEqual(["Nom de l'évènement", "Catégorie", "Public", "Date", "Horaire", "Lieu", "Responsable", "Description"]);
  await expect(page.getByLabel("Responsable")).toHaveValue("Alice Q.");
  await expect(page.getByText("Ajouter une bannière")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Automatique" })).toBeChecked();
  await expect(page.getByLabel("Fin de l'évènement (heure)")).toBeHidden();
  await expect(page.getByLabel("Places")).toBeHidden();
  await page.getByText("Plus d'options").click();
  await expect(page.getByLabel("Fin de l'évènement (heure)")).toBeVisible();
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
  await expect(carte.getByRole("radiogroup", { name: "Inscriptions" })).toBeVisible();
  await expect(carte.getByText("Plus d'options")).toBeVisible();
});

test("L6 organisateur : le compteur n'est écrit qu'une fois", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot", { ...DOCS, "evenements/foot/inscriptions/uid-jo": MA_PLACE });
  await expect(page.getByRole("region", { name: "Inscriptions", exact: true })).toBeVisible();
  await expect(page.getByText(/déjà inscrits/)).toHaveCount(0);
});


// ─── Retour de Timothée du 17/09/2026 : la maquette organisateur, et le créateur s'inscrit ──
// Fiche de l'organisateur : carte de gestion en haut (titre, badges, trois
// pilules, panneau des inscriptions, lien d'inscription), puis la fiche des
// membres sans répéter titre ni badges, avec « S'inscrire » (choix du 17/09/2026).

test("organisateur : carte de gestion en haut (titre, pilules, panneau, lien), puis la fiche avec « S'inscrire »", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot");
  const gestion = page.getByTestId("gestion-carte");
  const fiche = page.getByTestId("fiche-carte");
  await expect(gestion.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(gestion.getByText("Sport")).toBeVisible();
  for (const action of ["Modifier", "Dupliquer", "Supprimer"]) {
    await expect(gestion.getByRole(action === "Supprimer" ? "button" : "link", { name: action })).toBeVisible();
  }
  await expect(gestion.getByRole("region", { name: "Inscriptions", exact: true })).toContainText("Ouvertes");
  await expect(gestion.getByText("Lien d'inscription")).toBeVisible();
  await expect(gestion.getByRole("img", { name: /QR code/ })).toBeVisible();

  await expect(fiche.getByRole("button", { name: "S'inscrire" })).toBeVisible();
  await expect(fiche.getByTestId("banniere")).toBeVisible();
  await expect(fiche.getByRole("heading")).toHaveCount(0);
  const [g, f] = [(await gestion.boundingBox())!, (await fiche.boundingBox())!];
  expect(g.y + g.height, "la gestion est au-dessus de la fiche").toBeLessThanOrEqual(f.y);
});

test("organisateur : « Supprimer » est une pilule à bord, comme « Modifier » et « Dupliquer »", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot");
  const bord = (name: string, role: "link" | "button") =>
    page.getByTestId("gestion-carte").getByRole(role, { name }).evaluate((el) => getComputedStyle(el).borderTopWidth);
  expect(await bord("Modifier", "link")).toBe("1px");
  expect(await bord("Supprimer", "button")).toBe("1px");
});

test("le créateur s'inscrit à son propre évènement", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot");
  let sent: { evenementId: string; invites: number } | null = null;
  await page.route(INSCRIPTION, (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true, inscrits: 5, mine: { id: "uid-steph", nom: "Steph R.", invites: 0 } } });
  });
  await page.getByTestId("fiche-carte").getByRole("button", { name: "S'inscrire" }).click();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByTestId("fiche-carte").getByText("Inscrit", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Inscriptions", exact: true }).getByText("5", { exact: true })).toBeVisible();
  expect(sent).toEqual({ evenementId: "foot", invites: 0 });
});

test("évènement commencé : l'organisateur lit « Fermées » et pourquoi ; « Ouvertes » les rouvre (places respectées)", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-10T20:00:00"));
  const db = await signInAs(page, STEPH, DOCS, "/evenements/foot");
  const panneau = page.getByRole("region", { name: "Inscriptions", exact: true });
  await expect(panneau.getByTestId("etat-inscriptions")).toHaveText("Fermées");
  await expect(panneau).toContainText("Inscriptions fermées : l'évènement a commencé");
  await expect(panneau.getByRole("radio", { name: "Automatique" })).toHaveAttribute("aria-checked", "true");
  await panneau.getByRole("radio", { name: "Ouvertes" }).click();
  await expect(panneau.getByTestId("etat-inscriptions")).toHaveText("Ouvertes");
  await expect(page.getByTestId("fiche-carte").getByRole("button", { name: "S'inscrire" })).toBeVisible();
  await expect.poll(() => db.doc("evenements/foot")?.inscriptions).toBe("ouvertes");
});

test("calendrier : « Inscrit » s'écrit sous l'heure et le lieu, comme la maquette", async ({ page }) => {
  await member(page, JO, "/evenements", { ...DOCS, "evenements/foot/inscriptions/uid-jo": MA_PLACE });
  const carte = page.getByRole("link", { name: /Foot au parc/ });
  const [meta, badge] = [(await carte.getByText(/Parc de Bercy/).boundingBox())!, (await carte.getByText("Inscrit", { exact: true }).boundingBox())!];
  expect(badge.y, "sous la ligne heure · lieu").toBeGreaterThanOrEqual(meta.y + meta.height - 1);
});

test("fiche : la date n'est pas en gras", async ({ page }) => {
  await member(page, JO, "/evenements/foot");
  const poids = await page.getByText("samedi 10 octobre 2026").evaluate((el) => Number(getComputedStyle(el).fontWeight));
  expect(poids).toBeLessThan(600);
});

test("formulaire : libellés discrets, « Prévenir les membres » et le bouton pleine largeur dans la carte", async ({ page }) => {
  await member(page, ALICE, "/evenements/nouveau");
  const carte = page.getByTestId("form-carte");
  const poids = await carte.locator("label[for='ev-titre']").evaluate((el) => Number(getComputedStyle(el).fontWeight));
  expect(poids).toBeLessThan(600);
  await expect(carte.getByLabel("Prévenir les membres")).toBeVisible();
  const bouton = carte.getByRole("button", { name: "Créer l'évènement" });
  await expect(bouton).toBeVisible();
  const [c, b] = [(await carte.boundingBox())!, (await bouton.boundingBox())!];
  expect(b.width, "pleine largeur").toBeGreaterThan(c.width * 0.8);
  const [lieu, type] = [carte.locator("#ev-lieu"), carte.locator("#ev-type")];
  const fond = (l: typeof lieu) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await fond(type), "listes et champs au même style").toBe(await fond(lieu));
});

// ─── 17/09/2026 : l'onglet Évènements montre une grande carte par évènement ──
// Maquette de Timothée (图片_20260916093643_1235_30.jpg) : bannière, badges,
// titre, date · horaire · lieu, « Pour plus d'infos », « S'inscrire »,
// « N déjà inscrits ». Infos épinglées et évènements passés restent compacts.

test("calendrier : un évènement à venir est une grande carte comme la maquette", async ({ page }) => {
  await member(page, JO, "/evenements", { ...DOCS, "evenements/foot": { ...FOOT, heureFin: "21:00", contact: "Steph R." } });
  const carte = page.getByRole("link", { name: /Foot au parc/ });
  await expect(carte.getByTestId("banniere")).toBeVisible();
  for (const texte of ["Sport", "Toute l'église", "samedi 10 octobre 2026", "19:00 – 21:00", "Parc de Bercy", "Pour plus d'infos : Steph R.", "S'inscrire", "4 déjà inscrits"]) {
    await expect(carte).toContainText(texte);
  }
  const [titre, date, bouton, compteur] = await Promise.all(
    [carte.getByText("Foot au parc"), carte.getByText("samedi 10 octobre 2026"), carte.getByText("S'inscrire"), carte.getByText("4 déjà inscrits")].map(async (l) => (await l.boundingBox())!.y),
  );
  expect(titre, "titre, puis date").toBeLessThan(date);
  expect(date, "date, puis bouton").toBeLessThan(bouton);
  expect(bouton, "bouton, puis compteur").toBeLessThan(compteur);
  const box = (await carte.getByText("S'inscrire").boundingBox())!;
  const cadre = (await carte.boundingBox())!;
  expect(box.width, "« S'inscrire » sur toute la largeur").toBeGreaterThan(cadre.width * 0.7);
});

test("calendrier : une info épinglée et un évènement passé restent sur une ligne compacte", async ({ page }) => {
  await member(page, JO, "/evenements");
  await expect(page.getByRole("link", { name: /Nouveau parking/ }).getByTestId("banniere")).toHaveCount(0);
  await page.getByRole("button", { name: "Évènements passés" }).click();
  await expect(page.getByRole("link", { name: /Pique-nique de rentrée/ }).getByTestId("banniere")).toHaveCount(0);
});

test("calendrier : une réunion de pôle n'a ni « S'inscrire » ni compteur", async ({ page }) => {
  const reunion = { ...FOOT, titre: "Réunion DA", pour: "pole:da", placesMax: null, inscriptionOuverte: false, inscrits: 0 };
  await member(page, { ...JO, poles: ["da"] }, "/evenements", { ...DOCS, "evenements/reunion": reunion });
  const carte = page.getByRole("link", { name: /Réunion DA/ });
  await expect(carte).toContainText("Parc de Bercy");
  await expect(carte).not.toContainText("S'inscrire");
  await expect(carte).not.toContainText("déjà inscrit");
});

test("période P2 : le formulaire écrit l'ouverture et la fin des inscriptions (heure facultative)", async ({ page }) => {
  const db = await member(page, ALICE, "/evenements/nouveau");
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  await page.getByLabel("Nom de l'évènement").fill("Retraite");
  await page.getByLabel("Date", { exact: true }).fill("2026-11-14");
  await expect(page.getByText("Vide : dès la publication")).toBeVisible();
  await expect(page.getByText("Vide : au début de l'évènement")).toBeVisible();
  await page.getByLabel("Ouverture des inscriptions", { exact: true }).fill("2026-10-05");
  await page.getByLabel("Heure d'ouverture des inscriptions").fill("10:00");
  await page.getByLabel("Fin des inscriptions", { exact: true }).fill("2026-11-08");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Retraite" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({ inscriptions: "auto", inscriptionDebut: "2026-10-05T10:00", inscriptionFin: "2026-11-08" });
  expect(created?.data).not.toHaveProperty("inscriptionOuverte");
});

test("période P2 : forcer « Ouvertes » cache les dates ; une fin avant l'ouverture est refusée", async ({ page }) => {
  const db = await member(page, ALICE, "/evenements/nouveau");
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  await page.getByLabel("Nom de l'évènement").fill("Soirée louange");
  await page.getByLabel("Date", { exact: true }).fill("2026-11-14");
  await page.getByLabel("Ouverture des inscriptions", { exact: true }).fill("2026-11-10");
  await page.getByLabel("Fin des inscriptions", { exact: true }).fill("2026-11-01");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByText("La fin des inscriptions est avant leur ouverture.")).toBeVisible();
  await page.getByRole("radio", { name: "Ouvertes" }).check();
  await expect(page.getByLabel("Ouverture des inscriptions", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await expect(page.getByRole("heading", { name: "Soirée louange" })).toBeVisible();
  const created = db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"));
  expect(created?.data).toMatchObject({ inscriptions: "ouvertes", inscriptionDebut: "", inscriptionFin: "" });
});

// P3 : la page dit toujours pourquoi on ne peut pas s'inscrire.
const PAS_ENCORE = { ...FOOT, inscriptions: "auto", inscriptionDebut: "2026-10-05T10:00", inscriptionFin: "" };

test("période P3 : la fiche dit pourquoi — pas encore, closes, commencé, fermées par l'organisateur", async ({ page }) => {
  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot": PAS_ENCORE });
  const fiche = page.getByTestId("fiche-carte");
  await expect(fiche).toContainText(/Inscriptions à partir du lundi 5 octobre 2026 à 10:00/);
  await expect(fiche.getByRole("button", { name: "S'inscrire" })).toHaveCount(0);

  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, inscriptions: "auto", inscriptionFin: "2026-09-30" } });
  await expect(page.getByTestId("fiche-carte")).toContainText(/Inscriptions closes le mercredi 30 septembre 2026/);

  await member(page, JO, "/evenements/foot", { ...DOCS, "evenements/foot": { ...FOOT, inscriptions: "fermees" } });
  await expect(page.getByTestId("fiche-carte")).toContainText("Inscriptions fermées par l'organisateur");
});

test("période P3 : sans compte aussi, la raison s'affiche", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-10T20:00:00"));
  await fakeFirestore(page, DOCS);
  await page.goto("/evenements/foot");
  await expect(page.getByText("Inscriptions fermées : l'évènement a commencé")).toBeVisible();
});

test("période P3 : la carte de la liste annonce l'ouverture au lieu de « S'inscrire »", async ({ page }) => {
  await member(page, JO, "/evenements", { ...DOCS, "evenements/foot": PAS_ENCORE });
  const carte = page.getByRole("link", { name: /Foot au parc/ });
  await expect(carte).toContainText("Inscriptions à partir du 5 oct.");
  await expect(carte).not.toContainText("S'inscrire");
});

test("période P3 : le panneau de l'organisateur dit « Bientôt » avant l'ouverture", async ({ page }) => {
  await member(page, STEPH, "/evenements/foot", { ...DOCS, "evenements/foot": PAS_ENCORE });
  const panneau = page.getByRole("region", { name: "Inscriptions", exact: true });
  await expect(panneau.getByTestId("etat-inscriptions")).toHaveText("Bientôt");
  await expect(panneau).toContainText(/Inscriptions à partir du lundi 5 octobre 2026 à 10:00/);
});

// P4 : le matin du jour d'ouverture, une ligne dans le rappel du jour.
test("période P4 : les inscriptions qui s'ouvrent aujourd'hui, en automatique seulement", () => {
  const e = { ...FOOT, id: "foot", inscriptions: "auto" as const, inscriptionDebut: "2026-10-05T10:00" };
  expect(ouvertureDuJour(e, "2026-10-05")).toBe(true);
  expect(ouvertureDuJour({ ...e, inscriptionDebut: "2026-10-05" }, "2026-10-05")).toBe(true);
  expect(ouvertureDuJour(e, "2026-10-04")).toBe(false);
  expect(ouvertureDuJour(e, "2026-10-06")).toBe(false);
  expect(ouvertureDuJour({ ...e, inscriptions: "ouvertes" as const }, "2026-10-05")).toBe(false);
  expect(ouvertureDuJour({ ...e, inscriptions: "fermees" as const }, "2026-10-05")).toBe(false);
  expect(ouvertureDuJour({ ...e, inscriptionDebut: "" }, "2026-10-05")).toBe(false);
  expect(ouvertureDuJour({ ...e, pour: "pole:da" as const }, "2026-10-05")).toBe(false);
  expect(ouvertureDuJour({ ...e, date: "2026-10-01" }, "2026-10-05"), "évènement déjà passé").toBe(false);
});

test("période P4 : la ligne « Inscriptions ouvertes », en français et en chinois, ajoutée au message du jour", () => {
  const e = { ...FOOT, inscriptionDebut: "2026-10-05T10:00" };
  expect(ligneOuverture(e, "fr")).toBe("Inscriptions ouvertes : Foot au parc (dès 10:00)");
  expect(ligneOuverture({ ...e, inscriptionDebut: "2026-10-05" }, "fr")).toBe("Inscriptions ouvertes : Foot au parc");
  expect(ligneOuverture(e, "zh-CN")).toBe("报名开始：Foot au parc（10:00 起）");
  expect(ouverturesTitre("fr")).toBe("Inscriptions ouvertes");
  expect(ouverturesTitre("zh-CN")).toBe("报名开始");
  expect(avecLignes("Dimanche : piano", ["Inscriptions ouvertes : Foot au parc"])).toBe("Dimanche : piano\nInscriptions ouvertes : Foot au parc");
  expect(avecLignes("", ["Inscriptions ouvertes : Foot au parc"])).toBe("Inscriptions ouvertes : Foot au parc");
});

// ─── Lot 11 : inscription par un lien externe (docs/spec-inscription-externe.md) ──
// Le lien externe est un refus de plus, testé en premier : une seule règle
// décide pour la page comme pour le serveur, et l'app ne compte plus rien.

const FORMULAIRE = "https://forms.gle/theologie";
const THEOLOGIE: Omit<Evenement, "id"> = {
  ...base, titre: "Cours de théologie", type: "eglise", date: "2026-11-05", heure: "20:00",
  lieu: "Salle du haut", description: "Six soirées.", lienExterne: FORMULAIRE, inscrits: 0,
};
const DOCS_EXT = { ...DOCS, "evenements/theologie": THEOLOGIE };
const DOCS_SANS = { ...DOCS, "evenements/theologie": { ...THEOLOGIE, lienExterne: "" } };

test("lot 11 : le lien externe refuse l'inscription avant la fermeture, les places et la période", () => {
  const now = "2026-10-01T10:00";
  expect(refusInscription(THEOLOGIE, 0, now)).toBe("externe");
  expect(refusInscription({ ...THEOLOGIE, inscriptions: "fermees" }, 0, now)).toBe("externe");
  expect(refusInscription({ ...THEOLOGIE, inscrits: 10 }, 0, now)).toBe("externe");
  expect(refusInscription({ ...THEOLOGIE, inscriptions: "auto", inscriptionDebut: "2026-11-01" }, 0, now)).toBe("externe");
  // Lien vide : la règle d'aujourd'hui, intacte.
  expect(refusInscription({ ...THEOLOGIE, lienExterne: "" }, 0, now)).toBeNull();
  expect(refusInscription({ ...THEOLOGIE, lienExterne: "", inscrits: 10 }, 0, now)).toBe("complet");
  expect(refusInscription({ ...THEOLOGIE, lienExterne: "", inscriptions: "fermees" }, 0, now)).toBe("fermee");
});

// Le lien externe masque les dates d'inscription sans les effacer (R2) : une
// ouverture datée restée là ne doit plus rien annoncer à toute l'église.
test("lot 11 : un formulaire externe n'annonce aucune ouverture d'inscriptions le matin", () => {
  const e = { ...THEOLOGIE, id: "theologie", inscriptions: "auto" as const, inscriptionDebut: "2026-10-05T10:00" };
  expect(ouvertureDuJour(e, "2026-10-05")).toBe(false);
  expect(ouvertureDuJour({ ...e, lienExterne: "" }, "2026-10-05"), "sans lien externe, l'ouverture s'annonce").toBe(true);
});

test("lot 11 fiche : « S'inscrire » ouvre le formulaire externe dans un nouvel onglet, sans compteur ni places", async ({ page }) => {
  await member(page, JO, "/evenements/theologie", DOCS_EXT);
  const fiche = page.getByTestId("fiche-carte");
  const bouton = fiche.getByRole("link", { name: "S'inscrire" });
  await expect(bouton).toHaveAttribute("href", FORMULAIRE);
  await expect(bouton).toHaveAttribute("target", "_blank");
  await expect(bouton).toHaveAttribute("rel", /noopener/);
  await expect(fiche).toContainText("Inscriptions sur un formulaire externe");
  await expect(fiche).not.toContainText("déjà inscrit");
  await expect(fiche).not.toContainText("places restantes");
  await expect(fiche).not.toContainText("Complet");
  await expect(fiche.getByRole("button", { name: "S'inscrire" })).toHaveCount(0);
});

test("lot 11 fiche : un visiteur sans compte voit le même bouton, jamais « Connecte-toi »", async ({ page }) => {
  await visitor(page, "/evenements/theologie", { ...DOCS_EXT, "evenements/theologie": { ...THEOLOGIE, sansCompte: false } });
  await expect(page.getByRole("link", { name: "S'inscrire" })).toHaveAttribute("href", FORMULAIRE);
  await expect(page.getByText("Connecte-toi pour t'inscrire")).toHaveCount(0);
});

test("lot 11 panneau : « Formulaire externe », l'adresse cliquable, aucun réglage ; le QR reste celui de la fiche", async ({ page }) => {
  await member(page, STEPH, "/evenements/theologie", DOCS_EXT);
  const panneau = page.getByRole("region", { name: "Inscriptions", exact: true });
  await expect(panneau.getByTestId("etat-inscriptions")).toHaveText("Formulaire externe");
  await expect(panneau).toContainText("Inscriptions sur un formulaire externe");
  await expect(panneau.getByRole("link", { name: FORMULAIRE })).toHaveAttribute("href", FORMULAIRE);
  await expect(panneau.getByRole("radiogroup")).toHaveCount(0);
  // D4 : l'affiche fait entrer dans l'app, la fiche envoie au formulaire.
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  const lienQr = page.getByRole("link", { name: /\/evenements\/theologie/ });
  await expect(lienQr).toBeVisible();
  await expect(lienQr).toHaveAttribute("href", /\/evenements\/theologie$/);
});

test("lot 11 calendrier : la carte montre « S'inscrire » seul et mène à la fiche, pas au formulaire", async ({ page }) => {
  await member(page, JO, "/evenements", DOCS_EXT);
  const carte = page.getByRole("link", { name: /Cours de théologie/ });
  await expect(carte).toContainText("S'inscrire");
  await expect(carte).not.toContainText("déjà inscrit");
  await expect(carte).not.toContainText("places restantes");
  await expect(carte).toHaveAttribute("href", "/evenements/theologie/");
  await carte.click();
  await expect(page).toHaveURL(/\/evenements\/theologie\/?$/);
});

test("lot 11 formulaire : le lien est écrit, le mode et les dates disparaissent, places et sans compte désactivés", async ({ page }) => {
  const db = await member(page, STEPH, "/evenements/theologie/modifier", DOCS_SANS);
  await expect(page.getByRole("radio", { name: "Automatique" })).toBeVisible();
  await page.getByLabel("Lien d'inscription externe").fill(FORMULAIRE);
  await expect(page.getByRole("radiogroup", { name: "Inscriptions" })).toHaveCount(0);
  await expect(page.getByLabel("Ouverture des inscriptions", { exact: true })).toHaveCount(0);
  await page.getByText("Plus d'options").click();
  await expect(page.getByText("Inscription sur un formulaire externe : ces réglages ne s'appliquent pas.")).toBeVisible();
  await expect(page.getByLabel("Places")).toBeDisabled();
  await expect(page.getByLabel("Les personnes sans compte peuvent s'inscrire")).toBeDisabled();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("heading", { name: "Cours de théologie" })).toBeVisible();
  const write = db.writes.find((w) => w.method === "PATCH" && w.path === "evenements/theologie");
  expect(write?.data.lienExterne).toBe(FORMULAIRE);
});

test("lot 11 formulaire : une adresse sans http(s) est refusée, comme les liens", async ({ page }) => {
  const db = await member(page, STEPH, "/evenements/theologie/modifier", DOCS_SANS);
  const champ = page.getByLabel("Lien d'inscription externe");
  // Sans schéma : le champ « url » ne laisse même pas partir le formulaire.
  await champ.fill("forms.gle/theologie");
  expect(await champ.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false);
  // Un autre schéma passe le navigateur : la règle de l'app le refuse, avec le
  // message des liens (jamais de « javascript: » derrière « S'inscrire »).
  await champ.fill("javascript:alert(1)");
  expect(await champ.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(true);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("doit commencer par http:// ou https://")).toBeVisible();
  expect(db.writes.find((w) => w.path === "evenements/theologie")).toBeUndefined();
});

test("lot 11 formulaire : un évènement qui a déjà des inscrits refuse le lien externe", async ({ page }) => {
  const db = await member(page, STEPH, "/evenements/foot/modifier");
  await page.getByLabel("Lien d'inscription externe").fill(FORMULAIRE);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Cet évènement a déjà 4 inscrits dans l'app.")).toBeVisible();
  expect(db.writes.find((w) => w.method === "PATCH" && w.path === "evenements/foot")).toBeUndefined();
});

test("lot 11 中文 : la fiche et le formulaire montrent les nouveaux libellés", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await member(page, STEPH, "/evenements/theologie", DOCS_EXT);
  await expect(page.getByTestId("etat-inscriptions")).toHaveText("外部表单");
  const fiche = page.getByTestId("fiche-carte");
  await expect(fiche).toContainText("通过外部表单报名");
  await expect(fiche.getByRole("link", { name: "报名" })).toHaveAttribute("href", FORMULAIRE);
  await page.goto("/evenements/theologie/modifier");
  await expect(page.getByLabel("外部报名链接")).toHaveValue(FORMULAIRE);
  await expect(page.getByText(/应用不再统计名额和报名人数/)).toBeVisible();
});
