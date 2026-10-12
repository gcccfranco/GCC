import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  canSeeSetlist, canEditSetlist, canDeleteSetlist, canSetSetlistTeam, canSetPresentationLink,
} from "../src/lib/access";
import {
  estDansLePartage, candidatsDeLEquipe, roleParDefaut, nomCourt, equipeDeLaSetlist, aPrevenir,
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
    expect(canDeleteSetlist(user(MUSICIEN_CULTE), MUSICIEN_CULTE, PUBLIQUE)).toBe(true);
    expect(canSetSetlistTeam(user(MUSICIEN_CULTE), MUSICIEN_CULTE, PUBLIQUE)).toBe(false);
    expect(canSetSetlistTeam(ADMIN, null, PUBLIQUE)).toBe(true);
    expect(canSetSetlistTeam(ADMIN, null, PRIVEE)).toBe(false);
    expect(canSetPresentationLink(user(JOEL), JOEL, PRIVEE, false)).toBe(true);
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
  { email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: p.planningName, serviceRoles: p.serviceRoles, annonces: [], notify: [], poles: [] },
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
    await puceEquipe(page).click();
    await expect(volet(page).getByText("Seuls son créateur et les admins changent l'équipe.")).toBeVisible();
    await expect(volet(page).getByRole("button", { name: "Ajouter quelqu'un" })).toHaveCount(0);
    await expect(volet(page).getByRole("button", { name: /^Retirer/ })).toHaveCount(0);
    // L'historique s'écrit sous son nom.
    const histo = db.list(`${CHEMIN}/history`).map((p) => db.doc(p));
    expect(histo.some((h) => h?.authorUid === "joel" && h?.authorName === "Joël F.")).toBe(true);
  });

  test("un musicien de la catégorie, hors équipe", async ({ page }) => {
    await planningVide(page);
    const db = await signInAs(page, fp(MUSICIEN_CULTE), { ...ANNUAIRE, [CHEMIN]: DOC(), "setlists/sl-privee": DOC({ isPrivate: true }) }, `/setlists/${ID}/edit`);
    await attendreEditeur(page, "Abba Père");
    await expect(puceEquipe(page)).toHaveCount(0);
    await choisirTonalite(page, "Abba Père", "B");
    await expect.poll(() => ecritures(db, CHEMIN).length, { timeout: 10_000 }).toBeGreaterThan(0);
    for (const w of ecritures(db, CHEMIN)) expect(Object.keys(w.data)).not.toContain("editeurs");
    await page.goto("/setlists/sl-privee/edit");
    await expect(page.getByText(/^Seuls le créateur de la setlist/)).toBeVisible();
    await expect(page.locator("[data-liste-courte]")).toHaveCount(0);
  });
});
