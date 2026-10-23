// Lot AO (« les accès viennent de l'organigramme », docs/spec-acces-organigramme.md, section « Choix
// d'exécution ») : le NOUVEAU mode des accès, une fonction pure par ligne du tableau « Ce que chacun
// ouvre ». Aucune dépendance Firebase ni `BACK_OFFICE` : src/lib/access.ts, audiences.ts et releases.ts
// l'appellent quand leur paramètre `backOffice` vaut `true` ; `false` garde l'ancien mode, inchangé.
//
// Le nouveau mode ne lit ni `serviceRoles` ni les droits cochés (`coordination`, `annonces`, `notify`,
// `plannings`, `equipes`) : seulement ce que le serveur recopie de l'organigramme sur le profil
// (`dansEquipes`, `referentDe`, `sousEquipes`, `referentSous`, `lieuxLouange`, `lieuxRegie`, `joue`) et
// de ceux des groupes (`groupe`, `remplitParRole`, `publieParRole`, `notifieParRole`). Les admins
// (`ADMIN_EMAILS`) ne passent pas ici : access.ts les traite avant, dans les deux modes (A3).
// `referentDe` garde son sens d'ids d'équipes : `louange` = référent de Louange (D4) ; les référents
// de sous-équipe sont dans `referentSous`.

import { EQUIPES, cleNomEquipe } from "@/lib/equipes/table";
import { TABLE_GROUPES, groupeDef } from "@/lib/groupes/table";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { SOUS_EQUIPES, type SousEquipe } from "@/types/equipe";
import { GROUPES, SERVICE_LIEUX } from "@/types/user";

/** Ce que ce module lit d'un profil. Tout est optionnel : un profil d'avant le lot AO ne donne rien. */
export type ProfilOrganigramme = {
  dansEquipes?: string[];
  referentDe?: string[];
  groupe?: string | null;
  sousEquipes?: string[];
  referentSous?: string[];
  lieuxLouange?: string[];
  lieuxRegie?: string[];
  joue?: string[];
  remplitParRole?: string[];
  publieParRole?: string[];
  notifieParRole?: string[];
};
type P = ProfilOrganigramme | null | undefined;

const liste = (l: string[] | undefined): string[] => l ?? [];
const dans = (p: P, equipe: string) => liste(p?.dansEquipes).includes(equipe);
const referent = (p: P, equipe: string) => liste(p?.referentDe).includes(equipe);
const IDS_EQUIPES = EQUIPES.map((e) => e.id);

/** Membre d'Orga (« coordination générale ») : partout dans l'église. */
export const estOrga = (p: P): boolean => dans(p, "orga");
/** Référent de Louange (D4), au-dessus des trois sous-équipes. */
export const estReferentLouange = (p: P): boolean => referent(p, "louange");
export const estReferentEdd = (p: P): boolean => referent(p, "edd");
export const estReferentRegie = (p: P): boolean => referent(p, "regie");

// ─── Setlists ───────────────────────────────────────────────────────────────

/** Catégories où l'on CRÉE une setlist (C3, groupes, C4) : les lieux de service d'un membre de Louange
 *  (`lieuxLouange`), la catégorie de son groupe (champ `groupe`, Paix · Fidélité · Bonté : Amour et
 *  Joie n'ont pas de setlists), les trois classes de l'EDD pour un membre d'`edd`. Dans l'ordre des
 *  lieux, du groupe, de l'EDD. */
export function categoriesCreables(p: P): string[] {
  const lieux = SERVICE_LIEUX.filter((l) => liste(p?.lieuxLouange).includes(l)) as string[];
  const cat = p?.groupe ? groupeDef(p.groupe)?.categorie : undefined;
  const groupe = cat && (GROUPES as readonly string[]).includes(cat) ? [cat] : [];
  const edd = dans(p, "edd") ? [...EDD_CLASSES] as string[] : [];
  return [...new Set([...lieux, ...groupe, ...edd])];
}

/** Catégories qu'on VOIT (C2) : celles qu'on crée, plus les lieux où l'on sert à la Régie (`lieuxRegie`),
 *  en lecture seule. La lecture d'une seule date où l'on sert (F1) se calcule à part (access.ts). */
export function categoriesVisibles(p: P): string[] {
  const regie = SERVICE_LIEUX.filter((l) => liste(p?.lieuxRegie).includes(l)) as string[];
  return [...new Set([...categoriesCreables(p), ...regie])];
}

// ─── Harmonie ───────────────────────────────────────────────────────────────

/** Harmonie (catalogue, cours, idées) : les Musiciens avec piano ou guitare ; le RD-2000 suit le piano. */
export function harmonie(p: P): { piano: boolean; guitare: boolean } {
  if (!liste(p?.sousEquipes).includes("musiciens")) return { piano: false, guitare: false };
  const joue = liste(p?.joue);
  return { piano: joue.includes("piano"), guitare: joue.includes("guitare") };
}

// ─── Coordination ───────────────────────────────────────────────────────────

/** Coordination (D5) : scène, fêtes, évènements de toute l'Église — le référent Louange, le référent
 *  EDD, les membres d'Orga. Ni le référent d'une sous-équipe, ni le référent Régie. */
export function coordination(p: P): boolean {
  return estReferentLouange(p) || estReferentEdd(p) || estOrga(p);
}

// ─── Plannings ──────────────────────────────────────────────────────────────

/** Les plannings « du culte » : ceux des quatre lieux (Culte, Intergroupe, Interfranco, Campus en deux moments). */
export const PLANNINGS_DU_CULTE = ["culte", "intergroupe", "interfranco", "campusMatin", "campusSoir"] as const;
/** Les trois plannings de l'EDD (une grille par classe, `CLES_EDD` de grilles.ts — recopié ici : ce module
 *  n'importe pas la table des grilles, qui tire releases.ts, qui l'importe). */
export const PLANNINGS_EDD = ["eddZhongban", "eddDaban", "eddGaoban"] as const;
/** Les colonnes que le référent Régie remplit (lecture littérale du tableau : Sono, Sono Live, PPT). */
export const COLONNES_REGIE = ["sono", "sonoLive", "ppt"] as const;

const dedans = (liste: readonly string[], key: string) => liste.includes(key);

/** Les plannings des groupes (clés de PUBLISHABLE_PLANNINGS et la grille des musiciens de Fidélité). */
export const PLANNINGS_DES_GROUPES = ["paix", "bonte", "fidelite", "fideliteMusiciens"] as const;
/** Toutes les grilles, par clé (celles de GRILLES, src/lib/planning/grilles.ts). */
export const TOUS_LES_PLANNINGS: readonly string[] = [...PLANNINGS_DU_CULTE, "table", ...PLANNINGS_EDD, ...PLANNINGS_DES_GROUPES];

/** Ce que l'organigramme (hors rôles de groupe) donne sur un planning : toutes les colonnes, la liste de
 *  celles de la Régie, ou rien. Référent Louange : le culte, toutes colonnes ; référent Régie : Sono, Sono
 *  Live, PPT du culte ; PAS le référent Musiciens (E2) ; référent EDD : les classes de l'EDD ; Orga : la
 *  Table (aucune ligne du tableau ne la nomme, « coordination générale » — à confirmer par Timothée). */
function colonnesParEquipe(p: P, key: string): "toutes" | readonly string[] | null {
  if (dedans(PLANNINGS_DU_CULTE, key)) {
    if (estReferentLouange(p)) return "toutes";
    if (estReferentRegie(p)) return COLONNES_REGIE;
  }
  if (dedans(PLANNINGS_EDD, key) && estReferentEdd(p)) return "toutes";
  if (key === "table" && estOrga(p)) return "toutes";
  return null;
}

/** Les colonnes qu'on remplit sur un planning : `"toutes"`, une liste (la Régie), ou `null` (rien). Un rôle
 *  de groupe (`remplitParRole`, V19GROUPES, inchangé) donne toutes les colonnes de son planning. */
export function colonnesRemplies(p: P, key: string): "toutes" | readonly string[] | null {
  if (liste(p?.remplitParRole).includes(key)) return "toutes";
  return colonnesParEquipe(p, key);
}

/** Remplit-on au moins un planning ? (« ceux qui font les plannings » : absences, petit déj.) */
export function remplitUnPlanning(p: P): boolean {
  return liste(p?.remplitParRole).length > 0 || TOUS_LES_PLANNINGS.some((k) => colonnesParEquipe(p, k) !== null);
}

/** Publier un trimestre d'un planning : qui en remplit toutes les colonnes par son équipe (référent Louange, référent
 *  EDD), ou son rôle de groupe (`publieParRole`). Pas le référent Régie (Timothée, 23/10/2026). La Table ne se publie pas. */
export function publiePlanning(p: P, key: string): boolean {
  return liste(p?.publieParRole).includes(key) || (key !== "table" && colonnesParEquipe(p, key) === "toutes");
}

/** Prévenir des changements d'un planning : qui le publie, et le référent Régie sur le culte — il remplit Sono et
 *  PPT mais ne publie pas le trimestre (Timothée, 23/10/2026). Un rôle « Notifier » seul : releases.ts l'ajoute. */
export function previentPlanning(p: P, key: string): boolean {
  return publiePlanning(p, key) || (key !== "table" && colonnesParEquipe(p, key) !== null);
}

// ─── Notifier ───────────────────────────────────────────────────────────────

/** Sentinelle « toute l'Église » — la même que NOTIFY_ALL (audiences.ts, qui importe ce module). */
const TOUS = "*";
const PREFIXE_EQUIPE = "equipe:";
const PREFIXE_LOUANGE = "louange:";

/** Audience valide du nouveau mode : `equipe:<id>` (une des 13 équipes) ou `louange:<sous-équipe>`. */
export function audienceOrganigrammeValide(a: string): boolean {
  if (a.startsWith(PREFIXE_EQUIPE)) return IDS_EQUIPES.includes(a.slice(PREFIXE_EQUIPE.length));
  if (a.startsWith(PREFIXE_LOUANGE)) return (SOUS_EQUIPES as readonly string[]).includes(a.slice(PREFIXE_LOUANGE.length));
  return false;
}

/** Les sous-équipes dont on est référent : toutes pour le référent Louange, sinon `referentSous`. */
export function sousEquipesReferent(p: P): SousEquipe[] {
  if (estReferentLouange(p)) return [...SOUS_EQUIPES];
  return SOUS_EQUIPES.filter((s) => liste(p?.referentSous).includes(s));
}

/** Les équipes de l'Église dont on est référent (les comités des groupes n'en sont pas : leurs droits
 *  viennent des rôles des groupes), dans l'ordre de la table. */
function equipesReferent(p: P): string[] {
  return IDS_EQUIPES.filter((id) => referent(p, id));
}

/** Les audiences qu'on notifie : Orga, toute l'Église (`*`) ; un référent, son équipe (`equipe:<id>`) ; le
 *  référent Louange, aussi chaque sous-équipe ; un référent de sous-équipe, la sienne (`louange:<s>`) ; plus
 *  les audiences des rôles de groupe (`notifieParRole`). Le droit coché `notify` n'est pas lu. */
export function audiencesOrganigramme(p: P): string[] {
  const parRole = liste(p?.notifieParRole);
  if (estOrga(p)) return [...new Set([TOUS, ...parRole])];
  return [...new Set([
    ...equipesReferent(p).map((id) => `${PREFIXE_EQUIPE}${id}`),
    ...sousEquipesReferent(p).map((s) => `${PREFIXE_LOUANGE}${s}`),
    ...parRole,
  ])];
}

// ─── Évènements ─────────────────────────────────────────────────────────────

/** Sections d'évènement qu'on crée, parmi `sections` : le référent Louange, le Culte Francophone ; président
 *  et VP d'un groupe (leur `referentDe` porte le comité), la catégorie du groupe. Il n'existe pas de section
 *  EDD : rien pour le référent EDD (écart signalé dans la spec). */
export function sectionsCreables(p: P, sections: readonly string[]): string[] {
  const permis = new Set<string>();
  if (estReferentLouange(p)) permis.add("Culte Francophone");
  for (const g of TABLE_GROUPES) if (referent(p, g.comite)) permis.add(g.categorie);
  return sections.filter((s) => permis.has(s));
}

// ─── Tenir l'organigramme ───────────────────────────────────────────────────

export type TenirOrganigramme = { tout: boolean; equipes: string[]; sousEquipes: SousEquipe[] };

/** Ce qu'on tient dans l'organigramme : Orga, tout ; un référent, son équipe ; le référent Louange, toute la
 *  Louange et ses trois sous-équipes ; un référent de sous-équipe, la sienne. Président et VP tiennent leur
 *  groupe par `canTenirGroupe` (inchangé), pas ici. */
export function tientOrganigramme(p: P): TenirOrganigramme {
  return { tout: estOrga(p), equipes: equipesReferent(p), sousEquipes: sousEquipesReferent(p) };
}

/** Tenir toute une équipe : ajouter, retirer, cocher, y compris les listes « Où il sert » et « Ce qu'il joue ». */
export function peutTenirEquipe(p: P, equipe: string): boolean {
  const t = tientOrganigramme(p);
  return t.tout || t.equipes.includes(equipe);
}

/** Tenir une sous-équipe de Louange : le référent de Louange et Orga (qui tiennent l'équipe), ou son référent. */
export function peutTenirSousEquipe(p: P, sous: string): boolean {
  return peutTenirEquipe(p, "louange") || sousEquipesReferent(p).some((s) => s === sous);
}

/** Placer un membre : tenir son équipe ; ou, dans Louange, tenir l'une des sous-équipes concernées (celles qu'il a
 *  déjà, ou celle où on l'ajoute). Le référent Musiciens place donc un musicien, pas un choriste. */
export function peutPlacerMembre(p: P, equipe: string, sousEquipes: readonly string[] = []): boolean {
  return peutTenirEquipe(p, equipe) || (equipe === "louange" && sousEquipes.some((s) => peutTenirSousEquipe(p, s)));
}

/** Changer les référents d'une équipe : Orga ; le référent Louange, ceux de Louange et de ses sous-équipes
 *  (D4, B3). Ni un référent de sous-équipe, ni un référent d'une autre équipe. Les admins : access.ts. */
export function peutChangerReferents(p: P, equipe: string): boolean {
  return estOrga(p) || (equipe === "louange" && estReferentLouange(p));
}

// ─── « Ce que tu peux faire » / « Ce que ça lui ouvre » ──────────────────────

export type Acces = { cle: string; params?: Record<string, string>; pourquoi: string };
type Nommer = (cleI18n: string) => string;

/** La liste des accès d'une personne avec leur raison, en clés i18n (`acces.ouvre.*`, `acces.pourquoi.*`) ; les `params`
 *  servent à la phrase et à sa raison (`t(cle, params)`, `t(pourquoi, params)`).
 *  `nommer` traduit les noms que les params portent (lieux `categories.<c>`, équipes `equipes.court.<id>`,
 *  sous-équipes `acces.sousEquipe.<s>`, instruments `acces.instrument.<i>`) ; sans lui, les clés restent telles.
 *  Même source que les fonctions ci-dessus : l'écran ne recalcule rien. Les admins : pas ici. */
export function ceQueCaOuvre(p: P, nommer: Nommer = (c) => c): Acces[] {
  const out: Acces[] = [];
  const noms = (ids: readonly string[], prefixe: string) => ids.map((i) => nommer(`${prefixe}${i}`)).join(", ");

  const lieuxLouange = SERVICE_LIEUX.filter((l) => liste(p?.lieuxLouange).includes(l));
  if (lieuxLouange.length) out.push({ cle: "acces.ouvre.setlistsCreer", params: { lieux: noms(lieuxLouange, "categories.") }, pourquoi: "acces.pourquoi.louangeLieu" });
  const cat = p?.groupe ? groupeDef(p.groupe)?.categorie : undefined;
  if (cat && (GROUPES as readonly string[]).includes(cat)) {
    out.push({ cle: "acces.ouvre.setlistsGroupe", params: { groupe: nommer(`categories.${cat}`) }, pourquoi: "acces.pourquoi.groupe" });
  }
  if (dans(p, "edd")) out.push({ cle: "acces.ouvre.setlistsEdd", pourquoi: "acces.pourquoi.edd" });
  const lieuxRegie = SERVICE_LIEUX.filter((l) => liste(p?.lieuxRegie).includes(l) && !lieuxLouange.includes(l));
  if (lieuxRegie.length) out.push({ cle: "acces.ouvre.setlistsVoir", params: { lieux: noms(lieuxRegie, "categories.") }, pourquoi: "acces.pourquoi.regieLieu" });

  const h = harmonie(p);
  if (h.piano || h.guitare) {
    const instruments = (["piano", "guitare"] as const).filter((i) => h[i]);
    out.push({ cle: "acces.ouvre.harmonie", pourquoi: "acces.pourquoi.musiciensJoue", params: { instruments: noms(instruments, "acces.instrument.") } });
  }

  if (coordination(p)) {
    out.push({
      cle: "acces.ouvre.coordination",
      pourquoi: estReferentLouange(p) ? "acces.pourquoi.referentLouange" : estReferentEdd(p) ? "acces.pourquoi.referentEdd" : "acces.pourquoi.orga",
    });
  }

  if (estReferentLouange(p)) out.push({ cle: "acces.ouvre.planningCulte", pourquoi: "acces.pourquoi.referentLouange" });
  else if (estReferentRegie(p)) out.push({ cle: "acces.ouvre.planningCulteRegie", pourquoi: "acces.pourquoi.referentRegie" });
  if (estReferentEdd(p)) out.push({ cle: "acces.ouvre.planningEdd", pourquoi: "acces.pourquoi.referentEdd" });
  if (estOrga(p)) out.push({ cle: "acces.ouvre.planningTable", pourquoi: "acces.pourquoi.orga" });
  const parRole = [...new Set([...liste(p?.remplitParRole), ...liste(p?.publieParRole)])];
  if (parRole.length) {
    const nomPlanning = (k: string) => { const g = TABLE_GROUPES.find((x) => x.planning === k); return g ? nommer(`categories.${g.categorie}`) : k; };
    out.push({ cle: "acces.ouvre.planningGroupe", params: { plannings: parRole.map(nomPlanning).join(", ") }, pourquoi: "acces.pourquoi.roleGroupe" });
  }

  if (estOrga(p)) out.push({ cle: "acces.ouvre.notifierTous", pourquoi: "acces.pourquoi.orga" });
  else {
    for (const id of equipesReferent(p)) {
      out.push({ cle: "acces.ouvre.notifierEquipe", params: { equipe: nommer(cleNomEquipe(id, true)) }, pourquoi: "acces.pourquoi.referentEquipe" });
    }
    if (!estReferentLouange(p)) {
      for (const s of sousEquipesReferent(p)) {
        out.push({ cle: `acces.ouvre.notifier${s[0].toUpperCase()}${s.slice(1)}`, pourquoi: "acces.pourquoi.referentSous", params: { sous: nommer(`acces.sousEquipe.${s}`) } });
      }
    }
  }
  if (liste(p?.notifieParRole).length) out.push({ cle: "acces.ouvre.notifierGroupe", params: { groupes: liste(p?.notifieParRole).join(", ") }, pourquoi: "acces.pourquoi.roleGroupe" });

  const sections = sectionsCreables(p, ["Culte Francophone", ...TABLE_GROUPES.map((g) => g.categorie)]);
  if (sections.length) out.push({ cle: "acces.ouvre.evenementSection", params: { sections: noms(sections, "categories.") }, pourquoi: estReferentLouange(p) ? "acces.pourquoi.referentLouange" : "acces.pourquoi.presidenceGroupe" });

  const t = tientOrganigramme(p);
  if (t.tout) out.push({ cle: "acces.ouvre.organigrammeTout", pourquoi: "acces.pourquoi.orga" });
  else {
    for (const id of t.equipes) {
      out.push({ cle: "acces.ouvre.organigrammeEquipe", params: { equipe: nommer(cleNomEquipe(id, true)) }, pourquoi: "acces.pourquoi.referentEquipe" });
    }
    if (!estReferentLouange(p)) {
      for (const s of t.sousEquipes) {
        out.push({ cle: `acces.ouvre.organigramme${s[0].toUpperCase()}${s.slice(1)}`, params: { sous: nommer(`acces.sousEquipe.${s}`) }, pourquoi: "acces.pourquoi.referentSous" });
      }
    }
  }
  return out;
}
