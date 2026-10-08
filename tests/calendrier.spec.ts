import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ADMIN_EMAILS, entreesBackOffice } from "../src/lib/access";
import { joursDeLaGrille, libelleCourt } from "../src/lib/calendrier/grille";
import {
  ORDRE_PASTILLES,
  SOURCES,
  SOURCES_D_OFFICE,
  entreesCalendrier,
  filtrerEntrees,
  peutDeplacer,
  sourcesPermises,
  type DonneesCalendrier,
  type EntreeCalendrier,
  type ProfilCalendrier,
} from "../src/lib/calendrier/entrees";
import type { FSSetlist } from "../src/lib/firebase/setlists";
import type { Evenement } from "../src/types/evenement";
import type { Creneau, Programme } from "../src/types/programme";
import type { Fois, Tache } from "../src/types/tache";

// Lot U8, tranche C2 (docs/spec-calendrier.md) : les sources du calendrier,
// une seule fonction pure qui produit la liste des entrées (grille, agenda,
// panneau et widget la liront), « Seulement moi », l'ordre dans un jour et
// `peutDeplacer`. Tests purs : une ligne par source et par droit.
// Horloge au jeudi 1er octobre 2026 ; noms et titres inventés.

const TODAY = "2026-10-01";
const OCT = ["2026-10-01", "2026-10-31"] as const;

const ADMIN = { uid: "u-admin", email: ADMIN_EMAILS[0] };
const MOI = { uid: "u-moi", email: "moi@example.org" };
const AUTRE = { uid: "u-autre", email: "autre@example.org" };

const profil = (p: Partial<ProfilCalendrier> = {}): ProfilCalendrier => ({
  uid: "u-moi",
  email: "moi@example.org",
  firstName: "Alix",
  lastName: "Prune",
  planningName: "Alix P.",
  serviceRoles: {},
  annonces: [],
  notify: [],
  ...p,
});

const evenement = (e: Partial<Evenement> & Pick<Evenement, "id" | "titre">): Evenement => ({
  type: "loisir",
  pour: "eglise",
  date: "2026-10-10",
  heure: "19:00",
  heureFin: "",
  dateFin: "",
  lieu: "",
  description: "",
  liens: [],
  images: [],
  placesMax: null,
  sansCompte: false,
  lienExterne: "",
  contact: "",
  organisateurUid: "u-orga",
  organisateurNom: "Orga",
  epingle: false,
  expiresAt: null,
  inscrits: 0,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
  ...e,
});

const tache = (t: Partial<Tache> & Pick<Tache, "id" | "titre">): Tache => ({
  pole: "da",
  responsableUid: null,
  responsableNom: "",
  echeance: "2026-10-15",
  repetition: null,
  lien: "",
  note: "",
  prevenir: null,
  evenement: null,
  auteurUid: "u-autre",
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
  ...t,
});

const fois = (date: string, etat: Fois["etat"]): Fois => ({ date, parUid: "u-moi", parNom: "Alix P.", le: `${date}T10:00:00Z`, etat, debutLe: "" });

const programme = (p: Partial<Programme> = {}): Programme => ({
  id: "noel",
  nom: "Noël",
  jourJ: "2026-12-20",
  debut: "2026-09-27",
  passages: [],
  createdBy: "u-orga",
  updatedAt: "2026-09-01T10:00:00Z",
  ...p,
});

const creneau = (c: Partial<Creneau> & Pick<Creneau, "id">): Creneau => ({
  dimanche: "2026-10-04",
  debut: "17:00",
  fin: "18:30",
  quoi: "Chant",
  qui: ["EDD 中班"],
  note: "",
  auteurUid: "u-autre",
  auteurNom: "Autre",
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
  ...c,
});

const setlist = (s: Partial<FSSetlist> & Pick<FSSetlist, "id" | "title">): FSSetlist => ({
  leader: "",
  category: "Culte Francophone",
  date: "2026-10-11",
  language: "fr",
  notes: "",
  createdAt: null,
  items: [],
  ...s,
});

const vide = (): DonneesCalendrier => ({
  seances: [],
  mesServices: [],
  sheet: [],
  evenements: [],
  mesInscriptions: [],
  taches: [],
  scene: [],
  petitDej: [],
  setlists: [],
});

const ctx = (user = MOI, profile: ProfilCalendrier | null = profil(), lang: "fr" | "zh-CN" = "fr") => ({ user, profile, lang, today: TODAY });

const de = (entrees: EntreeCalendrier[], source: EntreeCalendrier["source"]) => entrees.filter((e) => e.source === source);

test.describe("sources du calendrier (pur)", () => {
  test("sept sources ; toutes allumées d'office sauf Setlists", () => {
    expect(SOURCES).toEqual(["services", "evenements", "reunions", "scene", "taches", "petitDej", "setlists"]);
    expect(SOURCES_D_OFFICE).toEqual(["services", "evenements", "reunions", "scene", "taches", "petitDej"]);
  });

  test("services : une entrée par séance, « Présidence : … », couleur de la catégorie, trimestre non publié compris", () => {
    const d = vide();
    d.seances = [
      { category: "Culte Francophone", date: "2026-10-04", leader: "Alix P.", label: "" },
      { category: "Groupe Fidélité", date: "2026-10-04", leader: "", label: "" },
      { category: "Culte Francophone", date: "2026-11-01", leader: "Noé R.", label: "" },
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx()), "services");
    expect(e).toHaveLength(2);
    expect(e[0]).toMatchObject({
      cle: "services:Culte Francophone:2026-10-04",
      date: "2026-10-04",
      titre: "Culte Franco",
      detail: "Présidence : Alix P.",
      couleur: "#2d5a65",
      duSheet: false,
      deplacable: false,
      lien: "/planning/culte",
    });
    expect(e[1]).toMatchObject({ titre: "Groupe Fidélité", detail: "", couleur: "#a03030", lien: "/planning/groupes" });
  });

  test("services : une seule entrée « EDD » le dimanche, les classes dans le détail ; Campus matin et soir à part", () => {
    const d = vide();
    d.seances = [
      { category: "中班", date: "2026-10-04", leader: "Lou M.", label: "" },
      { category: "大班", date: "2026-10-04", leader: "", label: "" },
      { category: "高班", date: "2026-10-04", leader: "Sam T.", label: "" },
      { category: "Campus", date: "2026-10-20", moment: "matin", leader: "A.", label: "" },
      { category: "Campus", date: "2026-10-20", moment: "soir", leader: "B.", label: "" },
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx()), "services");
    expect(e.map((x) => x.titre)).toEqual(["EDD", "Campus", "Campus"]);
    expect(e[0]).toMatchObject({ cle: "services:EDD:2026-10-04", detail: "中班 Lou M. · 大班 · 高班 Sam T.", couleur: "#3b6d11", lien: "/planning/edd" });
    expect(new Set(e.map((x) => x.cle)).size).toBe(3);
  });

  test("services : « moi » quand je sers ce jour-là dans cette catégorie", () => {
    const d = vide();
    d.seances = [
      { category: "Culte Francophone", date: "2026-10-04", leader: "", label: "" },
      { category: "Culte Francophone", date: "2026-10-11", leader: "", label: "" },
      { category: "大班", date: "2026-10-11", leader: "", label: "" },
    ];
    d.mesServices = [
      { date: "2026-10-04", service: "Culte Franco" },
      { date: "2026-10-11", service: "EDD 大班" },
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx()), "services");
    expect(e.map((x) => [x.date, x.titre, x.moi])).toEqual([
      ["2026-10-04", "Culte Franco", true],
      ["2026-10-11", "Culte Franco", false],
      ["2026-10-11", "EDD", true],
    ]);
  });

  test("services : « Cases vides » des plannings lus (calcul du widget 4 de U6), aujourd'hui et après seulement", () => {
    const d = vide();
    d.seances = [
      { category: "Culte Francophone", date: "2026-09-27", leader: "Lou M.", label: "" },
      { category: "Culte Francophone", date: "2026-10-11", leader: "Sam T.", label: "" },
      { category: "Culte Francophone", date: "2026-10-18", leader: "Noé R.", label: "" },
      { category: "Groupe Paix", date: "2026-10-11", leader: "Kim R.", label: "" },
      { category: "Campus", date: "2026-10-20", moment: "matin", leader: "A.", label: "" },
      { category: "Campus", date: "2026-10-20", moment: "soir", leader: "B.", label: "" },
      { category: "中班", date: "2026-10-11", leader: "Lou M.", label: "" },
      { category: "大班", date: "2026-10-11", leader: "", label: "" },
    ];
    // Lignes des grilles lues (`lireGrilles`) : index 1 = présidence, puis les colonnes de chaque grille.
    // Culte : Batterie (6) et Sono (7) vides le 11 ; Sainte cène (11) vide mais optionnelle ; le 18 complet.
    const culte = (date: string, vides: number[]) =>
      [date, ...Array.from({ length: 11 }, (_, i) => (vides.includes(i + 1) || i + 1 === 11 ? "" : `N${i + 1}`))];
    const campus = (date: string) => [date, ...Array.from({ length: 13 }, (_, i) => (i + 1 === 4 ? "" : `C${i + 1}`))];
    d.grilles = {
      culte: [culte("2026-09-27", [6]), culte("2026-10-11", [6, 7]), culte("2026-10-18", [])],
      campusSoir: [campus("2026-10-20")],
      // EDD 中班 : Piano (3) et Cajón (4) vides ; 大班 n'est pas lu.
      eddZhongban: [["2026-10-11", "Lou M.", "S.", "", "", "G.", "Cours"]],
    };
    const e = de(entreesCalendrier(...OCT, d, ctx()), "services");
    const vides = (cle: string) => e.find((x) => x.cle === cle)?.vides;
    expect(vides("services:Culte Francophone:2026-10-11")).toEqual(["planning.roles.batterie", "planning.roles.sono"]);
    // Complet, ou planning non lu (Groupe Paix, Campus matin) : rien.
    expect(vides("services:Culte Francophone:2026-10-18")).toBeUndefined();
    expect(vides("services:Groupe Paix:2026-10-11")).toBeUndefined();
    expect(vides("services:Campus-matin:2026-10-20")).toBeUndefined();
    // Campus : la grille du même moment seulement.
    expect(vides("services:Campus-soir:2026-10-20")).toEqual(["planning.roles.piano"]);
    // L'entrée « EDD » réunit les classes lues.
    expect(vides("services:EDD:2026-10-11")).toEqual(["planning.roles.piano", "planning.roles.cajon"]);
    // Un dimanche passé ne réclame plus rien (le 27/09, Batterie vide).
    const passe = de(entreesCalendrier("2026-09-27", "2026-09-27", d, ctx()), "services");
    expect(passe[0].vides).toBeUndefined();
  });

  test("services : la setlist publiée du même jour et de la même catégorie, même pastille Setlists éteinte (planche bo-calendrier)", () => {
    const d = vide();
    d.seances = [
      { category: "Culte Francophone", date: "2026-10-11", leader: "Sam T.", label: "" },
      { category: "Culte Francophone", date: "2026-10-18", leader: "Noé R.", label: "" },
      { category: "Campus", date: "2026-10-20", moment: "matin", leader: "A.", label: "" },
      { category: "Campus", date: "2026-10-20", moment: "soir", leader: "B.", label: "" },
    ];
    const chants = (n: number) => Array.from({ length: n }, () => ({}) as never);
    d.setlists = [
      // Privée d'un autre, brouillon : jamais jointes.
      setlist({ id: "privee", title: "Privée d'un autre", isPrivate: true, ownerId: "u-autre", items: chants(2) }),
      setlist({ id: "brouillon", title: "Brouillon", isDraft: true, date: "2026-10-18" }),
      setlist({ id: "s11", title: "Culte du 11 octobre", items: chants(4) }),
      setlist({ id: "soir", title: "Campus soir", category: "Campus", date: "2026-10-20", moment: "soir", items: chants(3) }),
    ];
    const toutes = entreesCalendrier(...OCT, d, ctx(MOI, profil({ serviceRoles: { "Culte Francophone": ["chanteur"], Campus: ["chanteur"] } })));
    const services = de(filtrerEntrees(toutes, { sources: SOURCES_D_OFFICE, seulementMoi: false }), "services");
    expect(services.map((x) => [x.cle, x.setlist ?? null])).toEqual([
      ["services:Culte Francophone:2026-10-11", { titre: "Culte du 11 octobre", chants: 4 }],
      ["services:Culte Francophone:2026-10-18", null],
      ["services:Campus-matin:2026-10-20", null],
      ["services:Campus-soir:2026-10-20", { titre: "Campus soir", chants: 3 }],
    ]);
  });

  test("Sheet : lecture seule, jamais « moi », heures « 19:00 – 21:00 », lien vers l'onglet du mois", () => {
    const d = vide();
    d.sheet = [
      { date: "2026-10-06", titre: "Soirée louange", heure: "19:00", heureFin: "21:00", horaire: "19h-21h", lieu: "Salle 2", responsable: "Lou" },
      { date: "2026-10-06", titre: "Soirée louange", heure: "", heureFin: "", horaire: "après le culte", lieu: "", responsable: "" },
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx(ADMIN, null)), "evenements");
    expect(e).toHaveLength(2);
    expect(e[0]).toMatchObject({
      date: "2026-10-06",
      heure: "",
      titre: "Soirée louange",
      detail: "après le culte",
      couleur: "#e0a100",
      duSheet: true,
      moi: false,
      deplacable: false,
      lien: "https://docs.google.com/spreadsheets/d/12FxK1sMrk08bFrVnL7BjCTJd6FXTqvRXyZoyDYhgPU8/edit#gid=439766955",
    });
    expect(e[1]).toMatchObject({ heure: "19:00", heureFin: "21:00", detail: "19:00 – 21:00 · Salle 2 · Lou", duSheet: true });
    expect(e[0].cle).not.toBe(e[1].cle);
  });

  test("évènements de l'app : hors réunions, une info sans date n'y est pas, « 19:00 · 4 inscrits sur 10 »", () => {
    const d = vide();
    d.evenements = [
      evenement({ id: "foot", titre: "Foot au parc", lieu: "", inscrits: 4, placesMax: 10 }),
      evenement({ id: "repas", titre: "Repas", date: "2026-10-17", heure: "12:00", heureFin: "14:00", lieu: "Salle 1", inscrits: 3 }),
      evenement({ id: "info", titre: "Info", type: "info", date: "" }),
      evenement({ id: "reu", titre: "Réunion DA", pour: "pole:da" }),
      evenement({ id: "nov", titre: "Novembre", date: "2026-11-02" }),
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx(ADMIN, null)), "evenements");
    expect(e.map((x) => x.titre)).toEqual(["Foot au parc", "Repas"]);
    expect(e[0]).toMatchObject({ cle: "evenements:foot:2026-10-10", detail: "19:00 · 4 inscrits sur 10", couleur: "#e0a100", duSheet: false, lien: "/evenements/foot" });
    expect(e[1]).toMatchObject({ heure: "12:00", heureFin: "14:00", detail: "12:00 – 14:00 · Salle 1 · 3 inscrits" });
  });

  test("évènements : un évènement sur plusieurs jours a une entrée par jour, l'heure le premier jour", () => {
    const d = vide();
    d.evenements = [evenement({ id: "camp", titre: "Camp", date: "2026-10-30", dateFin: "2026-11-01", heure: "18:00" })];
    const e = de(entreesCalendrier(...OCT, d, ctx(ADMIN, null)), "evenements");
    expect(e.map((x) => [x.date, x.heure, x.cle])).toEqual([
      ["2026-10-30", "18:00", "evenements:camp:2026-10-30"],
      ["2026-10-31", "", "evenements:camp:2026-10-31"],
    ]);
  });

  test("évènements : seuls les jours de la fenêtre sont parcourus ; une date mal formée ne fige rien", () => {
    const d = vide();
    d.evenements = [
      // Sur toute l'année : les trente et un jours d'octobre, rien d'autre.
      evenement({ id: "annee", titre: "Année", date: "2026-01-01", dateFin: "2026-12-31" }),
      // Fin tapée sur cinq chiffres (le champ date de Chrome l'accepte) : la boucle ne part pas à l'infini.
      evenement({ id: "fin", titre: "Fin à cinq chiffres", date: "2026-10-12", dateFin: "20266-10-12" }),
      // Début mal formé : écarté.
      evenement({ id: "debut", titre: "Début à cinq chiffres", date: "20266-10-12" }),
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx(ADMIN, null)), "evenements");
    expect(e.filter((x) => x.titre === "Année")).toHaveLength(31);
    expect(e.filter((x) => x.titre === "Fin à cinq chiffres").map((x) => x.date)).toEqual(["2026-10-12"]);
    expect(e.filter((x) => x.titre === "Début à cinq chiffres")).toEqual([]);
  });

  test("évènements : chacun ne voit que les siens (canSeeEvenement) ; « moi » = j'organise ou je suis inscrit", () => {
    const d = vide();
    d.evenements = [
      evenement({ id: "public", titre: "Public" }),
      evenement({ id: "section", titre: "Section", pour: "Groupe Paix" }),
      evenement({ id: "orga", titre: "J'organise", organisateurUid: "u-moi" }),
      evenement({ id: "inscrit", titre: "Inscrit" }),
    ];
    d.mesInscriptions = ["inscrit"];
    const e = de(entreesCalendrier(...OCT, d, ctx()), "evenements");
    expect(e.map((x) => [x.titre, x.moi])).toEqual([
      ["Inscrit", true],
      ["J'organise", true],
      ["Public", false],
    ]);
    const paix = de(entreesCalendrier(...OCT, d, ctx(MOI, profil({ serviceRoles: { "Groupe Paix": ["chanteur"] } }))), "evenements");
    expect(paix.map((x) => x.titre)).toContain("Section");
  });

  test("réunions : pôle et équipe, vues de leurs membres seulement, violet de la planche", () => {
    const d = vide();
    d.evenements = [
      evenement({ id: "da", titre: "Réunion DA", pour: "pole:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2" }),
      evenement({ id: "media", titre: "Réunion Média", pour: "pole:media", date: "2026-10-03" }),
      evenement({ id: "eq", titre: "Réunion accueil", pour: "equipe:accueil" as Evenement["pour"], date: "2026-10-08" }),
    ];
    const membre = profil({ poles: ["da"], dansEquipes: ["accueil"] });
    const e = de(entreesCalendrier(...OCT, d, ctx(MOI, membre)), "reunions");
    expect(e.map((x) => x.titre)).toEqual(["Réunion DA", "Réunion accueil"]);
    expect(e[0]).toMatchObject({ cle: "reunions:da:2026-10-03", detail: "20:00 · Salle 2", couleur: "#6b4a8e", moi: true, lien: "/back-office/reunions/da" });
    expect(e[1].moi).toBe(true);
    expect(de(entreesCalendrier(...OCT, d, ctx(MOI, profil())), "reunions")).toEqual([]);
    expect(de(entreesCalendrier(...OCT, d, ctx(ADMIN, null)), "reunions").map((x) => x.moi)).toEqual([false, false, false]);
  });

  test("réunions : la règle d'access.ts (estReunion) — un pôle inconnu ou une équipe mal formée n'en est pas une", () => {
    const d = vide();
    d.evenements = [
      evenement({ id: "inconnu", titre: "Pôle inconnu", pour: "pole:inconnu" as Evenement["pour"], date: "2026-10-03" }),
      evenement({ id: "eq", titre: "Équipe mal formée", pour: "equipe:Accueil Bis" as Evenement["pour"], date: "2026-10-03" }),
    ];
    const e = entreesCalendrier(...OCT, d, ctx(ADMIN, null));
    expect(de(e, "reunions")).toEqual([]);
  });

  test("scène : les créneaux du programme affiché, « Scène · Chant EDD 中班 », jamais ceux d'un brouillon", () => {
    const d = vide();
    d.scene = [{ programme: programme(), creneaux: [creneau({ id: "c1", note: "Costumes" })] }];
    const e = de(entreesCalendrier(...OCT, d, ctx()), "scene");
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({
      cle: "scene:c1:2026-10-04",
      heure: "17:00",
      heureFin: "18:30",
      titre: "Scène · Chant EDD 中班",
      detail: "17:00 – 18:30 · Costumes",
      couleur: "#3f51a3",
      moi: false,
      lien: "/evenements/scene/noel",
    });
    d.scene = [{ programme: programme({ ouvert: false }), creneaux: [creneau({ id: "c1" })] }];
    expect(de(entreesCalendrier(...OCT, d, ctx()), "scene")).toEqual([]);
  });

  test("scène : « moi » = j'en suis l'auteur, ou son « qui » est une de mes catégories", () => {
    const d = vide();
    d.scene = [{
      programme: programme(),
      creneaux: [
        creneau({ id: "a", auteurUid: "u-moi", qui: ["Jeunes"] }),
        creneau({ id: "b", qui: ["Gp Paix"], debut: "14:00", fin: "15:00" }),
        creneau({ id: "c", qui: ["Gp Joie"], debut: "15:00", fin: "16:00" }),
      ],
    }];
    const e = de(entreesCalendrier(...OCT, d, ctx(MOI, profil({ serviceRoles: { "Groupe Paix": ["musicien"] } }))), "scene");
    expect(e.map((x) => [x.cle, x.moi])).toEqual([
      ["scene:b:2026-10-04", true],
      ["scene:c:2026-10-04", false],
      ["scene:a:2026-10-04", true],
    ]);
  });

  test("tâches : chaque échéance (une tâche répétée a une entrée par fois), « DA · échéance », pôles de la personne seulement", () => {
    const d = vide();
    d.taches = [
      { tache: tache({ id: "ppt", titre: "Fond PPT du culte", echeance: "2026-10-01" }), fois: [] },
      { tache: tache({ id: "setl", titre: "Envoyer la setlist", pole: "louange", echeance: "2026-10-02", responsableUid: "u-moi", responsableNom: "Alix P.", repetition: { rythme: "semaine" } }), fois: [] },
      { tache: tache({ id: "media", titre: "Vidéo", pole: "media" }), fois: [] },
    ];
    const membre = profil({ poles: ["da"], serviceRoles: { "Culte Francophone": ["musicien"] } });
    const e = de(entreesCalendrier(...OCT, d, ctx(MOI, membre)), "taches");
    expect(e.map((x) => x.cle)).toEqual([
      "taches:ppt:2026-10-01",
      "taches:setl:2026-10-02",
      "taches:setl:2026-10-09",
      "taches:setl:2026-10-16",
      "taches:setl:2026-10-23",
      "taches:setl:2026-10-30",
    ]);
    expect(e[0]).toMatchObject({ titre: "Fond PPT du culte", detail: "DA · échéance", couleur: "#8e8e93", heure: "", lien: "/taches/da" });
    expect(e[1]).toMatchObject({ titre: "Envoyer la setlist", detail: "Louange · Alix P.", lien: "/taches/louange" });
    // Q6 : la tâche répétée ne se glisse pas, et le dit (« Change la répétition dans la tâche ») ; l'unique, non.
    expect(e.map((x) => x.repetee ?? false)).toEqual([false, true, true, true, true, true]);
  });

  test("tâches : « moi » = responsable moi, ou mon pôle sans responsable, et pas terminée", () => {
    const d = vide();
    d.taches = [
      { tache: tache({ id: "a", titre: "Sans responsable", echeance: "2026-10-05" }), fois: [] },
      { tache: tache({ id: "b", titre: "À moi", echeance: "2026-10-06", responsableUid: "u-moi", responsableNom: "Alix P." }), fois: [] },
      { tache: tache({ id: "c", titre: "À un autre", echeance: "2026-10-07", responsableUid: "u-autre", responsableNom: "Noé R." }), fois: [] },
      { tache: tache({ id: "d", titre: "Faite", echeance: "2026-10-08" }), fois: [fois("2026-10-08", "terminee")] },
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx(MOI, profil({ poles: ["da"] }))), "taches");
    expect(e.map((x) => [x.titre, x.moi])).toEqual([
      ["Sans responsable", true],
      ["À moi", true],
      ["À un autre", false],
      ["Faite", false],
    ]);
  });

  test("petit déj : une entrée par ligne, « Libre » un dimanche à venir sans ligne, rien si la lecture a échoué", () => {
    const d = vide();
    d.petitDej = [
      { id: "l1", dimanche: "2026-10-18", nom: "Famille Martin", uid: "u-moi" },
      { id: "l2", dimanche: "2026-09-27", nom: "Passée", uid: "" },
    ];
    const e = de(entreesCalendrier("2026-09-27", "2026-10-25", d, ctx()), "petitDej");
    expect(e.map((x) => [x.date, x.detail, x.moi])).toEqual([
      ["2026-09-27", "Passée", false],
      ["2026-10-04", "Libre", false],
      ["2026-10-11", "Libre", false],
      ["2026-10-18", "Famille Martin", true],
      ["2026-10-25", "Libre", false],
    ]);
    expect(e[0]).toMatchObject({ titre: "Petit déj", couleur: "#c87941", deplacable: false, lien: "/planning/table" });
    expect(e[1].cle).toBe("petitDej:libre:2026-10-04");
    d.petitDej = null;
    expect(de(entreesCalendrier(...OCT, d, ctx()), "petitDej")).toEqual([]);
  });

  test("setlists : publiées et visibles seulement ; « moi » = celles que j'ai créées", () => {
    const d = vide();
    d.setlists = [
      setlist({ id: "s1", title: "Culte du 11 octobre", items: [{} as never, {} as never] }),
      setlist({ id: "s2", title: "Brouillon", isDraft: true }),
      setlist({ id: "s3", title: "Privée d'un autre", isPrivate: true, ownerId: "u-autre" }),
      setlist({ id: "s4", title: "La mienne", ownerId: "u-moi", category: "Groupe Paix", date: "2026-10-12" }),
      setlist({ id: "s5", title: "Groupe Bonté", category: "Groupe Bonté" }),
    ];
    const e = de(entreesCalendrier(...OCT, d, ctx(MOI, profil({ serviceRoles: { "Culte Francophone": ["chanteur"] } }))), "setlists");
    expect(e.map((x) => [x.titre, x.moi])).toEqual([
      ["Culte du 11 octobre", false],
      ["La mienne", true],
    ]);
    expect(e[0]).toMatchObject({ cle: "setlists:s1:2026-10-11", detail: "Culte Franco · 2 chants", couleur: "#2d5a65", deplacable: false, lien: "/setlists/s1" });
  });

  test("ordre dans un jour : Services, Évènements, Réunions, Scène, Tâches, Petit déj, Setlists, puis l'heure", () => {
    const d = vide();
    const J = "2026-10-11";
    d.setlists = [setlist({ id: "s", title: "Setlist", date: J })];
    d.petitDej = [];
    d.taches = [{ tache: tache({ id: "t", titre: "Tâche", echeance: J }), fois: [] }];
    d.scene = [{ programme: programme(), creneaux: [creneau({ id: "c2", dimanche: J, debut: "16:00", fin: "17:00" }), creneau({ id: "c1", dimanche: J, debut: "14:00", fin: "15:00" })] }];
    d.evenements = [evenement({ id: "r", titre: "Réunion", pour: "pole:da", date: J, heure: "08:00" }), evenement({ id: "e", titre: "Évènement", date: J, heure: "20:00" })];
    d.sheet = [{ date: J, titre: "Sheet", heure: "10:00", heureFin: "", horaire: "10h", lieu: "", responsable: "" }];
    d.seances = [{ category: "Culte Francophone", date: J, leader: "", label: "" }];
    d.mesServices = [];
    const e = entreesCalendrier(J, J, d, ctx(ADMIN, null));
    expect(e.map((x) => `${x.source}:${x.titre}:${x.heure}`)).toEqual([
      "services:Culte Franco:",
      "evenements:Sheet:10:00",
      "evenements:Évènement:20:00",
      "reunions:Réunion:08:00",
      "scene:Scène · Chant EDD 中班:14:00",
      "scene:Scène · Chant EDD 中班:16:00",
      "taches:Tâche:",
      "petitDej:Petit déj:",
      "setlists:Setlist:",
    ]);
  });

  test("les jours se suivent, et rien hors de la fenêtre", () => {
    const d = vide();
    d.evenements = [
      evenement({ id: "b", titre: "B", date: "2026-10-20" }),
      evenement({ id: "a", titre: "A", date: "2026-10-05" }),
      evenement({ id: "x", titre: "Septembre", date: "2026-09-30" }),
    ];
    expect(de(entreesCalendrier(...OCT, d, ctx(ADMIN, null)), "evenements").map((x) => x.date)).toEqual(["2026-10-05", "2026-10-20"]);
  });

  test("中文 : les mêmes entrées, libellés en chinois", () => {
    const d = vide();
    d.seances = [{ category: "Culte Francophone", date: "2026-10-04", leader: "Alix P.", label: "" }];
    d.evenements = [evenement({ id: "foot", titre: "Foot au parc", inscrits: 4, placesMax: 10 })];
    d.taches = [{ tache: tache({ id: "ppt", titre: "Fond PPT", echeance: "2026-10-05" }), fois: [] }];
    d.scene = [{ programme: programme(), creneaux: [creneau({ id: "c1" })] }];
    d.petitDej = [];
    d.setlists = [setlist({ id: "s1", title: "Culte", items: [{} as never] })];
    const e = entreesCalendrier("2026-10-04", "2026-10-11", d, ctx(ADMIN, null, "zh-CN"));
    const par = (s: EntreeCalendrier["source"]) => de(e, s)[0];
    expect(par("services").detail).toBe("司会：Alix P.");
    expect(par("evenements").detail).toBe("19:00 · 已报名 4/10");
    expect(par("taches").detail).toBe("美工 · 截止");
    expect(par("scene").titre).toBe("舞台 · Chant EDD 中班");
    expect(par("petitDej")).toMatchObject({ titre: "早餐", detail: "空闲" });
    expect(par("setlists").detail).toBe("Culte Franco · 1 首");
  });
});

test.describe("filtres : pastilles et « Seulement moi » (pur)", () => {
  const entrees = (): EntreeCalendrier[] => {
    const d = vide();
    d.seances = [{ category: "Culte Francophone", date: "2026-10-04", leader: "", label: "" }];
    d.mesServices = [{ date: "2026-10-04", service: "Culte Franco" }];
    d.sheet = [{ date: "2026-10-06", titre: "Sheet", heure: "", heureFin: "", horaire: "", lieu: "", responsable: "" }];
    d.taches = [
      { tache: tache({ id: "t1", titre: "À moi", responsableUid: "u-moi", responsableNom: "Alix P." }), fois: [] },
      { tache: tache({ id: "t2", titre: "À un autre", responsableUid: "u-autre", responsableNom: "Noé R." }), fois: [] },
    ];
    return entreesCalendrier(...OCT, d, ctx(MOI, profil({ poles: ["da"] })));
  };

  test("une pastille éteinte retire sa source", () => {
    const e = filtrerEntrees(entrees(), { sources: ["services", "evenements"], seulementMoi: false });
    expect(e.map((x) => x.source)).toEqual(["services", "evenements"]);
  });

  test("« Seulement moi » ne garde que les miennes, jamais une entrée du Sheet", () => {
    const e = filtrerEntrees(entrees(), { sources: [...SOURCES], seulementMoi: true });
    expect(e.map((x) => x.titre)).toEqual(["Culte Franco", "À moi"]);
  });
});

test.describe("pastilles permises (pur)", () => {
  // L'ordre des pastilles est celui de la planche (§ Écrans) : Tâches avant Réunions ;
  // celui d'un jour (SOURCES) met les réunions avant.
  const PLANCHE = ["services", "evenements", "taches", "reunions", "scene", "petitDej", "setlists"];

  test("sans pôle ni équipe : ni Tâches ni Réunions", () => {
    expect(sourcesPermises(MOI, profil())).toEqual(["services", "evenements", "scene", "petitDej", "setlists"]);
  });

  test("un pôle (Louange compris, par un rôle de service) : Tâches et Réunions, dans l'ordre de la planche", () => {
    expect(ORDRE_PASTILLES).toEqual(PLANCHE);
    expect(sourcesPermises(MOI, profil({ serviceRoles: { "Culte Francophone": ["musicien"] } }))).toEqual(PLANCHE);
  });

  test("une équipe sans pôle : Réunions, pas Tâches", () => {
    expect(sourcesPermises(MOI, profil({ dansEquipes: ["accueil"] }))).toEqual([
      "services", "evenements", "reunions", "scene", "petitDej", "setlists",
    ]);
  });

  test("un admin : toutes, dans l'ordre de la planche", () => {
    expect(sourcesPermises(ADMIN, null)).toEqual(PLANCHE);
  });
});

test.describe("peutDeplacer (pur)", () => {
  const coord = profil({ poles: ["evenement"] });
  const ev = evenement({ id: "e", titre: "E", organisateurUid: "u-moi", date: "2026-10-10" });

  test("évènement : l'organisateur, la coordination, un admin ; pas un autre membre", () => {
    expect(peutDeplacer(MOI, profil(), { source: "evenements", evenement: ev }, TODAY)).toBe(true);
    expect(peutDeplacer(AUTRE, coord, { source: "evenements", evenement: ev }, TODAY)).toBe(true);
    expect(peutDeplacer(ADMIN, null, { source: "evenements", evenement: ev }, TODAY)).toBe(true);
    expect(peutDeplacer(AUTRE, profil(), { source: "evenements", evenement: ev }, TODAY)).toBe(false);
  });

  test("évènement passé : ne bouge pas, même pour son organisateur ; en cours sur plusieurs jours non plus", () => {
    const passe = evenement({ id: "p", titre: "P", organisateurUid: "u-moi", date: "2026-09-30" });
    const enCours = evenement({ id: "c", titre: "C", organisateurUid: "u-moi", date: "2026-09-30", dateFin: "2026-10-02" });
    expect(peutDeplacer(MOI, profil(), { source: "evenements", evenement: passe }, TODAY)).toBe(false);
    expect(peutDeplacer(MOI, profil(), { source: "evenements", evenement: enCours }, TODAY)).toBe(false);
    expect(peutDeplacer(MOI, profil(), { source: "evenements", evenement: { ...passe, date: TODAY } }, TODAY)).toBe(true);
  });

  test("réunion : son organisateur et la coordination, pas un membre du pôle qui ne l'a pas créée", () => {
    const reu = evenement({ id: "r", titre: "R", pour: "pole:da", organisateurUid: "u-orga" });
    expect(peutDeplacer(MOI, profil({ poles: ["da"] }), { source: "reunions", evenement: reu }, TODAY)).toBe(false);
    expect(peutDeplacer({ uid: "u-orga" }, profil({ poles: ["da"] }), { source: "reunions", evenement: reu }, TODAY)).toBe(true);
    expect(peutDeplacer(AUTRE, coord, { source: "reunions", evenement: reu }, TODAY)).toBe(true);
  });

  test("tâche unique : les membres du pôle et les admins ; pas un autre", () => {
    const t = tache({ id: "t", titre: "T" });
    const cible = { source: "taches" as const, tache: t, date: t.echeance, fois: [] };
    expect(peutDeplacer(MOI, profil({ poles: ["da"] }), cible, TODAY)).toBe(true);
    expect(peutDeplacer(ADMIN, null, cible, TODAY)).toBe(true);
    expect(peutDeplacer(MOI, profil({ poles: ["media"] }), cible, TODAY)).toBe(false);
  });

  test("tâche répétée : ne se glisse pas", () => {
    const t = tache({ id: "t", titre: "T", repetition: { rythme: "semaine" } });
    expect(peutDeplacer(ADMIN, null, { source: "taches", tache: t, date: "2026-10-15", fois: [] }, TODAY)).toBe(false);
  });

  test("tâche passée : bouge tant qu'elle n'est pas terminée", () => {
    const t = tache({ id: "t", titre: "T", echeance: "2026-09-20" });
    expect(peutDeplacer(ADMIN, null, { source: "taches", tache: t, date: t.echeance, fois: [] }, TODAY)).toBe(true);
    expect(peutDeplacer(ADMIN, null, { source: "taches", tache: t, date: t.echeance, fois: [fois(t.echeance, "encours")] }, TODAY)).toBe(true);
    expect(peutDeplacer(ADMIN, null, { source: "taches", tache: t, date: t.echeance, fois: [fois(t.echeance, "terminee")] }, TODAY)).toBe(false);
  });

  test("créneau : l'auteur si son groupe est permis et la saison ouverte ; la coordination toujours ; pas un autre", () => {
    const c = creneau({ id: "c", auteurUid: "u-moi", qui: ["Gp Paix"] });
    const ouvert = programme({ quiAutorises: ["Gp Paix"] });
    expect(peutDeplacer(MOI, profil(), { source: "scene", creneau: c, programme: ouvert }, TODAY)).toBe(true);
    expect(peutDeplacer(MOI, profil(), { source: "scene", creneau: c, programme: programme({ quiAutorises: ["Jeunes"] }) }, TODAY)).toBe(false);
    expect(peutDeplacer(MOI, profil(), { source: "scene", creneau: c, programme: programme({ ouvert: false }) }, TODAY)).toBe(false);
    expect(peutDeplacer(AUTRE, coord, { source: "scene", creneau: c, programme: programme({ quiAutorises: ["Jeunes"] }) }, TODAY)).toBe(true);
    expect(peutDeplacer(AUTRE, profil(), { source: "scene", creneau: c, programme: ouvert }, TODAY)).toBe(false);
  });

  test("créneau passé : ne bouge pas", () => {
    const c = creneau({ id: "c", auteurUid: "u-moi", dimanche: "2026-09-27" });
    expect(peutDeplacer(AUTRE, coord, { source: "scene", creneau: c, programme: programme() }, TODAY)).toBe(false);
  });

  test("services, entrées du Sheet, setlists, petit déj : jamais", () => {
    for (const source of ["services", "sheet", "setlists", "petitDej"] as const) {
      expect(peutDeplacer(ADMIN, null, { source }, TODAY)).toBe(false);
    }
  });

  test("le champ `deplacable` des entrées suit peutDeplacer", () => {
    const d = vide();
    d.evenements = [ev, evenement({ id: "autre", titre: "Autre", date: "2026-10-12" })];
    d.taches = [{ tache: tache({ id: "u", titre: "Unique" }), fois: [] }, { tache: tache({ id: "r", titre: "Répétée", repetition: { rythme: "mois", rang: 3 } }), fois: [] }];
    d.scene = [{ programme: programme(), creneaux: [creneau({ id: "c", auteurUid: "u-moi", qui: ["Jeunes"] })] }];
    const e = entreesCalendrier(...OCT, d, ctx(MOI, profil({ poles: ["da"] })));
    const dep = Object.fromEntries(e.map((x) => [x.cle, x.deplacable]));
    expect(dep["evenements:e:2026-10-10"]).toBe(true);
    expect(dep["evenements:autre:2026-10-12"]).toBe(false);
    expect(dep["taches:u:2026-10-15"]).toBe(true);
    expect(dep["taches:r:2026-10-15"]).toBe(false);
    expect(dep["scene:c:2026-10-04"]).toBe(true);
  });
});

// ─── C3 : la page en Mois (ordinateur, tablettes) ───────────────────────────
// Horloge au jeudi 1er octobre 2026 ; Sheet des évènements (fixture d'octobre),
// planning (onglet du culte) et Firestore simulés. Noms et titres inventés.
// Le téléphone montre encore le Mois : l'Agenda d'office vient avec C4.

test.describe("grille du mois (pur)", () => {
  test("six semaines du lundi au dimanche, à partir du lundi qui précède le 1er", () => {
    const jours = joursDeLaGrille("2026-10");
    expect(jours).toHaveLength(42);
    expect(jours[0]).toBe("2026-09-28");
    expect(jours[3]).toBe("2026-10-01");
    expect(jours[41]).toBe("2026-11-08");
    // Un mois qui commence un lundi commence la grille.
    expect(joursDeLaGrille("2026-06")[0]).toBe("2026-06-01");
  });

  test("libellé court d'une case : le nom après « Présidence : », l'heure après le titre, « Petit déj : libre »", () => {
    const d = vide();
    d.seances = [{ category: "Culte Francophone", date: "2026-10-04", leader: "Lou M.", label: "" }];
    d.evenements = [evenement({ id: "r", titre: "Réunion DA", pour: "pole:da", date: "2026-10-03", heure: "20:00" })];
    d.petitDej = [{ id: "p", dimanche: "2026-10-18", nom: "Famille Test", uid: "" }];
    const e = entreesCalendrier(...OCT, d, ctx(ADMIN, null));
    const court = (cle: string) => libelleCourt(e.find((x) => x.cle === cle)!, "fr");
    expect(court("services:Culte Francophone:2026-10-04")).toBe("Culte Franco · Lou M.");
    expect(court("reunions:r:2026-10-03")).toBe("Réunion DA 20:00");
    expect(court("petitDej:libre:2026-10-04")).toBe("Petit déj : libre");
    expect(court("petitDej:p:2026-10-18")).toBe("Famille Test");
    const zh = entreesCalendrier(...OCT, d, ctx(ADMIN, null, "zh-CN"));
    expect(libelleCourt(zh.find((x) => x.cle === "services:Culte Francophone:2026-10-04")!, "zh-CN")).toBe("Culte Franco · Lou M.");
    expect(libelleCourt(zh.find((x) => x.cle === "petitDej:libre:2026-10-04")!, "zh-CN")).toBe("早餐：空闲");
  });
});

const FIXTURE_OCTOBRE = readFileSync(join(__dirname, "fixtures", "sheet-evenements-mois.csv"), "utf8");
const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["04/10", "Lou M.", "", "", "", "", "", "", "", "", "", "", ""],
  // Le 11 : tout rempli sauf Batterie et Sono (« Cases vides : Batterie, Sono », la Sainte cène est optionnelle).
  ["11/10", "Sam T.", "Ana B.", "Bea C.", "Cyd D.", "Dan E.", "", "", "Eli F.", "Fay G.", "Gus H.", "", ""],
]);

const P_ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };
/** Responsable des plannings, sans pôle : ni Tâches ni Réunions (Q2). */
const P_PLANNINGS: FakeProfile = { uid: "u-pl", email: "pl@example.org", firstName: "Noa", lastName: "V.", plannings: ["culte"] };

const MAINTENANT = "2026-09-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/reu-da": {
    titre: "Réunion DA", type: "reunion", pour: "pole:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/ping": {
    titre: "Tournoi de ping", type: "loisir", pour: "eglise", date: "2026-10-22", heure: "19:00", lieu: "Gymnase",
    placesMax: 10, inscrits: 4, organisateurUid: "u-autre", organisateurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  // Le 4 porte cinq entrées (culte, baptêmes, repas du Sheet, scène, petit déj) : trois, puis « +2 ».
  "evenements/bapteme": {
    titre: "Baptêmes", type: "culte", pour: "eglise", date: "2026-10-04", heure: "11:00", lieu: "Église",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "poles/da/taches/noel": {
    titre: "Chants de Noël", responsableUid: null, responsableNom: "", echeance: "2026-10-15", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "programmes/noel": {
    nom: "Noël", jourJ: "2026-12-20", debut: "2026-09-27", visible: true, passages: [], createdBy: "u-autre", updatedAt: MAINTENANT,
  },
  "programmes/noel/creneaux/c4": {
    dimanche: "2026-10-04", debut: "17:00", fin: "18:00", quoi: "Sketch", qui: ["Jeunes"], note: "",
    auteurUid: "u-autre", auteurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "programmes/noel/creneaux/c11": {
    dimanche: "2026-10-11", debut: "14:00", fin: "15:30", quoi: "Sketch", qui: ["Jeunes"], note: "Costumes à prévoir",
    auteurUid: "u-autre", auteurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "petitDej/pd18": { dimanche: "2026-10-18", nom: "Famille Test", uid: "", auteurUid: "u-autre", creeLe: MAINTENANT, modifieLe: MAINTENANT },
  // La setlist publiée du culte du 11 (planche bo-calendrier : « Setlist « Culte du 11 octobre » · 4 chants »).
  "setlists/s11": {
    title: "Culte du 11 octobre", leader: "Sam T.", category: "Culte Francophone", date: "2026-10-11", language: "fr", notes: "",
    createdAt: MAINTENANT, isDraft: false, isPrivate: false, ownerId: "u-autre",
    items: [1, 2, 3, 4].map((position) => ({ songSlug: `chant-${position}`, position })),
  },
  // L'admin est inscrit au tournoi du 22 ; un évènement d'il y a deux ans reste dans la base.
  "evenements/ping/inscriptions/u-admin": { uid: "u-admin", nom: "Admin T.", le: MAINTENANT },
  "evenements/vieux": {
    titre: "Sortie de 2024", type: "loisir", pour: "eglise", date: "2024-10-12", heure: "10:00",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 3, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
};

/** Le Sheet des évènements (export par gid) et le planning (gviz) : jamais les vrais. */
async function sheets(page: Page, opts: { evenementsCoupe?: boolean } = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/export")) {
      if (opts.evenementsCoupe) return route.abort("internetdisconnected");
      const corps = url.searchParams.get("gid") === "439766955" ? FIXTURE_OCTOBRE : "";
      return route.fulfill({ status: 200, contentType: "text/csv", body: corps });
    }
    const corps = url.searchParams.get("sheet") === "Franco_Louange" ? CULTE : "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: corps });
  });
}

async function ouvrir(
  page: Page,
  profil: FakeProfile = P_ADMIN,
  opts: { evenementsCoupe?: boolean; docs?: Record<string, Record<string, unknown>>; maintenant?: string } = {},
) {
  await page.clock.setFixedTime(new Date(opts.maintenant ?? "2026-10-01T10:00:00"));
  await sheets(page, opts);
  const db = await signInAs(page, profil, { ...DOCS, ...opts.docs }, "/back-office/calendrier");
  // « Octobre 2026 » ; « Octobre » sur téléphone (planche bo-telephone-calendrier, C4).
  await expect(page.getByTestId("mois-affiche")).toHaveText(/^Octobre( 2026)?$/);
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  return db;
}

const jour = (page: Page, date: string) => page.locator(`[data-jour="${date}"]`);
const pastilles = (page: Page) => page.getByRole("group", { name: "Sources affichées" });
/** Panneau du jour : à droite sur ordinateur et tablette couchée, en feuille ailleurs. */
const panneauADroite = (info: TestInfo) => info.project.name.startsWith("ordinateur") || info.project.name === "tablette-paysage";
/** Téléphone (C4) : Agenda d'office, Mois à points, pastilles dans la feuille « Sources ». */
const estTelephone = (info: TestInfo) => info.project.name === "telephone";
const SANS_TELEPHONE = "grille étiquetée : ordinateur et tablettes ; le téléphone a l'agenda et le Mois à points (C4)";

/** Les pastilles des sources : en rangée, ou dans la feuille « Sources » sur téléphone. */
async function sourcesAffichees(page: Page, info: TestInfo) {
  if (estTelephone(info)) {
    await page.getByRole("button", { name: "Sources", exact: true }).click();
    return page.getByRole("dialog", { name: "Sources" }).getByRole("group", { name: "Sources affichées" });
  }
  return pastilles(page);
}
/** Rail « Mois · Agenda » (agencement v18) : choisit la vue (sans effet si elle l'est déjà). */
async function vue(page: Page, nom: "Mois" | "Agenda") {
  const bouton = page.getByRole("tablist", { name: "Affichage" }).getByRole("tab", { name: nom });
  if ((await bouton.getAttribute("aria-selected")) !== "true") await bouton.click();
  await expect(bouton).toHaveAttribute("aria-selected", "true");
}
async function fermerSources(page: Page, info: TestInfo) {
  if (!estTelephone(info)) return;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Sources" })).toHaveCount(0);
}

test.describe("C3 : la page du calendrier en Mois", () => {
  test("l'entrée « Calendrier » du menu du Back-Office mène à la page", async ({ page }) => {
    expect(entreesBackOffice(ADMIN, null)).toContain("calendrier");
    // Depuis le tableau de bord : la barre latérale sur grand écran, la liste du tableau de
    // bord sur téléphone et tablette en portrait (U6).
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    const lien = page.getByRole("link", { name: "Calendrier" }).filter({ visible: true }).first();
    await expect(lien).toHaveAttribute("href", /^\/back-office\/calendrier\/?$/);
    await lien.click();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Octobre( 2026)?$/);
  });

  test("octobre en grille : culte du 4 et sa présidence, Sheet le 6, réunion le 3, tâche le 15, scène et petit déj le dimanche (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page);
    await expect(page.getByTestId("grille-mois").locator("[data-jour]")).toHaveCount(42);
    await expect(jour(page, "2026-10-04").locator('[data-source="services"]')).toContainText("Culte Franco · Lou M.");
    await expect(jour(page, "2026-10-06").locator('[data-source="evenements"]').first()).toContainText("Soirée louange 19:00");
    await expect(jour(page, "2026-10-03").locator('[data-source="reunions"]')).toContainText("Réunion DA 20:00");
    await expect(jour(page, "2026-10-15").locator('[data-source="taches"]')).toContainText("Chants de Noël");
    // Le 4, la scène est derrière « +2 » ; le 11 (culte, scène, petit déj) la montre.
    await expect(jour(page, "2026-10-11").locator('[data-source="scene"]')).toContainText("Scène · Sketch Jeunes 14:00");
    await expect(jour(page, "2026-10-18").locator('[data-source="petitDej"]')).toContainText("Famille Test");
    await expect(jour(page, "2026-10-11").locator('[data-source="petitDej"]')).toContainText("Petit déj : libre");
    // Aujourd'hui est marqué ; les jours hors du mois aussi.
    await expect(jour(page, "2026-10-01")).toHaveAttribute("aria-current", "date");
    await expect(jour(page, "2026-09-28")).toHaveAttribute("data-hors-mois", "true");
  });

  test("Setlists éteinte d'office ; une pastille éteinte retire sa source, même après rechargement", async ({ page }, info) => {
    await ouvrir(page);
    let groupe = await sourcesAffichees(page, info);
    await expect(groupe.getByRole("button", { name: "Setlists" })).toHaveAttribute("aria-pressed", "false");
    const taches = groupe.getByRole("button", { name: "Tâches" });
    await expect(taches).toHaveAttribute("aria-pressed", "true");
    await taches.click();
    await expect(taches).toHaveAttribute("aria-pressed", "false");
    await fermerSources(page, info);
    await expect(jour(page, "2026-10-15").locator('[data-source="taches"]')).toHaveCount(0);
    // L'entrée du Sheet du même jour reste.
    await expect(jour(page, "2026-10-15").locator('[data-source="evenements"]')).toHaveCount(1);
    await page.reload();
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    groupe = await sourcesAffichees(page, info);
    await expect(groupe.getByRole("button", { name: "Tâches" })).toHaveAttribute("aria-pressed", "false");
    await fermerSources(page, info);
    await expect(jour(page, "2026-10-15").locator('[data-source="evenements"]')).toHaveCount(1);
    await expect(jour(page, "2026-10-15").locator('[data-source="taches"]')).toHaveCount(0);
  });

  test("« Seulement moi » ne laisse que mes entrées (mon service du 4), retenu au rechargement", async ({ page }) => {
    await ouvrir(page);
    const moi = page.getByRole("button", { name: "Seulement moi" });
    await expect(moi).toHaveAttribute("aria-pressed", "false");
    await moi.click();
    await expect(moi).toHaveAttribute("aria-pressed", "true");
    await expect(jour(page, "2026-10-04").locator('[data-source="services"]')).toContainText("Lou M.");
    await expect(jour(page, "2026-10-11").locator('[data-source="services"]')).toHaveCount(0);
    await expect(jour(page, "2026-10-03").locator('[data-source="reunions"]')).toHaveCount(0);
    await expect(jour(page, "2026-10-06").locator('[data-source="evenements"]')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("button", { name: "Seulement moi" })).toHaveAttribute("aria-pressed", "true");
    await expect(jour(page, "2026-10-11").locator('[data-source="services"]')).toHaveCount(0);
  });

  test("toucher un jour ouvre le panneau du jour (à droite sur grand écran, en feuille sinon ; ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page);
    await jour(page, "2026-10-11").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Dimanche 11 octobre" })
      : page.getByRole("dialog", { name: "Dimanche 11 octobre" });
    await expect(panneau).toBeVisible();
    await expect(panneau.getByRole("link", { name: /Culte Franco/ })).toContainText("Présidence : Sam T.");
    await expect(panneau.getByRole("link", { name: /Scène/ })).toContainText("14:00 – 15:30 · Costumes à prévoir");
    await expect(panneau.getByRole("link", { name: /Petit déj/ })).toContainText("Libre");
    await expect(jour(page, "2026-10-11")).toHaveAttribute("aria-pressed", "true");
  });

  test("le panneau du jour dit les cases vides d'un service : « Cases vides : Batterie, Sono » (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page);
    await jour(page, "2026-10-11").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Dimanche 11 octobre" })
      : page.getByRole("dialog", { name: "Dimanche 11 octobre" });
    await expect(panneau.getByRole("link", { name: /Culte Franco/ })).toContainText("Cases vides : Batterie, Sono");
    // La case de la grille n'en dit rien : la carte du panneau seulement (planche bo-calendrier).
    await expect(jour(page, "2026-10-11")).not.toContainText("Cases vides");
  });

  test("« Cases vides » : seulement pour les plannings qu'on remplit ou publie, comme le widget 4 (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page, P_POLES);
    await jour(page, "2026-10-11").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Dimanche 11 octobre" })
      : page.getByRole("dialog", { name: "Dimanche 11 octobre" });
    await expect(panneau.getByRole("link", { name: /Culte Franco/ })).toContainText("Présidence : Sam T.");
    await expect(panneau).not.toContainText("Cases vides");
  });

  test("sur grand écran, le panneau montre aujourd'hui dès l'ouverture", async ({ page }, info) => {
    test.skip(!panneauADroite(info), "panneau à droite : ordinateur et tablette couchée");
    await ouvrir(page);
    await expect(page.getByRole("complementary", { name: "Jeudi 1er octobre" })).toBeVisible();
  });

  test("trois entrées dans une case, puis « +N », qui ouvre le jour entier (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page);
    const quatre = jour(page, "2026-10-04");
    await expect(quatre.locator("[data-source]")).toHaveCount(3);
    const plus = quatre.getByTestId("plus-n");
    await expect(plus).toHaveText(/^\+\d+$/);
    const n = Number((await plus.textContent())!.slice(1));
    await plus.click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Dimanche 4 octobre" })
      : page.getByRole("dialog", { name: "Dimanche 4 octobre" });
    // Les cartes du jour (les boutons de création, C5, sont sous la liste).
    await expect(panneau.getByRole("list").getByRole("link")).toHaveCount(3 + n);
  });

  test("une entrée du Sheet : lecture seule, ni « Déplacer… », elle ouvre l'onglet du mois (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page);
    await jour(page, "2026-10-06").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Mardi 6 octobre" })
      : page.getByRole("dialog", { name: "Mardi 6 octobre" });
    const carte = panneau.getByRole("link", { name: /Soirée louange/ });
    await expect(carte).toContainText("Lu dans le Sheet des évènements");
    await expect(carte).toContainText("19:00 – 21:00");
    await expect(carte).toHaveAttribute("href", /docs\.google\.com\/spreadsheets\/d\/[^/]+\/edit#gid=439766955$/);
    await expect(carte).toHaveAttribute("target", "_blank");
    await expect(panneau.getByRole("button", { name: /Déplacer/ })).toHaveCount(0);
  });

  test("sans pôle : ni pastille Tâches ni Réunions, et aucune tâche", async ({ page }, info) => {
    await ouvrir(page, P_PLANNINGS);
    const groupe = await sourcesAffichees(page, info);
    await expect(groupe.getByRole("button", { name: "Services" })).toBeVisible();
    await expect(groupe.getByRole("button", { name: "Tâches" })).toHaveCount(0);
    await expect(groupe.getByRole("button", { name: "Réunions" })).toHaveCount(0);
    await fermerSources(page, info);
    await expect(page.locator('[data-source="taches"]')).toHaveCount(0);
  });

  test("Sheet des évènements injoignable : bandeau, et les autres sources s'affichent", async ({ page }) => {
    await ouvrir(page, P_ADMIN, { evenementsCoupe: true });
    await expect(page.getByRole("status").filter({ hasText: "Sheet des évènements injoignable" })).toBeVisible();
    await expect(jour(page, "2026-10-04").locator('[data-source="services"]')).toContainText("Lou M.");
    await expect(jour(page, "2026-10-06").locator('[data-source="evenements"]')).toHaveCount(0);
  });

  test("‹ › changent de mois, « Aujourd'hui » y revient", async ({ page }) => {
    await ouvrir(page);
    await vue(page, "Mois");
    await page.getByRole("button", { name: "Mois suivant" }).click();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Novembre( 2026)?$/);
    await expect(page.locator("[data-jour]").first()).toHaveAttribute("data-jour", "2026-10-26");
    await page.getByRole("button", { name: "Aujourd'hui" }).click();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Octobre( 2026)?$/);
    await page.getByRole("button", { name: "Mois précédent" }).click();
    await expect(page.getByTestId("mois-affiche")).toHaveText(/^Septembre( 2026)?$/);
  });

  test("中文 : titre, pastilles et entrées", async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office/calendrier");
    await expect(page.getByTestId("mois-affiche")).toHaveText(estTelephone(info) ? "10月" : "2026年10月");
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    if (estTelephone(info)) await page.getByRole("button", { name: "来源", exact: true }).click();
    const groupe = page.getByRole("group", { name: "显示的来源" });
    await expect(groupe.getByRole("button", { name: "任务" })).toBeVisible();
    if (estTelephone(info)) await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "只看我的" })).toBeVisible();
    // La case de la grille dit « 早餐：空闲 » ; la carte de l'agenda, « 早餐 » puis « 空闲 ».
    await expect(jour(page, "2026-10-11").locator('[data-source="petitDej"]')).toContainText(estTelephone(info) ? "空闲" : "早餐：空闲");
    if (estTelephone(info)) return;
    // Les cases vides du panneau du jour, libellés des colonnes en chinois.
    await jour(page, "2026-10-11").click();
    await expect(page.getByRole(panneauADroite(info) ? "complementary" : "dialog", { name: /10月11日/ })).toContainText("空缺：架子鼓, 音控");
  });
});

test.describe("relecture du lot : setlist du culte, ordre des pastilles, lectures, sources illisibles", () => {
  test("le panneau du 11 : la setlist du culte sous la présidence, pastille Setlists éteinte (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page);
    await jour(page, "2026-10-11").click();
    const panneau = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Dimanche 11 octobre" })
      : page.getByRole("dialog", { name: "Dimanche 11 octobre" });
    const culte = panneau.getByRole("link", { name: /Culte Franco/ });
    await expect(culte).toContainText("Présidence : Sam T.");
    await expect(culte).toContainText("Setlist « Culte du 11 octobre » · 4 chants");
    await expect(culte).toContainText("Cases vides : Batterie, Sono");
    // Pas de carte « Setlist » à part : la pastille est éteinte d'office.
    await expect(panneau.locator('[data-source="setlists"]')).toHaveCount(0);
  });

  test("中文 : la setlist du culte dans le panneau du jour (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office/calendrier");
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    await jour(page, "2026-10-11").click();
    await expect(page.getByRole(panneauADroite(info) ? "complementary" : "dialog", { name: /10月11日/ }))
      .toContainText("歌单「Culte du 11 octobre」· 4 首");
  });

  test("les pastilles dans l'ordre de la planche : Tâches avant Réunions", async ({ page }, info) => {
    await ouvrir(page);
    const groupe = await sourcesAffichees(page, info);
    await expect(groupe.getByRole("button")).toHaveText([
      "Services", "Évènements (Sheet)", "Tâches", "Réunions", "Scène", "Petit déj", "Setlists",
    ]);
  });

  test("mes inscriptions ne se lisent qu'avec « Seulement moi », pour les évènements de la période affichée", async ({ page }) => {
    const lues: string[] = [];
    page.on("request", (r) => {
      const m = /\/evenements\/([^/]+)\/inscriptions\//.exec(decodeURIComponent(r.url()));
      if (m && r.method() === "GET") lues.push(m[1]);
    });
    await ouvrir(page);
    expect(lues, "« Seulement moi » éteint : aucune inscription lue").toEqual([]);
    await page.getByRole("button", { name: "Seulement moi" }).click();
    await expect(page.locator('[data-source="evenements"]').filter({ hasText: "Tournoi de ping" })).toHaveCount(1);
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    expect(lues).toContain("ping");
    expect(lues, "un évènement hors de la période n'est pas lu").not.toContain("vieux");
    expect(lues, "une réunion n'a pas d'inscriptions").not.toContain("reu-da");
  });

  test("téléphone : les fois d'une tâche ne se lisent que si elle a une échéance dans la période affichée", async ({ page }, info) => {
    // Ailleurs, la barre latérale du Back-Office relit toutes les tâches pour sa pastille (lot U6) :
    // le téléphone, sans elle, isole les lectures du calendrier.
    test.skip(!estTelephone(info), "test propre au téléphone");
    const lues: string[] = [];
    page.on("request", (r) => {
      const m = /\/taches\/([^/:]+):runQuery/.exec(decodeURIComponent(r.url()));
      if (m) lues.push(m[1]);
    });
    await ouvrir(page, P_ADMIN, {
      docs: {
        "poles/da/taches/ancienne": {
          titre: "Affiche de 2024", responsableUid: null, responsableNom: "", echeance: "2024-10-15", repetition: null,
          lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
        },
      },
    });
    await expect(page.locator('[data-source="taches"]').filter({ hasText: "Chants de Noël" })).toHaveCount(1);
    expect(lues).toContain("noel");
    expect(lues).not.toContain("ancienne");
  });

  test("une source illisible : bandeau qui la nomme, et le reste s'affiche", async ({ page }, info) => {
    await ouvrir(page);
    // Firestore injoignable pour les tâches (réseau qui bloque) : la liste rejette.
    await page.route(/documents\/poles\/[a-z-]+:runQuery/, (route) => route.abort("internetdisconnected"));
    await page.reload();
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("status").filter({ hasText: "Lecture impossible : Tâches" })).toBeVisible();
    await expect(page.locator('[data-source="services"]').filter({ hasText: "Sam T." }).first()).toBeVisible();
    if (!estTelephone(info)) await expect(jour(page, "2026-10-04").locator('[data-source="services"]')).toContainText("Lou M.");
  });

  test("téléphone : la grille du Mois n'apparaît jamais avant l'Agenda (requêtes média lues au montage)", async ({ page }, info) => {
    test.skip(!estTelephone(info), "test propre au téléphone");
    // La page se monte après la connexion (gabarit de U6 : « Chargement… »), jamais à
    // l'hydratation : les requêtes média sont lues dès son premier rendu.
    await page.addInitScript(() => {
      const w = window as unknown as { __grilleVue?: boolean };
      new MutationObserver(() => {
        if (document.querySelector('[data-testid="grille-mois"]')) w.__grilleVue = true;
      }).observe(document, { childList: true, subtree: true });
    });
    await ouvrir(page);
    await expect(page.getByTestId("agenda")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __grilleVue?: boolean }).__grilleVue ?? false)).toBe(false);
  });
});

test.describe("C3 : captures à regarder", () => {
  // Comparées à la planche bo-calendrier (ordinateur) ; tablettes et téléphone à l'œil.
  test("octobre, puis le dimanche 11 ouvert, dans chaque disposition (ordinateur et tablettes)", async ({ page }, info) => {
    test.skip(estTelephone(info), SANS_TELEPHONE);
    await ouvrir(page);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: `test-results/calendrier-captures/${info.project.name}-mois.png` });
    await jour(page, "2026-10-11").click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/calendrier-captures/${info.project.name}-jour.png` });
  });
});

// ─── C4 : Agenda (téléphone, et au choix en grand), feuille « Sources », Mois à points ───

/** Une tâche aujourd'hui (planche : « Fond PPT du culte », « DA · échéance ») et une sortie en novembre. */
const DOCS_AGENDA: Record<string, Record<string, unknown>> = {
  "poles/da/taches/ppt": {
    titre: "Fond PPT du culte", responsableUid: null, responsableNom: "", echeance: "2026-10-01", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/marche": {
    titre: "Marche d'automne", type: "sport", pour: "eglise", date: "2026-11-07", heure: "09:30", lieu: "Forêt",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
};
const agenda = (page: Page) => page.getByTestId("agenda");
/** Les jours de l'agenda, dans l'ordre : le titre du jour (téléphone) ou le nom de son bouton (agenda v18 en grand). */
const titresDesJours = (page: Page) =>
  agenda(page).locator("[data-jour]").evaluateAll((els) =>
    els.map((el) => el.querySelector("h2")?.textContent ?? el.querySelector("button[aria-label]")?.getAttribute("aria-label") ?? ""));

test.describe("C4 : Agenda, feuille « Sources », Mois à points", () => {
  test("vue d'office : Mois sur ordinateur et tablettes, Agenda sur téléphone", async ({ page }, info) => {
    await ouvrir(page);
    const choix = page.getByRole("tablist", { name: "Affichage" });
    await expect(choix.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-selected", String(estTelephone(info)));
    await expect(choix.getByRole("tab", { name: "Mois" })).toHaveAttribute("aria-selected", String(!estTelephone(info)));
    if (estTelephone(info)) {
      await expect(agenda(page)).toBeVisible();
      await expect(page.getByTestId("mois-affiche")).toHaveText("Octobre");
    } else {
      await expect(page.getByTestId("grille-mois")).toBeVisible();
      await expect(agenda(page)).toHaveCount(0);
    }
  });

  test("Agenda : part d'aujourd'hui, jours vides sautés, une carte par entrée (titre et détail)", async ({ page }) => {
    await ouvrir(page, P_ADMIN, { docs: DOCS_AGENDA });
    await vue(page, "Agenda");
    const titres = await titresDesJours(page);
    expect(titres[0]).toBe("Aujourd'hui · jeudi 1er octobre");
    expect(titres).toContain("Samedi 3 octobre");
    expect(titres).toContain("Dimanche 4 octobre");
    // Rien le 2 : le jour est sauté.
    expect(titres).not.toContain("Vendredi 2 octobre");
    await expect(jour(page, "2026-10-01").locator('[data-source="taches"]')).toContainText("Fond PPT du culte");
    await expect(jour(page, "2026-10-01").locator('[data-source="taches"]')).toContainText("DA · échéance");
    await expect(jour(page, "2026-10-03").locator('[data-source="reunions"]')).toContainText("Réunion DA");
    // Téléphone : « 20:00 · Salle 2 » ; dès 768 px, l'heure a sa colonne (agenda v18).
    await expect(jour(page, "2026-10-03").locator('[data-source="reunions"]')).toContainText(/20:00.*Salle 2/);
    // Le dimanche, dans l'ordre : service, évènements, scène, petit déj.
    const dimanche = jour(page, "2026-10-04").locator("[data-source]");
    await expect(dimanche.first()).toHaveAttribute("data-source", "services");
    await expect(dimanche.first()).toContainText("Culte Franco");
    await expect(dimanche.first()).toContainText("Présidence : Lou M.");
    await expect(jour(page, "2026-10-04").locator('[data-source="scene"]')).toContainText(/17:00.*18:00/);
    await expect(jour(page, "2026-10-04").locator('[data-source="petitDej"]')).toContainText("Libre");
    await expect(jour(page, "2026-10-22").locator('[data-source="evenements"]')).toContainText(/19:00.*Gymnase · 4 inscrits sur 10/);
    // Le volet du jour à côté de l'agenda en grand (agenda v18, B5) ; aucun ailleurs.
    await expect(page.getByRole("complementary")).toHaveCount(panneauADroite(test.info()) ? 1 : 0);
  });

  test("Agenda : rien avant aujourd'hui", async ({ page }) => {
    await ouvrir(page, P_ADMIN, { maintenant: "2026-10-05T10:00:00" });
    await vue(page, "Agenda");
    await expect(jour(page, "2026-10-04")).toHaveCount(0);
    const titres = await titresDesJours(page);
    expect(titres[0]).toBe("Mardi 6 octobre");
  });

  test("Agenda : toucher une carte ouvre sa feuille (date, détail, « Ouvrir »)", async ({ page }, info) => {
    test.skip(!estTelephone(info), "téléphone : dès 768 px, une ligne de l'agenda choisit son jour (agencement-v18-calendrier.spec.ts)");
    await ouvrir(page);
    await vue(page, "Agenda");
    await jour(page, "2026-10-03").getByRole("button", { name: /Réunion DA/ }).click();
    const feuille = page.getByRole("dialog", { name: "Réunion DA" });
    await expect(feuille).toContainText("Samedi 3 octobre");
    await expect(feuille).toContainText("20:00 · Salle 2");
    await expect(feuille.getByRole("link", { name: "Ouvrir" })).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da\/?$/);
  });

  test("Agenda : une entrée du Sheet, lecture seule, « Ouvrir » mène à l'onglet du mois, pas de « Déplacer… »", async ({ page }, info) => {
    test.skip(!estTelephone(info), "téléphone : dès 768 px, la carte du Sheet est dans le volet ou la feuille du jour (test suivant)");
    await ouvrir(page);
    await vue(page, "Agenda");
    await jour(page, "2026-10-06").getByRole("button", { name: /Soirée louange/ }).click();
    const feuille = page.getByRole("dialog", { name: "Soirée louange" });
    await expect(feuille).toContainText("Lu dans le Sheet des évènements");
    await expect(feuille).toContainText("19:00 – 21:00");
    const ouvrirLien = feuille.getByRole("link", { name: "Ouvrir" });
    await expect(ouvrirLien).toHaveAttribute("href", /docs\.google\.com\/spreadsheets\/d\/[^/]+\/edit#gid=439766955$/);
    await expect(ouvrirLien).toHaveAttribute("target", "_blank");
    await expect(feuille.getByRole("button", { name: /Déplacer/ })).toHaveCount(0);
  });

  test("Agenda dès 768 px : toucher une ligne choisit son jour ; la carte du Sheet, en lecture seule, ouvre l'onglet du mois", async ({ page }, info) => {
    test.skip(estTelephone(info), "le téléphone ouvre la feuille de l'entrée (tests précédents)");
    await ouvrir(page);
    await vue(page, "Agenda");
    await jour(page, "2026-10-06").getByRole("button", { name: /Soirée louange/ }).click();
    const ou = panneauADroite(info)
      ? page.getByRole("complementary", { name: "Mardi 6 octobre" })
      : page.getByRole("dialog", { name: "Mardi 6 octobre" });
    await expect(ou).toContainText("Lu dans le Sheet des évènements");
    const lien = ou.getByRole("link", { name: /Soirée louange/ });
    await expect(lien).toHaveAttribute("href", /docs\.google\.com\/spreadsheets\/d\/[^/]+\/edit#gid=439766955$/);
    await expect(lien).toHaveAttribute("target", "_blank");
    await expect(ou.getByRole("button", { name: /Déplacer/ })).toHaveCount(0);
  });

  test("Agenda : « Afficher novembre » ajoute le mois suivant", async ({ page }) => {
    await ouvrir(page, P_ADMIN, { docs: DOCS_AGENDA });
    await vue(page, "Agenda");
    await expect(jour(page, "2026-11-07")).toHaveCount(0);
    await page.getByRole("button", { name: "Afficher novembre" }).click();
    await expect(jour(page, "2026-11-07").locator('[data-source="evenements"]')).toContainText("Marche d'automne");
    await expect(page.getByRole("button", { name: "Afficher décembre" })).toBeVisible();
  });

  test("Agenda : « Seulement moi » et les sources s'y appliquent", async ({ page }, info) => {
    await ouvrir(page);
    await vue(page, "Agenda");
    await page.getByRole("button", { name: "Seulement moi" }).click();
    await expect(jour(page, "2026-10-04").locator('[data-source="services"]')).toContainText("Lou M.");
    await expect(jour(page, "2026-10-03")).toHaveCount(0);
    await page.getByRole("button", { name: "Seulement moi" }).click();
    const groupe = await sourcesAffichees(page, info);
    await groupe.getByRole("button", { name: "Réunions" }).click();
    await fermerSources(page, info);
    await expect(jour(page, "2026-10-03")).toHaveCount(0);
    await expect(jour(page, "2026-10-04").locator('[data-source="services"]')).toHaveCount(1);
  });

  test("téléphone : « Tout » · « Seulement moi » · « Sources », la feuille des sources (retenue au rechargement)", async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone : ailleurs, les pastilles sont en rangée");
    await ouvrir(page);
    // Pas de rangée de pastilles sur la page : elles sont dans la feuille.
    await expect(pastilles(page)).toHaveCount(0);
    const tout = page.getByRole("button", { name: "Tout", exact: true });
    const moi = page.getByRole("button", { name: "Seulement moi" });
    await expect(tout).toHaveAttribute("aria-pressed", "true");
    await moi.click();
    await expect(moi).toHaveAttribute("aria-pressed", "true");
    await expect(tout).toHaveAttribute("aria-pressed", "false");
    await tout.click();
    await expect(tout).toHaveAttribute("aria-pressed", "true");
    await expect(moi).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Sources", exact: true }).click();
    const feuille = page.getByRole("dialog", { name: "Sources" });
    const groupe = feuille.getByRole("group", { name: "Sources affichées" });
    await expect(groupe.getByRole("button")).toHaveCount(7);
    await expect(groupe.getByRole("button", { name: "Setlists" })).toHaveAttribute("aria-pressed", "false");
    await groupe.getByRole("button", { name: "Scène" }).click();
    await expect(groupe.getByRole("button", { name: "Scène" })).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-source="scene"]')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    await expect(page.locator('[data-source="scene"]')).toHaveCount(0);
    await expect(jour(page, "2026-10-04").locator('[data-source="services"]')).toHaveCount(1);
  });

  test("téléphone : Mois à points, la liste du jour touché dessous", async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone : ailleurs, la grille étiquetée (C3)");
    await ouvrir(page);
    await vue(page, "Mois");
    const grille = page.getByTestId("grille-points");
    await expect(grille.locator("[data-jour]")).toHaveCount(42);
    // Un point par entrée (quatre au plus), aucun libellé.
    const quatre = jour(page, "2026-10-04");
    await expect(quatre.locator("[data-source]")).toHaveCount(4);
    await expect(quatre.locator('[data-source="services"]')).toHaveCount(1);
    await expect(quatre).not.toContainText("Culte");
    await expect(jour(page, "2026-10-01")).toHaveAttribute("aria-current", "date");
    // Une légende des sources affichées.
    await expect(page.getByTestId("legende")).toContainText("Services");
    // Le jour choisi (aujourd'hui d'office), puis le 11 touché : sa liste dessous, sans feuille.
    const liste = page.getByTestId("jour-choisi");
    await expect(liste.getByRole("heading", { level: 2 })).toHaveText("Aujourd'hui · jeudi 1er octobre");
    await jour(page, "2026-10-11").click();
    await expect(jour(page, "2026-10-11")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(liste.getByRole("heading", { level: 2 })).toHaveText("Dimanche 11 octobre");
    await expect(liste.locator('[data-source="services"]')).toContainText("Présidence : Sam T.");
    await expect(liste.locator('[data-source="scene"]')).toContainText("14:00 – 15:30");
    await expect(liste.locator('[data-source="petitDej"]')).toContainText("Libre");
    // Une carte ouvre sa feuille, comme dans l'agenda.
    await liste.getByRole("button", { name: /Culte Franco/ }).click();
    await expect(page.getByRole("dialog", { name: "Culte Franco" }).getByRole("link", { name: "Ouvrir" })).toBeVisible();
  });

  test("ordinateur et tablettes : l'Agenda au choix, avec ‹ › (agencement v18), et retour au Mois", async ({ page }, info) => {
    test.skip(estTelephone(info), "le téléphone part de l'agenda (test de la vue d'office)");
    await ouvrir(page);
    await vue(page, "Agenda");
    await expect(agenda(page)).toBeVisible();
    await expect(page.getByTestId("grille-mois")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mois suivant" })).toBeVisible();
    // Les pastilles restent en rangée.
    await expect(pastilles(page).getByRole("button", { name: "Tâches" })).toBeVisible();
    await vue(page, "Mois");
    await expect(page.getByTestId("grille-mois")).toBeVisible();
  });

  test("中文 : agenda, « 全部 », « 来源 », « 显示11月 »", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, { ...DOCS, ...DOCS_AGENDA }, "/back-office/calendrier");
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    const choix = page.getByRole("tablist", { name: "视图" });
    await choix.getByRole("tab", { name: "日程" }).click();
    expect((await titresDesJours(page))[0]).toBe("今天 · 10月1日星期四");
    await expect(page.getByRole("button", { name: "显示11月" })).toBeVisible();
    await expect(choix.getByRole("tab", { name: "月", exact: true })).toBeVisible();
  });
});

test.describe("C4 : captures à regarder", () => {
  // Comparées à la planche bo-telephone-calendrier (téléphone) ; le reste à l'œil.
  test("agenda, feuille d'une entrée, feuille des sources, Mois à points", async ({ page }, info) => {
    await ouvrir(page, P_ADMIN, { docs: DOCS_AGENDA });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const dossier = `test-results/calendrier-captures/${info.project.name}`;
    await vue(page, "Agenda");
    await page.screenshot({ path: `${dossier}-agenda.png` });
    await jour(page, "2026-10-03").getByRole("button", { name: /Réunion DA/ }).click();
    await page.waitForTimeout(400);
    // Téléphone : la feuille de l'entrée ; tablette debout : la feuille du jour ; en grand : le volet du jour.
    await page.screenshot({ path: `${dossier}-agenda-feuille.png` });
    if (!panneauADroite(info)) await page.keyboard.press("Escape");
    if (estTelephone(info)) {
      await page.getByRole("button", { name: "Sources", exact: true }).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${dossier}-sources.png` });
      await page.keyboard.press("Escape");
      await vue(page, "Mois");
      await jour(page, "2026-10-11").click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${dossier}-mois-points.png`, fullPage: true });
    }
  });
});

// ─── C5 : créer depuis un jour ───

/** Membre de deux pôles, sans section : une réunion de ses pôles, des tâches (Q4). */
const P_POLES: FakeProfile = { uid: "u-da", email: "da@example.org", firstName: "Alix", lastName: "P.", poles: ["da", "media"] };
/** Publie pour une section, sans pôle : un évènement, pas de tâche. */
const P_SECTION: FakeProfile = { uid: "u-sec", email: "sec@example.org", firstName: "Noa", lastName: "R.", annonces: ["Groupe Paix"] };

/** Le jour touché : sur grand écran, le menu « Ajouter ce jour-là » du volet du jour (agencement v18,
 *  B5) ; la feuille du jour sur tablette debout ; sur téléphone, la feuille du « + » (question 5),
 *  sur le jour affiché. Rend où chercher les créations : liens et boutons, ou articles du menu. */
async function creerDepuis(page: Page, info: TestInfo, date: string, titre: string) {
  if (estTelephone(info)) {
    await vue(page, "Mois");
    await jour(page, date).click();
    await page.getByRole("button", { name: "Créer", exact: true }).click();
    return creations(page.getByRole("dialog", { name: "Créer" }), false);
  }
  await jour(page, date).click();
  if (!panneauADroite(info)) return creations(page.getByRole("dialog", { name: titre }), false);
  await page.getByRole("complementary", { name: titre }).getByRole("button", { name: "Ajouter ce jour-là" }).click();
  return creations(page.getByRole("menu"), true);
}
/** Les créations d'un jour : `lien` (évènement, réunion) et `bouton` (tâche), ou les articles du menu. */
function creations(ou: Locator, menu: boolean) {
  return {
    ou,
    lien: (nom: string | RegExp) => ou.getByRole(menu ? "menuitem" : "link", { name: nom }),
    bouton: (nom: string | RegExp) => ou.getByRole(menu ? "menuitem" : "button", { name: nom }),
  };
}

test.describe("C5 : créer depuis un jour", () => {
  test("« Nouvel évènement le 11/10 » ouvre le formulaire à la date du jour choisi", async ({ page }, info) => {
    await ouvrir(page);
    const ou = await creerDepuis(page, info, "2026-10-11", "Dimanche 11 octobre");
    const lien = ou.lien("Nouvel évènement le 11/10");
    await expect(lien).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?\?date=2026-10-11$/);
    await lien.click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/nouveau\/?\?date=2026-10-11$/);
    await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-10-11");
  });

  test("une adresse « ?date= » pré-remplit la date ; une date mal formée est ignorée", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office/evenements/nouveau?date=2026-12-24");
    await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-12-24");
    // Une année à cinq chiffres ne se tape pas (relecture : le calendrier bouclerait sur elle).
    await expect(page.getByLabel("Date", { exact: true })).toHaveAttribute("max", "9999-12-31");
    await page.goto("/back-office/evenements/nouveau?date=24-12");
    await expect(page.getByLabel("Nom de l'évènement")).toBeVisible();
    await expect(page.getByLabel("Date", { exact: true })).toHaveValue("");
  });

  test("« Nouvelle tâche pour le 11/10 » : échéance du jour, choix parmi mes pôles ; enregistrée, elle apparaît ce jour-là", async ({ page }, info) => {
    const db = await ouvrir(page, P_POLES);
    const ou = await creerDepuis(page, info, "2026-10-11", "Dimanche 11 octobre");
    await ou.bouton("Nouvelle tâche pour le 11/10").click();
    const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
    await expect(form.getByLabel("Échéance")).toHaveValue("2026-10-11");
    await expect(form.getByLabel("Pôle").locator("option")).toHaveText(["DA", "Média"]);
    await form.getByLabel("Pôle").selectOption("media");
    await form.getByLabel("Titre").fill("Affiche du concert");
    await form.getByRole("button", { name: "Enregistrer" }).click();
    await expect(form).toHaveCount(0);
    const ecrite = db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/media/taches/"));
    expect(ecrite?.data).toMatchObject({ titre: "Affiche du concert", echeance: "2026-10-11", pole: "media", repetition: null });
    // Le calendrier relit ses sources : la tâche est sur le 11.
    if (estTelephone(info)) {
      await expect(page.getByTestId("jour-choisi").locator('[data-source="taches"]')).toContainText("Affiche du concert");
    } else {
      await expect(jour(page, "2026-10-11").locator('[data-source="taches"]')).toContainText("Affiche du concert");
    }
  });

  test("sans droit, pas de bouton : ni tâche sans pôle, ni évènement sans section ni pôle", async ({ page }, info) => {
    await ouvrir(page, P_PLANNINGS);
    if (estTelephone(info)) {
      await expect(page.getByRole("button", { name: "Créer", exact: true })).toHaveCount(0);
    } else {
      await jour(page, "2026-10-11").click();
      await expect(page.getByRole("link", { name: /Nouvel évènement/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Nouvelle tâche/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Ajouter ce jour-là" })).toHaveCount(0);
    }
  });

  test("une section sans pôle : « Nouvel évènement » seul", async ({ page }, info) => {
    await ouvrir(page, P_SECTION);
    const ou = await creerDepuis(page, info, "2026-10-11", "Dimanche 11 octobre");
    await expect(ou.lien("Nouvel évènement le 11/10")).toBeVisible();
    await expect(ou.bouton(/Nouvelle tâche/)).toHaveCount(0);
    await expect(ou.lien(/Nouvelle réunion/)).toHaveCount(0);
  });

  test("téléphone : en Agenda, le « + » propose aujourd'hui", async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone : ailleurs, les boutons du panneau du jour");
    await ouvrir(page, P_POLES);
    await expect(agenda(page)).toBeVisible();
    await page.getByRole("button", { name: "Créer", exact: true }).click();
    const feuille = page.getByRole("dialog", { name: "Créer" });
    // Membre de pôles sans section : une réunion de ses pôles (agencement v18 : « Nouvelle réunion »).
    await expect(feuille.getByRole("link", { name: "Nouvelle réunion le 01/10" })).toHaveAttribute(
      "href",
      /^\/back-office\/evenements\/nouveau\/?\?reunion=1&date=2026-10-01$/,
    );
    await expect(feuille.getByRole("link", { name: /Nouvel évènement/ })).toHaveCount(0);
    await expect(feuille.getByRole("button", { name: "Nouvelle tâche pour le 01/10" })).toBeVisible();
  });

  test("中文 : les deux boutons du jour", async ({ page }, info) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await sheets(page);
    await signInAs(page, P_ADMIN, DOCS, "/back-office/calendrier");
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    let menu = false;
    if (estTelephone(info)) {
      await page.getByRole("button", { name: "新建", exact: true }).click();
    } else {
      await jour(page, "2026-10-11").click();
      if (panneauADroite(info)) {
        await page.getByRole("complementary").getByRole("button", { name: "在这天添加" }).click();
        menu = true;
      }
    }
    const jourAffiche = estTelephone(info) ? "10月1日" : "10月11日";
    await expect(page.getByRole(menu ? "menuitem" : "link", { name: `新建${jourAffiche}的活动` })).toBeVisible();
    await expect(page.getByRole(menu ? "menuitem" : "button", { name: `新建${jourAffiche}截止的任务` })).toBeVisible();
  });
});

test.describe("C5 : captures à regarder", () => {
  test("le jour et ses deux boutons ; le formulaire de tâche pré-rempli", async ({ page }, info) => {
    await ouvrir(page, P_POLES);
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    const dossier = `test-results/calendrier-captures/${info.project.name}`;
    const ou = await creerDepuis(page, info, "2026-10-11", "Dimanche 11 octobre");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dossier}-creer.png` });
    await ou.bouton("Nouvelle tâche pour le 11/10").click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dossier}-creer-tache.png` });
  });
});
