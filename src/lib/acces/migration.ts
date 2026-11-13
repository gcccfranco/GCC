// Lot AO, tranche AO-D (docs/spec-acces-organigramme.md, B4 et B5) : remplir l'organigramme depuis l'existant
// (rôles des profils, intertitres de LOUANGE, colonnes du planning) pour que personne ne perde un accès le jour
// où les accès viennent de l'organigramme. Le relevé qui précède l'écriture, puis le plan d'écritures.
// Tout est pur ou passe par un `Magasin` (la base vue comme des documents à chemin) : les tests tournent sur une
// base en mémoire. Le script scripts/acces-vers-organigramme.ts branche l'Admin SDK ; il n'est lancé que par
// Timothée, à blanc d'abord, puis avec --ecrire. Aucune session ne lit la vraie base.
//
// On complète, on n'efface jamais : un membre garde ses champs, ses listes ne font que grandir, aucun champ de
// profil n'est supprimé (ni `serviceRoles` ni les droits cochés : AO-F s'en charge, plus tard). Les champs
// recopiés sur les profils (`dansEquipes`, `referentDe`, `sousEquipes`, `referentSous`, `lieuxLouange`,
// `lieuxRegie`, `joue`) sont recalculés ici, sans le code du serveur : le script ne dépend que de la logique pure.

import {
  canEditerEquipes, canEditPlanning, canUseHarmonie, creatableCategories, equipesDe, isAdminEmail, isCoordination,
  visibleCategories,
} from "@/lib/access";
import * as org from "@/lib/acces/organigramme";
import { appliquer as appliquerPlan, type Donnees, type Magasin, type Operation } from "@/lib/equipes/migration";
import { EQUIPES } from "@/lib/equipes/table";
import { comptesCites, groupeDe, lireGroupe } from "@/lib/groupes/organigramme";
import { COMITES, TABLE_GROUPES, groupeDef, groupeDeLaCategorie } from "@/lib/groupes/table";
import { audiencesNotifiables } from "@/lib/push/audiences";
import { collectPlanningNames, findMyServices, normalizeName, serviceCategory, type PlanningData } from "@/lib/planning/names";
import { droitsDePrevenir, droitsDePublication, PUBLISHABLE_PLANNINGS } from "@/lib/planning/releases";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { ANNONCE_SECTIONS } from "@/types/annonce";
import { INSTRUMENTS, SOUS_EQUIPES, type Instrument, type SousEquipe } from "@/types/equipe";
import type { OrganigrammeGroupe } from "@/types/groupe";
import { SERVICE_LIEUX, type ServiceLieu, type UserProfile } from "@/types/user";

export type { Donnees, Magasin } from "@/lib/equipes/migration";
export { enLectureSeule } from "@/lib/equipes/migration";

export const PAR_NOM = "migration AO";

export const ETAPES: Record<number, string> = {
  1: "equipes/louange complétée (sous-équipes, lieux, instruments, nouveaux membres)",
  2: "equipes/regie complétée (lieux, nouveaux membres)",
  3: "equipes/edd complétée (nouveaux membres)",
  4: "champs recopiés sur les profils (dansEquipes, referentDe, sousEquipes, referentSous, lieuxLouange, lieuxRegie, joue)",
};
const CHEMIN_ETAPE: Record<string, number> = { louange: 1, regie: 2, edd: 3 };

// ─── Lecture ────────────────────────────────────────────────────────────────

type ProfilLu = { uid: string; data: Donnees };
type EquipeLue = { id: string; existe: boolean; membres: Donnees[] };

/** Tout ce que la migration lit, avant de calculer le relevé et le plan. */
type Etat = {
  profils: ProfilLu[];
  /** Les documents equipes/* lus ; louange, regie et edd y figurent toujours (absents = vides, `existe` faux). */
  equipes: EquipeLue[];
  groupes: OrganigrammeGroupe[];
  planning: PlanningData;
};

const tableau = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const texte = (v: unknown): string => (typeof v === "string" ? v : "");
const liste = (v: unknown): string[] => tableau<unknown>(v).filter((x): x is string => typeof x === "string");

async function lireEtat(m: Magasin, planning: PlanningData): Promise<Etat> {
  const profils = (await m.lister("users")).map(({ id, data }) => ({ uid: id, data })).sort((a, b) => (a.uid < b.uid ? -1 : 1));
  const lus = await m.lister("equipes");
  const equipes: EquipeLue[] = lus.map(({ id, data }) => ({ id, existe: true, membres: tableau<Donnees>(data.membres) }));
  for (const id of Object.keys(CHEMIN_ETAPE)) {
    if (!equipes.some((e) => e.id === id)) equipes.push({ id, existe: false, membres: [] });
  }
  const groupes = (await m.lister("groupes"))
    .filter((g) => TABLE_GROUPES.some((def) => def.id === g.id))
    .map((g) => lireGroupe(g.id, g.data));
  return { profils, equipes, groupes, planning };
}

// ─── Ce que l'existant dit de chaque compte ─────────────────────────────────

/** Colonne du planning → « Ce qu'il joue ». « Cajon/Batterie » est lu comme batterie (spec AO-D). */
const JOUE_PAR_COLONNE: Record<string, Instrument> = {
  "Piano": "piano", "Guitare": "guitare", "Batterie": "batterie", "Cajon/Batterie": "batterie", "Cajon": "cajon", "Basse": "basse",
};
/** Colonnes du planning qui sont de la régie (Sono, PPT ; « Régie » au Campus). */
const COLONNES_REGIE = ["Sono", "Sono Live", "PPT", "Régie"];

/** Ce que le planning dit d'un nom : instruments, régie, et si Piano / Guitare (qui ouvraient Harmonie) y figurent. */
type DuPlanning = { joue: Set<Instrument>; harmonie: boolean; regie: boolean; lieuxLouange: Set<ServiceLieu>; lieuxRegie: Set<ServiceLieu> };
/** Colonnes du planning qui sont de la Louange (présidence, choristes, instruments) : le lieu du service où l'on y figure. */
const COLONNES_LOUANGE = ["Présidence", "Choriste", "Chant", "Musicien", ...Object.keys(JOUE_PAR_COLONNE)];

function duPlanning(data: PlanningData, noms: string[]): DuPlanning {
  const r: DuPlanning = { joue: new Set(), harmonie: false, regie: false, lieuxLouange: new Set(), lieuxRegie: new Set() };
  for (const nom of new Set(noms.filter((n) => n.trim()))) {
    for (const e of findMyServices(data, nom)) {
      const instrument = JOUE_PAR_COLONNE[e.role];
      if (instrument) r.joue.add(instrument);
      if (e.role === "Piano" || e.role === "Guitare") r.harmonie = true;
      if (COLONNES_REGIE.includes(e.role)) r.regie = true;
      // Le lieu : la catégorie du service (Culte Franco -> Culte Francophone, Campus (matin) -> Campus), si c'est un des 4 lieux.
      const lieu = serviceCategory(e.service);
      if (lieu && estLieu(lieu)) {
        if (COLONNES_REGIE.includes(e.role)) r.lieuxRegie.add(lieu);
        if (COLONNES_LOUANGE.includes(e.role)) r.lieuxLouange.add(lieu);
      }
    }
  }
  return r;
}

/** Les places qu'un compte (ou un nom sans compte) mérite d'après ses rôles et le planning. */
type Citation = {
  sous: Set<SousEquipe>;
  lieuxLouange: Set<ServiceLieu>;
  joue: Set<Instrument>;
  regie: boolean;
  lieuxRegie: Set<ServiceLieu>;
  edd: boolean;
  /** Piano ou Guitare au planning (même dans un groupe) : entre dans les Musiciens pour garder Harmonie. */
  harmonie: boolean;
};

const estLieu = (cle: string): cle is ServiceLieu => (SERVICE_LIEUX as readonly string[]).includes(cle);
const SOUS_PAR_ROLE: Record<string, SousEquipe> = { presidence: "presidence", musicien: "musiciens", chanteur: "choristes" };

function citer(data: Donnees | null, noms: string[], planning: PlanningData): Citation {
  const c: Citation = { sous: new Set(), lieuxLouange: new Set(), joue: new Set(), regie: false, lieuxRegie: new Set(), edd: false, harmonie: false };
  const serviceRoles = (data?.serviceRoles && typeof data.serviceRoles === "object" ? data.serviceRoles : {}) as Record<string, unknown>;
  for (const [cle, roles] of Object.entries(serviceRoles)) {
    const r = liste(roles);
    // Louange = les 4 lieux du culte seulement : une clé de groupe ou d'EDD n'y fait pas entrer (V19GROUPES).
    const sous = estLieu(cle) ? r.map((x) => SOUS_PAR_ROLE[x]).filter(Boolean) : [];
    for (const s of sous) c.sous.add(s);
    if (sous.length) c.lieuxLouange.add(cle as ServiceLieu);
    if (r.includes("regie")) {
      c.regie = true;
      if (estLieu(cle)) c.lieuxRegie.add(cle);
    }
    if ((EDD_CLASSES as readonly string[]).includes(cle)) c.edd = true;
  }
  const p = duPlanning(planning, noms);
  p.joue.forEach((i) => c.joue.add(i));
  p.lieuxLouange.forEach((l) => c.lieuxLouange.add(l));
  p.lieuxRegie.forEach((l) => c.lieuxRegie.add(l));
  c.harmonie = p.harmonie;
  if (p.regie) c.regie = true;
  return c;
}

/** Intertitre de LOUANGE → sous-équipe, plus l'instrument que les sous-colonnes Pianistes, Guitaristes, Batteurs disent. */
function parIntertitre(groupe: string): { sous: SousEquipe[]; joue: Instrument[] } {
  switch (normalizeName(groupe)) {
    case "presidences": case "presidence": return { sous: ["presidence"], joue: [] };
    case "choristes": return { sous: ["choristes"], joue: [] };
    case "pianistes": return { sous: ["musiciens"], joue: ["piano"] };
    case "guitaristes": return { sous: ["musiciens"], joue: ["guitare"] };
    case "batteurs": return { sous: ["musiciens"], joue: ["batterie"] };
    default: return { sous: [], joue: [] };
  }
}

// ─── Compléter les équipes ──────────────────────────────────────────────────

/** `existant` ∪ `ajout`, dans l'ordre de `ordre`. Inchangé (même tableau) si l'ajout est déjà couvert. */
function reunir<T extends string>(existant: unknown, ajout: Iterable<T>, ordre: readonly T[]): { valeur: T[]; change: boolean } {
  const deja = liste(existant);
  const nouveau = [...new Set(ajout)].filter((x) => !deja.includes(x));
  if (nouveau.length === 0) return { valeur: deja as T[], change: false };
  const tout = new Set<string>([...deja, ...nouveau]);
  return { valeur: [...ordre.filter((x) => tout.has(x)), ...[...tout].filter((x) => !(ordre as readonly string[]).includes(x))] as T[], change: true };
}

/** Le nom d'un compte dans l'organigramme : la graphie du planning, sinon prénom + initiale. */
function nomDeMembre(data: Donnees): string {
  const planning = texte(data.planningName).trim();
  if (planning) return planning;
  const prenom = texte(data.firstName).trim();
  const initiale = texte(data.lastName).trim().charAt(0);
  const court = [prenom, initiale ? `${initiale}.` : ""].filter(Boolean).join(" ");
  return court || texte(data.email) || "";
}

const nomComplet = (p: ProfilLu): string =>
  [p.data.firstName, p.data.lastName].filter((x) => typeof x === "string" && x).join(" ") || texte(p.data.planningName) || texte(p.data.email) || p.uid;
const estAdmin = (p: ProfilLu): boolean => isAdminEmail(texte(p.data.email) || null);

const membreNeuf = (nom: string, uid: string, champs: Donnees): Donnees =>
  ({ nom, uid, mention: "", referent: false, essai: false, groupe: "", ...champs });

type Ajout = { equipe: string; nom: string; uid: string };

type Complete = { membres: Donnees[]; ajouts: Ajout[]; liens: Ajout[]; pourHarmonie: Ajout[]; doublons: { equipe: string; nom: string }[]; modifies: number };

/** Un membre existant de Louange, complété (sous-équipes, lieux, instruments) ; jamais rien d'enlevé. */
function completerLouange(m: Donnees, cit: Citation): Donnees {
  const inter = parIntertitre(texte(m.groupe));
  const sous = reunir(m.sousEquipes, [...inter.sous, ...cit.sous, ...(cit.harmonie ? ["musiciens" as const] : [])], SOUS_EQUIPES);
  const musicien = sous.valeur.includes("musiciens");
  const joue = reunir(m.joue, musicien ? [...inter.joue, ...cit.joue] : [], INSTRUMENTS);
  const lieux = reunir(m.lieux, cit.lieuxLouange, SERVICE_LIEUX);
  if (!sous.change && !joue.change && !lieux.change) return m;
  return {
    ...m,
    ...(sous.change ? { sousEquipes: sous.valeur } : {}),
    ...(joue.change ? { joue: joue.valeur } : {}),
    ...(lieux.change ? { lieux: lieux.valeur } : {}),
  };
}

function completerRegie(m: Donnees, cit: Citation): Donnees {
  const lieux = reunir(m.lieux, cit.lieuxRegie, SERVICE_LIEUX);
  return lieux.change ? { ...m, lieux: lieux.valeur } : m;
}

/** Ce qu'un compte vaut dans l'équipe : `null` s'il n'y est pas cité ; sinon les champs d'un membre neuf. */
function champsDuNouveau(equipe: "louange" | "regie" | "edd", cit: Citation): Donnees | null {
  if (equipe === "louange" && (cit.sous.size > 0 || cit.harmonie)) {
    const sous = reunir(undefined, [...cit.sous, ...(cit.harmonie ? ["musiciens" as const] : [])], SOUS_EQUIPES).valeur;
    const joue = sous.includes("musiciens") ? reunir(undefined, cit.joue, INSTRUMENTS).valeur : [];
    const lieux = reunir(undefined, cit.lieuxLouange, SERVICE_LIEUX).valeur;
    return { sousEquipes: sous, ...(lieux.length ? { lieux } : {}), ...(joue.length ? { joue } : {}) };
  }
  if (equipe === "regie" && cit.regie) {
    const lieux = reunir(undefined, cit.lieuxRegie, SERVICE_LIEUX).valeur;
    return lieux.length ? { lieux } : {};
  }
  if (equipe === "edd" && cit.edd) return {};
  return null;
}

function completer(etat: Etat, equipe: "louange" | "regie" | "edd"): Complete {
  const lue = etat.equipes.find((e) => e.id === equipe)!;
  const parUid = new Map(etat.profils.map((p) => [p.uid, p]));
  const citationDe = (p: ProfilLu, nomsEnPlus: string[] = []) =>
    citer(p.data, [texte(p.data.planningName), ...nomsEnPlus], etat.planning);
  let modifies = 0;
  const ajouts: Ajout[] = [];
  const liens: Ajout[] = [];
  const pourHarmonie: Ajout[] = [];
  const doublons: Complete["doublons"] = [];
  const nomDe = (p: ProfilLu) => nomDeMembre(p.data) || nomComplet(p);

  // Un compte cité sans être dans l'équipe : s'il existe exactement UN membre sans compte du même nom, on le relie
  // (on pose son uid) ; plusieurs, on ne devine pas (doublons possibles) ; aucun, il s'ajoute plus bas.
  let depart = lue.membres;
  const presentsAvant = new Set(depart.map((m) => texte(m.uid)).filter(Boolean));
  const aAjouter: ProfilLu[] = [];
  for (const p of etat.profils) {
    if (presentsAvant.has(p.uid) || champsDuNouveau(equipe, citationDe(p)) === null) continue;
    const nom = nomDe(p);
    const memes = depart.map((m, i) => ({ m, i })).filter(({ m }) => !texte(m.uid) && normalizeName(texte(m.nom)) === normalizeName(nom));
    if (memes.length === 1) {
      depart = depart.map((m, i) => (i === memes[0].i ? { ...m, uid: p.uid } : m));
      liens.push({ equipe, nom: texte(memes[0].m.nom), uid: p.uid });
      modifies++;
    } else {
      if (memes.length > 1) doublons.push({ equipe, nom });
      aAjouter.push(p);
    }
  }

  const membres = depart.map((m) => {
    const uid = texte(m.uid);
    const profil = uid ? parUid.get(uid) : undefined;
    if (equipe === "edd") return m;
    const cit = profil ? citationDe(profil, [texte(m.nom)]) : citer(null, [texte(m.nom)], etat.planning);
    const apres = equipe === "louange" ? completerLouange(m, cit) : completerRegie(m, cit);
    if (equipe === "louange" && cit.harmonie && !liste(m.sousEquipes).includes("musiciens") && !parIntertitre(texte(m.groupe)).sous.includes("musiciens")
      && !cit.sous.has("musiciens") && liste(apres.sousEquipes).includes("musiciens")) {
      pourHarmonie.push({ equipe, nom: texte(m.nom), uid });
    }
    if (apres !== m) modifies++;
    return apres;
  });

  // Un compte cité sans être dans l'équipe s'ajoute (nom du planning ou prénom + initiale, uid, ni référent ni essai).
  const neufs: Donnees[] = [];
  for (const p of aAjouter) {
    const cit = citationDe(p);
    const champs = champsDuNouveau(equipe, cit)!;
    const nom = nomDe(p);
    neufs.push(membreNeuf(nom, p.uid, champs));
    ajouts.push({ equipe, nom, uid: p.uid });
    if (equipe === "louange" && cit.harmonie && !cit.sous.has("musiciens")) pourHarmonie.push({ equipe, nom, uid: p.uid });
  }
  neufs.sort((a, b) => texte(a.nom).localeCompare(texte(b.nom), "fr"));
  ajouts.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return { membres: [...membres, ...neufs], ajouts, liens, pourHarmonie, doublons, modifies };
}

// ─── Recopie sur les profils ────────────────────────────────────────────────

const CHAMPS_RECOPIES = ["dansEquipes", "referentDe", "sousEquipes", "referentSous", "lieuxLouange", "lieuxRegie", "joue"] as const;
type Recopie = Record<(typeof CHAMPS_RECOPIES)[number], string[]>;

/** Ce que l'organigramme (après migration) dit d'un compte, pour son profil. Les comités des groupes déjà posés
 *  (`comite-paix`…, venus des organigrammes de groupe) sont gardés tels quels : ils ne sont pas à nous. */
function recopieDe(p: ProfilLu, equipes: Map<string, Donnees[]>): Recopie {
  const dans: string[] = [];
  const referent: string[] = [];
  for (const def of EQUIPES) {
    const m = (equipes.get(def.id) ?? []).find((x) => texte(x.uid) === p.uid);
    if (!m) continue;
    dans.push(def.id);
    if (m.referent === true) referent.push(def.id);
  }
  const comites = (champ: unknown) => liste(champ).filter((id) => COMITES.includes(id));
  const louange = (equipes.get("louange") ?? []).find((x) => texte(x.uid) === p.uid);
  const regie = (equipes.get("regie") ?? []).find((x) => texte(x.uid) === p.uid);
  const sous = SOUS_EQUIPES.filter((s) => liste(louange?.sousEquipes).includes(s));
  const lieux = (m: Donnees | undefined) => SERVICE_LIEUX.filter((l) => liste(m?.lieux).includes(l));
  return {
    dansEquipes: [...dans, ...comites(p.data.dansEquipes)],
    referentDe: [...referent, ...comites(p.data.referentDe)],
    sousEquipes: sous,
    referentSous: SOUS_EQUIPES.filter((s) => liste(louange?.referentSous).includes(s)),
    lieuxLouange: lieux(louange),
    lieuxRegie: lieux(regie),
    joue: sous.includes("musiciens") ? INSTRUMENTS.filter((i) => liste(louange?.joue).includes(i)) : [],
  };
}

// ─── Accès, ancien mode et nouveau mode ─────────────────────────────────────

const LIBELLE_PLANNING: Record<string, string> = {
  culte: "Culte", intergroupe: "Intergroupe", interfranco: "Interfranco", campusMatin: "Campus matin", campusSoir: "Campus soir",
  table: "Table", eddZhongban: "EDD 中班", eddDaban: "EDD 大班", eddGaoban: "EDD 高班",
  paix: "Groupe Paix", bonte: "Groupe Bonté", fidelite: "Groupe Fidélité", fideliteMusiciens: "Fidélité musiciens",
};
const planningLibelle = (k: string) => LIBELLE_PLANNING[k] ?? k;

/** Profil tel que le lisent les fonctions d'accès : listes toujours présentes, droits cochés lus tels quels. */
function profilDe(p: ProfilLu, surcharge: Donnees = {}): UserProfile {
  const d = { ...p.data, ...surcharge };
  const serviceRoles = (d.serviceRoles && typeof d.serviceRoles === "object" ? d.serviceRoles : {}) as UserProfile["serviceRoles"];
  return {
    ...d,
    uid: p.uid, email: texte(d.email), firstName: texte(d.firstName), lastName: texte(d.lastName), planningName: texte(d.planningName),
    serviceRoles,
    annonces: liste(d.annonces), notify: liste(d.notify), plannings: liste(d.plannings),
    equipes: d.equipes === true, coordination: d.coordination === true,
    dansEquipes: liste(d.dansEquipes), referentDe: liste(d.referentDe),
    sousEquipes: liste(d.sousEquipes), referentSous: liste(d.referentSous),
    lieuxLouange: liste(d.lieuxLouange), lieuxRegie: liste(d.lieuxRegie), joue: liste(d.joue),
    remplitParRole: liste(d.remplitParRole), publieParRole: liste(d.publieParRole), notifieParRole: liste(d.notifieParRole),
    groupe: typeof d.groupe === "string" ? d.groupe : undefined,
  } as UserProfile;
}

/** Une audience ancienne (`notify`) est couverte si le nouveau mode l'offre telle quelle, ou par plus large :
 *  « * », la Louange entière pour un lieu du culte, l'EDD entière pour une classe. Une sous-équipe seule ne couvre rien. */
function audienceCouverte(ancienne: string, nouvelles: string[]): boolean {
  if (nouvelles.includes(ancienne) || nouvelles.includes("*")) return true;
  if ((SERVICE_LIEUX as readonly string[]).includes(ancienne)) return nouvelles.includes("equipe:louange");
  if ((EDD_CLASSES as readonly string[]).includes(ancienne)) return nouvelles.includes("equipe:edd");
  return false;
}

/** Tout ce que la personne ouvre dans un mode : clé stable → phrase. `ancien` : l'audience des anciens droits `notify`
 *  est comparée à celle du nouveau mode par `audienceCouverte`. */
function acces(p: UserProfile, backOffice: boolean, services: { role: string }[], ancienneAudience: string[]): Map<string, string> {
  const m = new Map<string, string>();
  const user = { uid: p.uid, email: null };
  for (const c of visibleCategories(p, backOffice)) m.set(`voir:${c}`, `voit les setlists ${c}`);
  for (const c of creatableCategories(p, backOffice)) m.set(`creer:${c}`, `crée des setlists ${c}`);
  const h = canUseHarmonie(user, services, p, backOffice);
  if (h.piano) m.set("harmonie:piano", "Harmonie (piano)");
  if (h.guitare) m.set("harmonie:guitare", "Harmonie (guitare)");
  if (isCoordination(user, p, backOffice)) m.set("coordination", "coordination (scène, fêtes, évènements de l'Église)");
  for (const k of org.TOUS_LES_PLANNINGS) {
    if (canEditPlanning(user, p, k, backOffice)) m.set(`remplir:${k}`, `remplit le planning ${planningLibelle(k)}`);
  }
  for (const pl of PUBLISHABLE_PLANNINGS) {
    if (droitsDePublication(pl, false, p, backOffice)) m.set(`publier:${pl.key}`, `publie le planning ${planningLibelle(pl.key)}`);
    if (droitsDePrevenir(pl, false, p, backOffice)) m.set(`prevenir:${pl.key}`, `prévient des changements du planning ${planningLibelle(pl.key)}`);
  }
  const sections = backOffice ? org.sectionsCreables(p, ANNONCE_SECTIONS) : ANNONCE_SECTIONS.filter((s) => p.annonces.includes(s));
  for (const s of sections) m.set(`evenement:${s}`, `crée des évènements ${s}`);
  if (canEditerEquipes(user, p, backOffice)) m.set("organigramme", "tient l'organigramme");
  for (const id of equipesDe(p, backOffice)) m.set(`equipe:${id}`, `est de l'équipe ${id} (réunions, tâches)`);
  const audiences = audiencesNotifiables(p, backOffice);
  if (backOffice) {
    for (const a of audiences) m.set(`notifier:${a}`, `notifie ${a}`);
    for (const a of ancienneAudience) if (audienceCouverte(a, audiences)) m.set(`notifier:${a}`, `notifie ${a}`);
  } else {
    for (const a of audiences) m.set(`notifier:${a}`, `notifie ${a}`);
  }
  return m;
}

// ─── Relevé et plan (purs) ──────────────────────────────────────────────────

type Personne = { uid: string; nom: string };

type Releve = {
  /** Garde son accès : rien de perdu ; `gagnes` = ce que le nouveau mode ouvre en plus. */
  gardent: (Personne & { gardes: string[]; gagnes: string[] })[];
  /** Perd un accès : la liste précise. */
  perdent: (Personne & { pertes: string[] })[];
  /** Au planning, dans aucune équipe après migration (B5), avec ou sans compte. */
  auPlanningSansEquipe: { nom: string; compte: string | null; services: string[] }[];
  /** Droit coché qui ne vient d'aucune place de l'organigramme (Timothée décide, rien n'est inventé). */
  droitsSansEquivalent: (Personne & { droits: string[] })[];
  /** Clé de groupe dans `serviceRoles` sans `groupe` correspondant (V19GROUPES : le `groupe` fait foi). */
  groupesSansCorrespondance: (Personne & { cle: string; groupe: string; citeDansLeGroupe: boolean })[];
  /** Membres ajoutés : par équipe. */
  ajouts: Ajout[];
  /** Un membre sans compte du même nom (un seul) a reçu l'uid du compte au lieu d'un ajout. */
  liens: Ajout[];
  /** Ajoutés aux Musiciens pour garder Harmonie (Piano ou Guitare au planning, sans rôle ni intertitre qui les y mette). */
  pourHarmonie: Ajout[];
  /** Un ajout dont le nom est déjà celui de plusieurs membres sans compte de la même équipe : à relier à la main. */
  doublons: { equipe: string; nom: string }[];
  membresCompletes: number;
  admins: number;
  sansAccesNiAvant: number;
  profilsRecopies: number;
  parEtape: Record<number, number>;
};

function egales(a: string[], b: string[]): boolean {
  return a.join(",") === b.join(",");
}

function releveEtPlan(etat: Etat, maintenant: string = new Date().toISOString()): { releve: Releve; plan: Operation[] } {
  const plan: Operation[] = [];
  const completees = new Map<string, Complete>();
  for (const id of ["louange", "regie", "edd"] as const) completees.set(id, completer(etat, id));

  // 1 à 3 : les trois équipes.
  const apres = new Map(etat.equipes.map((e) => [e.id, e.membres] as [string, Donnees[]]));
  for (const [id, c] of completees) {
    apres.set(id, c.membres);
    const lue = etat.equipes.find((e) => e.id === id)!;
    if (c.ajouts.length === 0 && c.modifies === 0) continue;
    const data = { membres: c.membres, updatedAt: maintenant, parUid: "", parNom: PAR_NOM };
    plan.push({ etape: CHEMIN_ETAPE[id], genre: lue.existe ? "maj" : "ecrire", chemin: `equipes/${id}`, data });
  }

  // 4 : les profils.
  let profilsRecopies = 0;
  const recopies = new Map<string, Donnees>();
  for (const p of etat.profils) {
    const voulu = recopieDe(p, apres);
    const changes: Donnees = {};
    for (const k of CHAMPS_RECOPIES) if (!egales(liste(p.data[k]), voulu[k])) changes[k] = voulu[k];
    if (Object.keys(changes).length === 0) continue;
    profilsRecopies++;
    recopies.set(p.uid, changes);
    plan.push({ etape: 4, genre: "maj", chemin: `users/${p.uid}`, data: changes });
  }

  // Les listes du relevé : l'ancien mode sur le profil tel quel, le nouveau sur le profil après recopie.
  const gardent: Releve["gardent"] = [];
  const perdent: Releve["perdent"] = [];
  const droitsSansEquivalent: Releve["droitsSansEquivalent"] = [];
  const groupesSansCorrespondance: Releve["groupesSansCorrespondance"] = [];
  let admins = 0;
  let sansAcces = 0;
  for (const p of etat.profils) {
    if (estAdmin(p)) { admins++; continue; }
    const avant = profilDe(p);
    const apresP = profilDe(p, recopies.get(p.uid));
    const services = findMyServices(etat.planning, avant.planningName);
    const ancien = acces(avant, false, services, []);
    const nouveau = acces(apresP, true, services, audiencesNotifiables(avant, false));
    const pertes = [...ancien].filter(([k]) => !nouveau.has(k)).map(([, v]) => v);
    const gagnes = [...nouveau].filter(([k]) => !ancien.has(k)).map(([, v]) => v);
    const gardes = [...ancien].filter(([k]) => nouveau.has(k)).map(([, v]) => v);
    const who = { uid: p.uid, nom: nomComplet(p) };
    if (pertes.length) perdent.push({ ...who, pertes });
    else if (ancien.size) gardent.push({ ...who, gardes, gagnes });
    else if (!gagnes.length) sansAcces++;

    // Droits cochés sans place d'organigramme qui les donne.
    const droits: string[] = [];
    const coordNouvelle = isCoordination({ email: null }, apresP, true);
    if (avant.coordination && !coordNouvelle) droits.push("coordination");
    const sectionsNouvelles = org.sectionsCreables(apresP, avant.annonces);
    const sectionsSans = avant.annonces.filter((s) => !coordNouvelle && !sectionsNouvelles.includes(s));
    if (sectionsSans.length) droits.push(`annonces : ${sectionsSans.join(", ")}`);
    const audiences = audiencesNotifiables(apresP, true);
    const notifySans = avant.notify.filter((a) => !audienceCouverte(a, audiences));
    if (notifySans.length) droits.push(`notify : ${notifySans.join(", ")}`);
    const planningsSans = (avant.plannings ?? []).filter((k) => !canEditPlanning({ email: null }, apresP, k, true));
    if (planningsSans.length) droits.push(`plannings : ${planningsSans.map(planningLibelle).join(", ")}`);
    if (avant.equipes && !canEditerEquipes({ uid: p.uid, email: null }, apresP, true)) droits.push("équipes");
    if (droits.length) droitsSansEquivalent.push({ ...who, droits });

    // Clé de groupe sans `groupe` correspondant.
    for (const cle of Object.keys(avant.serviceRoles)) {
      const def = groupeDeLaCategorie(cle);
      if (!def) continue;
      if (typeof p.data.groupe === "string" && groupeDef(p.data.groupe)?.categorie === cle) continue;
      const doc = etat.groupes.find((g) => g.id === def.id);
      groupesSansCorrespondance.push({
        ...who, cle, groupe: typeof p.data.groupe === "string" ? p.data.groupe || "(vide)" : "(absent)",
        citeDansLeGroupe: !!doc && comptesCites(doc).includes(p.uid) && groupeDe(p.data) !== null,
      });
    }
  }

  // B5 : les noms du planning qui ne sont dans aucune équipe, une fois la migration faite.
  const dansUneEquipe = { uids: new Set<string>(), noms: new Set<string>() };
  const compter = (m: { uid?: unknown; nom?: unknown }) => {
    if (texte(m.uid)) dansUneEquipe.uids.add(texte(m.uid));
    if (texte(m.nom)) dansUneEquipe.noms.add(normalizeName(texte(m.nom)));
  };
  for (const membres of apres.values()) membres.forEach(compter);
  for (const g of etat.groupes) {
    [g.president, ...g.vp, ...g.roles.flatMap((r) => r.titulaires)].forEach((t) => { if (t) compter(t); });
  }
  const comptesParNom = new Map<string, ProfilLu>();
  for (const p of etat.profils) {
    const n = normalizeName(texte(p.data.planningName));
    if (n && !comptesParNom.has(n)) comptesParNom.set(n, p);
  }
  const auPlanningSansEquipe: Releve["auPlanningSansEquipe"] = [];
  for (const nom of collectPlanningNames(etat.planning)) {
    const cle = normalizeName(nom);
    const compte = comptesParNom.get(cle);
    if (dansUneEquipe.noms.has(cle) || (compte && dansUneEquipe.uids.has(compte.uid))) continue;
    const parService = new Map<string, Set<string>>();
    for (const e of findMyServices(etat.planning, nom)) {
      if (!parService.has(e.service)) parService.set(e.service, new Set());
      parService.get(e.service)!.add(e.role);
    }
    auPlanningSansEquipe.push({
      nom, compte: compte ? nomComplet(compte) : null,
      services: [...parService].map(([s, roles]) => `${s} : ${[...roles].join(", ")}`),
    });
  }

  const parEtape: Record<number, number> = {};
  for (const o of plan) parEtape[o.etape] = (parEtape[o.etape] ?? 0) + 1;
  const toutes = [...completees.values()];
  return {
    plan,
    releve: {
      gardent, perdent, auPlanningSansEquipe, droitsSansEquivalent, groupesSansCorrespondance,
      ajouts: toutes.flatMap((c) => c.ajouts), liens: toutes.flatMap((c) => c.liens), pourHarmonie: toutes.flatMap((c) => c.pourHarmonie), doublons: toutes.flatMap((c) => c.doublons),
      membresCompletes: toutes.reduce((n, c) => n + c.modifies, 0),
      admins, sansAccesNiAvant: sansAcces, profilsRecopies, parEtape,
    },
  };
}

/** Lit la base (jamais d'écriture) puis calcule le relevé et le plan. */
export async function planifier(m: Magasin, planning: PlanningData, maintenant?: string): Promise<{ releve: Releve; plan: Operation[] }> {
  return releveEtPlan(await lireEtat(m, planning), maintenant);
}

/** Exécute le plan, dans l'ordre des étapes. `surEtape` est appelé à l'entrée de chaque étape. */
export const appliquer = appliquerPlan;

// ─── Texte du relevé (imprimé au terminal seulement, jamais écrit dans un fichier du dépôt) ───

export function formaterReleve(r: Releve): string[] {
  const l: string[] = [];
  const bloc = (titre: string, lignes: string[]) => {
    l.push("", `${titre} : ${lignes.length || "aucun"}`);
    for (const x of lignes) l.push(`  - ${x}`);
  };
  l.push("RELEVÉ — accès vers organigramme (rien n'est écrit sans --ecrire)");
  l.push(`Comptes lus hors admins (qui gardent tout) : ${r.admins} admin(s) laissé(s) de côté ; ${r.sansAccesNiAvant} compte(s) sans accès avant ni après.`);
  bloc("1. Garde son accès", r.gardent.map((x) => `${x.nom} (${x.uid}) : ${x.gardes.join(" ; ")}${x.gagnes.length ? ` — en plus : ${x.gagnes.join(" ; ")}` : ""}`));
  bloc("2. Perd un accès", r.perdent.map((x) => `${x.nom} (${x.uid}) : ${x.pertes.join(" ; ")}`));
  bloc("3. Au planning, dans aucune équipe (garde Mes services, ses rappels et la lecture de ses dates, sans autre accès)",
    r.auPlanningSansEquipe.map((x) => `${x.nom} — ${x.compte ? `compte : ${x.compte}` : "sans compte"} — ${x.services.join(" ; ") || "aucun service"}`));
  bloc("4. Droit coché sans équivalent dans l'organigramme (à trancher : rien n'est inventé)", r.droitsSansEquivalent.map((x) => `${x.nom} (${x.uid}) : ${x.droits.join(" ; ")}`));
  bloc("Clé de groupe sans `groupe` correspondant (le `groupe` fait foi, rien n'est écrit)",
    r.groupesSansCorrespondance.map((x) => `${x.nom} (${x.uid}) : ${x.cle}, groupe ${x.groupe}${x.citeDansLeGroupe ? ", cité dans l'organigramme du groupe" : ""}`));
  bloc("Membres qui seront ajoutés aux équipes", r.ajouts.map((x) => `${x.equipe} : ${x.nom} (${x.uid})`));
  bloc("Membres sans compte reliés au compte du même nom (uid posé, rien d'ajouté)", r.liens.map((x) => `${x.equipe} : ${x.nom} (${x.uid})`));
  bloc("Ajoutés aux Musiciens pour garder Harmonie (Piano ou Guitare au planning)", r.pourHarmonie.map((x) => `${x.nom}${x.uid ? ` (${x.uid})` : ""}`));
  bloc("Ajouts dont plusieurs membres sans compte portent déjà le nom (à relier à la main)", r.doublons.map((x) => `${x.equipe} : ${x.nom}`));
  l.push("", `Membres existants complétés : ${r.membresCompletes} ; profils dont les champs recopiés changent : ${r.profilsRecopies}`);
  l.push("", "Plan (écritures que ferait --ecrire)");
  for (const e of Object.keys(ETAPES).map(Number)) l.push(`  Étape ${e} — ${ETAPES[e]} : ${r.parEtape[e] ?? 0} opération(s)`);
  const total = Object.values(r.parEtape).reduce((a, b) => a + b, 0);
  l.push(`  Total : ${total} opération(s)${total === 0 ? " — rien à migrer" : ""}`);
  return l;
}
