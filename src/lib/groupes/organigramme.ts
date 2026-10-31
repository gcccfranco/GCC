// Logique pure des organigrammes de groupe (lot 2 du chantier « équipes et groupes »,
// docs/spec-organigrammes-groupes.md, tranche OG-A) : à quel groupe une personne appartient, le comité,
// le plafond des VP, les colonnes que l'on peut relier, « Relier à un compte », et ce que le serveur
// recopie sur un profil. Aucune dépendance Firebase ni réseau : le client, les routes et les tests
// lisent les mêmes fonctions.

import { BACK_OFFICE } from "@/lib/backOffice";
import { colonneDePersonnes } from "@/lib/planning/choisir";
import { grilleDe } from "@/lib/planning/grilles";
import { normalizeName } from "@/lib/planning/names";
import type { OrganigrammeGroupe, RoleGroupe, Titulaire } from "@/types/groupe";
import {
  MAX_VP_BORNE, MAX_VP_DEFAUT, TABLE_GROUPES, estGroupeId, groupeDef, groupeDeLaCategorie, type GroupeId,
} from "./table";

// ─── Le groupe d'une personne (OG2, OG28) ────────────────────────────────────

/** Ce que `groupeDe` lit d'un profil. */
export type ProfilGroupe = {
  groupe?: string | null;
  serviceRoles?: Record<string, readonly string[]>;
};

/**
 * Le groupe d'une personne (D14 : un seul), partout le même (client et serveur). La valeur de
 * `groupe` si le champ existe (`""` = sans groupe) ; sinon déduit de `serviceRoles` quand le profil
 * y a exactement une clé de groupe (« Groupe Paix »…) ; sinon sans groupe. Rien à écrire pour les
 * comptes d'aujourd'hui (décision 45, Q6).
 */
export function groupeDe(profil: ProfilGroupe): GroupeId | null {
  if (typeof profil.groupe === "string") return estGroupeId(profil.groupe) ? profil.groupe : null;
  const roles = profil.serviceRoles ?? {};
  const cles = TABLE_GROUPES.filter((g) => g.planning !== null && g.categorie in roles);
  return cles.length === 1 ? cles[0].id : null;
}

/**
 * Destinataires d'un groupe (OG28, D17) : la clé du groupe dans `serviceRoles` (comme avant) ou le
 * groupe de la personne (`groupeDe`). Les droits venus des organigrammes ne comptent que si
 * `backOffice` (OG27) : un test pur le passe lui-même, la variable n'est pas celle de son processus.
 */
export function estDuGroupe(profil: ProfilGroupe, categorie: string, backOffice: boolean = BACK_OFFICE): boolean {
  if (categorie in (profil.serviceRoles ?? {})) return true;
  const def = groupeDeLaCategorie(categorie);
  return backOffice && !!def && groupeDe(profil) === def.id;
}

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Les quatre champs du profil que le serveur écrit seul (OG19, OG20) : `groupe` reste `undefined`
 *  tant qu'il manque (il se déduit alors, OG2), les trois listes valent `[]`. */
export function lireChampsGroupe(data: Record<string, unknown>) {
  return {
    groupe: typeof data.groupe === "string" ? data.groupe : undefined,
    remplitParRole: liste(data.remplitParRole),
    publieParRole: liste(data.publieParRole),
    notifieParRole: liste(data.notifieParRole),
  };
}

// ─── Lecture d'un document groupes/{id} ──────────────────────────────────────

const chaine = (v: unknown): string => (typeof v === "string" ? v : "");

function lireTitulaire(v: unknown): Titulaire | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  const nom = chaine(t.nom).trim();
  const uid = chaine(t.uid);
  // Un compte garde ses droits même sans nom de repli ; ni nom ni compte = rien à garder.
  return nom || uid ? { nom, uid } : null;
}

const lireTitulaires = (v: unknown): Titulaire[] =>
  (Array.isArray(v) ? v : []).map(lireTitulaire).filter((t): t is Titulaire => t !== null);

/** Un document lu tel que Firestore le rend, avec les défauts du modèle : `maxVp` absent, droit
 *  `saisirFetes` absent = faux (décision 35), colonne toujours `null` pour un groupe sans planning. */
export function lireGroupe(id: string, data: unknown): OrganigrammeGroupe {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const planning = groupeDef(id)?.planning ?? null;
  const roles = (Array.isArray(d.roles) ? d.roles : []).map((r): RoleGroupe => {
    const x = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const droits = (x.droits && typeof x.droits === "object" ? x.droits : {}) as Record<string, unknown>;
    return {
      id: chaine(x.id),
      nom: chaine(x.nom),
      nomZh: chaine(x.nomZh),
      places: typeof x.places === "number" && Number.isInteger(x.places) && x.places >= 0 ? x.places : null,
      comite: x.comite === true,
      colonne: planning && typeof x.colonne === "string" && x.colonne ? x.colonne : null,
      droits: {
        remplir: droits.remplir === true,
        publier: droits.publier === true,
        notifier: droits.notifier === true,
        saisirFetes: droits.saisirFetes === true,
      },
      titulaires: lireTitulaires(x.titulaires),
    };
  });
  const maxVp = d.maxVp;
  return {
    id,
    president: lireTitulaire(d.president),
    vp: lireTitulaires(d.vp),
    ...(typeof maxVp === "number" && Number.isInteger(maxVp) && maxVp >= 1 && maxVp <= MAX_VP_BORNE ? { maxVp } : {}),
    roles,
    updatedAt: chaine(d.updatedAt),
    parUid: chaine(d.parUid),
    parNom: chaine(d.parNom),
  };
}

// ─── Plafond des VP (OG6, décision 36) ───────────────────────────────────────

/** Le plafond des VP du groupe : `maxVp`, 2 quand il est absent. */
export function placesVp(groupe: Pick<OrganigrammeGroupe, "maxVp">): number {
  return groupe.maxVp ?? MAX_VP_DEFAUT;
}

/** Combien de VP la feuille « Nommer » peut encore offrir. */
export function placesVpLibres(groupe: Pick<OrganigrammeGroupe, "maxVp" | "vp">): number {
  return Math.max(0, placesVp(groupe) - groupe.vp.length);
}

/** Le plafond après « − » ou « + » : jamais sous 1 ni sous les VP déjà nommés, jamais au-dessus de 9. */
export function changerPlafondVp(groupe: Pick<OrganigrammeGroupe, "maxVp" | "vp">, delta: 1 | -1): number {
  return Math.min(MAX_VP_BORNE, Math.max(1, groupe.vp.length, placesVp(groupe) + delta));
}

// ─── Comité (OG17) ───────────────────────────────────────────────────────────

const clePersonne = (t: Titulaire) => (t.uid ? `u:${t.uid}` : `n:${normalizeName(t.nom)}`);

/** Le comité : le président, les VP, puis les titulaires des rôles « au comité », chacun une fois
 *  (un nom sans compte du même nom est une seule personne, OG15). */
export function membresComite(groupe: OrganigrammeGroupe): Titulaire[] {
  const tous = [
    ...(groupe.president ? [groupe.president] : []),
    ...groupe.vp,
    ...groupe.roles.filter((r) => r.comite).flatMap((r) => r.titulaires),
  ];
  const vus = new Set<string>();
  return tous.filter((t) => {
    const cle = clePersonne(t);
    if (vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

// ─── Colonnes reliables (OG12) ───────────────────────────────────────────────

interface ColonneReliable {
  cle: string;
  /** Clé de `planning.roles.*`, déjà traduite en 中文. */
  i18n: string;
}

/** Les colonnes de personnes du planning du groupe, jamais Thème ni une colonne en lecture seule ;
 *  aucune pour Amour et Joie. */
export function colonnesReliables(groupeId: string): ColonneReliable[] {
  const planning = groupeDef(groupeId)?.planning;
  const grille = planning ? grilleDe(planning) : undefined;
  return (grille?.colonnes ?? [])
    .filter((c) => colonneDePersonnes(c.cle) && !c.lectureSeule)
    .map((c) => ({ cle: c.cle, i18n: c.i18n }));
}

/** Le rôle relié à une colonne ; si deux le sont (écriture directe), le premier (OG12). */
export function roleDeColonne(groupe: Pick<OrganigrammeGroupe, "roles">, colonne: string): RoleGroupe | undefined {
  return groupe.roles.find((r) => r.colonne === colonne);
}

/** Les colonnes que le formulaire d'un rôle propose, avec le rôle qui tient déjà chacune (le cadenas) :
 *  une colonne = un seul rôle. `roleId` = le rôle modifié (`null` pour un nouveau), qui garde la sienne. */
export function colonnesProposees(groupe: OrganigrammeGroupe, roleId: string | null) {
  return colonnesReliables(groupe.id).map((c) => {
    const tenue = roleDeColonne(groupe, c.cle);
    return { ...c, prisePar: tenue && tenue.id !== roleId ? tenue.id || undefined : null };
  });
}

// ─── Relier à un compte (OG16, décision 45) ──────────────────────────────────

/** Remplace un nom sans compte par un compte, dans la présidence, les VP et tous les rôles du groupe,
 *  en une écriture. Un rôle où le compte était déjà titulaire garde une seule ligne. Le document donné
 *  n'est pas modifié. */
export function relierACompte(groupe: OrganigrammeGroupe, nom: string, compte: Titulaire): OrganigrammeGroupe {
  const cle = normalizeName(nom);
  const remplace = (t: Titulaire): Titulaire => (!t.uid && normalizeName(t.nom) === cle ? { nom: compte.nom, uid: compte.uid } : t);
  const unSeul = (l: Titulaire[]) => l.filter((t, i) => !t.uid || l.findIndex((x) => x.uid === t.uid) === i);
  return {
    ...groupe,
    president: groupe.president ? remplace(groupe.president) : null,
    vp: unSeul(groupe.vp.map(remplace)),
    roles: groupe.roles.map((r) => ({ ...r, titulaires: unSeul(r.titulaires.map(remplace)) })),
  };
}

/** Les comptes cités dans le document (président, VP, titulaires) : ceux que la route recopie. */
export function comptesCites(groupe: OrganigrammeGroupe): string[] {
  return [...new Set([groupe.president, ...groupe.vp, ...groupe.roles.flatMap((r) => r.titulaires)].map((t) => t?.uid ?? "").filter(Boolean))];
}

// ─── Ce que le serveur recopie sur un profil (OG19, OG3) ─────────────────────

interface RecopieGroupe {
  /** Le groupe après OG3 : celui de la personne, ou celui où elle entre. */
  groupe: GroupeId | null;
  /** Vrai = une personne sans groupe entre dans `groupe` : le serveur écrit alors le champ. */
  entre: boolean;
  /** Groupes dont un document la cite sans qu'elle en soit : ni groupe ni droit (OG3). */
  ignores: GroupeId[];
  remplitParRole: string[];
  publieParRole: string[];
  notifieParRole: string[];
  /** Ids de comité seulement : la recopie des équipes de l'église les complète (OG20). */
  dansEquipes: string[];
  referentDe: string[];
}

const cite = (g: OrganigrammeGroupe, uid: string) =>
  g.president?.uid === uid || g.vp.some((t) => t.uid === uid) || g.roles.some((r) => r.titulaires.some((t) => t.uid === uid));

/**
 * Ce que les documents `groupes/*` disent d'un compte, pour son profil. `actuel` = `groupeDe(profil)`.
 * Une personne sans groupe citée quelque part entre dans le premier groupe de la table qui la cite
 * (OG3) ; une personne d'un autre groupe n'est jamais placée : le groupe cité est renvoyé dans
 * `ignores`. « Saisir les chants des fêtes » n'est pas recopiée : le lot 4 la lit dans le document.
 */
export function recopieDeGroupe(uid: string, actuel: GroupeId | null, groupes: readonly OrganigrammeGroupe[]): RecopieGroupe {
  // Les cinq documents sont obligatoires : sans celui du groupe de la personne, les listes vides
  // rendues ici effaceraient ses droits à l'écriture.
  if (TABLE_GROUPES.some((def) => !groupes.some((g) => g.id === def.id))) {
    throw new Error("recopieDeGroupe : les cinq documents groupes/* sont obligatoires");
  }
  const rien = { remplitParRole: [], publieParRole: [], notifieParRole: [], dansEquipes: [], referentDe: [] };
  if (!uid) return { groupe: actuel, entre: false, ignores: [], ...rien };

  const cites = TABLE_GROUPES.filter((def) => groupes.some((g) => g.id === def.id && cite(g, uid))).map((def) => def.id);
  const groupe = actuel ?? cites[0] ?? null;
  const resultat = { groupe, entre: actuel === null && groupe !== null, ignores: cites.filter((id) => id !== groupe) };
  const doc = groupe ? groupes.find((g) => g.id === groupe) : undefined;
  const def = groupe ? groupeDef(groupe) : undefined;
  if (!doc || !def || !cites.includes(def.id)) return { ...resultat, ...rien };

  const fixe = doc.president?.uid === uid || doc.vp.some((t) => t.uid === uid);
  const siens = doc.roles.filter((r) => r.titulaires.some((t) => t.uid === uid));
  const a = (droit: (r: RoleGroupe) => boolean) => fixe || siens.some(droit);
  return {
    ...resultat,
    // Amour et Joie n'ont pas de clé de planning : jamais remplitParRole ni publieParRole.
    remplitParRole: def.planning && a((r) => r.droits.remplir || r.droits.publier) ? [def.planning] : [],
    publieParRole: def.planning && a((r) => r.droits.publier) ? [def.planning] : [],
    notifieParRole: a((r) => r.droits.notifier) ? [def.categorie] : [],
    dansEquipes: a((r) => r.comite) ? [def.comite] : [],
    referentDe: fixe ? [def.comite] : [],
  };
}
