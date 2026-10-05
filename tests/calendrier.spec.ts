import { expect, test } from "@playwright/test";
import { ADMIN_EMAILS } from "../src/lib/access";
import {
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
  visible: true,
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
  scene: null,
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
    expect(e[0]).toMatchObject({ cle: "reunions:da:2026-10-03", detail: "20:00 · Salle 2", couleur: "#6b4a8e", moi: true, lien: "/evenements/da" });
    expect(e[1].moi).toBe(true);
    expect(de(entreesCalendrier(...OCT, d, ctx(MOI, profil())), "reunions")).toEqual([]);
    expect(de(entreesCalendrier(...OCT, d, ctx(ADMIN, null)), "reunions").map((x) => x.moi)).toEqual([false, false, false]);
  });

  test("scène : les créneaux du programme affiché, « Scène · Chant EDD 中班 », jamais ceux d'un brouillon", () => {
    const d = vide();
    d.scene = { programme: programme(), creneaux: [creneau({ id: "c1", note: "Costumes" })] };
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
      lien: "/evenements/scene",
    });
    d.scene = { programme: programme({ ouvert: false }), creneaux: [creneau({ id: "c1" })] };
    expect(de(entreesCalendrier(...OCT, d, ctx()), "scene")).toEqual([]);
  });

  test("scène : « moi » = j'en suis l'auteur, ou son « qui » est une de mes catégories", () => {
    const d = vide();
    d.scene = {
      programme: programme(),
      creneaux: [
        creneau({ id: "a", auteurUid: "u-moi", qui: ["Jeunes"] }),
        creneau({ id: "b", qui: ["Gp Paix"], debut: "14:00", fin: "15:00" }),
        creneau({ id: "c", qui: ["Gp Joie"], debut: "15:00", fin: "16:00" }),
      ],
    };
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
    d.scene = { programme: programme(), creneaux: [creneau({ id: "c2", dimanche: J, debut: "16:00", fin: "17:00" }), creneau({ id: "c1", dimanche: J, debut: "14:00", fin: "15:00" })] };
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
    d.scene = { programme: programme(), creneaux: [creneau({ id: "c1" })] };
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
  test("sans pôle ni équipe : ni Tâches ni Réunions", () => {
    expect(sourcesPermises(MOI, profil())).toEqual(["services", "evenements", "scene", "petitDej", "setlists"]);
  });

  test("un pôle (Louange compris, par un rôle de service) : Tâches et Réunions", () => {
    expect(sourcesPermises(MOI, profil({ serviceRoles: { "Culte Francophone": ["musicien"] } }))).toEqual([...SOURCES]);
  });

  test("une équipe sans pôle : Réunions, pas Tâches", () => {
    expect(sourcesPermises(MOI, profil({ dansEquipes: ["accueil"] }))).toEqual([
      "services", "evenements", "reunions", "scene", "petitDej", "setlists",
    ]);
  });

  test("un admin : toutes", () => {
    expect(sourcesPermises(ADMIN, null)).toEqual([...SOURCES]);
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
    d.scene = { programme: programme(), creneaux: [creneau({ id: "c", auteurUid: "u-moi", qui: ["Jeunes"] })] };
    const e = entreesCalendrier(...OCT, d, ctx(MOI, profil({ poles: ["da"] })));
    const dep = Object.fromEntries(e.map((x) => [x.cle, x.deplacable]));
    expect(dep["evenements:e:2026-10-10"]).toBe(true);
    expect(dep["evenements:autre:2026-10-12"]).toBe(false);
    expect(dep["taches:u:2026-10-15"]).toBe(true);
    expect(dep["taches:r:2026-10-15"]).toBe(false);
    expect(dep["scene:c:2026-10-04"]).toBe(true);
  });
});
