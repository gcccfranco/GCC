import { expect, test, type Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { mesurerUsage } from "./helpers/mesuresUsage";

// Audit du design, second lot (03/11/2026) : les pages que audit-design-captures.spec.ts ne couvre pas.
// Rien n'est vérifié ici, on photographie. Comptes et données fictifs. PW_CAPTURES=<dossier> obligatoire.
// Lancer avec playwright.audit-design.config.ts (cinq dispositions).
// Nom de capture : chemin sans slash initial, « / » remplacés par « _ », paramètres remplacés par leur nom.

const DIR = process.env.PW_CAPTURES ?? "test-results/audit-design";

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", planningName: "Alix D.",
  dansEquipes: ["da", "louange"], referentDe: ["da"], plannings: ["culte"], lieuxLouange: ["culte"], joue: ["piano"],
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const tache = (titre: string, echeance: string, over: Record<string, unknown> = {}) => ({
  equipe: "da", titre, responsableUid: null, responsableNom: "", echeance, repetition: null, lien: "", note: "",
  prevenir: null, evenement: null, auteurUid: "uid-admin", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z", ...over,
});
const EV = {
  titre: "Pique-nique de rentrée", type: "loisir", pour: "eglise", date: "2026-11-14", heure: "12:00", heureFin: "16:00", dateFin: "",
  lieu: "Parc de la Villette", description: "Chacun apporte un plat à partager.", liens: [], images: [], placesMax: 40,
  inscriptions: "auto", inscriptionOuverte: true, sansCompte: false, contact: "Alix D.", organisateurUid: "uid-admin",
  organisateurNom: "Alix D.", epingle: false, expiresAt: null, inscrits: 12, createdAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-20T10:00:00Z",
};
// Réunion de TEAM DA (`pour: "equipe:da"`), organisée par l'admin fictif.
const REUNION = {
  titre: "Réunion DA", type: "loisir", pour: "equipe:da", date: "2026-11-10", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-admin", organisateurNom: "Alix D.", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: "2026-10-18T10:00:00Z", updatedAt: "2026-10-18T10:00:00Z",
};
const sujet = (texte: string, ordre: number, traite = false) => ({
  texte, auteurUid: "uid-admin", auteurNom: "Alix D.", creeLe: "2026-10-28T09:00:00Z", ordre, traite, reprisDans: null, repriseDe: null,
});
const profil = (uid: string, prenom: string, nom: string, over: Record<string, unknown> = {}) => ({
  uid, email: `${prenom.toLowerCase()}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`,
  serviceRoles: {}, annonces: [], notify: [], ...over,
});
const membreLouange = (uid: string, nom: string, groupe: string, over: Record<string, unknown> = {}) => ({
  nom, uid, mention: "", referent: false, essai: false, groupe, ...over,
});
const resa = (dimanche: string, debut: string, fin: string, quoi: string, qui: string[]) => ({
  dimanche, debut, fin, quoi, qui, note: "", auteurUid: "uid-autre", auteurNom: "Zoé F.",
  createdAt: "2026-10-20T10:00:00Z", updatedAt: "2026-10-20T10:00:00Z",
});
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});

const DOCS: Record<string, Record<string, unknown>> = {
  // Tâches de TEAM DA : /taches, /taches/da, /taches/da/t1, back-office/taches/da/t1.
  "equipes/da/taches/t1": tache("Préparer les affiches de Noël", "2026-11-08", { responsableUid: "uid-admin", responsableNom: "Alix D.", note: "Format A3, deux versions." }),
  "equipes/da/taches/t2": tache("Fond PPT du culte", "2026-11-12", { responsableUid: "uid-zoe", responsableNom: "Zoé F." }),
  "equipes/da/taches/t3": tache("Photos du culte", "2026-11-20"),
  // Évènements : /evenements/[id]/modifier et back-office/evenements/[id](/modifier) = « pique-nique ».
  "evenements/pique-nique": EV,
  "evenements/pique-nique/inscriptions/uid-zoe": { uid: "uid-zoe", nom: "Zoé F.", createdAt: "2026-10-22T10:00:00Z" },
  // Réunions : back-office/reunions/[id](/modifier) = « reunion-da », avec ses sujets à aborder.
  "evenements/reunion-da": REUNION,
  "evenements/reunion-da/sujets/s1": sujet("Affiche de Noël : valider le visuel", 0),
  "evenements/reunion-da/sujets/s2": sujet("Fond PPT du culte : modèle de l'Avent", 1),
  "evenements/reunion-da/sujets/s3": sujet("Budget impression du trimestre", 2, true),
  // Scène de Noël et de Pâques (évènements/scene, évènements/scene/[fete], back-office/evenements/scene…).
  "programmes/noel-2026": { nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: true, passages: [], createdBy: "", updatedAt: "" },
  "programmes/noel-2026/creneaux/n1": resa("2026-11-15", "14:00", "15:00", "Chant", ["Groupe Amour"]),
  "programmes/noel-2026/creneaux/n2": resa("2026-11-22", "15:00", "16:00", "Théâtre", ["Mathis R.", "Lina O."]),
  "programmes/paques-2027": { nom: "Pâques 2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01", ouvert: false, passages: [], createdBy: "", updatedAt: "" },
  // Profils : /admin, back-office/equipes/personnes, back-office/equipes/[id].
  "users/uid-admin": profil("uid-admin", "Alix", "D.", { email: ADMIN_EMAIL, dansEquipes: ["da", "louange"], referentDe: ["da"] }),
  "users/uid-zoe": profil("uid-zoe", "Zoé", "F.", { dansEquipes: ["da"] }),
  "users/uid-mathis": profil("uid-mathis", "Mathis", "R.", { dansEquipes: ["louange"], serviceRoles: { "Culte Francophone": ["chanteur"] } }),
  "users/uid-lina": profil("uid-lina", "Lina", "O.", { dansEquipes: ["medias"] }),
  // Audit d'usage (11/11/2026) : une équipe Louange de neuf membres, pour que la feuille d'une équipe montre une vraie
  // liste (défilement, « Ajouter un membre » après la liste). Noms inventés.
  "equipes/louange": {
    membres: [
      membreLouange("u-capucine", "Capucine Morel", "Présidences", { referent: true, mention: "Référente Louange" }),
      membreLouange("u-ugo", "Ugo Ferrand", "Pianistes"),
      membreLouange("u-salome", "Salomé Diaz", "Guitaristes"),
      membreLouange("u-bastien", "Bastien Leroux", "Batteurs"),
      membreLouange("u-ornella", "Ornella Costa", "Batteurs"),
      membreLouange("u-titouan", "Titouan Gallet", "Choristes"),
      membreLouange("u-maiwenn", "Maïwenn Jaouen", "Choristes"),
      membreLouange("", "Anselme Vidalenc", "Guitaristes", { essai: true }),
      membreLouange("u-yaelle", "Yaëlle Brun", "Présidences"),
    ],
    updatedAt: "2026-10-01T10:00:00Z", parUid: "uid-admin", parNom: "Alix D.",
  },
  "users/u-capucine": profil("u-capucine", "Capucine", "Morel", { dansEquipes: ["louange"], referentDe: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"], joue: ["guitare"], lieuxLouange: ["Culte Francophone", "Intergroupe", "Interfranco", "Campus"] }),
  "users/u-ugo": profil("u-ugo", "Ugo", "Ferrand", { dansEquipes: ["louange"], sousEquipes: ["musiciens"], joue: ["piano"], lieuxLouange: ["Culte Francophone", "Interfranco"] }),
  "users/u-salome": profil("u-salome", "Salomé", "Diaz", { dansEquipes: ["louange"], sousEquipes: ["musiciens", "choristes"], joue: ["guitare", "basse"], lieuxLouange: ["Culte Francophone", "Campus"] }),
  "users/u-bastien": profil("u-bastien", "Bastien", "Leroux", { dansEquipes: ["louange"], sousEquipes: ["musiciens"], joue: ["batterie", "cajon"], lieuxLouange: ["Culte Francophone", "Interfranco", "Campus"] }),
  "users/u-ornella": profil("u-ornella", "Ornella", "Costa", { dansEquipes: ["louange"], sousEquipes: ["musiciens"], joue: ["batterie", "cajon"], lieuxLouange: ["Culte Francophone"] }),
  "users/u-titouan": profil("u-titouan", "Titouan", "Gallet", { dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: ["Culte Francophone", "Interfranco", "Campus"] }),
  "users/u-maiwenn": profil("u-maiwenn", "Maïwenn", "Jaouen", { dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: ["Culte Francophone"] }),
  "users/u-yaelle": profil("u-yaelle", "Yaëlle", "Brun", { dansEquipes: ["louange"], sousEquipes: ["presidence"], lieuxLouange: ["Culte Francophone", "Interfranco", "Campus"] }),
  // Setlist du 8 novembre (mes-services/[date] la relie au service).
  "setlists/s1": {
    title: "Culte du 8 novembre", leader: "Alix D.", category: "Culte Francophone", date: "2026-11-08", language: "mixed",
    notes: "Intro douce, enchaîner sans pause.", ownerId: "uid-admin", isPrivate: false,
    items: [item("hosanna", 1), item("abba-pere", 2)],
  },
};

// Feuille Google du culte, fictive : mes-services/[date] (service du 8 novembre de l'admin), planning/culte,
// back-office/planning/culte. Les autres feuilles restent vides (états vides : table, groupes, EDD, campus,
// intergroupe, interfranco, sans-compte).
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, pres: string, piano: string) =>
  [date, pres, "Mathis R.", "Lina O.", piano, "Elias G.", "Maëlle S.", "Zoé F.", "Mathis R.", "Lina O.", "Elias G.", "", ""];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([ENTETE_CULTE, culte("08/11", "Zoé F.", "Alix D."), culte("15/11", "Zoé F.", "Maëlle S."), culte("22/11", "Lina O.", "Alix D.")]),
};

type Page_ = {
  /** Nom de la capture. */
  nom: string;
  chemin: string;
  /** Sans connexion (page d'inscription, page hors ligne). */
  anonyme?: boolean;
};

const PAGES: Page_[] = [
  { nom: "signup", chemin: "/signup", anonyme: true },
  { nom: "profil", chemin: "/profil" },
  { nom: "admin", chemin: "/admin" },
  { nom: "annonces", chemin: "/annonces" },
  { nom: "notifier", chemin: "/notifier" },
  { nom: "questionnaire", chemin: "/questionnaire" },
  { nom: "setlists_new", chemin: "/setlists/new" },
  { nom: "mes-services_date", chemin: "/mes-services/2026-11-08" },
  { nom: "equipes_id", chemin: "/equipes/da" },
  { nom: "taches", chemin: "/taches" },
  { nom: "taches_equipe", chemin: "/taches/da" },
  { nom: "taches_equipe_id", chemin: "/taches/da/t1" },
  { nom: "evenements_id_modifier", chemin: "/evenements/pique-nique/modifier" },
  { nom: "evenements_nouveau", chemin: "/evenements/nouveau" },
  { nom: "evenements_scene", chemin: "/evenements/scene" },
  { nom: "evenements_scene_fete", chemin: "/evenements/scene/noel" },
  { nom: "planning_campus", chemin: "/planning/campus" },
  { nom: "planning_culte", chemin: "/planning/culte" },
  // L'accueil avec un service à venir (Alix D. au piano le 08/11 dans Franco_Louange) : la forme à deux colonnes.
  { nom: "accueil-avec-service", chemin: "/" },
  { nom: "planning_edd", chemin: "/planning/edd" },
  { nom: "planning_groupes", chemin: "/planning/groupes" },
  { nom: "planning_interfranco", chemin: "/planning/interfranco" },
  { nom: "planning_intergroupe", chemin: "/planning/intergroupe" },
  { nom: "planning_table", chemin: "/planning/table" },
  // Une fiche réelle de public/harmonie-index.json (id « substitutions/2m7-pour-4 »).
  { nom: "harmonie_fiche", chemin: "/harmonie/substitutions/2m7-pour-4" },
  { nom: "harmonie_cours", chemin: "/harmonie/cours" },
  // Un chapitre réel de public/harmonie-cours/.
  { nom: "harmonie_cours_id", chemin: "/harmonie/cours/le-son-les-notes-et-le-clavier" },
  { nom: "harmonie_rd2000", chemin: "/harmonie/rd2000" },
  // Un son réel de public/rd2000.json.
  { nom: "harmonie_rd2000_n", chemin: "/harmonie/rd2000/S01" },
  { nom: "back-office_calendrier", chemin: "/back-office/calendrier" },
  { nom: "back-office_equipes", chemin: "/back-office/equipes" },
  { nom: "back-office_equipes_id", chemin: "/back-office/equipes/da" },
  { nom: "back-office_equipes_personnes", chemin: "/back-office/equipes/personnes" },
  { nom: "back-office_equipes_personnes_sans-compte", chemin: "/back-office/equipes/personnes/sans-compte" },
  { nom: "back-office_equipes_responsabilites", chemin: "/back-office/equipes/responsabilites" },
  { nom: "back-office_evenements", chemin: "/back-office/evenements" },
  { nom: "back-office_evenements_id", chemin: "/back-office/evenements/pique-nique" },
  { nom: "back-office_evenements_id_modifier", chemin: "/back-office/evenements/pique-nique/modifier" },
  { nom: "back-office_evenements_nouveau", chemin: "/back-office/evenements/nouveau" },
  { nom: "back-office_evenements_reunions", chemin: "/back-office/evenements/reunions" },
  { nom: "back-office_evenements_scene", chemin: "/back-office/evenements/scene" },
  { nom: "back-office_evenements_scene_fete", chemin: "/back-office/evenements/scene/noel" },
  { nom: "back-office_messages", chemin: "/back-office/messages" },
  { nom: "back-office_messages_notifier", chemin: "/back-office/messages/notifier" },
  { nom: "back-office_messages_questionnaire", chemin: "/back-office/messages/questionnaire" },
  { nom: "back-office_planning", chemin: "/back-office/planning" },
  { nom: "back-office_planning_cle", chemin: "/back-office/planning/culte" },
  { nom: "back-office_planning_sans-compte", chemin: "/back-office/planning/sans-compte" },
  { nom: "back-office_plus", chemin: "/back-office/plus" },
  { nom: "back-office_reunions", chemin: "/back-office/reunions" },
  { nom: "back-office_reunions_id", chemin: "/back-office/reunions/reunion-da" },
  { nom: "back-office_reunions_id_modifier", chemin: "/back-office/reunions/reunion-da/modifier" },
  { nom: "back-office_reunions_nouvelle", chemin: "/back-office/reunions/nouvelle" },
  { nom: "back-office_taches_equipe_id", chemin: "/back-office/taches/da/t1" },
  { nom: "back-office_taches_equipe_nouvelle", chemin: "/back-office/taches/da/nouvelle" },
  // Page statique, servie hors ligne par le service worker : ni connexion ni Firestore.
  { nom: "hors-ligne", chemin: "/hors-ligne.html", anonyme: true },
];
const VARIANTES = [
  { nom: "fr-clair", langue: "fr", sombre: false },
  { nom: "fr-sombre", langue: "fr", sombre: true },
  { nom: "zh-clair", langue: "zh-CN", sombre: false },
] as const;

async function preparer(page: Page, langue: string, sombre: boolean) {
  await page.emulateMedia({ colorScheme: sombre ? "dark" : "light" });
  await page.addInitScript(([l, s]) => {
    localStorage.setItem("i18nextLng", l as string);
    localStorage.setItem("theme", s ? "dark" : "light");
    localStorage.setItem("perf-role-preset", "pianiste");
  }, [langue, sombre] as const);
  await page.clock.setFixedTime(new Date("2026-11-02T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => {
    const feuille = new URL(r.request().url()).searchParams.get("sheet") ?? "";
    return r.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
}

async function photographier(page: Page, nom: string) {
  // PW_EMAIL_CHECK=<fichier> : au lieu de photographier, note les pages qui affichent une adresse e-mail réelle
  // (le compte admin simulé porte une vraie adresse) — à ne pas recopier dans une planche du dépôt public.
  if (process.env.PW_EMAIL_CHECK) {
    await page.waitForTimeout(1500);
    const texte = await page.evaluate(() => document.body.innerText);
    const vues = [...new Set(texte.match(/[\w.+-]+@gmail\.com/g) ?? [])];
    if (vues.length) appendFileSync(process.env.PW_EMAIL_CHECK, `${test.info().project.name} ${nom}: ${vues.join(", ")}\n`);
    return;
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  // Le badge « Compiling… » de `next dev` recouvrait la barre de navigation sur certaines captures.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/${test.info().project.name}/${nom}.png`, fullPage: true });
  // Audit d'usage (11/11/2026) : PW_MESURES=<fichier> ajoute le relevé mesuré de l'écran (tests/helpers/mesuresUsage.ts).
  if (process.env.PW_MESURES) await mesurerUsage(page, nom);
}

for (const v of VARIANTES) {
  for (const p of PAGES) {
    test(`${p.nom} ${v.nom}`, async ({ page }) => {
      test.setTimeout(240_000); // première compilation de `next dev` sous charge (trois processus) : > 90 s sur 9 pages
      await preparer(page, v.langue, v.sombre);
      if (p.anonyme) {
        await page.goto(p.chemin);
      } else {
        await signInAs(page, ADMIN, DOCS, "/setlists");
        await page.goto(p.chemin);
        await expect(page.locator("main, [data-performance-mode], body").first()).toBeVisible();
      }
      await photographier(page, `${p.nom}-${v.nom}`);
    });
  }
}
