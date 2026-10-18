import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canSeeSetlist, canEditSetlist, canDeleteSetlist, canSetSetlistTeam, canSetPresentationLink,
} from "../src/lib/access";
import {
  estDansLePartage, candidatsDeLEquipe, roleParDefaut, nomCourt, equipeDeLaSetlist, aPrevenir,
  peutPrevenirEquipe, notifierSetlistPrete, horodatageEnvoi,
} from "../src/lib/setlist/partage";
import type { FSSetlist } from "../src/lib/firebase/setlists";
import type { UserProfile } from "../src/types/user";

// Partage d'une setlist (docs/spec-partage-setlist.md) : personnes fictives.
// Léa M. = choriste du Culte Francophone, propriétaire ; Joël F. = musicien du
// Groupe Paix seulement ; Hugo L. = choriste du Groupe Bonté seulement.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const profil = (uid: string, prenom: string, nom: string, serviceRoles: UserProfile["serviceRoles"], planningName = ""): UserProfile =>
  ({ uid, email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName, serviceRoles, annonces: [], notify: [] }) as unknown as UserProfile;

const LEA = profil("lea", "Léa", "Martin", { "Culte Francophone": ["chanteur"] }, "Léa M.");
const JOEL = profil("joel", "Joël", "Faure", { "Groupe Paix": ["musicien"] }, "Joël F.");
const HUGO = profil("hugo", "Hugo", "Lamy", { "Groupe Bonté": ["chanteur"] }, "Hugo L.");
const MUSICIEN_CULTE = profil("mus", "Noé", "Perrin", { "Culte Francophone": ["musicien"] }, "Noé P.");
const user = (p: UserProfile) => ({ uid: p.uid, email: p.email });
const ADMIN = { uid: "admin1", email: "tc328829@gmail.com" };

const setlist = (o: Partial<FSSetlist> = {}): FSSetlist => ({
  id: "s1", title: "Culte", leader: "", category: "Culte Francophone", date: "2026-11-01", language: "fr",
  notes: "", createdAt: null, items: [], ownerId: "lea", ...o,
});
const PUBLIQUE = setlist({ editeurs: ["joel"] });
const PRIVEE = setlist({ isPrivate: true, editeurs: ["joel"] });

test.describe("partage : droits (pur)", () => {
  test("voir", () => {
    expect(canSeeSetlist(user(JOEL), JOEL, PUBLIQUE)).toBe(true);
    expect(canSeeSetlist(user(LEA), LEA, PRIVEE)).toBe(true);
    expect(canSeeSetlist(user(JOEL), JOEL, PRIVEE)).toBe(true);
    expect(canSeeSetlist(user(MUSICIEN_CULTE), MUSICIEN_CULTE, PRIVEE)).toBe(false);
    expect(canSeeSetlist(user(JOEL), JOEL, setlist({ isPrivate: true, editeurs: [] }))).toBe(false);
    expect(canSeeSetlist(user(JOEL), JOEL, setlist({ editeurs: [] }))).toBe(false);
  });

  test("modifier, supprimer, choisir l'équipe", () => {
    for (const s of [PUBLIQUE, PRIVEE]) {
      expect(canEditSetlist(user(JOEL), JOEL, s)).toBe(true);
      expect(canDeleteSetlist(user(JOEL), JOEL, s)).toBe(false);
      expect(canDeleteSetlist(user(LEA), LEA, s)).toBe(true);
      expect(canSetSetlistTeam(user(JOEL), JOEL, s)).toBe(false);
      expect(canSetSetlistTeam(user(LEA), LEA, s)).toBe(true);
      expect(canEditSetlist(user(HUGO), HUGO, s)).toBe(false);
    }
    expect(canEditSetlist(user(MUSICIEN_CULTE), MUSICIEN_CULTE, PRIVEE)).toBe(false);
    // SC1 (docs/spec-createur-corbeille-absences.md) : un musicien du service ne modifie ni ne supprime plus.
    expect(canEditSetlist(user(MUSICIEN_CULTE), MUSICIEN_CULTE, PUBLIQUE)).toBe(false);
    expect(canDeleteSetlist(user(MUSICIEN_CULTE), MUSICIEN_CULTE, PUBLIQUE)).toBe(false);
    expect(canSetSetlistTeam(user(MUSICIEN_CULTE), MUSICIEN_CULTE, PUBLIQUE)).toBe(false);
    expect(canSetSetlistTeam(ADMIN, null, PUBLIQUE)).toBe(true);
    expect(canSetSetlistTeam(ADMIN, null, PRIVEE)).toBe(false);
    expect(canSetPresentationLink(user(JOEL), JOEL, PRIVEE, false)).toBe(true);
    // Admin dans l'équipe d'une privée d'autrui : il en choisit l'équipe (la règle l'accorde).
    expect(canSetSetlistTeam(ADMIN, null, setlist({ isPrivate: true, editeurs: ["admin1"] }))).toBe(true);
  });
});

test.describe("partage : fonctions pures", () => {
  test("estDansLePartage", () => {
    expect(estDansLePartage(PUBLIQUE, "joel")).toBe(true);
    expect(estDansLePartage(PUBLIQUE, "hugo")).toBe(false);
    expect(estDansLePartage(setlist(), "joel")).toBe(false);
  });

  test("candidats et rôle", () => {
    const profils = [HUGO, JOEL, LEA, MUSICIEN_CULTE];
    const c = candidatsDeLEquipe(profils, "Culte Francophone", "lea");
    expect(c.duService.map((p) => p.uid)).toEqual(["mus"]);
    expect(c.tous.map((p) => p.uid)).toEqual(["hugo", "joel", "mus"]); // par nom court, propriétaire exclu
    expect(candidatsDeLEquipe(profils, "", "lea").duService).toEqual([]);
    expect(roleParDefaut(profil("a", "A", "B", { X: ["musicien", "chanteur"] }), "X")).toBe("musicien");
    expect(roleParDefaut(profil("a", "A", "B", { X: ["chanteur"], Y: ["musicien"] }), "X")).toBe("chanteur");
    expect(roleParDefaut(profil("a", "A", "B", { Y: ["musicien"] }), "X")).toBe("musicien");
    expect(roleParDefaut(profil("a", "A", "B", { Y: ["chanteur"] }), "X")).toBe("chanteur");
    expect(nomCourt(JOEL)).toBe("Joël F.");
    expect(nomCourt(profil("a", "Ana", "Dupont", {}))).toBe("Ana D.");
  });

  test("carte de l'équipe", () => {
    const profils = [JOEL, HUGO];
    const s = setlist({ editeurs: ["joel", "hugo", "inconnu"], rolesPartage: { hugo: "chanteur" } });
    expect(equipeDeLaSetlist([], s, profils)).toEqual([
      ["planning.roles.musiciens", "Joël F."], ["planning.roles.choristes", "Hugo L."],
    ]);
    const planning: [string, string][] = [["planning.roles.presidence", "Ana"], ["planning.roles.choristes", "Hugo L., Zoé"]];
    expect(equipeDeLaSetlist(planning, s, profils)).toEqual([
      ["planning.roles.presidence", "Ana"], ["planning.roles.choristes", "Hugo L., Zoé"], ["planning.roles.musiciens", "Joël F."],
    ]);
    expect(equipeDeLaSetlist([["planning.roles.musiciens", "Ben"]], s, profils)[0]).toEqual(["planning.roles.musiciens", "Ben, Joël F."]);
    expect(equipeDeLaSetlist(planning, setlist(), profils)).toEqual(planning);
  });

  test("qui prévenir", () => {
    const base = { planning: ["p1", "p2"], prevenus: [] as string[], planningDejaPrevenu: false };
    expect(aPrevenir(setlist({ editeurs: ["e1"] }), { ...base, auto: false })).toEqual(["p1", "p2", "e1"]);
    expect(aPrevenir(setlist({ isPrivate: true, editeurs: ["e1"] }), { ...base, auto: false })).toEqual(["e1"]);
    expect(aPrevenir(setlist({ isPrivate: true }), { ...base, auto: false })).toEqual([]);
    expect(aPrevenir(setlist({ editeurs: ["e1", "p1"] }), { ...base, auto: false })).toEqual(["p1", "p2", "e1"]);
    // auto : déjà prévenus exclus, ajout tardif prévenu, planning déjà fait ignoré
    expect(aPrevenir(setlist({ editeurs: ["e1", "e2"] }), { ...base, auto: true, prevenus: ["e1"], planningDejaPrevenu: true })).toEqual(["e2"]);
    expect(aPrevenir(setlist({ editeurs: ["e1"] }), { ...base, auto: true, prevenus: ["e1"], planningDejaPrevenu: true })).toEqual([]);
  });

  test("qui peut déclencher « Setlist prête » (PS13)", () => {
    const sl = (o: Partial<FSSetlist>) => setlist(o);
    const nul = { estAdmin: false, estExecutant: false };
    // publique : propriétaire, équipe, admin, exécutant de la catégorie
    expect(peutPrevenirEquipe(sl({}), { uid: "lea", ...nul })).toBe(true);
    expect(peutPrevenirEquipe(sl({ editeurs: ["joel"] }), { uid: "joel", ...nul })).toBe(true);
    expect(peutPrevenirEquipe(sl({}), { uid: "x", ...nul, estAdmin: true })).toBe(true);
    expect(peutPrevenirEquipe(sl({}), { uid: "mus", ...nul, estExecutant: true })).toBe(true);
    expect(peutPrevenirEquipe(sl({}), { uid: "x", ...nul })).toBe(false);
    // privée avec équipe : le propriétaire et l'équipe seulement
    expect(peutPrevenirEquipe(sl({ isPrivate: true, editeurs: ["joel"] }), { uid: "joel", ...nul })).toBe(true);
    expect(peutPrevenirEquipe(sl({ isPrivate: true, editeurs: ["joel"] }), { uid: "lea", ...nul })).toBe(true);
    expect(peutPrevenirEquipe(sl({ isPrivate: true, editeurs: ["joel"] }), { uid: "mus", ...nul, estExecutant: true })).toBe(false);
    expect(peutPrevenirEquipe(sl({ isPrivate: true, editeurs: ["joel"] }), { uid: "admin", ...nul, estAdmin: true })).toBe(false);
  });

  test("quand l'éditeur appelle la route (PS13)", () => {
    expect(notifierSetlistPrete(setlist({}))).toBe(true);
    expect(notifierSetlistPrete(setlist({ editeurs: ["joel"] }))).toBe(true);
    expect(notifierSetlistPrete(setlist({ isPrivate: true }))).toBe(false);
    expect(notifierSetlistPrete(setlist({ isPrivate: true, editeurs: [] }))).toBe(false);
    expect(notifierSetlistPrete(setlist({ isPrivate: true, editeurs: ["joel"] }))).toBe(true);
  });

  test("le délai de 24 h du bouton manuel ne repart pas d'un envoi auto à l'équipe seule", () => {
    expect(horodatageEnvoi({ auto: true, planningTouche: 0, maintenant: 500 })).toBeUndefined();
    expect(horodatageEnvoi({ auto: true, planningTouche: 2, maintenant: 500 })).toBe(500);
    expect(horodatageEnvoi({ auto: false, planningTouche: 0, maintenant: 500 })).toBe(500);
    expect(horodatageEnvoi({ auto: false, planningTouche: 3, maintenant: 500 })).toBe(500);
  });

  test("la route lit l'équipe dans le document et garde la trace des prévenus (texte)", () => {
    const route = lire("src/app/api/push/notify-setlist/route.ts");
    expect(route).toContain("aPrevenir(");
    expect(route).toContain("peutPrevenirEquipe(");
    expect(route).toContain("partagePrevenus");
    expect(route).toContain("arrayUnion");
    expect(route).toContain("editeurs?: string[]");
    expect(route).toContain("horodatageEnvoi(");
    // jamais lu dans la requête : la déstructuration du corps sans `editeurs`, et chaque accès `.editeurs` sur le document `sl`
    const corps = route.match(/const \{([^}]*)\} = \(await req\.json/);
    expect(corps).not.toBeNull();
    expect(corps![1]).not.toContain("editeurs");
    expect(route).not.toMatch(/\b(?:body|data|payload|req)\.editeurs/);
    for (const m of route.matchAll(/(\w+)\??\.editeurs/g)) expect(m[1]).toBe("sl");
  });
});

test.describe("partage : règles Firestore (texte)", () => {
  test("setlists : lecture, modification, suppression, équipe", () => {
    const rules = lire("firestore.rules");
    const bloc = rules.slice(rules.indexOf("match /setlists/{id}"), rules.indexOf("match /history/{entryId}"));
    expect(bloc).toContain("allow read: if signedIn();");
    const update = bloc.slice(bloc.indexOf("allow update"), bloc.indexOf("allow delete"));
    const del = bloc.slice(bloc.indexOf("allow delete"));
    expect(update).toContain("canEditSetlistDoc(resource.data)");
    expect(update).toContain("affectedKeys().hasAny(['editeurs', 'rolesPartage'])");
    expect(update).toContain("affectedKeys().hasAny(['isPrivate'])");
    expect(update).toContain("canDeleteSetlistDoc(resource.data)");
    expect(del).toContain("canDeleteSetlistDoc(resource.data)");
    // Changer de catégorie : le propriétaire et les admins seulement (sinon l'équipe se donnerait ce droit).
    expect(update).toMatch(/\|\| isAdmin\(\)\s*\|\|\s*request\.resource\.data\.category == resource\.data\.category\s*\)/);
    const edit = rules.slice(rules.indexOf("function canEditSetlistDoc"), rules.indexOf("function canEditSetlistDoc") + 300);
    expect(edit).toContain("canDeleteSetlistDoc(setlist)");
    expect(edit).toContain("request.auth.uid in setlist.get('editeurs', [])");
    const sup = rules.slice(rules.indexOf("function canDeleteSetlistDoc"));
    expect(sup.slice(0, 400)).toContain("!setlist.get('isPrivate', false)");
  });
});

// ─── L'éditeur (PS-B) ────────────────────────────────────────────────────────

import type { Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { ajouterChant, attendreEditeur, champPresidence, choisirTonalite, fermerFeuille, volet } from "./helpers/editeurSetlist";
import { interdireDialoguesNatifs, verifierSansDebordement } from "./helpers/agencement";

const fp = (p: UserProfile): FakeProfile => ({
  uid: p.uid, email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: p.planningName, serviceRoles: p.serviceRoles,
});
const ANNUAIRE = Object.fromEntries([LEA, JOEL, HUGO, MUSICIEN_CULTE].map((p) => [
  `users/${p.uid}`,
  { email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: p.planningName, serviceRoles: p.serviceRoles, annonces: [], notify: [] },
]));
const item = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", ...over,
});
const DOC = (over: Record<string, unknown> = {}) => ({
  title: "Culte Francophone 01/11", leader: "Présidence A", category: "Culte Francophone", date: "2026-11-01",
  language: "fr", notes: "", ownerId: "lea", isPrivate: false, items: [item({ songSlug: "abba-pere", position: 1 })], ...over,
});
const ID = "sl-partage";
const CHEMIN = `setlists/${ID}`;
const planningVide = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
const puceEquipe = (page: Page) => page.getByRole("button", { name: /^Équipe/ });
const ecritures = (db: FakeDb, chemin: string) => db.writes.filter((w) => w.path === chemin && w.method !== "DELETE");

test.describe("partage : l'éditeur", () => {
  test("création « Autre setlist » : la puce Équipe, l'ajout, le rôle, le retrait", async ({ page }, testInfo) => {
    interdireDialoguesNatifs(page);
    await planningVide(page);
    const db = await signInAs(page, fp(LEA), ANNUAIRE, "/setlists/new?autre=1");
    await page.getByLabel("Titre").fill("Soirée louange");
    await page.getByLabel("Catégorie").selectOption("Culte Francophone");
    await champPresidence(page).selectOption("__other__");
    await page.getByPlaceholder("ex. Timothée").fill("Présidence A");
    await ajouterChant(page, "Abba Père");

    await puceEquipe(page).click();
    const v = volet(page);
    await expect(v.getByRole("heading", { name: "L'équipe de cette setlist" })).toBeVisible();
    await v.getByRole("button", { name: "Ajouter quelqu'un" }).click();
    await expect(v.getByText("Musiciens et choristes de Culte Francophone")).toBeVisible();
    await v.getByRole("button", { name: "Noé P.", exact: true }).click();
    await v.getByRole("button", { name: "Ajouter quelqu'un" }).click();
    await v.getByRole("button", { name: "Voir tous les comptes" }).click();
    await expect(v.getByRole("button", { name: "Léa M." })).toHaveCount(0); // le propriétaire n'est pas proposé
    await v.getByRole("button", { name: "Joël F.", exact: true }).click();
    // Rôle par défaut Musicien ; Joël passe Choriste d'un toucher.
    const ligneJoel = v.getByRole("listitem").filter({ hasText: "Joël F." });
    await expect(ligneJoel.getByRole("button", { name: "Musicien", exact: true })).toHaveAttribute("aria-pressed", "true");
    await ligneJoel.getByRole("button", { name: "Choriste", exact: true }).click();
    await expect(v.getByText(/Régie/)).toHaveCount(0);
    await expect(v.getByPlaceholder(/sans compte/i)).toHaveCount(0);
    if (testInfo.project.name === "telephone") await verifierSansDebordement(page);

    const brouillons = () => db.writes.filter((w) => /^setlists\/[^/]+$/.test(w.path));
    await expect.poll(() => brouillons().at(-1)?.data.editeurs, { timeout: 10_000 }).toEqual(["mus", "joel"]);
    const brouillon = brouillons().at(-1)!;
    expect(brouillon.data.isDraft).toBe(true);
    expect(brouillon.data.rolesPartage).toEqual({ mus: "musicien", joel: "chanteur" });

    await fermerFeuille(page);
    await expect(puceEquipe(page)).toHaveText(/Équipe · 2/);
    await puceEquipe(page).click();
    await volet(page).getByRole("button", { name: "Retirer Noé P." }).click();
    await fermerFeuille(page);
    await page.getByRole("button", { name: "Publier" }).click();
    await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === `/${brouillon.path}`);
    expect(db.doc(brouillon.path)?.isDraft).toBe(false);
    expect(db.doc(brouillon.path)?.editeurs).toEqual(["joel"]);
    expect(db.doc(brouillon.path)?.rolesPartage).toEqual({ joel: "chanteur" });
  });

  test("modification : ajouter Hugo s'enregistre tout seul (FR)", async ({ page }) => {
    await planningVide(page);
    const db = await signInAs(page, fp(LEA), { ...ANNUAIRE, [CHEMIN]: DOC({ editeurs: ["joel"], rolesPartage: { joel: "musicien" } }) }, `/setlists/${ID}/edit`);
    await attendreEditeur(page, "Abba Père");
    await expect(puceEquipe(page)).toHaveText(/Équipe · 1/);
    await puceEquipe(page).click();
    await volet(page).getByRole("button", { name: "Ajouter quelqu'un" }).click();
    await volet(page).getByRole("button", { name: "Voir tous les comptes" }).click();
    await volet(page).getByRole("button", { name: "Hugo L.", exact: true }).click();
    await expect.poll(() => db.doc(CHEMIN)?.editeurs, { timeout: 10_000 }).toEqual(["joel", "hugo"]);
    expect((db.doc(CHEMIN)?.rolesPartage as Record<string, string>).hugo).toBe("chanteur"); // Groupe Bonté : choriste
    await fermerFeuille(page);
    await expect(puceEquipe(page)).toHaveText(/Équipe · 2/);
  });

  test("un compte de l'équipe sans profil garde sa ligne et se retire", async ({ page }) => {
    await planningVide(page);
    const db = await signInAs(page, fp(LEA), { ...ANNUAIRE, [CHEMIN]: DOC({ editeurs: ["joel", "fantome"], rolesPartage: { joel: "musicien", fantome: "musicien" } }) }, `/setlists/${ID}/edit`);
    await attendreEditeur(page, "Abba Père");
    await expect(puceEquipe(page)).toHaveText(/Équipe · 2/);
    await puceEquipe(page).click();
    await expect(volet(page).getByText("Personne pour l'instant.")).toHaveCount(0);
    await expect(volet(page).getByText("Joël F.")).toBeVisible(); // profils arrivés : sinon tout le monde serait « Membre inconnu »
    await volet(page).getByRole("button", { name: "Retirer Membre inconnu" }).click();
    await expect.poll(() => db.doc(CHEMIN)?.editeurs, { timeout: 10_000 }).toEqual(["joel"]);
  });

  test("中文 : la puce et la vue de l'équipe", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await planningVide(page);
    await signInAs(page, fp(LEA), { ...ANNUAIRE, [CHEMIN]: DOC() }, `/setlists/${ID}/edit`);
    const puce = page.getByRole("button", { name: /^服事团队/ });
    await puce.click();
    await expect(volet(page).getByRole("heading", { name: "本歌单服事团队" })).toBeVisible();
    await expect(volet(page).getByRole("button", { name: "添加成员" })).toBeVisible();
  });

  test("une personne de l'équipe modifie une privée : ni équipe ni visibilité dans l'écriture", async ({ page }) => {
    await planningVide(page);
    const db = await signInAs(page, fp(JOEL), { ...ANNUAIRE, [CHEMIN]: DOC({ isPrivate: true, editeurs: ["joel"], rolesPartage: { joel: "musicien" } }) }, `/setlists/${ID}/edit`);
    await attendreEditeur(page, "Abba Père");
    await expect(page.getByText("Privée : visible et modifiable par son créateur et son équipe")).toBeVisible();
    await choisirTonalite(page, "Abba Père", "B");
    await expect.poll(() => ecritures(db, CHEMIN).length, { timeout: 10_000 }).toBeGreaterThan(0);
    for (const w of ecritures(db, CHEMIN)) {
      expect(Object.keys(w.data)).not.toContain("editeurs");
      expect(Object.keys(w.data)).not.toContain("rolesPartage");
    }
    expect((db.doc(CHEMIN)?.items as { keyOverride: string }[])[0].keyOverride).toBe("B");
    await fermerFeuille(page);
    await expect(page.getByLabel("Visibilité")).toBeDisabled();
    await expect(page.getByLabel("Catégorie")).toBeDisabled(); // changer de catégorie ouvrirait la suppression
    await puceEquipe(page).click();
    await expect(volet(page).getByText("Seuls son créateur et les admins changent l'équipe.")).toBeVisible();
    await expect(volet(page).getByRole("button", { name: "Ajouter quelqu'un" })).toHaveCount(0);
    await expect(volet(page).getByRole("button", { name: /^Retirer/ })).toHaveCount(0);
    // L'historique s'écrit sous son nom.
    const histo = db.list(`${CHEMIN}/history`).map((p) => db.doc(p));
    expect(histo.some((h) => h?.authorUid === "joel" && h?.authorName === "Joël F.")).toBe(true);
  });

  test("« Setlist prête » : une privée avec équipe prévient en quittant l'éditeur, une privée seule non (PS13)", async ({ page }) => {
    await planningVide(page);
    const appels: string[] = [];
    await page.route("**/api/push/notify-setlist", (route) => {
      appels.push(route.request().postData() ?? "");
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    const db = await signInAs(page, fp(JOEL), {
      ...ANNUAIRE,
      [CHEMIN]: DOC({ isPrivate: true, editeurs: ["joel"], rolesPartage: { joel: "musicien" } }),
      "setlists/sl-seule": DOC({ isPrivate: true, ownerId: "joel" }),
    }, `/setlists/${ID}/edit`);
    await attendreEditeur(page, "Abba Père");
    await choisirTonalite(page, "Abba Père", "B");
    await expect.poll(() => ecritures(db, CHEMIN).length, { timeout: 10_000 }).toBeGreaterThan(0);
    await page.evaluate(() => history.back());
    await expect.poll(() => appels.length).toBe(1);
    expect(appels[0]).toContain(ID);
    // Privée sans équipe (celle de Joël) : aucun appel.
    await page.goto("/setlists/sl-seule/edit");
    await attendreEditeur(page, "Abba Père");
    await choisirTonalite(page, "Abba Père", "B");
    await expect.poll(() => ecritures(db, "setlists/sl-seule").length, { timeout: 10_000 }).toBeGreaterThan(0);
    await page.evaluate(() => history.back());
    await page.waitForTimeout(1_500);
    expect(appels).toHaveLength(1);
  });

  test("« Setlist prête » : « Publier » une privée avec équipe appelle la route (PS13)", async ({ page }) => {
    await planningVide(page);
    const appels: string[] = [];
    await page.route("**/api/push/notify-setlist", (route) => {
      appels.push(route.request().postData() ?? "");
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await signInAs(page, fp(LEA), ANNUAIRE, "/setlists/new?autre=1");
    await page.getByLabel("Titre").fill("Soirée privée");
    await page.getByLabel("Catégorie").selectOption("Culte Francophone");
    await champPresidence(page).selectOption("__other__");
    await page.getByPlaceholder("ex. Timothée").fill("Présidence A");
    await ajouterChant(page, "Abba Père");
    await page.getByLabel("Visibilité").selectOption("privee");
    await puceEquipe(page).click();
    await volet(page).getByRole("button", { name: "Ajouter quelqu'un" }).click();
    await volet(page).getByRole("button", { name: "Voir tous les comptes" }).click();
    await volet(page).getByRole("button", { name: "Joël F.", exact: true }).click();
    await fermerFeuille(page);
    await page.getByRole("button", { name: "Publier" }).click();
    await expect.poll(() => appels.length, { timeout: 10_000 }).toBe(1);
  });

  test("un musicien de la catégorie, hors équipe : ne modifie plus (SC1), duplique pour ses notes", async ({ page }) => {
    await planningVide(page);
    await signInAs(page, fp(MUSICIEN_CULTE), { ...ANNUAIRE, [CHEMIN]: DOC(), "setlists/sl-privee": DOC({ isPrivate: true }) }, `/setlists/${ID}/edit`);
    await expect(page.getByText(/^Seuls le créateur de la setlist/)).toBeVisible();
    await expect(page.locator("[data-liste-courte]")).toHaveCount(0);
    await page.goto(`/setlists/${ID}`);
    await expect(page.getByText("Lecture seule")).toBeVisible();
    await expect(page.getByText("Modifiable par son créateur seulement (et les admins)")).toBeVisible();
    await page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).first().click();
    await expect(page.getByRole("menuitem", { name: "Dupliquer pour mes notes" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Supprimer" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.goto("/setlists/sl-privee/edit");
    await expect(page.getByText(/^Seuls le créateur de la setlist/)).toBeVisible();
    await expect(page.locator("[data-liste-courte]")).toHaveCount(0);
  });
});

// ─── Où la trouver (PS-C) ────────────────────────────────────────────────────

const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const csvCulte = [ENTETE_CULTE, ["04/10", "Léa M.", "Noé T.", "Inès V.", "Ruth K.", "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""]]
  .map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const planningCulte = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: new URL(route.request().url()).searchParams.get("sheet") === "Franco_Louange" ? csvCulte : "" }));
const horloge = (page: Page) => page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
const GRAND = ["ordinateur", "tablette-paysage", "ordinateur-1440"];

const PUB = DOC({ title: "Culte partagé", date: "2026-11-01", editeurs: ["joel"], rolesPartage: { joel: "musicien" } });
const PRIV = DOC({ title: "Privée partagée", date: "2026-11-08", isPrivate: true, editeurs: ["joel"], rolesPartage: { joel: "musicien" } });
const PRIV_SEULE = DOC({ title: "Privée de Léa", date: "2026-11-15", isPrivate: true });
const LISTE = { "setlists/sl-pub": PUB, "setlists/sl-priv": PRIV, "setlists/sl-seule": PRIV_SEULE };
const rangee = (page: Page, titre: string) => page.getByRole("link", { name: new RegExp(titre) }).first();

test.describe("partage : la liste des setlists (PS10)", () => {
  test("Joël voit ce qui est partagé avec lui, marqué « Dans l'équipe »", async ({ page }) => {
    await horloge(page);
    await planningVide(page);
    const requetes: string[] = [];
    page.on("request", (r) => { if (r.url().includes(":runQuery") && r.postData()) requetes.push(r.postData()!); });
    await signInAs(page, fp(JOEL), { ...ANNUAIRE, ...LISTE }, "/setlists");
    await expect(rangee(page, "Culte partagé")).toContainText("Dans l'équipe");
    await expect(rangee(page, "Privée partagée")).toContainText("Dans l'équipe");
    await expect(rangee(page, "Privée partagée").getByLabel("Privée")).toBeVisible();
    await expect(page.getByRole("link", { name: /Privée de Léa/ })).toHaveCount(0);
    expect(requetes.some((b) => b.includes("ARRAY_CONTAINS") && b.includes('"joel"'))).toBe(true);
    // L'équipe ne supprime pas : pas de suppression groupée.
    await expect(page.getByRole("button", { name: "Sélectionner" })).toHaveCount(0);
  });

  test("le propriétaire ne voit pas la marque, et garde la suppression groupée", async ({ page }) => {
    await horloge(page);
    await planningVide(page);
    await signInAs(page, fp(LEA), { ...ANNUAIRE, ...LISTE }, "/setlists");
    await expect(rangee(page, "Culte partagé")).toBeVisible();
    await expect(rangee(page, "Culte partagé")).not.toContainText("Dans l'équipe");
    await expect(page.getByRole("button", { name: "Sélectionner" })).toBeVisible();
  });

  test("un musicien hors équipe ne voit pas la privée, et son adresse dit « pas d'accès »", async ({ page }) => {
    await horloge(page);
    await planningVide(page);
    // Sans nom de planning : le filtre « Mes services » ne s'applique pas.
    await signInAs(page, { ...fp(MUSICIEN_CULTE), planningName: "" },
      { ...ANNUAIRE, "users/mus": { ...(ANNUAIRE["users/mus"] as object), planningName: "" }, ...LISTE }, "/setlists");
    await expect(rangee(page, "Culte partagé")).toBeVisible();
    await expect(page.getByRole("link", { name: /Privée partagée/ })).toHaveCount(0);
    await expect(rangee(page, "Culte partagé")).not.toContainText("Dans l'équipe"); // il sert dans la catégorie
    await page.goto("/setlists/sl-priv");
    await expect(page.getByText("Tu n'as pas accès à cette setlist")).toBeVisible();
  });
});

test.describe("partage : la carte de l'équipe dans l'aperçu (PS12)", () => {
  test.beforeEach(({}, info) => { test.skip(!GRAND.includes(info.project.name), "aperçu : en grand seulement"); });
  const apercu = (page: Page) => page.getByRole("region", { name: "Aperçu de la setlist" });

  test("hors planning : « choisie dans la setlist », Joël en pastille, avec ou sans nom de planning", async ({ page }) => {
    await horloge(page);
    await planningVide(page);
    await signInAs(page, fp(JOEL), { ...ANNUAIRE, ...LISTE }, "/setlists?apercu=sl-pub");
    await expect(apercu(page).getByRole("heading", { name: "L'équipe de cette setlist" })).toBeVisible();
    await expect(apercu(page).getByText("choisie dans la setlist")).toBeVisible();
    await expect(apercu(page).getByTestId("moi")).toHaveText("Joël F.");
    await expect(apercu(page).getByText("Musiciens")).toBeVisible();
  });

  test("sans nom de planning, la pastille prend le prénom et l'initiale", async ({ page }) => {
    await horloge(page);
    await planningVide(page);
    const sansNom = { ...ANNUAIRE, "users/joel": { ...(ANNUAIRE["users/joel"] as object), planningName: "" }, ...LISTE };
    await signInAs(page, { ...fp(JOEL), planningName: "" }, sansNom, "/setlists?apercu=sl-pub");
    await expect(apercu(page).getByTestId("moi")).toHaveText("Joël F.");
  });

  test("liée à un culte du planning : la carte du planning, Hugo ajouté aux Choristes", async ({ page }) => {
    await horloge(page);
    await planningCulte(page);
    const doc = DOC({ title: "Culte du 4", date: "2026-10-04", editeurs: ["hugo"], rolesPartage: { hugo: "chanteur" } });
    await signInAs(page, fp(MUSICIEN_CULTE), { ...ANNUAIRE, "setlists/sl-4": doc }, "/setlists?apercu=sl-4");
    await expect(apercu(page).getByRole("heading", { name: "L'équipe de ce service" })).toBeVisible();
    await expect(apercu(page).getByText("d'après le planning et la setlist")).toBeVisible();
    await expect(apercu(page).locator("dd").filter({ hasText: "Hugo L." })).toBeVisible();
    await expect(apercu(page).locator("dd").filter({ hasText: "Noé T." })).toContainText("Hugo L.");
  });

  test("中文 : le titre et le sous-titre de la carte", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await horloge(page);
    await planningVide(page);
    await signInAs(page, fp(JOEL), { ...ANNUAIRE, ...LISTE }, "/setlists?apercu=sl-pub");
    const zone = page.getByRole("region", { name: "歌单预览" });
    await expect(zone.getByRole("heading", { name: "本歌单服事团队" })).toBeVisible();
    await expect(zone.getByText("在歌单中选定")).toBeVisible();
  });
});

test.describe("partage : la page d'une setlist (PS14, PS15)", () => {
  test.beforeEach(({}, info) => { test.skip(!GRAND.includes(info.project.name), "page en deux volets : ordinateur et tablette couchée"); });
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });
  const menu = (page: Page) => page.locator("[data-en-tete]").getByRole("button", { name: "Plus d'actions" });

  test("Joël (équipe) sur la privée : peut modifier, ne supprime pas, droits en toutes lettres", async ({ page }) => {
    await planningVide(page);
    await signInAs(page, fp(JOEL), { ...ANNUAIRE, ...LISTE }, "/setlists/sl-priv");
    await expect(page.getByText("Vous pouvez modifier")).toBeVisible();
    await expect(page.getByText("Privée — visible et modifiable par son créateur et son équipe")).toBeVisible();
    await menu(page).click();
    await expect(page.getByRole("menuitem", { name: "Prévenir l'équipe" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Supprimer" })).toHaveCount(0);
  });

  test("publique avec équipe : « Modifiable par son créateur et son équipe seulement » ; Léa supprime", async ({ page }) => {
    await planningVide(page);
    await signInAs(page, fp(LEA), { ...ANNUAIRE, ...LISTE }, "/setlists/sl-pub");
    await expect(page.getByText("Modifiable par son créateur et son équipe seulement (et les admins)")).toBeVisible();
    await menu(page).click();
    await expect(page.getByRole("menuitem", { name: "Supprimer" })).toBeVisible();
  });

  test("sans équipe, les textes d'avant restent", async ({ page }) => {
    await planningVide(page);
    await signInAs(page, fp(LEA), { ...ANNUAIRE, "setlists/sl-x": DOC({ isPrivate: true }) }, "/setlists/sl-x");
    await expect(page.getByText("Privée — visible et modifiable uniquement par son créateur")).toBeVisible();
  });

  test("« Partager » une privée avec équipe copie le lien et le dit", async ({ page }) => {
    await planningVide(page);
    await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }));
    await signInAs(page, fp(LEA), { ...ANNUAIRE, ...LISTE }, "/setlists/sl-priv");
    await menu(page).click();
    await page.getByRole("menuitem", { name: "Partager" }).click();
    await expect(page.getByText("Setlist privée — seule son équipe pourra l'ouvrir")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/setlists/sl-priv");
  });

  test("« Partager » une privée sans équipe refuse, comme avant", async ({ page }) => {
    await planningVide(page);
    await signInAs(page, fp(LEA), { ...ANNUAIRE, "setlists/sl-x": DOC({ isPrivate: true }) }, "/setlists/sl-x");
    await menu(page).click();
    await page.getByRole("menuitem", { name: "Partager" }).click();
    await expect(page.getByText("Setlist privée — visible uniquement par toi")).toBeVisible();
  });
});

test("Dupliquer ne recopie pas l'équipe (PS15)", () => {
  const src = lire("src/lib/firebase/setlists.ts");
  const dup = src.slice(src.indexOf("export async function duplicateSetlist"));
  expect(dup.slice(0, dup.indexOf("\n}\n"))).not.toMatch(/editeurs|rolesPartage/);
});
