// Sources du calendrier du Back-Office (lot U8, tranche C2, docs/spec-calendrier.md).
// Une seule fonction pure produit la liste des entrées d'une période ; la
// grille, l'agenda, le panneau du jour et le widget la lisent. Aucun droit
// nouveau : chaque source garde sa règle (access.ts), rien à publier.
// Dates ISO « AAAA-MM-JJ » et heures « HH:MM », comparées comme du texte.

import {
  canEditCreneau,
  canEditEvenement,
  canReserverPour,
  canSeeEvenement,
  canSeeSetlist,
  isAdminUser,
  isPoleMember,
  polesDe,
} from "@/lib/access";
import { lienOngletSheet, type EntreeSheet } from "@/lib/evenements/sheet";
import type { FSSetlist } from "@/lib/firebase/setlists";
import { casesVides } from "@/lib/planning/casesVides";
import { GRILLE_CAMPUS_MATIN, GRILLE_CAMPUS_SOIR } from "@/lib/planning/grilles";
import type { ServiceEntry, SetlistSeance } from "@/lib/planning/names";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { quiCategories } from "@/lib/scene/rappels";
import { PLANNING_COLORS, categoryColor, categoryLabel, serviceColor } from "@/lib/serviceColors";
import { GRILLES_DU_SERVICE } from "@/lib/tableauDeBord/donnees";
import { addDays, echeancesDe } from "@/lib/taches/echeances";
import { poleLabel } from "@/lib/taches/messages";
import type { Evenement } from "@/types/evenement";
import type { Creneau, Programme } from "@/types/programme";
import type { Fois, Tache } from "@/types/tache";
import type { NotifLang, UserProfile } from "@/types/user";

export type SourceCalendrier = "services" | "evenements" | "taches" | "reunions" | "scene" | "petitDej" | "setlists";

/** Les sept sources, dans l'ordre où elles se suivent dans un jour. */
export const SOURCES: readonly SourceCalendrier[] = ["services", "evenements", "reunions", "scene", "taches", "petitDej", "setlists"];

/** Pastilles allumées d'office (Q11) : toutes sauf Setlists. */
export const SOURCES_D_OFFICE: readonly SourceCalendrier[] = SOURCES.filter((s) => s !== "setlists");

/** Couleurs de la planche, rangées avec le calendrier et non dans
 *  serviceColors.ts (Q1, questions 1 et 2) : le point et le fond teinté. */
export const COULEURS_CALENDRIER = {
  evenements: { point: "#e0a100", fond: "#fff3d6" },
  taches: { point: "#8e8e93", fond: "#f2f2f4" },
  reunions: { point: "#6b4a8e", fond: "#f0ecf9" },
} as const;

export interface EntreeCalendrier {
  source: SourceCalendrier;
  /** `${source}:${id}:${date}` : une tâche répétée a une entrée par échéance. */
  cle: string;
  /** AAAA-MM-JJ ; un évènement sur plusieurs jours a une entrée par jour. */
  date: string;
  /** « HH:MM » ou "". */
  heure: string;
  heureFin: string;
  titre: string;
  /** « Présidence : … », « 20:00 · Salle 2 », « DA · échéance ». */
  detail: string;
  couleur: string;
  /** Lue dans le Sheet des évènements : lecture seule. */
  duSheet: boolean;
  /** Gardée par « Seulement moi ». */
  moi: boolean;
  /** Droits existants (Q2) et règles de Q6, par peutDeplacer. */
  deplacable: boolean;
  /** Fiche, page du pôle, setlist, onglet du Sheet. */
  lien: string;
  /** Services seulement : colonnes à remplir (clés `planning.roles.*`), « Cases vides : … »
   *  du panneau du jour ; absent quand rien ne manque ou que le planning n'est pas lu. */
  vides?: string[];
}

/** Profil lu par le calendrier ; `dansEquipes` vient avec les réunions
 *  d'équipe de U6 (R4), absent avant. */
export type ProfilCalendrier = UserProfile & { dansEquipes?: string[] };

type Utilisateur = { uid: string; email?: string | null };

/** Ligne du petit déj (`petitDej/{id}`, lot U3) : seuls ces champs sont lus. */
export interface LignePetitDejCalendrier {
  id: string;
  dimanche: string;
  nom: string;
  /** L'inscrit par « Je m'inscris » ; "" pour une ligne posée pour quelqu'un. */
  uid: string;
}

/** Ce que la page a lu, source par source. */
export interface DonneesCalendrier {
  /** Séances du planning (`setlistSeances`), trimestres non publiés compris. */
  seances: SetlistSeance[];
  /** Mes services (`findMyServices` sur mon nom de planning). */
  mesServices: Pick<ServiceEntry, "date" | "service" | "moment">[];
  /** Entrées du Sheet des évènements (`lireSheetEvenements`). */
  sheet: EntreeSheet[];
  /** Évènements et réunions de l'app (`listEvenements`). */
  evenements: Evenement[];
  /** Ids des évènements où je suis inscrit. */
  mesInscriptions: string[];
  /** Tâches de mes pôles, avec leurs fois. */
  taches: { tache: Tache; fois: Fois[] }[];
  /** Programme de scène affiché (`currentProgramme`) et ses créneaux. */
  scene: { programme: Programme; creneaux: Creneau[] } | null;
  /** Lignes du petit déj ; null = lecture en échec (rien, jamais « Libre »). */
  petitDej: LignePetitDejCalendrier[] | null;
  /** Setlists (`getSetlists`). */
  setlists: FSSetlist[];
  /** Lignes des plannings dont on montre les cases vides (`lireGrilles`), par clé de grille. */
  grilles?: Record<string, string[][]>;
}

export interface ContexteCalendrier {
  user: Utilisateur;
  profile: ProfilCalendrier | null;
  lang: NotifLang;
  today: string;
}

// ─── Libellés ────────────────────────────────────────────────────────────────

const MOTS = {
  fr: {
    presidence: (nom: string) => `Présidence : ${nom}`,
    inscrits: (n: number, max: number | null) =>
      max ? `${n} inscrit${n > 1 ? "s" : ""} sur ${max}` : `${n} inscrit${n > 1 ? "s" : ""}`,
    echeance: "échéance",
    scene: "Scène",
    petitDej: "Petit déj",
    libre: "Libre",
    edd: "EDD",
    chants: (n: number) => `${n} chant${n > 1 ? "s" : ""}`,
  },
  "zh-CN": {
    presidence: (nom: string) => `司会：${nom}`,
    inscrits: (n: number, max: number | null) => (max ? `已报名 ${n}/${max}` : `已报名 ${n} 人`),
    echeance: "截止",
    scene: "舞台",
    petitDej: "早餐",
    libre: "空闲",
    edd: "主日学",
    chants: (n: number) => `${n} 首`,
  },
} as const;

const plage = (heure: string, heureFin: string) => (heure && heureFin ? `${heure} – ${heureFin}` : heure);
const joindre = (parts: string[]) => parts.filter(Boolean).join(" · ");
const dans = (date: string, debut: string, fin: string) => !!date && date >= debut && date <= fin;

// ─── Droits ──────────────────────────────────────────────────────────────────

/** Ce qu'on demande à déplacer. « sheet » : une entrée du Sheet des évènements. */
export type CibleDeplacement =
  | { source: "evenements" | "reunions"; evenement: Pick<Evenement, "pour" | "organisateurUid" | "date"> }
  | { source: "taches"; tache: Pick<Tache, "pole" | "repetition">; date: string; fois: Fois[] }
  | { source: "scene"; creneau: Pick<Creneau, "auteurUid" | "qui" | "dimanche">; programme: Pick<Programme, "ouvert" | "quiAutorises"> }
  | { source: "services" | "sheet" | "setlists" | "petitDej" };

/** Peut-on soulever cette entrée (Q5, Q6) ? Évènement et réunion : organisateur
 *  et coordination (canEditEvenement), pas avant aujourd'hui. Tâche : unique,
 *  membre du pôle, pas terminée (même passée). Créneau : son auteur s'il peut
 *  réserver pour son groupe (canReserverPour), la coordination toujours, pas
 *  avant aujourd'hui. Le reste ne bouge jamais. Le jour visé (aujourd'hui au
 *  plus tôt, créneau libre de la grille) se vérifie au dépôt (C6). */
export function peutDeplacer(
  user: Utilisateur | null,
  profile: ProfilCalendrier | null,
  cible: CibleDeplacement,
  today: string,
): boolean {
  if (!user) return false;
  switch (cible.source) {
    case "evenements":
    case "reunions":
      return cible.evenement.date >= today && canEditEvenement(user, profile, cible.evenement);
    case "taches":
      return (
        !cible.tache.repetition &&
        isPoleMember(user, profile, cible.tache.pole) &&
        !cible.fois.some((f) => f.date === cible.date && f.etat === "terminee")
      );
    case "scene":
      return (
        cible.creneau.dimanche >= today &&
        canEditCreneau(user, profile, cible.creneau) &&
        canReserverPour(user, profile, cible.programme, cible.creneau.qui)
      );
    default:
      return false;
  }
}

/** Pastilles à montrer (Q2) : une source n'apparaît que si la personne a
 *  quelque chose à y voir — Tâches : un pôle ; Réunions : un pôle ou une
 *  équipe ; un admin toujours. */
export function sourcesPermises(user: Utilisateur | null, profile: ProfilCalendrier | null): SourceCalendrier[] {
  const admin = isAdminUser(user);
  const poles = polesDe(profile).length > 0;
  const equipes = (profile?.dansEquipes ?? []).length > 0;
  return SOURCES.filter((s) => (s === "taches" ? admin || poles : s === "reunions" ? admin || poles || equipes : true));
}

/** Pastilles allumées et « Seulement moi ». */
export function filtrerEntrees(
  entrees: EntreeCalendrier[],
  filtre: { sources: readonly SourceCalendrier[]; seulementMoi: boolean },
): EntreeCalendrier[] {
  return entrees.filter((e) => filtre.sources.includes(e.source) && (!filtre.seulementMoi || e.moi));
}

// ─── Sources ─────────────────────────────────────────────────────────────────

const equipeDuPour = (pour: string) => (pour.startsWith("equipe:") ? pour.slice(7) : null);
const estReunion = (pour: string) => pour.startsWith("pole:") || pour.startsWith("equipe:");

function lienPlanning(category: string): string {
  if (category === "Culte Francophone") return "/planning/culte";
  if (category.startsWith("Groupe ")) return "/planning/groupes";
  if (category === "EDD") return "/planning/edd";
  if (category === "Campus") return "/planning/campus";
  if (category === "Intergroupe") return "/planning/intergroupe";
  if (category === "Interfranco") return "/planning/interfranco";
  return "/planning";
}

/** Catégorie d'un service de « Mes services » (« Culte Franco », « EDD 中班 »). */
function categorieDuService(service: string): string {
  if (service === "Culte Franco") return "Culte Francophone";
  if (service.startsWith("EDD ")) return "EDD";
  if (service.startsWith("Campus")) return "Campus";
  return service;
}

/** Les grilles d'une séance : celles de sa catégorie, du même moment au Campus. */
const grillesDeLaSeance = (s: SetlistSeance) =>
  (GRILLES_DU_SERVICE[s.category] ?? []).filter(
    (g) => !s.moment || g.key === (s.moment === "matin" ? GRILLE_CAMPUS_MATIN : GRILLE_CAMPUS_SOIR).key,
  );

/** « Cases vides » (calcul du widget 4 de U6) des grilles lues de ces séances, aujourd'hui et après. */
function videsDe(d: DonneesCalendrier, c: ContexteCalendrier, seances: SetlistSeance[], date: string): string[] | undefined {
  if (date < c.today || !d.grilles) return undefined;
  const cles = seances
    .flatMap(grillesDeLaSeance)
    .flatMap((g) => (d.grilles![g.key] ? casesVides(g, d.grilles![g.key], [date]) : []))
    .flatMap((v) => v.colonnes.map((col) => col.i18n));
  return cles.length ? [...new Set(cles)] : undefined;
}

function services(d: DonneesCalendrier, c: ContexteCalendrier, debut: string, fin: string): EntreeCalendrier[] {
  const m = MOTS[c.lang];
  const classes = EDD_CLASSES as readonly string[];
  const out: EntreeCalendrier[] = [];
  const edd = new Map<string, SetlistSeance[]>();
  for (const s of d.seances) {
    if (!dans(s.date, debut, fin)) continue;
    if (classes.includes(s.category)) {
      edd.set(s.date, [...(edd.get(s.date) ?? []), s]);
      continue;
    }
    const id = s.moment ? `${s.category}-${s.moment}` : s.category;
    out.push({
      source: "services",
      cle: `services:${id}:${s.date}`,
      date: s.date,
      heure: "",
      heureFin: "",
      titre: categoryLabel(s.category),
      detail: s.leader ? m.presidence(s.leader) : "",
      couleur: categoryColor(s.category),
      duSheet: false,
      moi: d.mesServices.some(
        (x) => x.date === s.date && categorieDuService(x.service) === s.category && (!s.moment || !x.moment || x.moment === s.moment),
      ),
      deplacable: false,
      lien: lienPlanning(s.category),
      vides: videsDe(d, c, [s], s.date),
    });
  }
  // Question 6 : une seule entrée « EDD » le dimanche, les classes dans le détail.
  for (const [date, seances] of edd) {
    const rang = (s: SetlistSeance) => classes.indexOf(s.category);
    const detail = joindre([...seances].sort((a, b) => rang(a) - rang(b)).map((s) => [s.category, s.leader].filter(Boolean).join(" ")));
    out.push({
      source: "services",
      cle: `services:EDD:${date}`,
      date,
      heure: "",
      heureFin: "",
      titre: m.edd,
      detail,
      couleur: serviceColor("EDD"),
      duSheet: false,
      moi: d.mesServices.some((x) => x.date === date && categorieDuService(x.service) === "EDD"),
      deplacable: false,
      lien: lienPlanning("EDD"),
      vides: videsDe(d, c, seances, date),
    });
  }
  return out;
}

function sheet(d: DonneesCalendrier, debut: string, fin: string): EntreeCalendrier[] {
  const parJour = new Map<string, number>();
  return d.sheet
    .filter((s) => dans(s.date, debut, fin))
    .map((s) => {
      const n = parJour.get(s.date) ?? 0;
      parJour.set(s.date, n + 1);
      return {
        source: "evenements" as const,
        cle: `evenements:sheet-${n}:${s.date}`,
        date: s.date,
        heure: s.heure,
        heureFin: s.heureFin,
        titre: s.titre,
        detail: joindre([plage(s.heure, s.heureFin) || s.horaire, s.lieu, s.responsable]),
        couleur: COULEURS_CALENDRIER.evenements.point,
        duSheet: true,
        // Q3 : les noms du Sheet sont du texte libre, reliés à aucun compte.
        moi: false,
        deplacable: false,
        lien: lienOngletSheet(s.date),
      };
    });
}

function evenements(d: DonneesCalendrier, c: ContexteCalendrier, debut: string, fin: string): EntreeCalendrier[] {
  const m = MOTS[c.lang];
  const mesPoles = polesDe(c.profile) as string[];
  const mesEquipes = c.profile?.dansEquipes ?? [];
  const out: EntreeCalendrier[] = [];
  for (const e of d.evenements) {
    if (!e.date) continue; // une info sans date n'est pas au calendrier
    const reunion = estReunion(e.pour);
    const equipe = equipeDuPour(e.pour);
    const visible = canSeeEvenement(c.user, c.profile, e) || (equipe !== null && mesEquipes.includes(equipe));
    if (!visible) continue;
    const source = reunion ? "reunions" : "evenements";
    const moi =
      e.organisateurUid === c.user.uid ||
      (reunion ? mesPoles.includes(e.pour.slice(5)) || (equipe !== null && mesEquipes.includes(equipe)) : d.mesInscriptions.includes(e.id));
    const inscrits = !e.lienExterne && e.inscrits > 0 ? m.inscrits(e.inscrits, e.placesMax) : "";
    const detail = joindre([plage(e.heure, e.heureFin), e.lieu, inscrits]);
    const deplacable = peutDeplacer(c.user, c.profile, { source, evenement: e }, c.today);
    const dernier = e.dateFin && e.dateFin > e.date ? e.dateFin : e.date;
    for (let jour = e.date; jour <= dernier; jour = addDays(jour, 1)) {
      if (!dans(jour, debut, fin)) continue;
      const premier = jour === e.date;
      out.push({
        source,
        cle: `${source}:${e.id}:${jour}`,
        date: jour,
        // Sur plusieurs jours, l'heure ne vaut que pour le premier.
        heure: premier ? e.heure : "",
        heureFin: premier && dernier === e.date ? e.heureFin : "",
        titre: e.titre,
        detail,
        couleur: (reunion ? COULEURS_CALENDRIER.reunions : COULEURS_CALENDRIER.evenements).point,
        duSheet: false,
        moi,
        deplacable,
        lien: `/evenements/${e.id}`,
      });
    }
  }
  return out;
}

function scene(d: DonneesCalendrier, c: ContexteCalendrier, debut: string, fin: string): EntreeCalendrier[] {
  if (!d.scene || d.scene.programme.ouvert === false) return []; // un brouillon n'est jamais affiché (U1)
  const { programme, creneaux } = d.scene;
  const m = MOTS[c.lang];
  const mesCategories = Object.keys(c.profile?.serviceRoles ?? {});
  return creneaux
    .filter((x) => dans(x.dimanche, debut, fin))
    .map((x) => ({
      source: "scene" as const,
      cle: `scene:${x.id}:${x.dimanche}`,
      date: x.dimanche,
      heure: x.debut,
      heureFin: x.fin,
      titre: `${m.scene} · ${[x.quoi, x.qui.join(", ")].filter(Boolean).join(" ")}`,
      detail: joindre([plage(x.debut, x.fin), x.note]),
      couleur: PLANNING_COLORS.scene,
      duSheet: false,
      moi: x.auteurUid === c.user.uid || quiCategories(x.qui).some((q) => mesCategories.includes(q)),
      deplacable: peutDeplacer(c.user, c.profile, { source: "scene", creneau: x, programme }, c.today),
      lien: "/evenements/scene",
    }));
}

function taches(d: DonneesCalendrier, c: ContexteCalendrier, debut: string, fin: string): EntreeCalendrier[] {
  const mesPoles = polesDe(c.profile) as string[];
  const out: EntreeCalendrier[] = [];
  for (const { tache: t, fois } of d.taches) {
    if (!isPoleMember(c.user, c.profile, t.pole)) continue;
    for (const date of echeancesDe(t, debut, fin)) {
      const terminee = fois.some((f) => f.date === date && f.etat === "terminee");
      out.push({
        source: "taches",
        cle: `taches:${t.id}:${date}`,
        date,
        heure: "",
        heureFin: "",
        titre: t.titre,
        detail: joindre([poleLabel(t.pole, c.lang), t.responsableNom || MOTS[c.lang].echeance]),
        couleur: COULEURS_CALENDRIER.taches.point,
        duSheet: false,
        // « Mes tâches » (aFairePour) : à moi, ou à mon pôle sans responsable, pas terminée.
        moi: !terminee && (t.responsableUid === c.user.uid || (t.responsableUid === null && mesPoles.includes(t.pole))),
        deplacable: peutDeplacer(c.user, c.profile, { source: "taches", tache: t, date, fois }, c.today),
        lien: `/taches/${t.pole}`,
      });
    }
  }
  return out;
}

function petitDej(d: DonneesCalendrier, c: ContexteCalendrier, debut: string, fin: string): EntreeCalendrier[] {
  if (!d.petitDej) return []; // lecture en échec : rien, jamais « Libre »
  const m = MOTS[c.lang];
  const entree = (id: string, date: string, detail: string, moi: boolean): EntreeCalendrier => ({
    source: "petitDej",
    cle: `petitDej:${id}:${date}`,
    date,
    heure: "",
    heureFin: "",
    titre: m.petitDej,
    detail,
    couleur: serviceColor("Petit déj"),
    duSheet: false,
    moi,
    deplacable: false,
    lien: "/planning/table",
  });
  const lignes = d.petitDej.filter((l) => dans(l.dimanche, debut, fin));
  const out = lignes.map((l) => entree(l.id, l.dimanche, l.nom, !!l.uid && l.uid === c.user.uid));
  // « Libre » : un dimanche à venir sans ligne (estLibre de U3).
  const premier = addDays(debut, (7 - new Date(`${debut}T00:00:00Z`).getUTCDay()) % 7);
  for (let dim = premier; dim <= fin; dim = addDays(dim, 7)) {
    if (dim >= c.today && !d.petitDej.some((l) => l.dimanche === dim)) out.push(entree("libre", dim, m.libre, false));
  }
  return out;
}

function setlists(d: DonneesCalendrier, c: ContexteCalendrier, debut: string, fin: string): EntreeCalendrier[] {
  const m = MOTS[c.lang];
  return d.setlists
    .filter((s) => !s.isDraft && dans(s.date, debut, fin) && canSeeSetlist(c.user, c.profile, s))
    .map((s) => ({
      source: "setlists" as const,
      cle: `setlists:${s.id}:${s.date}`,
      date: s.date,
      heure: "",
      heureFin: "",
      titre: s.title,
      detail: joindre([categoryLabel(s.category), m.chants(s.items.length)]),
      couleur: categoryColor(s.category),
      duSheet: false,
      moi: !!s.ownerId && s.ownerId === c.user.uid,
      deplacable: false,
      lien: `/setlists/${s.id}`,
    }));
}

/** Toutes les entrées de `debut` à `fin` (inclus) que la personne a le droit
 *  de voir, triées par jour, puis Services, Évènements, Réunions, Scène,
 *  Tâches, Petit déj, Setlists, puis l'heure. Les pastilles et « Seulement
 *  moi » se posent ensuite (filtrerEntrees). */
export function entreesCalendrier(
  debut: string,
  fin: string,
  donnees: DonneesCalendrier,
  contexte: ContexteCalendrier,
): EntreeCalendrier[] {
  const toutes = [
    ...services(donnees, contexte, debut, fin),
    ...sheet(donnees, debut, fin),
    ...evenements(donnees, contexte, debut, fin),
    ...scene(donnees, contexte, debut, fin),
    ...taches(donnees, contexte, debut, fin),
    ...petitDej(donnees, contexte, debut, fin),
    ...setlists(donnees, contexte, debut, fin),
  ];
  const rang = (e: EntreeCalendrier) => SOURCES.indexOf(e.source);
  return toutes.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      rang(a) - rang(b) ||
      a.heure.localeCompare(b.heure) ||
      a.titre.localeCompare(b.titre, "fr"),
  );
}
