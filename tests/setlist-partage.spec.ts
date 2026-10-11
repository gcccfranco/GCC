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
