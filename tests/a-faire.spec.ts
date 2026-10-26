import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { margeAttendue, zoneDeContenu } from "./helpers/agencement";
import { aFaire, filtrer, type EntreesAFaire, type LigneAFaire } from "../src/lib/tableauDeBord/aFaire";
import type { Evenement } from "../src/types/evenement";
import type { Creneau } from "../src/types/programme";

// Piste A, BO-B (docs/spec-back-office-piste-a.md, BO6) : l'écran « À faire » de /back-office, qui remplace le
// tableau de bord. D'abord la fonction pure (`aFaire`, `filtrer`), puis les écrans sur les cinq dispositions
// (SPECS_GRAND_ECRAN). Aucun nom réel : personnes inventées pour ces tests.

// ─── La fonction pure ────────────────────────────────────────────────────────

// Samedi 24 octobre 2026 : le prochain dimanche est le 25, les quatre suivants vont du 1er au 22 novembre.
const TODAY = "2026-10-24";
const NOW = "2026-10-24T10:00";
const PLEIN = ["Pers. A", "Pers. B", "Pers. C", "Pers. D", "Pers. E", "Pers. F", "Pers. G", "Pers. H", "Pers. I", "Pers. B", ""];
/** Une ligne du Culte : `trous` = colonnes vidées (5 = batterie, 7 = PPT). */
const ligneCulte = (date: string, trous: Record<number, string> = {}) => [date, ...PLEIN.map((v, i) => trous[i] ?? v)];
const REFERENT = { uid: "u-odalys", firstName: "Odalys", lastName: "Fernier", planningName: "", referentSous: ["musiciens"] };
const ROWS = {
  culte: [ligneCulte("2026-10-25", { 5: "" }), ligneCulte("2026-11-08", { 7: "" }), ligneCulte("2026-11-15", { 5: "" })],
};

const evt = (x: Partial<Evenement>) => ({
  id: "e", titre: "E", type: "loisir", pour: "eglise", date: "2026-11-07", heure: "", heureFin: "", dateFin: "", lienExterne: "",
  inscriptions: "ouvertes", inscriptionDebut: "", inscriptionFin: "", placesMax: null, inscrits: 0, expiresAt: null, organisateurUid: "autre", ...x,
}) as Evenement;
const tache = (id: string, echeance: string, x: { resp?: string | null; equipe?: string } = {}) =>
  ({ tache: { id, titre: `T-${id}`, equipe: x.equipe ?? "da", echeance, responsableUid: x.resp ?? null }, date: echeance, fois: null }) as never;

const entrees = (sources: EntreesAFaire["sources"], x: Partial<EntreesAFaire> = {}): EntreesAFaire =>
  ({ sources, today: TODAY, nowIso: NOW, uid: "moi", mesEquipes: [], ...x });
const lignesDe = (r: ReturnType<typeof aFaire>, g: string): LigneAFaire[] => r.groupes.find((x) => x.id === g)?.lignes ?? [];
const ids = (l: LigneAFaire[]) => l.map((x) => x.id);

test.describe("À faire (BO-B) : la fonction pure", () => {
  test("aucune source : aucun groupe, total 0 ; une source absente n'enlève rien aux autres", () => {
    expect(aFaire(entrees({}))).toEqual({ groupes: [], total: 0 });
    const r = aFaire(entrees({ messages: { signalements: 1, propositions: 0 } }));
    expect(r.total).toBe(1);
    expect(r.groupes.map((g) => g.id)).toEqual(["aLire"]);
  });

  test("cases vides : le prochain dimanche en « semaine » (qui relancer), les suivants en « plus tard » (jusqu'au dernier)", () => {
    const r = aFaire(entrees({ planning: { rows: ROWS, plannings: ["culte"], profils: [REFERENT] } }));
    expect(r.groupes.map((g) => g.id)).toEqual(["semaine", "plusTard"]);
    const [semaine] = lignesDe(r, "semaine");
    expect(semaine).toMatchObject({
      id: "cases:culte:semaine", sorte: "cases", verbe: "remplir", href: "/back-office/planning/culte", date: "2026-10-25",
      equipes: ["louange"], aMoi: false, planning: "culte", relancer: ["Odalys"],
    });
    expect(semaine.colonnes?.map((c) => c.cle)).toEqual(["batterie"]);
    const [plus] = lignesDe(r, "plusTard");
    expect(plus).toMatchObject({ id: "cases:culte:plusTard", verbe: "remplir", href: "/back-office/planning/culte", date: "2026-11-22" });
    expect(plus.colonnes).toMatchObject([{ cle: "batterie", n: 1 }, { cle: "ppt", n: 1 }]);
    expect([...plus.equipes].sort()).toEqual(["louange", "regie"]);
  });

  test("cases vides : plusieurs référents ou aucun, les prénoms sont distincts", () => {
    const deux = { ...REFERENT, uid: "u-2", firstName: "Thibaut", referentSous: ["presidence"] };
    const rows = { culte: [ligneCulte("2026-10-25", { 0: "", 5: "" })] };
    const r = aFaire(entrees({ planning: { rows, plannings: ["culte"], profils: [REFERENT, deux] } }));
    expect(lignesDe(r, "semaine")[0].relancer?.sort()).toEqual(["Odalys", "Thibaut"]);
    const sans = aFaire(entrees({ planning: { rows, plannings: ["culte"], profils: [] } }));
    expect(lignesDe(sans, "semaine")[0].relancer).toEqual([]);
  });

  test("tâches : en retard ou cette semaine, jamais au-delà de J+7 ; verbe « fait », les siennes marquées", () => {
    const r = aFaire(entrees({
      taches: [
        tache("retard", "2026-10-20"), tache("aujourdhui", "2026-10-24", { resp: "moi" }), tache("lundi", "2026-10-26", { equipe: "louange" }),
        tache("loin", "2026-11-05"),
      ],
    }));
    expect(ids(lignesDe(r, "enRetard"))).toEqual(["tache:da:retard:2026-10-20"]);
    expect(ids(lignesDe(r, "semaine"))).toEqual(["tache:da:aujourdhui:2026-10-24", "tache:louange:lundi:2026-10-26"]);
    expect(r.total).toBe(3);
    const [m, l] = lignesDe(r, "semaine");
    // BO16 (c) : « Fait » mène à la tâche elle-même.
    expect(m).toMatchObject({ sorte: "tache", verbe: "fait", href: "/back-office/taches/da/aujourdhui", aMoi: true, equipes: ["da"], titre: "T-aujourdhui" });
    expect(l).toMatchObject({ href: "/back-office/taches/louange/lundi", aMoi: false, equipes: ["louange"] });
  });

  test("BO16 (c) : une tâche répétée mène à celle de ses fois qui est à faire (`?date=`)", () => {
    const repetee = { tache: { id: "hebdo", titre: "Salle", equipe: "da", echeance: "2026-10-26", responsableUid: null, repetition: { tous: 7 } }, date: "2026-10-26", fois: null } as never;
    expect(lignesDe(aFaire(entrees({ taches: [repetee] })), "semaine")[0].href).toBe("/back-office/taches/da/hebdo?date=2026-10-26");
  });

  // BO13 : une personne planifiée qui s'est déclarée absente, une ligne par absence sur les cinq dimanches, jamais le motif.
  test("BO13 : absences en conflit, « Remplacer » vers la grille ; cette semaine ou plus tard selon la date ; sans le motif", () => {
    // Pers. F tient la batterie (colonne 5) ; elle est absente le 25 octobre et le 8 novembre, pas le 15.
    const rows = { culte: [ligneCulte("2026-10-25"), ligneCulte("2026-11-08"), ligneCulte("2026-11-15")] };
    const persF = { uid: "u-persf", firstName: "Pers.", lastName: "F", planningName: "Pers. F", referentSous: [] };
    const absences = [
      { id: "a1", uid: "u-persf", du: "2026-10-24", au: "2026-10-26", motif: "Rendez-vous privé" },
      { id: "a2", uid: "u-persf", du: "2026-11-08", au: "2026-11-08" },
      { id: "a3", uid: "u-autre", du: "2026-10-25", au: "2026-10-25" },
    ];
    const r = aFaire(entrees({ planning: { rows, plannings: ["culte"], profils: [persF], absences } }));
    expect(lignesDe(r, "semaine")).toMatchObject([{
      id: "absence:culte:2026-10-25:batterie:Pers. F", sorte: "absence", verbe: "remplacer", href: "/back-office/planning/culte",
      date: "2026-10-25", equipes: ["louange"], aMoi: false, planning: "culte", nom: "Pers. F", colonnes: [{ cle: "batterie" }],
    }]);
    expect(lignesDe(r, "plusTard")).toMatchObject([{ id: "absence:culte:2026-11-08:batterie:Pers. F", sorte: "absence", date: "2026-11-08" }]);
    expect(r.total).toBe(2);
    expect(JSON.stringify(r)).not.toContain("Rendez-vous");
    // Sans les absences (pas le droit de les voir) : aucune ligne d'absence.
    expect(aFaire(entrees({ planning: { rows, plannings: ["culte"], profils: [persF] } })).total).toBe(0);
    // « Mes équipes » : l'absence est à Louange.
    expect(filtrer(r, "mesEquipes", ["louange"]).total).toBe(2);
    expect(filtrer(r, "mesEquipes", ["da"]).total).toBe(0);
  });

  test("inscriptions : celles de ses évènements qui ferment bientôt, avec inscrits et places", () => {
    const sien = evt({ id: "sien", titre: "Atelier", organisateurUid: "moi", inscriptions: "auto", inscriptionFin: "2026-10-27", placesMax: 12, inscrits: 5, date: "2026-11-01" });
    const equipe = evt({ id: "eq", pour: "equipe:da", reunion: false, date: "2026-10-30", heure: "19:00", inscrits: 2 });
    const pasLeSien = evt({ id: "autre", date: "2026-10-26" });
    const tardif = evt({ id: "tard", organisateurUid: "moi", date: "2026-11-30" });
    const reunion = evt({ id: "reu", organisateurUid: "moi", pour: "equipe:da", date: "2026-10-26", reunion: true });
    const r = aFaire(entrees({ evenements: [sien, equipe, pasLeSien, tardif, reunion] }, { mesEquipes: ["da"] }));
    expect(ids(lignesDe(r, "semaine"))).toEqual(["inscriptions:eq", "inscriptions:sien"]);
    expect(lignesDe(r, "semaine")[1]).toMatchObject({
      sorte: "inscriptions", verbe: "voirInscrits", href: "/back-office/evenements/sien", aMoi: true, titre: "Atelier",
      inscriptions: { cas: "places", inscrits: 5, max: 12 },
    });
    expect(lignesDe(r, "semaine")[0]).toMatchObject({ equipes: ["da"], inscriptions: { cas: "sansLimite", inscrits: 2 } });
  });

  test("scène : une ligne par évènement avec le nombre de passages vides ; « semaine » jusqu'à J+7, sinon « plus tard »", () => {
    const c = (id: string, dimanche: string, qui: string[]) => ({ id, dimanche, qui }) as Creneau;
    const creneaux = [c("a", "2026-10-25", []), c("b", "2026-10-25", ["Gp Paix"]), c("c", "2026-11-08", ["  "]), c("d", "2026-11-08", []), c("e", "2026-10-18", [])];
    // Inscriptions fermées : seule la scène compte ici.
    const proche = evt({ id: "proche", titre: "Veillée", organisateurUid: "moi", date: "2026-10-25", dateFin: "", inscriptions: "fermees" });
    const loin = evt({ id: "loin", titre: "Fête", organisateurUid: "moi", date: "2026-11-08", inscriptions: "fermees" });
    const passe = evt({ id: "passe", organisateurUid: "moi", date: "2026-10-18", inscriptions: "fermees" });
    const r = aFaire(entrees({ evenements: [proche, loin, passe], creneaux }));
    expect(lignesDe(r, "semaine")).toMatchObject([{ id: "scene:proche", sorte: "scene", verbe: "attribuer", href: "/back-office/evenements/scene", date: "2026-10-25", nombre: 1, aMoi: true }]);
    expect(lignesDe(r, "plusTard")).toMatchObject([{ id: "scene:loin", date: "2026-11-08", nombre: 2 }]);
    // Sans les créneaux (lecture échouée), les inscriptions restent, la scène s'en va.
    expect(aFaire(entrees({ evenements: [proche, loin] })).total).toBe(0);
  });

  test("compte rendu : « en retard », une seule ligne même si deux réunions suivent la même", () => {
    const precedente = evt({ id: "p", titre: "Point", pour: "equipe:da", reunion: true, date: "2026-10-13" });
    const r = aFaire(entrees({
      reunions: [
        { reunion: evt({ id: "r1", reunion: true }), precedenteSansCompteRendu: precedente },
        { reunion: evt({ id: "r2", reunion: true }), precedenteSansCompteRendu: precedente },
        { reunion: evt({ id: "r3", reunion: true }), precedenteSansCompteRendu: null },
      ],
    }));
    expect(lignesDe(r, "enRetard")).toMatchObject([{
      id: "compteRendu:p", sorte: "compteRendu", verbe: "compteRendu", href: "/back-office/reunions/p", date: "2026-10-13", aMoi: true, equipes: ["da"],
    }]);
    expect(r.total).toBe(1);
  });

  test("à lire ou à relier : messages (si > 0), noms sans compte (si > 0)", () => {
    const r = aFaire(entrees({
      messages: { signalements: 2, propositions: 1 },
      comptes: { noms: ["Pers. A", "pers b", "Pers. C"], profils: [{ planningName: "Pers. A" }] },
    }));
    expect(lignesDe(r, "aLire")).toMatchObject([
      { id: "comptes", sorte: "comptes", verbe: "relier", href: "/back-office/equipes/personnes/sans-compte", nombre: 2 },
      { id: "messages", sorte: "messages", verbe: "lire", href: "/back-office/messages", nombre: 3, signalements: 2, propositions: 1 },
    ]);
    const rien = aFaire(entrees({ messages: { signalements: 0, propositions: 0 }, comptes: { noms: ["Pers. A"], profils: [{ planningName: "Pers. A" }] } }));
    expect(rien.total).toBe(0);
  });

  test("tri : date croissante, sans date à la fin, puis les siennes d'abord, puis l'identifiant ; groupes dans l'ordre, vides omis", () => {
    const r = aFaire(entrees({
      taches: [
        tache("b", "2026-10-26"), tache("a", "2026-10-26"), tache("moi", "2026-10-26", { resp: "moi" }), tache("tot", "2026-10-24"),
        tache("r2", "2026-10-02"), tache("r1", "2026-10-01"),
      ],
      messages: { signalements: 1, propositions: 0 },
    }));
    expect(r.groupes.map((g) => g.id)).toEqual(["enRetard", "semaine", "aLire"]);
    expect(ids(lignesDe(r, "enRetard"))).toEqual(["tache:da:r1:2026-10-01", "tache:da:r2:2026-10-02"]);
    expect(ids(lignesDe(r, "semaine"))).toEqual(["tache:da:tot:2026-10-24", "tache:da:moi:2026-10-26", "tache:da:a:2026-10-26", "tache:da:b:2026-10-26"]);
    // Dans un groupe, une ligne sans date passe après les datées.
    const mix = aFaire(entrees({
      planning: { rows: { culte: [ligneCulte("2026-11-08", { 7: "" })] }, plannings: ["culte"], profils: [] },
      messages: { signalements: 1, propositions: 0 }, comptes: { noms: ["Pers. X"], profils: [] },
    }));
    expect(ids(lignesDe(mix, "aLire"))).toEqual(["comptes", "messages"]);
  });

  test("total : toutes les lignes de tous les groupes", () => {
    const r = aFaire(entrees({
      planning: { rows: ROWS, plannings: ["culte"], profils: [REFERENT] },
      taches: [tache("retard", "2026-10-20"), tache("sem", "2026-10-26")],
      messages: { signalements: 1, propositions: 1 },
    }));
    expect(r.total).toBe(5);
    expect(r.groupes.reduce((n, g) => n + g.lignes.length, 0)).toBe(5);
  });

  test("filtre « Mes équipes » : les siennes et celles de ses équipes ; une ligne sans équipe disparaît ; total recalculé", () => {
    const r = aFaire(entrees({
      planning: { rows: ROWS, plannings: ["culte"], profils: [REFERENT] },
      taches: [tache("mienne", "2026-10-20", { resp: "moi", equipe: "regie" }), tache("da", "2026-10-26"), tache("autre", "2026-10-26", { equipe: "louange" })],
      messages: { signalements: 1, propositions: 0 },
    }, { mesEquipes: ["da"] }));
    expect(filtrer(r, "tout", ["da"])).toBe(r);
    const f = filtrer(r, "mesEquipes", ["da"]);
    expect(f.groupes.map((g) => g.id)).toEqual(["enRetard", "semaine"]);
    expect(ids(f.groupes.flatMap((g) => g.lignes))).toEqual(["tache:regie:mienne:2026-10-20", "tache:da:da:2026-10-26"]);
    expect(f.total).toBe(2);
    // Les cases de Louange et de la Régie s'ajoutent si l'on en est.
    const lou = filtrer(r, "mesEquipes", ["louange"]);
    expect(ids(lou.groupes.flatMap((g) => g.lignes))).toContain("cases:culte:semaine");
    expect(ids(lou.groupes.flatMap((g) => g.lignes))).not.toContain("messages");
    expect(filtrer(aFaire(entrees({ messages: { signalements: 1, propositions: 0 } })), "mesEquipes", ["da"])).toEqual({ groupes: [], total: 0 });
  });
});

// ─── Les écrans ──────────────────────────────────────────────────────────────

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Noémie", lastName: "T.", dansEquipes: ["da"] };
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", dansEquipes: ["evenementiel"], referentDe: ["evenementiel"], coordination: true };

const reunion = (titre: string, date: string, x: Record<string, unknown> = {}) => ({
  titre, type: "eglise", pour: "equipe:evenementiel", reunion: true, date, heure: "20:00", placesMax: null, inscrits: 0, ...x,
});
const CULTE_PLEIN = {
  presidence: "Pers. A", choriste1: "Pers. B", choriste2: "Pers. C", piano: "Pers. D", guitare: "Pers. E",
  batterie: "Pers. F", sono: "Pers. G", ppt: "Pers. H", orateur: "Pers. I", traduction: "Pers. B",
};
/** Samedi 24 octobre 2026, 10:00 : tout ce qu'il faut pour que chaque sorte de ligne existe, une fois. */
const JEU: Record<string, Record<string, unknown>> = {
  // Cases : le 25 sans batterie (cette semaine), le 1er novembre sans PPT (plus tard).
  "plannings/culte/dimanches/2026-10-25": { date: "2026-10-25", ...CULTE_PLEIN, batterie: "" },
  "plannings/culte/dimanches/2026-11-01": { date: "2026-11-01", ...CULTE_PLEIN, ppt: "" },
  "users/uid-odalys": {
    email: "odalys@example.com", firstName: "Odalys", lastName: "F.", planningName: "", serviceRoles: {}, annonces: [], notify: [],
    dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"],
  },
  // Tâches : une en retard, une du jour (la mienne), une de lundi (équipe DA).
  "equipes/evenementiel/taches/t1": { titre: "Affiche de l'atelier", responsableUid: null, responsableNom: "", echeance: "2026-10-20", repetition: null },
  "equipes/evenementiel/taches/t3": { titre: "Clés de la salle", responsableUid: "uid-admin", responsableNom: "Noémie", echeance: "2026-10-24", repetition: null },
  "equipes/da/taches/t2": { titre: "Fond du culte", responsableUid: null, responsableNom: "", echeance: "2026-10-26", repetition: null },
  // Évènement organisé par l'admin : inscriptions qui ferment le 27, un passage de scène sans personne le 1er novembre.
  "evenements/e1": {
    titre: "Atelier cuisine", type: "loisir", pour: "eglise", date: "2026-11-01", heure: "15:00", placesMax: 12, inscrits: 5,
    inscriptions: "auto", inscriptionFin: "2026-10-27", organisateurUid: "uid-admin",
  },
  "programmes/p1": { nom: "Noël", jourJ: "2026-12-20", debut: "2026-09-27", visible: true, passages: [], createdBy: "uid-admin", updatedAt: "" },
  "programmes/p1/creneaux/c1": { dimanche: "2026-11-01", debut: "16:00", fin: "17:00", quoi: "Danse", qui: [], note: "" },
  // Réunions : la passée sans compte rendu, la prochaine.
  "evenements/r0": reunion("Point des bâtisseurs", "2026-10-13"),
  "evenements/r1": reunion("Point des bâtisseurs", "2026-11-03", { lieu: "salle 2" }),
  // Un signalement et une proposition de chant en attente.
  "reports/rp1": { status: "pending", message: "Accord faux", createdAt: "2026-10-23T10:00:00Z" },
  "songProposals/sp1": { status: "pending", titre: "Un chant", createdAt: "2026-10-23T10:00:00Z" },
};

const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>> = JEU) {
  await page.clock.setFixedTime(new Date("2026-10-24T10:00:00"));
  await sansSheet(page);
  return signInAs(page, qui, docs, "/back-office");
}

const lignes = (page: Page) => page.getByTestId("ligne-a-faire");
const ligne = (page: Page, texte: string | RegExp) => lignes(page).filter({ hasText: texte });
/** L'alerte de la page (le Next route announcer porte aussi `role="alert"`). */
const alerte = (page: Page) => page.getByRole("alert").filter({ hasText: /Une partie|部分/ });
const barreMontree = (page: Page) => page.evaluate(() =>
  window.matchMedia("(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)").matches);

test.describe("À faire (BO-B) : l'écran", () => {
  test("l'admin : les quatre groupes dans l'ordre, la plus urgente en premier, chaque bouton à son verbe et à son adresse", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(page.getByRole("heading", { level: 1, name: "À faire" })).toBeVisible();
    await expect(page.getByText("Samedi 24 octobre, le plus urgent en premier")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /^(En retard|Cette semaine|Plus tard|À lire ou à relier)$/ }))
      .toHaveText(["En retard", "Cette semaine", "Plus tard", "À lire ou à relier"]);
    await expect(lignes(page)).toHaveCount(10);

    const groupe = (id: string) => page.getByTestId(`groupe-${id}`).getByTestId("ligne-a-faire");
    await expect(groupe("enRetard")).toHaveText([/Point des bâtisseurs/, /Affiche de l'atelier/]);
    await expect(groupe("semaine")).toHaveText([/Clés de la salle/, /Culte Franco\s: Batterie/, /Fond du culte/, /Atelier cuisine/]);
    await expect(groupe("plusTard")).toHaveText([/Scène\s: Atelier cuisine/, /Culte Franco\s: PPT/]);
    await expect(groupe("aLire")).toHaveText([/Noms du planning sans compte/, /Messages à lire/]);

    const bouton = (texte: string | RegExp, verbe: string) => ligne(page, texte).getByRole("link", { name: new RegExp(`^${verbe}`) });
    await expect(bouton("Point des bâtisseurs", "Écrire le compte rendu")).toHaveAttribute("href", /\/back-office\/reunions\/r0\/?$/);
    // BO16 (c) : « Fait » mène à la tâche.
    await expect(bouton("Affiche de l'atelier", "Fait")).toHaveAttribute("href", /\/back-office\/taches\/evenementiel\/t1\/?$/);
    await expect(bouton("Fond du culte", "Fait")).toHaveAttribute("href", /\/back-office\/taches\/da\/t2\/?$/);
    await expect(bouton("Culte Franco : Batterie", "Remplir")).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
    await expect(bouton("Culte Franco : PPT", "Remplir")).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
    await expect(bouton("les inscriptions ferment bientôt", "Voir les inscrits")).toHaveAttribute("href", /\/back-office\/evenements\/e1\/?$/);
    await expect(bouton("Scène : Atelier cuisine", "Attribuer")).toHaveAttribute("href", /\/back-office\/evenements\/scene\/?$/);
    await expect(bouton("Messages à lire", "Lire")).toHaveAttribute("href", /\/back-office\/messages\/?$/);
    await expect(bouton("Noms du planning sans compte", "Relier")).toHaveAttribute("href", /\/back-office\/equipes\/personnes\/sans-compte\/?$/);
  });

  test("chaque ligne : titre, une ligne de contexte, bouton nommé « verbe : titre » et assez haut pour le doigt", async ({ page }) => {
    await ouvrir(page, ADMIN);
    const batterie = ligne(page, "Culte Franco : Batterie");
    await expect(batterie).toContainText("Dimanche 25 octobre, à relancer : Odalys");
    await expect(page.getByRole("link", { name: "Remplir : Culte Franco : Batterie" })).toBeVisible();
    await expect(ligne(page, "Culte Franco : PPT")).toContainText("Jusqu'au 22 novembre");
    await expect(ligne(page, "Atelier cuisine : les inscriptions")).toContainText("5 inscrits sur 12 places");
    await expect(ligne(page, "Scène : Atelier cuisine")).toContainText("1 passage sans personne, dès le 1er novembre");
    await expect(ligne(page, "Messages à lire")).toContainText("1 signalement · 1 proposition de chant");
    await expect(ligne(page, "Noms du planning sans compte")).toContainText("noms à relier à un compte");
    for (const b of await page.getByTestId("ligne-a-faire").getByRole("link").all()) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("la tâche en retard a sa date en rouge, la tâche à toi est marquée « À toi »", async ({ page }) => {
    await ouvrir(page, ADMIN);
    const retard = ligne(page, "Affiche de l'atelier");
    await expect(retard).toContainText("en retard depuis le 20/10");
    await expect(retard.getByText("en retard depuis le 20/10")).toHaveCSS("color", "rgb(185, 28, 28)");
    await expect(ligne(page, "Clés de la salle")).toContainText("À toi · pour le 24/10");
    await expect(ligne(page, "Clés de la salle")).toHaveAttribute("data-a-moi", "true");
    await expect(ligne(page, "Fond du culte")).toContainText("pour le 26/10");
    await expect(ligne(page, "Fond du culte").getByText("pour le 26/10")).not.toHaveCSS("color", "rgb(185, 28, 28)");
  });

  test("sombre : la date en retard passe au rouge clair", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(ligne(page, "Affiche de l'atelier").getByText("en retard depuis le 20/10")).toHaveCSS("color", "rgb(248, 113, 113)");
  });

  test("« Mes équipes » : ses lignes et celles de ses équipes ; « Tout » les rend toutes", async ({ page }) => {
    await ouvrir(page, ADMIN);
    const filtre = page.getByRole("group", { name: "Afficher" });
    await expect(filtre.getByRole("button", { name: "Tout" })).toHaveAttribute("aria-pressed", "true");
    await filtre.getByRole("button", { name: "Mes équipes" }).click();
    await expect(filtre.getByRole("button", { name: "Mes équipes" })).toHaveAttribute("aria-pressed", "true");
    // L'admin est de l'équipe DA : sa tâche, les siennes (clés, évènement, scène, compte rendu) ; pas les cases ni les messages.
    await expect(lignes(page)).toHaveText([/Point des bâtisseurs/, /Clés de la salle/, /Fond du culte/, /Atelier cuisine/, /Scène\s: Atelier cuisine/]);
    await expect(page.getByText("Affiche de l'atelier")).toHaveCount(0);
    await expect(page.getByText("Messages à lire")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2, name: "À lire ou à relier" })).toHaveCount(0);
    await filtre.getByRole("button", { name: "Tout" }).click();
    await expect(lignes(page)).toHaveCount(10);
  });

  test("rien à faire : une phrase dans un état, pas de groupe ni de carte", async ({ page }) => {
    await ouvrir(page, ALICE, {});
    const vide = page.getByRole("status").filter({ hasText: "Rien à faire pour l'instant." });
    await expect(vide).toBeVisible();
    await expect(lignes(page)).toHaveCount(0);
    // Aucun groupe dans la liste ; BO-G, 9 : la colonne de droite (barre affichée) reste, avec « Rien de prévu ».
    await expect(page.locator('[data-testid^="groupe-"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasNotText: /^(Ce dimanche|Prochaine réunion)/ })).toHaveCount(0);
    await expect(alerte(page)).toHaveCount(0);
  });

  test("« Mes équipes » sans rien pour ses équipes : « Rien pour tes équipes. »", async ({ page }) => {
    await ouvrir(page, { ...ADMIN, dansEquipes: [] }, { "reports/rp1": JEU["reports/rp1"] });
    // Messages, et les noms du planning sans compte : aucun n'est à une équipe.
    await expect(lignes(page)).toHaveCount(2);
    await page.getByRole("group", { name: "Afficher" }).getByRole("button", { name: "Mes équipes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rien pour tes équipes." })).toBeVisible();
    await expect(lignes(page)).toHaveCount(0);
  });

  test("colonne de droite : « Ce dimanche » et « Prochaine réunion » quand la barre latérale est là, rien sinon", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    const colonne = page.getByTestId("colonne-droite");
    if (!(await barreMontree(page))) {
      await expect(colonne).toHaveCount(0);
      await expect(page.getByText("Prochaine réunion")).toHaveCount(0);
      return;
    }
    await expect(colonne.getByRole("heading", { name: "Ce dimanche, 25 octobre" })).toBeVisible();
    const culte = colonne.getByTestId("service-dimanche").filter({ hasText: "Culte Franco" });
    await expect(culte).toContainText("10:30");
    await expect(culte).toContainText("Présidence Pers. A");
    await expect(culte).toContainText("Sono Pers. G");
    // Les cases vides sont omises : la batterie n'est pas là.
    await expect(culte).not.toContainText("Batterie");
    await expect(colonne.getByRole("link", { name: "Ouvrir le planning" })).toHaveAttribute("href", /\/back-office\/planning\/?$/);
    await expect(colonne.getByRole("heading", { name: "Prochaine réunion" })).toBeVisible();
    const prochaine = colonne.getByRole("link", { name: /Point des bâtisseurs/ });
    await expect(prochaine).toContainText("Mardi 3 novembre, 20:00, salle 2");
    await expect(prochaine).toHaveAttribute("href", /\/back-office\/reunions\/r1\/?$/);
    // BO-G, 1 : elle ne chevauche pas la liste (qui prend le reste de la largeur) et finit sur le bord droit du filtre.
    const liste = (await page.getByTestId("groupe-semaine").locator("ul").boundingBox())!;
    const droite = (await colonne.boundingBox())!;
    expect(liste.x + liste.width, "la liste finit avant la colonne").toBeLessThanOrEqual(droite.x);
  });

  // BO-G, 1 : un seul conteneur de largeur, la colonne de droite et le filtre « Tout | Mes équipes » ont le même bord droit.
  test("BO-G 1 : le filtre et la colonne de droite finissent sur le même bord droit", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    test.skip(!(await barreMontree(page)), "la colonne de droite n'existe qu'avec la barre latérale");
    const colonne = (await page.getByTestId("colonne-droite").boundingBox())!;
    const dernierePilule = (await page.getByRole("group", { name: "Afficher" }).getByRole("button", { name: "Mes équipes" }).boundingBox())!;
    expect(Math.abs(colonne.x + colonne.width - (dernierePilule.x + dernierePilule.width)), "même bord droit").toBeLessThanOrEqual(2);
    const zone = await zoneDeContenu(page);
    const marge = await margeAttendue(page);
    expect(Math.abs(colonne.x + colonne.width - (Math.min(zone.droite, zone.gauche + 1440) - marge)), "à la marge de la zone").toBeLessThanOrEqual(2);
  });

  // BO-G, 2 : sans la barre latérale (téléphone, tablette portrait), les cartes prennent toute la largeur utile.
  test("BO-G 2 : les cartes prennent la largeur utile quand il n'y a pas de colonne de droite", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page).first()).toBeVisible();
    test.skip(await barreMontree(page), "sans barre latérale seulement");
    const marge = await margeAttendue(page);
    const vw = page.viewportSize()!.width;
    for (const carte of await page.getByTestId("groupe-semaine").locator("ul").all()) {
      const largeur = (await carte.boundingBox())!.width;
      expect(Math.round(largeur), "toute la largeur utile").toBeGreaterThanOrEqual(vw - 2 * marge - 2);
    }
  });

  // BO-G, 9 : liste vide (rien pour ses équipes), la colonne de droite reste affichée.
  test("BO-G 9 : liste vide, la colonne de droite (Ce dimanche, Prochaine réunion) reste affichée", async ({ page }) => {
    const docs = {
      "plannings/culte/dimanches/2026-10-25": { date: "2026-10-25", ...CULTE_PLEIN },
      "evenements/r1": reunion("Point des bâtisseurs", "2026-11-03", { lieu: "salle 2" }),
    };
    await ouvrir(page, { ...ADMIN, dansEquipes: [] }, docs);
    await expect(lignes(page).first()).toBeVisible();
    await page.getByRole("group", { name: "Afficher" }).getByRole("button", { name: "Mes équipes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rien pour tes équipes." })).toBeVisible();
    await expect(lignes(page)).toHaveCount(0);
    test.skip(!(await barreMontree(page)), "la colonne de droite n'existe qu'avec la barre latérale");
    const colonne = page.getByTestId("colonne-droite");
    await expect(colonne.getByRole("heading", { name: "Ce dimanche, 25 octobre" })).toBeVisible();
    await expect(colonne.getByRole("heading", { name: "Prochaine réunion" })).toBeVisible();
  });

  // BO-G, 14 : téléphone, le verbe reste sur la ligne, en « Verbe › » à droite ; c'est le titre qui se coupe.
  test("BO-G 14 : téléphone, « Écrire le compte rendu › » reste à droite sur la ligne du titre", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone seulement");
    await ouvrir(page, ADMIN);
    const rangee = ligne(page, "Point des bâtisseurs").first();
    await expect(rangee).toBeVisible();
    const verbe = (await rangee.getByRole("link").boundingBox())!;
    const titre = (await rangee.locator("b").boundingBox())!;
    const r = (await rangee.boundingBox())!;
    expect(verbe.y, "le verbe n'est pas passé sous le titre").toBeLessThan(titre.y + titre.height);
    expect(verbe.x, "…il est à droite du titre").toBeGreaterThanOrEqual(titre.x + titre.width - 1);
    expect(verbe.x + verbe.width, "dans la ligne").toBeLessThanOrEqual(r.x + r.width);
    expect(await rangee.evaluate((li) => li.scrollWidth - li.clientWidth), "rien ne déborde").toBeLessThanOrEqual(0);
    await expect(rangee.getByRole("link").locator("svg")).toHaveCount(1);
    // BO16 (b) : le verbe passe sur deux lignes plutôt que de couper tôt le titre, qui tient en entier sur deux lignes.
    expect(await rangee.locator("b").evaluate((b) => b.scrollHeight - b.clientHeight), "le titre n'est pas coupé").toBeLessThanOrEqual(1);
    expect(titre.width, "le titre a au moins la moitié de la ligne").toBeGreaterThanOrEqual(r.width / 2 - 60);
  });

  // BO-G, 9 : la carte reste, vide, au lieu d'être omise (barre latérale affichée : la colonne de droite n'existe que là).
  test("sans réunion à venir, le bloc « Prochaine réunion » dit « Rien de prévu »", async ({ page }) => {
    const { "evenements/r1": _r1, ...sans } = JEU;
    void _r1;
    await ouvrir(page, ADMIN, sans);
    await expect(lignes(page).first()).toBeVisible();
    if (await barreMontree(page)) {
      const bloc = page.getByRole("region", { name: "Prochaine réunion" });
      await expect(bloc).toContainText("Rien de prévu pour l'instant.");
      await expect(bloc.getByRole("link")).toHaveCount(0);
    } else {
      await expect(page.getByText("Prochaine réunion")).toHaveCount(0);
    }
  });

  test("la pastille d'À faire dans la barre latérale compte les lignes (barre affichée seulement)", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page)).toHaveCount(10);
    if (!(await barreMontree(page))) {
      // L'icône Messages de l'en-tête garde sa pastille ; À faire n'en a pas hors de la barre latérale.
      await expect(page.getByTestId("pastille").filter({ hasText: "10" })).toHaveCount(0);
      return;
    }
    const entree = page.getByTestId("barre-laterale").getByRole("link", { name: "À faire" });
    await expect(entree.getByTestId("pastille")).toHaveText("10");
    // Messages garde la sienne : signalements + propositions.
    await expect(page.getByTestId("barre-laterale").getByRole("link", { name: "Messages" }).getByTestId("pastille")).toHaveText("2");
  });

  test("ni « Personnaliser », ni grille de widgets, ni widget : une disposition enregistrée n'a plus d'effet", async ({ page }) => {
    await ouvrir(page, ADMIN, {
      ...JEU,
      "backOffice/uid-admin": { tableauDeBord: [{ id: "calendrier", taille: "m", reglages: {} }], versionTableau: 2, majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Personnaliser/ })).toHaveCount(0);
    await expect(page.getByTestId("grille-widgets")).toHaveCount(0);
    for (const nom of ["Calendrier", "Chants les plus joués", "Setlists à préparer", "Petit déj", "Raccourcis", "Ce dimanche"]) {
      await expect(page.getByRole("region", { name: nom, exact: true })).toHaveCount(0);
    }
  });

  test("une source en échec ne vide pas la liste : une ligne discrète le dit, les autres lignes restent", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(lignes(page)).toHaveCount(10);
    // Posée après la base simulée, cette route passe avant elle ; le rechargement relit tout.
    await page.route(/:runQuery$/, (route) =>
      route.request().postData()?.includes("songProposals")
        ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refusé" } }) })
        : route.fallback());
    await page.reload();
    await expect(alerte(page)).toContainText("Une partie de la liste n'a pas pu être lue");
    await expect(lignes(page)).toHaveCount(9);
    await expect(page.getByText("Messages à lire")).toHaveCount(0);
    await expect(ligne(page, "Culte Franco : Batterie")).toBeVisible();
  });

  test("toutes les lectures en échec : l'alerte, jamais « Rien à faire »", async ({ page }) => {
    await ouvrir(page, ADMIN, { "reports/rp1": JEU["reports/rp1"] });
    await page.route(/:runQuery$/, (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refusé" } }) }));
    await page.reload();
    await expect(alerte(page)).toBeVisible();
    await expect(page.getByText("Rien à faire pour l'instant.")).toHaveCount(0);
  });

  test("le Google Sheet qui ne répond pas ne bloque pas À faire", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-24T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.abort());
    await signInAs(page, ADMIN, JEU, "/back-office");
    await expect(lignes(page)).toHaveCount(10);
    await expect(alerte(page)).toHaveCount(0);
  });

  test("Alice (référente de TEAM ÉVÉNEMENTIEL) : ses tâches, sans les lignes réservées aux admins", async ({ page }) => {
    await ouvrir(page, ALICE);
    await expect(lignes(page)).toHaveText([/Point des bâtisseurs/, /Affiche de l'atelier/, /Clés de la salle/]);
    await expect(page.getByText("Messages à lire")).toHaveCount(0);
    await expect(page.getByText("Noms du planning sans compte")).toHaveCount(0);
    await expect(page.getByText("Fond du culte")).toHaveCount(0);
  });

  test("中文 : les groupes, les verbes et le sélecteur", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ADMIN);
    await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /^(已逾期|本周|稍后|待阅读或关联)$/ })).toHaveText(["已逾期", "本周", "稍后", "待阅读或关联"]);
    await expect(page.getByRole("link", { name: /^填写/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^查看报名/ })).toBeVisible();
    await expect(page.getByRole("group", { name: "显示" }).getByRole("button", { name: "我的团队" })).toBeVisible();
    await expect(page.getByText("Rien à faire")).toHaveCount(0);
    // BO-G, 11 : les dates suivent la langue, plus de jj/mm codé en dur.
    await expect(ligne(page, "Affiche de l'atelier")).toContainText("自 10月20日 起逾期");
    await expect(ligne(page, "Clés de la salle")).toContainText("10月24日");
    await expect(lignes(page).filter({ hasText: /\d\d\/\d\d/ })).toHaveCount(0);
    await page.getByRole("group", { name: "显示" }).getByRole("button", { name: "我的团队" }).click();
    await expect(lignes(page).first()).toBeVisible();
  });

  test("中文 : rien à faire", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ALICE, {});
    await expect(page.getByRole("status").filter({ hasText: "目前没有待办事项。" })).toBeVisible();
  });

  // BO13 : Pers. F, à la batterie le 1er novembre (le 25, la batterie est vide), s'est déclarée absente ce jour-là.
  const AVEC_ABSENCE = {
    ...JEU,
    "users/uid-persf": {
      email: "persf@example.com", firstName: "Pers.", lastName: "F", planningName: "Pers. F", serviceRoles: {}, annonces: [], notify: [], dansEquipes: ["louange"],
    },
    "users/uid-persf/absences/a1": { du: "2026-11-01", au: "2026-11-01", motif: "Voyage en famille" },
  };

  test("BO13 : l'absence en conflit, « Remplacer » vers la grille du planning, sans le motif", async ({ page }) => {
    await ouvrir(page, ADMIN, AVEC_ABSENCE);
    await expect(lignes(page)).toHaveCount(11);
    const absence = ligne(page, "Pers. F est absent·e");
    await expect(absence).toHaveAttribute("data-sorte", "absence");
    await expect(absence).toContainText("Batterie, Culte Franco, dimanche 1er novembre");
    await expect(page.getByTestId("groupe-plusTard").getByTestId("ligne-a-faire").filter({ hasText: "Pers. F" })).toHaveCount(1);
    const bouton = page.getByRole("link", { name: "Remplacer : Pers. F est absent·e, Batterie, Culte Franco, dimanche 1er novembre" });
    await expect(bouton).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
    await expect(page.getByText("Voyage en famille")).toHaveCount(0);
    expect((await bouton.boundingBox())!.height).toBeGreaterThanOrEqual(40);
  });

  test("BO13 : les absences illisibles ne retirent pas les cases vides ; la liste se dit incomplète", async ({ page }) => {
    await ouvrir(page, ADMIN, AVEC_ABSENCE);
    await expect(lignes(page)).toHaveCount(11);
    await page.route(/:runQuery$/, (route) =>
      // Une coupure réseau (un refus 403 rend une liste vide, `listerToutesAbsences`).
      route.request().postData()?.includes('"absences"') ? route.abort() : route.fallback());
    await page.reload();
    await expect(alerte(page)).toBeVisible();
    await expect(ligne(page, "Culte Franco : Batterie")).toBeVisible();
    await expect(page.getByTestId("ligne-a-faire").filter({ hasText: "Pers. F" })).toHaveCount(0);
  });

  test("BO13 : qui ne remplit aucun planning ne voit aucune absence", async ({ page }) => {
    await ouvrir(page, ALICE, AVEC_ABSENCE);
    await expect(lignes(page).first()).toBeVisible();
    await expect(page.getByTestId("ligne-a-faire").filter({ hasText: "Pers. F" })).toHaveCount(0);
  });

  test("BO13 · 中文 : 已请假, 找人顶替", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await ouvrir(page, ADMIN, AVEC_ABSENCE);
    const absence = ligne(page, "Pers. F 已请假");
    await expect(absence).toContainText("11月1日主日");
    await expect(absence.getByRole("link", { name: /^找人顶替：Pers\. F 已请假，/ })).toHaveAttribute("href", /\/back-office\/planning\/culte\/?$/);
    await expect(page.getByText("Voyage en famille")).toHaveCount(0);
  });

  for (const variante of ["clair", "sombre", "zh"] as const) {
    test(`captures d'À faire, ${variante} (à regarder)`, async ({ page }, info) => {
      if (variante === "sombre") await page.emulateMedia({ colorScheme: "dark" });
      if (variante === "zh") await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
      await ouvrir(page, ADMIN, AVEC_ABSENCE);
      await expect(lignes(page)).toHaveCount(11);
      await page.screenshot({ path: `test-results/a-faire-captures/${info.project.name}-${variante}.png`, fullPage: true, animations: "disabled" });
    });
  }
});

// ─── BO16 (e, f) : finitions sans écran ──────────────────────────────────────

test.describe("BO16 : traductions et code mort", () => {
  const racine = path.resolve(__dirname, "..");
  const json = (langue: string) => JSON.parse(readFileSync(path.join(racine, `src/locales/${langue}.json`), "utf8"));
  const cle = (o: Record<string, unknown>, c: string) => c.split(".").reduce<unknown>((x, k) => (x as Record<string, unknown> | undefined)?.[k], o);

  test("(e) 会议记录 partout, plus aucun 会议纪要", () => {
    const zh = readFileSync(path.join(racine, "src/locales/zh-CN.json"), "utf8");
    expect(zh).not.toContain("会议纪要");
    expect(zh).toContain("之后阅读会议记录");
  });

  test("(f) le module des réglages du tableau de bord et les clés orphelines du lot sont retirés (fr et 中文)", () => {
    expect(existsSync(path.join(racine, "src/lib/firebase/backOffice.ts"))).toBe(false);
    // Gardés exprès : cinq specs les importent encore.
    for (const f of ["disposition", "colonnes", "reglages"]) expect(existsSync(path.join(racine, `src/lib/tableauDeBord/${f}.ts`))).toBe(true);
    for (const langue of ["fr", "zh-CN"]) {
      const d = json(langue);
      for (const c of ["backOffice.bonjour", "backOffice.parties.plannings", "backOffice.parties.sansCompte", "backOffice.parties.scene",
        "calendrier.creer", "calendrier.filtreAria", "calendrier.widget", "moi.apercus.membre", "taches.aucuneTache", "taches.sousTitreBackOffice"]) {
        expect(cle(d, c), `${langue} : ${c}`).toBeUndefined();
      }
      // Les voisines encore lues restent.
      expect(cle(d, "backOffice.parties.reunions"), langue).toBeTruthy();
    }
  });
});
