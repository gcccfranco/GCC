import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  canCreateEvenement, canSeeEvenement, creatableEvenementPours, equipeDuPour, estDeLaReunion, estReunion, peutAjouterSujet,
  peutOrdonnerSujets, peutRetirerSujet,
} from "../src/lib/access";
import { EQUIPES, rattachementDe } from "../src/lib/equipes/organigramme";
import { recalculerDepuisOrganigramme, recalculerPoles } from "../src/lib/equipes/serveur";
import { destinatairesEvenement } from "../src/lib/evenements/serveur";
import { copieReprise, estRouge, reordonner, reunionsALire, reunionsPrecedentes, sujetsAReprendre, trierSujets } from "../src/lib/reunions/sujets";
import type { Evenement } from "../src/types/evenement";
import type { Sujet } from "../src/types/reunion";
import { lienCompteRendu, sourceDuLien } from "../src/lib/reunions/compteRendu";
import { ligneCompteRendu, ligneVeille, nombreSujetsAAborder, notificationsDuMatin } from "../src/lib/reunions/rappels";
import type { RappelTache } from "../src/lib/taches/messages";

// Lot U6 (docs/spec-back-office.md), tranche R1 : les « Sujets à aborder »
// d'une réunion de pôle — sous-collection evenements/{id}/sujets, droits en
// double (access.ts + firestore.rules), ajout jusqu'au début de la réunion,
// retrait par l'auteur, l'organisateur ou un admin, ordre au glisser et au
// clavier, « traité », non traités en rouge une fois la réunion commencée.
// Tranche R2 (en fin de fichier) : à la création d'une réunion du même pôle
// (« Créer » ou « Dupliquer »), « Reprendre les sujets non traités ? » ; oui =
// recopiés dans la nouvelle (repriseDe) et marqués dans l'ancienne (reprisDans),
// non = rien d'écrit, reproposés la fois suivante ; carte « Réunions précédentes ».
// Tranche R3 (en fin de fichier) : lien du compte rendu (coller, ouvrir, retirer),
// et le rappel du matin qui porte la veille de la réunion et le compte rendu en
// lignes — une seule notification par personne et par jour, FR et 中文.
// Tranche R4 (en fin de fichier) : réunions d'équipe de l'organigramme
// (`pour: "equipe:<id>"`), créées par un référent ou un admin, vues et
// nourries de sujets par les membres de l'équipe (`dansEquipes`, `referentDe`,
// recopiés sur le profil par le serveur), invisibles pour les autres.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** Réunion du pôle DA, samedi 3 octobre à 20:00, organisée par Alice. */
const REUNION = {
  titre: "Réunion DA", type: "loisir", pour: "pole:da", date: "2026-10-03", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
};
const E = { ...REUNION, id: "reunion-da" } as unknown as Evenement;

const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["da"] };
const BRUNO: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "M.", poles: ["da"] };
const CLARA: FakeProfile = { uid: "uid-clara", email: "clara@example.com", firstName: "Clara", lastName: "P.", poles: ["da"] };
const NOE: FakeProfile = { uid: "uid-noe", email: "noe@example.com", firstName: "Noé", lastName: "V.", poles: ["media"] };
const ADMIN: FakeProfile = { uid: "admin1", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
const MUSICIEN: FakeProfile = { uid: "uid-musicien", email: "musicien@example.com", serviceRoles: { "Culte Francophone": ["musicien"] } };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });

function sujet(texte: string, auteur: FakeProfile, creeLe: string, ordre: number, traite = false) {
  return {
    texte, auteurUid: auteur.uid, auteurNom: `${auteur.firstName} ${auteur.lastName}`, creeLe, ordre, traite,
    reprisDans: null, repriseDe: null,
  };
}

// Rangés exprès dans le désordre : la carte trie sur `ordre`.
const SUJETS = {
  "evenements/reunion-da/sujets/s3": sujet("Photos du culte : qui prend le relais en novembre ?", CLARA, "2026-10-01T09:00:00Z", 2),
  "evenements/reunion-da/sujets/s1": sujet("Affiche de Noël : valider le visuel", ALICE, "2026-09-28T09:00:00Z", 0),
  "evenements/reunion-da/sujets/s4": sujet("Budget impression du trimestre", BRUNO, "2026-10-01T12:00:00Z", 3),
  "evenements/reunion-da/sujets/s2": sujet("Fond PPT du culte : nouveau modèle pour l'Avent", BRUNO, "2026-09-30T09:00:00Z", 1),
};
const ORDRE = ["Affiche de Noël", "Fond PPT du culte", "Photos du culte", "Budget impression"];

/** La veille de la réunion, 18:00 (heure de Paris), sauf mention contraire. */
async function ouvrir(page: Page, qui: FakeProfile, quand = "2026-10-02T18:00:00", docs: Record<string, Record<string, unknown>> = SUJETS) {
  await page.clock.setFixedTime(new Date(quand));
  return signInAs(page, qui, { "evenements/reunion-da": REUNION, ...docs }, "/evenements/reunion-da");
}

// « Sujets à aborder » avant le début, « Sujets » après (planches bo-reunion-avant
// et bo-reunion-apres-telephone).
const carte = (page: Page) => page.getByRole("region", { name: /^Sujets/ });
const lignes = (page: Page) => carte(page).getByRole("list", { name: "Sujets à aborder" }).getByRole("listitem");
const champ = (page: Page) => carte(page).getByRole("textbox", { name: "Nouveau sujet" });
const ecritures = (db: Awaited<ReturnType<typeof ouvrir>>, method: string) =>
  db.writes.filter((w) => w.method === method && w.path.startsWith("evenements/reunion-da/sujets"));

async function attendreOrdre(page: Page, attendu: string[]) {
  for (const [i, texte] of attendu.entries()) await expect(lignes(page).nth(i)).toContainText(texte);
}

// ─── Purs : droits (miroir de firestore.rules) ──────────────────────────────

test("droits : est de la réunion le membre du pôle, l'organisatrice et un admin ; pas un autre pôle", () => {
  expect(estDeLaReunion(user(BRUNO), BRUNO, E)).toBe(true);
  expect(estDeLaReunion(user(NOE), NOE, E)).toBe(false);
  expect(estDeLaReunion(user(ADMIN), null, E)).toBe(true);
  expect(estDeLaReunion(user(ALICE), { poles: [] }, E), "l'organisatrice, même sortie du pôle").toBe(true);
  expect(estDeLaReunion(null, null, E)).toBe(false);
  // Le pôle Louange se lit comme pour les tâches : avoir un rôle de service.
  expect(estDeLaReunion(user(MUSICIEN), MUSICIEN, { ...E, pour: "pole:louange" })).toBe(true);
});

test("droits : ajouter jusqu'au début seulement, pour une personne de la réunion", () => {
  expect(peutAjouterSujet(user(BRUNO), BRUNO, E, "2026-10-03T19:59")).toBe(true);
  expect(peutAjouterSujet(user(BRUNO), BRUNO, E, "2026-10-03T20:00")).toBe(false);
  expect(peutAjouterSujet(user(ALICE), ALICE, E, "2026-10-04T09:00")).toBe(false);
  expect(peutAjouterSujet(user(NOE), NOE, E, "2026-10-02T10:00")).toBe(false);
});

test("droits : retirer = l'auteur, l'organisatrice, un admin ; ordonner et cocher = l'organisatrice, un admin", () => {
  const deBruno = { auteurUid: BRUNO.uid };
  expect(peutRetirerSujet(user(BRUNO), E, deBruno)).toBe(true);
  expect(peutRetirerSujet(user(CLARA), E, deBruno)).toBe(false);
  expect(peutRetirerSujet(user(ALICE), E, deBruno)).toBe(true);
  expect(peutRetirerSujet(user(ADMIN), E, deBruno)).toBe(true);
  expect(peutOrdonnerSujets(user(ALICE), E)).toBe(true);
  expect(peutOrdonnerSujets(user(ADMIN), E)).toBe(true);
  expect(peutOrdonnerSujets(user(BRUNO), E)).toBe(false);
  expect(peutOrdonnerSujets(null, E)).toBe(false);
});

test("règles : la sous-collection des sujets reprend les mêmes droits", () => {
  const rules = lire("firestore.rules");
  const debut = rules.indexOf("match /sujets/{sid}");
  expect(debut, "bloc match /sujets/{sid}").toBeGreaterThan(0);
  const bloc = rules.slice(debut, rules.indexOf("}", rules.indexOf("allow delete", debut)));
  expect(bloc).toMatch(/allow read: if signedIn\(\) && estDeLaReunion\(reunion\(id\)\)/);
  expect(bloc).toMatch(/allow create:[\s\S]*estDeLaReunion\(reunion\(id\)\)[\s\S]*auteurUid == request\.auth\.uid/);
  expect(bloc).toMatch(/traite == false/);
  expect(bloc).toMatch(/organise\(id\) && changeSeulement\(\['ordre', 'traite'\]\)/);
  expect(bloc).toMatch(/allow delete: if signedIn\(\) && \(organise\(id\) \|\| resource\.data\.auteurUid == request\.auth\.uid\)/);
  expect(rules).toMatch(/function estDeLaReunion\(e\)[\s\S]*isTachePole\(e\.pour\.split\(':'\)\[1\]\)/);
  expect(rules).toMatch(/function organise\(id\) \{ return isAdmin\(\) \|\| reunion\(id\)\.organisateurUid == request\.auth\.uid; \}/);
});

// ─── Purs : tri, rouge, nouvel ordre ────────────────────────────────────────

const S = (id: string, ordre: number, extra: Partial<Sujet> = {}): Sujet => ({
  id, texte: id, auteurUid: "u", auteurNom: "U", creeLe: `2026-10-01T0${ordre}:00:00Z`, ordre, traite: false,
  reprisDans: null, repriseDe: null, ...extra,
});

test("tri : par ordre, puis par date d'ajout à ordre égal (deux ajouts simultanés)", () => {
  const tries = trierSujets([S("c", 2), S("a", 0), S("b2", 1, { creeLe: "2026-10-01T09:00:00Z" }), S("b1", 1, { creeLe: "2026-10-01T08:00:00Z" })]);
  expect(tries.map((s) => s.id)).toEqual(["a", "b1", "b2", "c"]);
});

test("rouge : réunion commencée, sujet ni traité ni repris", () => {
  expect(estRouge(E, S("a", 0), "2026-10-03T19:59")).toBe(false);
  expect(estRouge(E, S("a", 0), "2026-10-03T20:00")).toBe(true);
  expect(estRouge(E, S("a", 0, { traite: true }), "2026-10-03T21:00")).toBe(false);
  expect(estRouge(E, S("a", 0, { reprisDans: "reunion-nov" }), "2026-10-03T21:00")).toBe(false);
});

test("nouvel ordre : le sujet glissé prend sa place, seuls les sujets déplacés sont réécrits", () => {
  const { sujets, changes } = reordonner([S("a", 0), S("b", 1), S("c", 2), S("d", 3)], 2, 0);
  expect(sujets.map((s) => s.id)).toEqual(["c", "a", "b", "d"]);
  expect(sujets.map((s) => s.ordre)).toEqual([0, 1, 2, 3]);
  expect(changes).toEqual([{ id: "c", ordre: 0 }, { id: "a", ordre: 1 }, { id: "b", ordre: 2 }]);
});

test("libellés : les sujets existent en français et en 中文, clé pour clé", () => {
  const fr = JSON.parse(lire("src/locales/fr.json")).evenements.sujets;
  const zh = JSON.parse(lire("src/locales/zh-CN.json")).evenements.sujets;
  expect(fr.titre).toBe("Sujets à aborder");
  expect(Object.keys(zh).sort()).toEqual(Object.keys(fr).sort());
});

// ─── La carte, côté membre ──────────────────────────────────────────────────

test("membre du pôle, la veille : la carte liste les sujets dans l'ordre, avec auteur et date", async ({ page }) => {
  await ouvrir(page, BRUNO);
  await expect(carte(page).getByRole("heading", { name: "Sujets à aborder", exact: true })).toBeVisible();
  await expect(lignes(page)).toHaveCount(4);
  await attendreOrdre(page, ORDRE);
  await expect(lignes(page).nth(0)).toContainText("Alice Q. · 28/09");
  await expect(carte(page)).toContainText("Chaque personne de la réunion peut en ajouter jusqu'au début");
  await expect(carte(page).getByText("4", { exact: true })).toBeVisible();
});

test("membre du pôle, la veille : il ajoute un sujet, qui va à la fin, à son nom", async ({ page }) => {
  const db = await ouvrir(page, BRUNO);
  await expect(lignes(page)).toHaveCount(4);
  await champ(page).fill("  Décor de la crèche  ");
  await carte(page).getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(lignes(page)).toHaveCount(5);
  await expect(lignes(page).nth(4)).toContainText("Décor de la crèche");
  await expect(lignes(page).nth(4)).toContainText("Bruno M. · 02/10");
  await expect(champ(page)).toHaveValue("");
  const [post] = ecritures(db, "POST");
  expect(post.path).toMatch(/^evenements\/reunion-da\/sujets\/[^/]+$/);
  expect(post.data).toMatchObject({
    texte: "Décor de la crèche", auteurUid: "uid-bruno", auteurNom: "Bruno M.", ordre: 4, traite: false,
    reprisDans: null, repriseDe: null,
  });
  expect(String(post.data.creeLe)).toMatch(/^2026-10-02T/);
});

test("un sujet vide ne s'ajoute pas", async ({ page }) => {
  const db = await ouvrir(page, BRUNO);
  await champ(page).fill("   ");
  await expect(carte(page).getByRole("button", { name: "Ajouter", exact: true })).toBeDisabled();
  expect(ecritures(db, "POST")).toHaveLength(0);
});

test("borne du début (horloge simulée) : à 19:59 le champ est là ; à 20:00 le jour J il disparaît", async ({ page }) => {
  await ouvrir(page, BRUNO, "2026-10-03T19:59:00");
  await expect(champ(page)).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-10-03T20:00:00"));
  await page.reload();
  await expect(lignes(page)).toHaveCount(4);
  await expect(champ(page)).toHaveCount(0);
});

test("borne du début : un ajout tapé avant 20:00 et envoyé après est refusé", async ({ page }) => {
  const db = await ouvrir(page, BRUNO, "2026-10-03T19:59:00");
  await champ(page).fill("Trop tard");
  await page.clock.setFixedTime(new Date("2026-10-03T20:00:30"));
  await carte(page).getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(carte(page)).toContainText("La réunion a commencé : on n'ajoute plus de sujet.");
  await expect(champ(page)).toHaveCount(0);
  await expect(lignes(page)).toHaveCount(4);
  expect(ecritures(db, "POST")).toHaveLength(0);
});

test("retrait : un membre retire ses sujets, pas ceux des autres", async ({ page }) => {
  const db = await ouvrir(page, BRUNO);
  await expect(lignes(page)).toHaveCount(4);
  await expect(carte(page).getByRole("button", { name: /^Retirer/ })).toHaveCount(2);
  await expect(lignes(page).nth(0).getByRole("button", { name: /^Retirer/ })).toHaveCount(0);
  page.on("dialog", (d) => d.accept());
  await lignes(page).nth(3).getByRole("button", { name: "Retirer « Budget impression du trimestre »" }).click();
  await expect(lignes(page)).toHaveCount(3);
  await expect(carte(page)).not.toContainText("Budget impression");
  expect(ecritures(db, "DELETE").map((w) => w.path)).toEqual(["evenements/reunion-da/sujets/s4"]);
});

test("membre : ni poignée ni case à cocher active (l'organisatrice ordonne et coche)", async ({ page }) => {
  await ouvrir(page, BRUNO);
  await expect(lignes(page)).toHaveCount(4);
  await expect(carte(page).getByRole("button", { name: /^Déplacer/ })).toHaveCount(0);
  await expect(carte(page).getByRole("checkbox", { name: "Traité : Affiche de Noël : valider le visuel" })).toBeDisabled();
});

test("non-membre du pôle : ni la réunion ni ses sujets", async ({ page }) => {
  await ouvrir(page, NOE);
  await expect(page.getByText("Évènement introuvable")).toBeVisible();
  await expect(carte(page)).toHaveCount(0);
});

test("un évènement qui n'est pas une réunion n'a pas de sujets", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-02T18:00:00"));
  await signInAs(page, ADMIN, { "evenements/foot": { ...REUNION, titre: "Foot au parc", pour: "eglise" } }, "/evenements/foot");
  await expect(page.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(carte(page)).toHaveCount(0);
});

// ─── La carte, côté organisatrice et admin ──────────────────────────────────

test("organisatrice : elle retire n'importe quel sujet ; un admin aussi", async ({ page }) => {
  await ouvrir(page, ALICE);
  await expect(lignes(page)).toHaveCount(4);
  await expect(carte(page).getByRole("button", { name: /^Retirer/ })).toHaveCount(4);
});

test("admin hors du pôle : il voit la carte, retire et ordonne", async ({ page }) => {
  await ouvrir(page, ADMIN);
  await expect(lignes(page)).toHaveCount(4);
  await expect(carte(page).getByRole("button", { name: /^Retirer/ })).toHaveCount(4);
  await expect(carte(page).getByRole("button", { name: /^Déplacer/ })).toHaveCount(4);
});

test("organisatrice : elle coche « traité », le sujet passe barré", async ({ page }) => {
  const db = await ouvrir(page, ALICE);
  const caseFond = carte(page).getByRole("checkbox", { name: "Traité : Fond PPT du culte : nouveau modèle pour l'Avent" });
  await expect(caseFond).toBeEnabled();
  await caseFond.click();
  await expect(caseFond).toHaveAttribute("aria-checked", "true");
  await expect(lignes(page).nth(1).getByText("Fond PPT du culte : nouveau modèle pour l'Avent")).toHaveCSS("text-decoration-line", "line-through");
  expect(ecritures(db, "PATCH")).toEqual([{ method: "PATCH", path: "evenements/reunion-da/sujets/s2", data: { traite: true } }]);
  await caseFond.click();
  await expect(caseFond).toHaveAttribute("aria-checked", "false");
  expect(ecritures(db, "PATCH").pop()?.data).toEqual({ traite: false });
});

test("organisatrice : elle réordonne en glissant un sujet", async ({ page }) => {
  const db = await ouvrir(page, ALICE);
  await attendreOrdre(page, ORDRE);
  const poignee = lignes(page).nth(2).getByRole("button", { name: /^Déplacer/ });
  // La carte est sous la fiche : la souris n'atteint que ce qui est à l'écran.
  await carte(page).scrollIntoViewIfNeeded();
  const from = (await poignee.boundingBox())!;
  const to = (await lignes(page).nth(0).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 12, { steps: 4 });
  // Le glisser a pris (poignée pressée) avant d'aller plus loin, et le sujet est
  // annoncé à sa nouvelle place avant d'être lâché : sinon, sur une machine
  // chargée, le lâcher part avant que @dnd-kit ait mesuré les cibles.
  await expect(poignee).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 12 });
  await expect(page.getByText("Sujet « Photos du culte : qui prend le relais en novembre ? » en position 1 sur 4.")).toBeAttached();
  await page.mouse.up();
  await attendreOrdre(page, ["Photos du culte", "Affiche de Noël", "Fond PPT du culte", "Budget impression"]);
  // Les écritures partent l'une après l'autre : la dernière peut suivre l'affichage.
  const patchs = () => ecritures(db, "PATCH").map((w) => [w.path.split("/").pop(), w.data]);
  await expect.poll(patchs).toEqual([["s3", { ordre: 0 }], ["s1", { ordre: 1 }], ["s2", { ordre: 2 }]]);
});

test("organisatrice : elle réordonne au clavier (Espace, flèche, Espace)", async ({ page }) => {
  const db = await ouvrir(page, ALICE);
  await attendreOrdre(page, ORDRE);
  const poignee = lignes(page).nth(3).getByRole("button", { name: /^Déplacer/ });
  await poignee.focus();
  // Chaque touche attend l'effet de la précédente, comme le fait une personne :
  // @dnd-kit n'écoute les flèches qu'une fois le sujet saisi.
  await page.keyboard.press("Space");
  await expect(poignee).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowUp");
  await expect(page.getByText("Sujet « Budget impression du trimestre » en position 3 sur 4.")).toBeAttached();
  await page.keyboard.press("Space");
  await attendreOrdre(page, ["Affiche de Noël", "Fond PPT du culte", "Budget impression", "Photos du culte"]);
  const patchs = () => ecritures(db, "PATCH").map((w) => [w.path.split("/").pop(), w.data]);
  await expect.poll(patchs).toEqual([["s4", { ordre: 2 }], ["s3", { ordre: 3 }]]);
});

// ─── Après le début : le rouge ──────────────────────────────────────────────

test("après le début : 3 traités sur 4, le quatrième en rouge, « non traité »", async ({ page }) => {
  const traites = {
    ...SUJETS,
    "evenements/reunion-da/sujets/s1": { ...SUJETS["evenements/reunion-da/sujets/s1"], traite: true },
    "evenements/reunion-da/sujets/s2": { ...SUJETS["evenements/reunion-da/sujets/s2"], traite: true },
    "evenements/reunion-da/sujets/s3": { ...SUJETS["evenements/reunion-da/sujets/s3"], traite: true },
  };
  await ouvrir(page, BRUNO, "2026-10-03T21:30:00", traites);
  await expect(lignes(page)).toHaveCount(4);
  await expect(carte(page).getByRole("heading", { name: "Sujets", exact: true })).toBeVisible();
  await expect(carte(page)).toContainText("3 traités sur 4");
  const rouge = lignes(page).nth(3);
  await expect(rouge).toContainText("Bruno M. · 01/10 · non traité");
  await expect(rouge.getByText("Budget impression du trimestre")).toHaveCSS("color", "rgb(185, 28, 28)");
  await expect(lignes(page).nth(0).getByText("Affiche de Noël : valider le visuel")).not.toHaveCSS("color", "rgb(185, 28, 28)");
  await expect(carte(page)).toContainText("1 sujet non traité : il restera en rouge tant qu'on ne l'a pas repris dans une prochaine réunion.");
  await expect(champ(page)).toHaveCount(0);
});

test("avant le début, rien n'est rouge", async ({ page }) => {
  await ouvrir(page, BRUNO);
  await expect(lignes(page)).toHaveCount(4);
  await expect(lignes(page).nth(3)).not.toContainText("non traité");
});

// ─── Captures, regardées à l'œil ────────────────────────────────────────────

test("captures : la carte avant (organisatrice) et après le début (membre)", async ({ page }, info) => {
  await ouvrir(page, ALICE);
  await expect(lignes(page)).toHaveCount(4);
  await carte(page).screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-avant.png`) });
  await page.clock.setFixedTime(new Date("2026-10-03T21:30:00"));
  await page.reload();
  await expect(lignes(page)).toHaveCount(4);
  await carte(page).getByRole("checkbox", { name: /^Traité : Affiche/ }).click();
  await expect(lignes(page).nth(1)).toContainText("non traité");
  await page.screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-apres.png`), fullPage: true });
});

// ─── R2 : reprise des sujets non traités, réunions précédentes ──────────────

/** Une autre réunion (du pôle DA, sauf `pour` dans `extra`) à une autre date. */
const autreReunion = (date: string, extra: Record<string, unknown> = {}) => ({ ...REUNION, titre: `Réunion DA du ${date}`, date, ...extra });

/** Après la réunion du 3 octobre : trois sujets traités, « Budget impression » laissé. */
const APRES = {
  ...SUJETS,
  "evenements/reunion-da/sujets/s1": { ...SUJETS["evenements/reunion-da/sujets/s1"], traite: true },
  "evenements/reunion-da/sujets/s2": { ...SUJETS["evenements/reunion-da/sujets/s2"], traite: true },
  "evenements/reunion-da/sujets/s3": { ...SUJETS["evenements/reunion-da/sujets/s3"], traite: true },
};

const R = (id: string, date: string, extra: Partial<Evenement> = {}) => ({ ...E, id, date, ...extra }) as Evenement;

test("réunions précédentes : du même public, avant celle-ci (date et heure), la plus récente d'abord", () => {
  const liste = [
    R("juin", "2026-06-06"), R("nov", "2026-11-07"), R("sept", "2026-09-05"), E,
    R("media", "2026-09-12", { pour: "pole:media" }), R("meme-jour-avant", "2026-10-03", { heure: "18:00" }),
  ];
  expect(reunionsPrecedentes(liste, E).map((r) => r.id)).toEqual(["meme-jour-avant", "sept", "juin"]);
});

test("à reprendre : les sujets rouges des réunions commencées, la plus ancienne d'abord, dans leur ordre", () => {
  const lus = [
    { reunion: E, sujets: [S("b", 1), S("a", 0), S("traite", 2, { traite: true }), S("repris", 3, { reprisDans: "x" })] },
    { reunion: R("sept", "2026-09-05"), sujets: [S("vieux", 0)] },
    { reunion: R("oct10", "2026-10-10"), sujets: [S("pas-encore", 0)] },
  ];
  const res = sujetsAReprendre(lus, "2026-10-04T10:00");
  expect(res.map((x) => [x.reunion.id, x.reunion.date, x.sujet.id])).toEqual([
    ["sept", "2026-09-05", "vieux"], ["reunion-da", "2026-10-03", "a"], ["reunion-da", "2026-10-03", "b"],
  ]);
});

test("copie reprise : au nom de qui reprend, auteur d'origine affiché, ni traitée ni reprise, liée à l'ancienne", () => {
  const a = {
    reunion: { id: "reunion-da", date: "2026-10-03" },
    sujet: S("s4", 3, { texte: "Budget", auteurUid: "uid-bruno", auteurNom: "Bruno M.", creeLe: "2026-10-01T12:00:00Z" }),
  };
  expect(copieReprise(a, "uid-alice", 0)).toEqual({
    texte: "Budget", auteurUid: "uid-alice", auteurNom: "Bruno M.", creeLe: "2026-10-01T12:00:00Z", ordre: 0, traite: false,
    reprisDans: null, repriseDe: { reunionId: "reunion-da", date: "2026-10-03" },
  });
});

test("règles R2 : une personne de la réunion marque un sujet repris, une seule fois et rien d'autre ; une copie naît non reprise", () => {
  const rules = lire("firestore.rules");
  const debut = rules.indexOf("match /sujets/{sid}");
  const bloc = rules.slice(debut, rules.indexOf("}", rules.indexOf("allow delete", debut)));
  expect(bloc).toMatch(/estDeLaReunion\(reunion\(id\)\) && resource\.data\.reprisDans == null && changeSeulement\(\['reprisDans'\]\)/);
  expect(bloc).toMatch(/allow create:[\s\S]*request\.resource\.data\.reprisDans == null/);
});

// Relecture du lot U6 : le marquage « repris » ne vaut que pour une réunion du même public.
test("règles R2 : « repris dans » désigne une réunion qui existe, du même pôle ou de la même équipe", () => {
  const rules = lire("firestore.rules");
  const debut = rules.indexOf("match /sujets/{sid}");
  const bloc = rules.slice(debut, rules.indexOf("}", rules.indexOf("allow delete", debut)));
  expect(bloc).toMatch(/changeSeulement\(\['reprisDans'\]\)\s*&& reunion\(request\.resource\.data\.reprisDans\)\.pour == reunion\(id\)\.pour/);
});

// Relecture du lot U6 : la reprise ne relit que les dernières réunions tenues.
test("à reprendre : les sujets des six dernières réunions commencées seulement, ni d'une réunion à venir", () => {
  const dates = ["2026-03-07", "2026-04-04", "2026-05-02", "2026-06-06", "2026-07-04", "2026-09-05", "2026-10-03", "2026-10-10"];
  const liste = dates.map((d) => R(`r-${d}`, d));
  expect(reunionsALire(liste, "2026-10-04T10:00").map((r) => r.date)).toEqual(
    ["2026-10-03", "2026-09-05", "2026-07-04", "2026-06-06", "2026-05-02", "2026-04-04"],
  );
  expect(reunionsALire(liste.slice(0, 2), "2026-10-04T10:00").map((r) => r.date)).toEqual(["2026-04-04", "2026-03-07"]);
});

test("libellés R2 : reprise et réunions précédentes en français et en 中文, clé pour clé", () => {
  const fr = JSON.parse(lire("src/locales/fr.json")).evenements;
  const zh = JSON.parse(lire("src/locales/zh-CN.json")).evenements;
  expect(fr.reprise.titre).toBe("Reprendre les sujets non traités ?");
  expect(fr.precedentes.titre).toBe("Réunions précédentes");
  for (const cle of ["reprise", "precedentes", "sujets"]) expect(Object.keys(zh[cle]).sort(), cle).toEqual(Object.keys(fr[cle]).sort());
});

const question = (page: Page) => page.getByRole("alertdialog", { name: "Reprendre les sujets non traités ?" });
const precedentes = (page: Page) => page.getByRole("region", { name: "Réunions précédentes" });
const sansPush = (page: Page) => page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));

/** Nouvelle réunion du pôle DA par « Créer » (le seul public d'Alice). */
async function creerReunion(page: Page, date: string) {
  await page.goto("/back-office/evenements/nouveau");
  await page.getByLabel("Nom de l'évènement").fill("Réunion DA");
  await expect(page.getByLabel("Public")).toHaveValue("pole:da");
  await page.getByLabel("Date", { exact: true }).fill(date);
  await page.getByLabel("Horaire", { exact: true }).fill("20:00");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
}

/** Id de la réunion créée pendant le test (dernière écrite). */
const creee = (db: Awaited<ReturnType<typeof ouvrir>>) =>
  db.writes.filter((w) => w.method === "POST" && /^evenements\/[^/]+$/.test(w.path)).pop()!.path.split("/")[1];

test("reprise, oui : en dupliquant pour la prochaine, le sujet laissé est recopié, et n'est plus rouge dans l'ancienne", async ({ page }, info) => {
  const db = await ouvrir(page, ALICE, "2026-10-04T10:00:00", APRES);
  await sansPush(page);
  await expect(lignes(page)).toHaveCount(4);
  // Lot U6, B3 : « Dupliquer pour la prochaine » est sur la fiche de gestion, au Back-Office.
  await page.goto("/back-office/evenements/reunion-da");
  await expect(lignes(page)).toHaveCount(4);
  await page.getByRole("link", { name: "Dupliquer pour la prochaine" }).click();
  await page.getByLabel("Date", { exact: true }).fill("2026-11-07");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();

  await expect(question(page)).toBeVisible();
  await expect(question(page)).toContainText("La réunion du 3 octobre en a laissé 1 :");
  await expect(question(page).getByRole("listitem")).toHaveText(["Budget impression du trimestre"]);
  await expect(question(page)).toContainText("Sans reprise, ils restent en rouge dans l'ancienne réunion.");
  // Sans l'animation d'ouverture : la capture montre la question posée, pas son fondu.
  await page.screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-reprise.png`), animations: "disabled" });
  await question(page).getByRole("button", { name: "Oui, les reprendre" }).click();

  await page.waitForURL(/\/evenements\/fake-\d+\/?$/);
  const nouvelle = creee(db);
  expect(page.url()).toContain(`/evenements/${nouvelle}`);
  // La copie, au nom d'Alice qui reprend, garde l'auteur d'origine et sa provenance.
  const copies = db.writes.filter((w) => w.method === "POST" && w.path.startsWith(`evenements/${nouvelle}/sujets/`));
  expect(copies.map((w) => w.data)).toEqual([{
    texte: "Budget impression du trimestre", auteurUid: "uid-alice", auteurNom: "Bruno M.", creeLe: "2026-10-01T12:00:00Z",
    ordre: 0, traite: false, reprisDans: null, repriseDe: { reunionId: "reunion-da", date: "2026-10-03" },
  }]);
  // L'original est marqué repris, et seulement ce champ.
  expect(ecritures(db, "PATCH")).toEqual([{ method: "PATCH", path: "evenements/reunion-da/sujets/s4", data: { reprisDans: nouvelle } }]);
  await expect(lignes(page)).toHaveCount(1);
  await expect(lignes(page).nth(0)).toContainText("Budget impression du trimestre");
  await expect(lignes(page).nth(0)).toContainText("Bruno M. · 01/10 · repris du 3 octobre");

  // L'ancienne réunion : plus rouge, « repris le 7 novembre ».
  await page.goto("/evenements/reunion-da");
  await expect(lignes(page)).toHaveCount(4);
  const repris = lignes(page).nth(3);
  await expect(repris).toContainText("Bruno M. · 01/10 · repris le 7 novembre");
  await expect(repris).not.toContainText("non traité");
  await expect(repris.getByText("Budget impression du trimestre")).not.toHaveCSS("color", "rgb(185, 28, 28)");
  await expect(carte(page)).not.toContainText("sujet non traité");
  // En bas de page : sur téléphone et tablette, la barre du bas ne cache pas le sujet repris.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-repris.png`) });
});

test("reprise, non : rien n'est écrit, le sujet reste rouge et revient à la création suivante", async ({ page }) => {
  const db = await ouvrir(page, ALICE, "2026-10-04T10:00:00", APRES);
  await sansPush(page);
  await expect(lignes(page)).toHaveCount(4);
  for (const date of ["2026-11-07", "2026-12-05"]) {
    await creerReunion(page, date);
    await expect(question(page).getByRole("listitem")).toHaveText(["Budget impression du trimestre"]);
    await question(page).getByRole("button", { name: "Non, les laisser" }).click();
    await page.waitForURL(/\/evenements\/fake-\d+\/?$/);
    await expect(page.getByRole("heading", { name: "Réunion DA" }).first()).toBeVisible();
  }
  expect(db.writes.filter((w) => w.path.includes("/sujets/"))).toEqual([]);
  await page.goto("/evenements/reunion-da");
  await expect(lignes(page).nth(3)).toContainText("Bruno M. · 01/10 · non traité");
});

test("reprise : les sujets laissés par plusieurs réunions du pôle, ni ceux d'un autre pôle, ni ceux d'une réunion à venir", async ({ page }) => {
  const db = await ouvrir(page, ALICE, "2026-10-04T10:00:00", {
    ...APRES,
    "evenements/reunion-sept": autreReunion("2026-09-05"),
    "evenements/reunion-sept/sujets/v1": sujet("Vidéo de rentrée", CLARA, "2026-09-01T09:00:00Z", 0),
    "evenements/reunion-sept/sujets/v2": { ...sujet("Déjà repris", CLARA, "2026-09-01T10:00:00Z", 1), reprisDans: "reunion-da" },
    "evenements/reunion-oct10": autreReunion("2026-10-10"),
    "evenements/reunion-oct10/sujets/f1": sujet("Pas encore discuté", BRUNO, "2026-10-04T08:00:00Z", 0),
    "evenements/reunion-media": autreReunion("2026-09-12", { pour: "pole:media", organisateurUid: "uid-noe" }),
    "evenements/reunion-media/sujets/m1": sujet("Sujet du pôle Média", NOE, "2026-09-10T09:00:00Z", 0),
  });
  await sansPush(page);
  await expect(lignes(page)).toHaveCount(4);
  await creerReunion(page, "2026-11-07");
  await expect(question(page)).toContainText("Les réunions précédentes en ont laissé 2 :");
  await expect(question(page).getByRole("listitem")).toHaveText([/^Vidéo de rentrée.*5 septembre$/, /^Budget impression du trimestre.*3 octobre$/]);
  await question(page).getByRole("button", { name: "Oui, les reprendre" }).click();
  await page.waitForURL(/\/evenements\/fake-\d+\/?$/);
  const nouvelle = creee(db);
  const copies = db.writes.filter((w) => w.method === "POST" && w.path.startsWith(`evenements/${nouvelle}/sujets/`));
  expect(copies.map((w) => [w.data.texte, w.data.ordre, (w.data.repriseDe as { reunionId: string }).reunionId])).toEqual([
    ["Vidéo de rentrée", 0, "reunion-sept"], ["Budget impression du trimestre", 1, "reunion-da"],
  ]);
  expect(db.writes.filter((w) => w.method === "PATCH" && w.path.includes("/sujets/")).map((w) => [w.path, w.data])).toEqual([
    ["evenements/reunion-sept/sujets/v1", { reprisDans: nouvelle }], ["evenements/reunion-da/sujets/s4", { reprisDans: nouvelle }],
  ]);
  await expect(lignes(page)).toHaveCount(2);
  await attendreOrdre(page, ["Vidéo de rentrée", "Budget impression du trimestre"]);
});

test("reprise : sans sujet laissé, pas de question, la réunion se crée directement", async ({ page }) => {
  const toutTraite = { ...APRES, "evenements/reunion-da/sujets/s4": { ...SUJETS["evenements/reunion-da/sujets/s4"], traite: true } };
  const db = await ouvrir(page, ALICE, "2026-10-04T10:00:00", toutTraite);
  await sansPush(page);
  await expect(lignes(page)).toHaveCount(4);
  await creerReunion(page, "2026-11-07");
  await page.waitForURL(/\/evenements\/fake-\d+\/?$/);
  await expect(question(page)).toHaveCount(0);
  expect(db.writes.filter((w) => w.path.includes("/sujets/"))).toEqual([]);
});

test("réunions précédentes : celles du pôle avant celle-ci, la plus récente d'abord, avec leur compte rendu", async ({ page }, info) => {
  const cr = (url: string) => ({ url, parUid: "uid-clara", parNom: "Clara P.", le: "2026-09-06T10:00:00Z" });
  await ouvrir(page, BRUNO, "2026-10-02T18:00:00", {
    ...SUJETS,
    "evenements/reunion-juin": autreReunion("2026-06-06"),
    "evenements/reunion-sept": autreReunion("2026-09-05", { compteRendu: cr("https://docs.google.com/document/d/sept") }),
    "evenements/reunion-juil": autreReunion("2026-07-04", { compteRendu: cr("https://docs.google.com/document/d/juil") }),
    "evenements/reunion-nov": autreReunion("2026-11-07"),
    "evenements/reunion-media": autreReunion("2026-09-12", { pour: "pole:media" }),
  });
  const rangs = precedentes(page).getByRole("listitem");
  await expect(rangs).toHaveCount(3);
  await expect(rangs.nth(0)).toContainText("5 sept.");
  await expect(rangs.nth(0).getByRole("link", { name: "Compte rendu" })).toHaveAttribute("href", "https://docs.google.com/document/d/sept");
  await expect(rangs.nth(1)).toContainText("4 juil.");
  await expect(rangs.nth(1).getByRole("link", { name: "Compte rendu" })).toHaveAttribute("href", "https://docs.google.com/document/d/juil");
  await expect(rangs.nth(2)).toContainText("6 juin");
  await expect(rangs.nth(2)).toContainText("pas de compte rendu");
  await expect(rangs.nth(2).getByRole("link", { name: "Compte rendu" })).toHaveCount(0);
  await page.screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-precedentes.png`), fullPage: true });
  await rangs.nth(0).getByRole("link", { name: "5 sept.", exact: true }).click();
  await page.waitForURL(/\/evenements\/reunion-sept\/?$/);
  await expect(page.getByRole("heading", { name: "Réunion DA du 2026-09-05" })).toBeVisible();
});

test("réunions précédentes : pas de carte pour la première réunion du pôle", async ({ page }) => {
  await ouvrir(page, BRUNO, "2026-10-02T18:00:00", { ...SUJETS, "evenements/reunion-nov": autreReunion("2026-11-07") });
  await expect(lignes(page)).toHaveCount(4);
  await expect(precedentes(page)).toHaveCount(0);
});

// ─── R3 : compte rendu et rappels du matin ──────────────────────────────────

/** Compte rendu de la réunion du 3 octobre, collé par Alice le lendemain. */
const CR = { url: "https://docs.google.com/document/d/oct", parUid: "uid-alice", parNom: "Alice Q.", le: "2026-10-04T09:30:00Z" };

test("lien du compte rendu : tout lien https:// complet, rogné ; rien d'autre (question 12)", () => {
  expect(lienCompteRendu("  https://docs.google.com/document/d/oct  ")).toBe("https://docs.google.com/document/d/oct");
  expect(lienCompteRendu("https://drive.google.com/file/d/abc/view")).toBe("https://drive.google.com/file/d/abc/view");
  expect(lienCompteRendu("https://exemple.org/cr.pdf")).toBe("https://exemple.org/cr.pdf");
  for (const faux of ["", "docs.google.com/document/d/oct", "http://exemple.org/cr", "https://", "javascript:alert(1)", "https://exe mple.org"]) {
    expect(lienCompteRendu(faux), faux).toBeNull();
  }
});

test("source du lien : « Google Doc » pour un document Google, sinon le nom du site", () => {
  expect(sourceDuLien("https://docs.google.com/document/d/oct/edit")).toBe("Google Doc");
  expect(sourceDuLien("https://drive.google.com/file/d/abc/view")).toBe("Google Drive");
  expect(sourceDuLien("https://www.exemple.org/cr.pdf")).toBe("exemple.org");
});

test("règles R3 : une personne de la réunion change le compte rendu, et lui seul, à son nom", () => {
  const rules = lire("firestore.rules");
  const debut = rules.indexOf("match /evenements/{id}");
  const bloc = rules.slice(debut, rules.indexOf("match /inscriptions/{iid}", debut));
  expect(bloc).toMatch(/allow update:[\s\S]*estDeLaReunion\(resource\.data\) && changeSeulement\(\['compteRendu'\]\)/);
  expect(bloc).toMatch(/request\.resource\.data\.compteRendu == null[\s\S]*request\.resource\.data\.compteRendu\.parUid == request\.auth\.uid/);
  expect(bloc).toMatch(/compteRendu\.url\.matches\('https:\/\/.+'\)/);
});

test("libellés R3 : le compte rendu en français et en 中文, clé pour clé", () => {
  const fr = JSON.parse(lire("src/locales/fr.json")).evenements.compteRendu;
  const zh = JSON.parse(lire("src/locales/zh-CN.json")).evenements.compteRendu;
  expect(fr.titre).toBe("Compte rendu");
  expect(fr.enregistrer).toBe("Enregistrer le lien");
  expect(Object.keys(zh).sort()).toEqual(Object.keys(fr).sort());
});

test("veille d'une réunion : « Réunion DA demain, 20:00 : 1 sujet », en français et en 中文", () => {
  expect(nombreSujetsAAborder([S("a", 0), S("b", 1, { traite: true }), S("c", 2, { reprisDans: "x" }), S("d", 3)])).toBe(2);
  expect(ligneVeille(E, 1, "fr")).toBe("Réunion DA demain, 20:00 : 1 sujet");
  expect(ligneVeille(E, 3, "fr")).toBe("Réunion DA demain, 20:00 : 3 sujets");
  expect(ligneVeille(E, 0, "fr"), "sans sujet, pas de compte").toBe("Réunion DA demain, 20:00");
  expect(ligneVeille({ ...E, heure: "" }, 1, "fr")).toBe("Réunion DA demain : 1 sujet");
  expect(ligneVeille(E, 1, "zh-CN")).toBe("明天 20:00：Réunion DA（1 个议题）");
  expect(ligneVeille(E, 0, "zh-CN")).toBe("明天 20:00：Réunion DA");
  // Un évènement à inscriptions garde la phrase du lot 6.
  const foot = { ...E, titre: "Foot au parc", pour: "eglise", heure: "19:00", lieu: "Parc de Bercy" } as Evenement;
  expect(ligneVeille(foot, undefined, "fr")).toBe("Demain : Foot au parc à 19:00, Parc de Bercy");
  expect(ligneVeille(foot, undefined, "zh-CN")).toBe("明天：Foot au parc 19:00，Parc de Bercy");
});

test("compte rendu : la ligne du rappel du lendemain, en français et en 中文", () => {
  expect(ligneCompteRendu(E, "fr")).toBe("Compte rendu ajouté : Réunion DA du 3 octobre");
  expect(ligneCompteRendu(E, "zh-CN")).toBe("会议记录已添加：Réunion DA（10月3日）");
});

/** Une tâche du pôle DA à faire dans 3 jours. */
const RAPPEL_TACHE = {
  tache: {
    id: "t1", pole: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-05", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "uid-alice", createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
  },
  date: "2026-10-05", quand: "J3" as const,
} as unknown as RappelTache;
const SERVICE = { tag: "J3" as const, date: "2026-10-04", services: [{ service: "Culte Franco", roles: ["Piano"] }] };
const VEILLE = { kind: "veille" as const, evenement: E, sujets: 1 };
const COMPTE_RENDU = { kind: "compteRendu" as const, evenement: { ...E, id: "reunion-sept", date: "2026-09-05" } as Evenement };

test("un seul message quand service, tâche et réunion tombent le même jour (FR)", () => {
  const n = notificationsDuMatin({ services: [SERVICE], taches: [RAPPEL_TACHE], lignes: [VEILLE, COMPTE_RENDU] }, "fr", "2026-10-02");
  expect(n).toHaveLength(1);
  expect(n[0]).toMatchObject({ title: "Rappel de service", url: "/mes-services", tag: "rappel-J3-2026-10-04", kind: "reminder" });
  expect(n[0].body).toBe([
    "Dimanche 4 octobre (dans 3 jours) : Culte Franco (Piano)",
    "À faire : Fond PPT (DA), lundi 5 octobre",
    "Réunion DA demain, 20:00 : 1 sujet",
    "Compte rendu ajouté : Réunion DA du 5 septembre",
  ].join("\n"));
});

test("le même message en 中文", () => {
  const n = notificationsDuMatin({ services: [SERVICE], taches: [RAPPEL_TACHE], lignes: [VEILLE] }, "zh-CN", "2026-10-02");
  expect(n).toHaveLength(1);
  expect(n[0].title).toBe("服务提醒");
  expect(n[0].body.split("\n")).toEqual(["10月4日星期日（3天后）：法语崇拜（钢琴）", "待办：Fond PPT（美工），10月5日星期一", "明天 20:00：Réunion DA（1 个议题）"]);
});

test("sans service : tâche et réunion dans un seul message ; réunion seule, un message vers sa fiche", () => {
  const avecTache = notificationsDuMatin({ services: [], taches: [RAPPEL_TACHE], lignes: [VEILLE] }, "fr", "2026-10-02");
  expect(avecTache).toHaveLength(1);
  expect(avecTache[0]).toMatchObject({ title: "Rappel de tâches", url: "/taches", body: "À faire : Fond PPT (DA), lundi 5 octobre\nRéunion DA demain, 20:00 : 1 sujet" });

  const seule = notificationsDuMatin({ services: [], taches: [], lignes: [VEILLE] }, "fr", "2026-10-02");
  expect(seule).toEqual([{ title: "Rappel — Réunion DA", body: "Réunion DA demain, 20:00 : 1 sujet", url: "/evenements/reunion-da", tag: "rappel-evenements-2026-10-02", kind: "evenement" }]);

  const deux = notificationsDuMatin({ services: [], taches: [], lignes: [VEILLE, COMPTE_RENDU] }, "zh-CN", "2026-10-02");
  expect(deux).toHaveLength(1);
  expect(deux[0]).toMatchObject({ title: "活动提醒", url: "/evenements", body: "明天 20:00：Réunion DA（1 个议题）\n会议记录已添加：Réunion DA（9月5日）" });

  const ouverture = { kind: "ouverture" as const, evenement: { ...E, titre: "Foot au parc", pour: "eglise", inscriptionDebut: "2026-10-02T10:00" } as Evenement };
  expect(notificationsDuMatin({ services: [], taches: [], lignes: [ouverture] }, "fr", "2026-10-02")[0])
    .toMatchObject({ title: "Inscriptions ouvertes", body: "Inscriptions ouvertes : Foot au parc (dès 10:00)" });
  expect(notificationsDuMatin({ services: [], taches: [], lignes: [] }, "fr", "2026-10-02")).toEqual([]);
});

test("la ligne du petit déj du mercredi (lot U3) suit les autres lignes ; seule, pas de message ici", () => {
  const PD = ["Dimanche 4 octobre : personne pour le petit déj.", "Ne plus recevoir : Moi › Mon profil › Notifications › Petit déj"];
  const n = notificationsDuMatin({ services: [SERVICE], taches: [], lignes: [VEILLE], autres: PD }, "fr", "2026-09-30");
  expect(n).toHaveLength(1);
  expect(n[0].body.split("\n")).toEqual(["Dimanche 4 octobre (dans 3 jours) : Culte Franco (Piano)", "Réunion DA demain, 20:00 : 1 sujet", ...PD]);
  expect(notificationsDuMatin({ services: [], taches: [], lignes: [], autres: PD }, "fr", "2026-09-30")).toEqual([]);
});

test("le cron fond la veille et le compte rendu dans le rappel du matin : un seul envoi", () => {
  const route = lire("src/app/api/cron/reminders/route.ts");
  expect(route).toContain("notificationsDuMatin(");
  // Deux envois : le passage par personne, et la ligne du petit déj du mercredi
  // pour les comptes qui n'ont rien d'autre ce jour-là (lot U3, PD4).
  expect(route.match(/sendPushToUids\(/g), "le passage par personne, puis le petit déj seul").toHaveLength(2);
  expect(route).toContain("petitDejSeuls = [...petitDej.uids]");
  expect(route, "la veille ne part plus à part").not.toContain("evenementReminder");
  expect(route).toContain('"compteRendu.le"');
});

// La carte « Compte rendu », sur la fiche d'une réunion.
const compteRendu = (page: Page) => page.getByRole("region", { name: "Compte rendu", exact: true });
const lienCR = (page: Page) => compteRendu(page).getByRole("textbox", { name: "Lien du compte rendu" });
const ecrituresReunion = (db: Awaited<ReturnType<typeof ouvrir>>) =>
  db.writes.filter((w) => w.method === "PATCH" && w.path === "evenements/reunion-da");

test("compte rendu : un membre colle le lien après la réunion ; seul le champ compteRendu est écrit, à son nom", async ({ page }) => {
  const db = await ouvrir(page, BRUNO, "2026-10-04T10:00:00");
  await expect(compteRendu(page)).toContainText("Après la réunion, toute personne de la réunion (ou un admin) colle ici le lien du Google Doc du récap ; les autres sont prévenus dans le rappel du matin.");
  await lienCR(page).fill("docs.google.com/document/d/oct");
  await compteRendu(page).getByRole("button", { name: "Enregistrer le lien" }).click();
  await expect(compteRendu(page).getByRole("alert")).toHaveText("Colle un lien complet, qui commence par https://");
  expect(ecrituresReunion(db)).toHaveLength(0);

  await lienCR(page).fill("  https://docs.google.com/document/d/oct  ");
  await compteRendu(page).getByRole("button", { name: "Enregistrer le lien" }).click();
  await expect.poll(() => ecrituresReunion(db).length).toBe(1);
  const ecrit = ecrituresReunion(db)[0].data;
  expect(Object.keys(ecrit)).toEqual(["compteRendu"]);
  expect(ecrit.compteRendu).toMatchObject({ url: "https://docs.google.com/document/d/oct", parUid: "uid-bruno", parNom: "Bruno M." });
  expect(String((ecrit.compteRendu as { le: string }).le)).toMatch(/^2026-10-04T/);
  await expect(compteRendu(page)).toContainText("Google Doc · ajouté par Bruno M. le 4 oct.");
  await expect(compteRendu(page).getByRole("link", { name: "Ouvrir" })).toHaveAttribute("href", "https://docs.google.com/document/d/oct");

  await page.reload();
  await expect(compteRendu(page)).toContainText("Google Doc · ajouté par Bruno M. le 4 oct.");
});

test("compte rendu : on l'ouvre dans un nouvel onglet ; une personne de la réunion le retire", async ({ page }) => {
  const db = await ouvrir(page, CLARA, "2026-10-04T18:00:00", { ...SUJETS, "evenements/reunion-da": { ...REUNION, compteRendu: CR } });
  await expect(compteRendu(page)).toContainText("Google Doc · ajouté par Alice Q. le 4 oct.");
  const ouvrirLien = compteRendu(page).getByRole("link", { name: "Ouvrir" });
  await expect(ouvrirLien).toHaveAttribute("href", CR.url);
  await expect(ouvrirLien).toHaveAttribute("target", "_blank");
  await expect(lienCR(page)).toHaveCount(0);

  page.once("dialog", (d) => d.accept());
  await compteRendu(page).getByRole("button", { name: "Retirer le lien du compte rendu" }).click();
  await expect.poll(() => ecrituresReunion(db).map((w) => w.data)).toEqual([{ compteRendu: null }]);
  await expect(lienCR(page)).toBeVisible();
  await expect(compteRendu(page).getByRole("link", { name: "Ouvrir" })).toHaveCount(0);
});

test("compte rendu : un admin hors du pôle le colle aussi, tout lien https:// accepté", async ({ page }) => {
  const db = await ouvrir(page, ADMIN, "2026-10-04T10:00:00");
  await lienCR(page).fill("https://exemple.org/cr.pdf");
  await compteRendu(page).getByRole("button", { name: "Enregistrer le lien" }).click();
  await expect(compteRendu(page)).toContainText("exemple.org · ajouté par Admin T.");
  expect(ecrituresReunion(db)).toHaveLength(1);
});

test("compte rendu : pas de carte pour un évènement qui n'est pas une réunion", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await signInAs(page, ADMIN, { "evenements/foot": { ...REUNION, titre: "Foot au parc", pour: "eglise", compteRendu: CR } }, "/evenements/foot");
  await expect(page.getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(compteRendu(page)).toHaveCount(0);
});

test("captures : le compte rendu vide, avant la réunion (organisatrice)", async ({ page }, info) => {
  await ouvrir(page, ALICE);
  await expect(lienCR(page)).toBeVisible();
  // Au milieu de l'écran : sur téléphone, la barre d'onglets flottante cacherait le bas de la carte.
  await compteRendu(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await compteRendu(page).screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-compte-rendu-vide.png`) });
});

test("captures : le compte rendu collé, après la réunion (membre)", async ({ page }, info) => {
  await ouvrir(page, BRUNO, "2026-10-04T18:00:00", { ...APRES, "evenements/reunion-da": { ...REUNION, compteRendu: CR } });
  await expect(lignes(page)).toHaveCount(4);
  await expect(compteRendu(page).getByRole("link", { name: "Ouvrir" })).toBeVisible();
  await page.screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-compte-rendu.png`), fullPage: true });
});

// ─── R4 : réunions d'équipe ─────────────────────────────────────────────────

/** Réunion de l'équipe Régie (aucun pôle), samedi 3 octobre à 20:00, organisée par Rose, sa référente. */
const REUNION_REGIE = { ...REUNION, titre: "Réunion Régie", pour: "equipe:regie", organisateurUid: "uid-rose", organisateurNom: "Rose T." };
const ER = { ...REUNION_REGIE, id: "reunion-regie" } as unknown as Evenement;
const ROSE: FakeProfile = { uid: "uid-rose", email: "rose@example.com", firstName: "Rose", lastName: "T.", dansEquipes: ["regie"], referentDe: ["regie"] };
const HUGO: FakeProfile = { uid: "uid-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "B.", dansEquipes: ["regie"] };
const COORD: FakeProfile = { uid: "uid-coord", email: "coord@example.com", firstName: "Iris", lastName: "D.", poles: ["evenement"] };

const membre = (nom: string, uid: string, referent = false) => ({ nom, uid, mention: referent ? "Référente" : "", referent, essai: false, groupe: "" });
const ORGANIGRAMME = [
  { id: "da", pole: "da" as const, membres: [membre("Hugo B.", "uid-hugo")] },
  { id: "regie", pole: null, membres: [membre("Rose T.", "uid-rose", true), membre("Hugo B.", "uid-hugo"), membre("Sans Compte", "")] },
];

test("équipe d'une réunion : « equipe:<id> » ; une réunion = un pôle ou une équipe", () => {
  expect(equipeDuPour("equipe:regie")).toBe("regie");
  expect(equipeDuPour("equipe:accueil-j1")).toBe("accueil-j1");
  expect(equipeDuPour("equipe:")).toBeNull();
  expect(equipeDuPour("pole:da")).toBeNull();
  expect(equipeDuPour("Culte Francophone")).toBeNull();
  expect(estReunion("equipe:regie")).toBe(true);
  expect(estReunion("pole:da")).toBe(true);
  expect(estReunion("eglise")).toBe(false);
});

test("rattachement : pôles, équipes et équipes dont on est référent, dans l'ordre de l'organigramme", () => {
  expect(rattachementDe("uid-hugo", ORGANIGRAMME)).toEqual({ poles: ["da"], dansEquipes: ["da", "regie"], referentDe: [] });
  expect(rattachementDe("uid-rose", ORGANIGRAMME)).toEqual({ poles: [], dansEquipes: ["regie"], referentDe: ["regie"] });
  expect(rattachementDe("uid-personne", ORGANIGRAMME)).toEqual({ poles: [], dansEquipes: [], referentDe: [] });
  expect(rattachementDe("", ORGANIGRAMME), "un nom sans compte n'a rien").toEqual({ poles: [], dansEquipes: [], referentDe: [] });
});

/** Base Admin simulée : les profils et les équipes, et les mises à jour reçues. */
function fausseBase(users: Record<string, Record<string, unknown>>) {
  const ecrits: { uid: string; data: Record<string, unknown> }[] = [];
  const docs = (m: Record<string, Record<string, unknown>>) => Object.entries(m).map(([id, d]) => ({ id, data: () => d }));
  const equipes = Object.fromEntries(ORGANIGRAMME.map(({ id, ...e }) => [id, e as Record<string, unknown>]));
  const db = {
    collection: (nom: string) => ({
      get: async () => ({ docs: docs(nom === "equipes" ? equipes : users) }),
      doc: (uid: string) => ({
        get: async () => ({ exists: uid in users, data: () => users[uid] }),
        update: async (data: Record<string, unknown>) => { ecrits.push({ uid, data }); users[uid] = { ...users[uid], ...data }; },
      }),
    }),
  } as unknown as Parameters<typeof recalculerPoles>[0];
  return { db, ecrits, users };
}

test("recalculerPoles recopie aussi dansEquipes et referentDe sur le profil ; rien n'est réécrit s'il n'a pas changé", async () => {
  const { db, ecrits } = fausseBase({ "uid-rose": { poles: [] }, "uid-hugo": { poles: ["da"] } });
  const equipes = ORGANIGRAMME.map(({ id, pole, membres }) => ({ id, pole, membres }));
  expect(await recalculerPoles(db, ["uid-rose", "uid-hugo", "uid-absent"], equipes)).toBe(2);
  expect(ecrits).toEqual([
    { uid: "uid-rose", data: { poles: [], dansEquipes: ["regie"], referentDe: ["regie"] } },
    { uid: "uid-hugo", data: { poles: ["da"], dansEquipes: ["da", "regie"], referentDe: [] } },
  ]);
  expect(await recalculerPoles(db, ["uid-rose", "uid-hugo"], equipes)).toBe(0);
  expect(ecrits).toHaveLength(2);
});

test("« Recalculer depuis l'organigramme » : tous les membres des équipes, et personne d'autre ; leurs pôles ne bougent pas", async () => {
  const { db, ecrits, users } = fausseBase({
    // Pôle DA coché à la main (lot 7) sur la référente de la Régie, équipe sans pôle : le recalcul
    // de R4 ne pose que les équipes et les référents, il ne le retire pas (relecture du lot U6).
    "uid-rose": { poles: ["da"] }, "uid-hugo": { poles: ["da"] },
    "uid-hors": { poles: ["orga"] }, // pôle coché hors organigramme (D10) : on n'y touche pas ici
  });
  expect(await recalculerDepuisOrganigramme(db)).toBe(2);
  expect(ecrits).toEqual([
    { uid: "uid-hugo", data: { dansEquipes: ["da", "regie"], referentDe: [] } },
    { uid: "uid-rose", data: { dansEquipes: ["regie"], referentDe: ["regie"] } },
  ]);
  expect(users["uid-rose"].poles).toEqual(["da"]);
  // Relancé : rien n'a changé, rien n'est réécrit.
  expect(await recalculerDepuisOrganigramme(db)).toBe(0);
});

test("destinataires d'une réunion d'équipe : les comptes dont le profil porte l'équipe", async () => {
  const { db } = fausseBase({
    "uid-rose": { dansEquipes: ["regie"] }, "uid-hugo": { dansEquipes: ["da", "regie"] }, "uid-noe": { poles: ["media"] },
  });
  expect((await destinatairesEvenement(db, { pour: "equipe:regie" })).sort()).toEqual(["uid-hugo", "uid-rose"]);
});

test("droits d'une réunion d'équipe : voir et en être = ses membres, l'organisatrice, un admin ; pas la coordination", () => {
  const cas: [FakeProfile, FakeProfile | { dansEquipes: string[] } | null, boolean][] = [
    [HUGO, HUGO, true], [ROSE, { dansEquipes: [] }, true], [ADMIN, null, true], [NOE, NOE, false], [COORD, COORD, false],
  ];
  for (const [qui, profil, attendu] of cas) {
    expect(canSeeEvenement(user(qui), profil, ER), `${qui.uid} voit`).toBe(attendu);
    expect(estDeLaReunion(user(qui), profil, ER), `${qui.uid} en est`).toBe(attendu);
  }
  expect(canSeeEvenement(null, null, ER)).toBe(false);
  expect(peutAjouterSujet(user(HUGO), HUGO, ER, "2026-10-03T19:59")).toBe(true);
  expect(peutAjouterSujet(user(NOE), NOE, ER, "2026-10-02T10:00")).toBe(false);
});

test("droits d'une réunion d'équipe : la créer = un référent de l'équipe ou un admin", () => {
  expect(canCreateEvenement(user(ROSE), ROSE, "equipe:regie")).toBe(true);
  expect(canCreateEvenement(user(ROSE), ROSE, "equipe:da")).toBe(false);
  expect(canCreateEvenement(user(HUGO), HUGO, "equipe:regie")).toBe(false);
  expect(canCreateEvenement(user(COORD), COORD, "equipe:regie")).toBe(false);
  expect(canCreateEvenement(user(ADMIN), null, "equipe:regie")).toBe(true);
  expect(creatableEvenementPours(user(ROSE), ROSE, ["Culte Francophone"])).toEqual(["equipe:regie"]);
  expect(creatableEvenementPours(user(HUGO), HUGO, ["Culte Francophone"])).toEqual([]);
  const admin = creatableEvenementPours(user(ADMIN), null, ["Culte Francophone"]);
  expect(admin.filter((p) => p.startsWith("equipe:"))).toEqual(EQUIPES.map((e) => `equipe:${e.id}`));
});

test("règles R4 : membres (dansEquipes) de la réunion d'équipe, création par un référent, champs fermés à la création du profil", () => {
  const rules = lire("firestore.rules");
  expect(rules).toMatch(/function estDeLaReunion\(e\)[\s\S]*e\.pour\.matches\('equipe:\[a-z0-9-\]\+'\) && hasProfile\(\) && e\.pour\.split\(':'\)\[1\] in profile\(\)\.get\('dansEquipes', \[\]\)/);
  const create = rules.slice(rules.indexOf("match /evenements/{id}"), rules.indexOf("allow update", rules.indexOf("match /evenements/{id}")));
  expect(create).toMatch(/request\.resource\.data\.pour\.matches\('equipe:\[a-z0-9-\]\+'\)[\s\S]*request\.resource\.data\.pour\.split\(':'\)\[1\] in profile\(\)\.get\('referentDe', \[\]\)/);
  const profil = rules.slice(rules.indexOf("match /users/{uid}"), rules.indexOf("allow update", rules.indexOf("match /users/{uid}")));
  expect(profil).toMatch(/request\.resource\.data\.get\('dansEquipes', \[\]\) == \[\]/);
  expect(profil).toMatch(/request\.resource\.data\.get\('referentDe', \[\]\) == \[\]/);
});

// Relecture du lot U6 : miroir exact de canCreateEvenement — une réunion de pôle ou d'équipe ne
// passe pas par la branche « coordination » (qui ne crée que pour l'église et les sections).
test("règles : réunions de pôle et d'équipe créées par leurs seuls ayants droit, même pour la coordination", () => {
  const rules = lire("firestore.rules");
  const create = rules.slice(rules.indexOf("match /evenements/{id}"), rules.indexOf("allow update", rules.indexOf("match /evenements/{id}")));
  expect(create).toMatch(/request\.resource\.data\.pour\.matches\('pole:\[a-z\]\+'\)\s*&& isTachePole\(request\.resource\.data\.pour\.split\(':'\)\[1\]\)/);
  expect(create).toMatch(/request\.resource\.data\.pour\.matches\('equipe:\[a-z0-9-\]\+'\)\s*&& \(isAdmin\(\) \|\| \(hasProfile\(\)/);
  expect(create).toMatch(/!request\.resource\.data\.pour\.matches\('\(pole\|equipe\):\.\*'\)\s*&& \(isCoordination\(\)/);
  // Plus de « isCoordination() || … » qui couvrirait tous les publics.
  expect(create).not.toMatch(/&& \(isCoordination\(\)\s*\|\|\s*\(hasProfile\(\) && request\.resource\.data\.pour in profile\(\)\.get\('annonces', \[\]\)\)\s*\|\|\s*\(request/);
});

test("le cron : la veille d'une réunion d'équipe va à ses membres, comme celle d'une réunion de pôle", () => {
  const route = lire("src/app/api/cron/reminders/route.ts");
  expect(route).toMatch(/if \(estReunion\(e\.pour\)\) \{[\s\S]*?destinatairesEvenement\(db, e\)/);
});

/** La veille de la réunion de la Régie, 18:00, sur sa fiche. */
async function ouvrirRegie(page: Page, qui: FakeProfile, vers = "/evenements/reunion-regie") {
  await page.clock.setFixedTime(new Date("2026-10-02T18:00:00"));
  return signInAs(page, qui, {
    "evenements/reunion-regie": REUNION_REGIE,
    "evenements/reunion-regie/sujets/r1": sujet("Micros HF : piles neuves", ROSE, "2026-09-29T09:00:00Z", 0),
  }, vers);
}

test("référente : elle crée la réunion de son équipe, sans inscriptions, et y retrouve les sujets", async ({ page }) => {
  const db = await ouvrirRegie(page, ROSE, "/back-office/evenements/nouveau");
  await sansPush(page);
  await expect(page.getByLabel("Public")).toHaveValue("equipe:regie");
  await expect(page.getByLabel("Public").locator("option")).toHaveText(["TEAM RÉGIE"]);
  await page.getByLabel("Nom de l'évènement").fill("Réunion Régie");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-10");
  await page.getByLabel("Horaire", { exact: true }).fill("20:00");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await page.waitForURL(/\/evenements\/fake-\d+\/?$/);
  const ecrit = db.doc(`evenements/${creee(db)}`)!;
  expect(ecrit).toMatchObject({ pour: "equipe:regie", inscriptions: "fermees", organisateurUid: "uid-rose", placesMax: null });
  // La fiche du Back-Office nomme l'équipe en court (relecture du lot U6).
  await expect(page.getByText("Réunion d'équipe · Régie", { exact: true })).toBeVisible();
  await expect(carte(page).getByRole("heading", { name: "Sujets à aborder", exact: true })).toBeVisible();
});

test("membre de l'équipe, non référent : pas de réunion d'équipe à créer", async ({ page }) => {
  // Lot U6, B3 : créer est au Back-Office, réservé aux responsables (un référent l'est).
  await ouvrirRegie(page, HUGO, "/back-office/evenements/nouveau");
  await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
});

test("membre de l'équipe : il voit la réunion dans l'agenda, et y ajoute un sujet à son nom", async ({ page }) => {
  const db = await ouvrirRegie(page, HUGO);
  await expect(lignes(page)).toHaveCount(1);
  await champ(page).fill("Retour de la console");
  await carte(page).getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(lignes(page)).toHaveCount(2);
  const [post] = db.writes.filter((w) => w.method === "POST" && w.path.startsWith("evenements/reunion-regie/sujets/"));
  expect(post.data).toMatchObject({ texte: "Retour de la console", auteurUid: "uid-hugo", auteurNom: "Hugo B.", ordre: 1, traite: false });
  await page.goto("/evenements");
  // En grand (U4 bis, B2), la fiche du prochain évènement est aussi à droite : la ligne de l'agenda.
  await expect(page.getByRole("link", { name: /Réunion Régie/ })).toBeVisible();
});

for (const [qui, nom] of [[NOE, "un autre pôle"], [COORD, "la coordination"]] as const) {
  test(`non-membre de l'équipe (${nom}) : ni la réunion ni ses sujets, ni dans l'agenda`, async ({ page }) => {
    await ouvrirRegie(page, qui);
    await expect(page.getByText("Évènement introuvable")).toBeVisible();
    await expect(carte(page)).toHaveCount(0);
    await page.goto("/evenements");
    await expect(page.getByRole("heading", { name: "Évènements" }).first()).toBeVisible();
    await expect(page.getByText("Réunion Régie")).toHaveCount(0);
  });
}

test("captures : une réunion d'équipe, côté membre", async ({ page }, info) => {
  await ouvrirRegie(page, HUGO);
  await expect(lignes(page)).toHaveCount(1);
  await page.screenshot({ path: path.join(ROOT, "test-results", "reunions-captures", `${info.project.name}-reunion-equipe.png`), fullPage: true });
});
