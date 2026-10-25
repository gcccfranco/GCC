import { EDD_CLASSES } from "@/lib/planning/utils";
import { aCommence } from "@/lib/evenements/agenda";
import type { Evenement } from "@/types/evenement";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { Tache } from "@/types/tache";
import { EQUIPES } from "@/lib/equipes/table";
import { COMITES, groupeDef } from "@/lib/groupes/table";
import { PUBLISHABLE_PLANNINGS, droitsDePrevenir, peutPrevenir } from "@/lib/planning/releases";
import { audiencesNotifiables } from "@/lib/push/audiences";
import { BACK_OFFICE } from "@/lib/backOffice";
import * as org from "@/lib/acces/organigramme";
import type { ProfilOrganigramme } from "@/lib/acces/organigramme";
import type { SousEquipe } from "@/types/equipe";
import { ENTREES, WIDGETS, type Entree, type WidgetId } from "@/types/backOffice";
import {
  GROUPES,
  type AccessLevel,
  type ServiceRole,
  type UserProfile,
} from "@/types/user";

// Comptes administrateurs (doivent aussi figurer dans firestore.rules)
export const ADMIN_EMAILS = [
  "tc328829@gmail.com",
  "gcccfranco@gmail.com",
  "david.code999@gmail.com",
];

type AuthUser = { uid: string; email?: string | null };

/** Une adresse d'admin, quelle que soit sa casse — seule comparaison à utiliser,
 *  client comme serveur (audit du 19/09/2026 : deux routes comparaient sans
 *  mettre en minuscules). */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export function isAdminUser(user: { email?: string | null } | null): boolean {
  return isAdminEmail(user?.email);
}

/** Modification du profil : autorisée tant qu'il n'existe pas encore (première
 *  complétion par l'intéressé) ; une fois complété, réservé aux admins.
 *  Miroir serveur dans firestore.rules (users/{uid} : create libre, update admin). */
export function canEditProfile(
  user: { email?: string | null } | null,
  profile: UserProfile | null
): boolean {
  return isAdminUser(user) || !profile;
}

// ─── Équipes (lot 1 du chantier « équipes et groupes », docs/spec-equipes-sans-poles.md) ───

type ProfilEquipes = { dansEquipes?: string[]; referentDe?: string[]; serviceRoles?: Record<string, unknown>; groupe?: string | null };
// Lot AO (docs/spec-acces-organigramme.md) : chaque fonction dont la réponse change prend un dernier paramètre
// `backOffice` (patron d'audiencesNotifiables, droitsDePublication). `false` = l'ancien mode, code d'avant le
// lot inchangé ; `true` = le nouveau, calculé par src/lib/acces/organigramme.ts, qui ne lit ni `serviceRoles` ni
// les droits cochés (`coordination`, `annonces`, `notify`, `plannings`, `equipes`). Les admins (`ADMIN_EMAILS`)
// ont tout dans les deux modes (A3). Miroir des règles (firestore.rules) : « ancien ∪ nouveau » (tranche AO-C),
// elles suivent les deux modes.
/** Les équipes de l'église, puis les comités des cinq groupes (lot 2, OG17, OG20) : un comité est une
 *  équipe calculée depuis groupes/{id}, sans document equipes/comite-*. */
const ORDRE_EQUIPES = [...EQUIPES.map((e) => e.id), ...COMITES];
const rangEquipe = (id: string) => (ORDRE_EQUIPES.includes(id) ? ORDRE_EQUIPES.indexOf(id) : ORDRE_EQUIPES.length);

/** Les équipes d'une personne (EQ5) : celles où elle figure (`dansEquipes`, recopié par le serveur
 *  depuis l'organigramme), plus « louange » dès qu'elle a un rôle de service — une clé de
 *  `serviceRoles` suffit, même sans rôle (décisions 5 et 42) — ou un groupe (champ `groupe` non
 *  vide, lot 2, OG38), dans l'ordre de la table (équipes de l'église, puis comités). Seule
 *  fonction qui calcule « mes équipes » côté client. Miroir serveur : membresDeLEquipe
 *  (src/lib/taches/serveur.ts) ; miroir des règles : estDeLEquipe(equipe) dans firestore.rules.
 *  Lot AO (`backOffice`) : « louange » ne vient plus de `serviceRoles` (A4), seulement de l'organigramme
 *  (`dansEquipes`) ou d'un groupe non vide. */
export function equipesDe(profile: ProfilEquipes | null, backOffice: boolean = BACK_OFFICE): string[] {
  const ids = [...new Set(profile?.dansEquipes ?? [])];
  const parGroupe = typeof profile?.groupe === "string" && profile.groupe !== "";
  const louange = (!backOffice && Object.keys(profile?.serviceRoles ?? {}).length > 0) || parGroupe;
  if (louange && !ids.includes("louange")) ids.push("louange");
  return ids.sort((a, b) => rangEquipe(a) - rangEquipe(b));
}

/** Être d'une équipe (EQ3, EQ4) : un de ses membres, le public Louange élargi pour « louange », un
 *  admin. Miroir : estDeLEquipe(equipe) dans firestore.rules. */
export function estDeLEquipe(
  user: AuthUser | { email?: string | null } | null, profile: ProfilEquipes | null, equipe: string, backOffice: boolean = BACK_OFFICE,
): boolean {
  if (!user) return false;
  return isAdminUser(user) || equipesDe(profile, backOffice).includes(equipe);
}

/** En être référent (EQ3) : `referentDe`, recopié par le serveur ; un admin l'est de toutes. Les
 *  référents de Louange sont ceux de TEAM LOUANGE. Miroir : estReferentDe(equipe) dans firestore.rules. */
export function estReferentDe(user: AuthUser | { email?: string | null } | null, profile: ProfilEquipes | null, equipe: string): boolean {
  if (!user) return false;
  return isAdminUser(user) || (profile?.referentDe ?? []).includes(equipe);
}

/** Voir la page d'une équipe, `/equipes/<id>` ou `/back-office/equipes/<id>` (piste A, BO4, BO7) : un
 *  membre de l'équipe (estDeLEquipe), un référent ou un admin. Affichage seulement : equipes/{id}/taches
 *  et evenements/{id} gardent leurs règles. Ids valides : EQUIPES et COMITES (ORDRE_EQUIPES). */
export function peutVoirEquipe(
  user: AuthUser | { email?: string | null } | null, profile: ProfilEquipes | null, equipe: string, backOffice: boolean = BACK_OFFICE,
): boolean {
  return estDeLEquipe(user, profile, equipe, backOffice) || estReferentDe(user, profile, equipe);
}

/** Changer l'état d'une fois d'une tâche, « cocher » (EQ8, décisions 3 et 41) : les référents de son
 *  équipe et les admins, toute tâche ; un membre, celles dont il est le responsable. Une tâche « toute
 *  l'équipe » (sans responsable) ne se coche donc que par les référents et les admins. Miroir :
 *  `match …/fois/{date}` dans firestore.rules ; serveur : /api/taches/fait (tacheDeLAppelant). */
export function peutCocher(
  user: AuthUser | null,
  profile: ProfilEquipes | null,
  tache: Pick<Tache, "equipe" | "responsableUid">,
  backOffice: boolean = BACK_OFFICE,
): boolean {
  if (!user) return false;
  return estReferentDe(user, profile, tache.equipe)
    || (estDeLEquipe(user, profile, tache.equipe, backOffice) && tache.responsableUid === user.uid);
}

/** Les équipes dont on lit les tâches (EQ9) : les siennes, Louange élargi (`equipesDe`) ; toutes pour
 *  un admin. Affichage : equipes/{equipe}/taches garde sa règle (estDeLEquipe). */
export function equipesDesTaches(
  user: AuthUser | { email?: string | null } | null, profile: ProfilEquipes | null, backOffice: boolean = BACK_OFFICE,
): string[] {
  if (!user) return [];
  return isAdminUser(user) ? [...ORDRE_EQUIPES] : equipesDe(profile, backOffice);
}

/** Les équipes où l'on crée une tâche (EQ8, EQ9) : celles dont on est référent, dans l'ordre de la
 *  table ; toutes pour un admin. Créer emporte modifier, supprimer, déplacer, lier à un évènement. */
export function equipesOuCreer(user: AuthUser | { email?: string | null } | null, profile: ProfilEquipes | null): string[] {
  if (!user) return [];
  if (isAdminUser(user)) return [...ORDRE_EQUIPES];
  return [...new Set(profile?.referentDe ?? [])].sort((a, b) => rangEquipe(a) - rangEquipe(b));
}

/** Profil lu par la coordination : la case cochée (ancien mode) et l'organigramme (nouveau). */
type ProfilCoordination = { coordination?: boolean } & ProfilOrganigramme;

/** Coordination (lot 3 bis ; lot 1 du chantier « équipes et groupes », EQ24) : le
 *  droit `coordination` du profil, coché par un admin dans Personnes, + admins. Aucune
 *  équipe ne la donne. Règle la scène (programmes, ordre de
 *  passage, tout créneau), crée pour toute l'église, modifie tout évènement.
 *  Lot AO (`backOffice`, A2, D5) : plus de case — le référent Louange, le référent EDD et les membres d'Orga
 *  (`coordination`, src/lib/acces/organigramme.ts) ; ni le référent d'une sous-équipe, ni la case cochée.
 *  Miroir serveur : isCoordination() dans firestore.rules (ancien ∪ nouveau, tranche AO-C). */
export function isCoordination(
  user: { email?: string | null } | null,
  profile: ProfilCoordination | null,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (isAdminUser(user)) return true;
  return backOffice ? org.coordination(profile) : profile?.coordination === true;
}

/** Organigramme (lot 16, docs/spec-organigramme.md) : tout membre connecté le
 *  voit — c'est l'objet de la demande ; rien pour un visiteur sans compte,
 *  l'écran est nominatif. Miroir serveur : `read: if signedIn()` sur
 *  equipes/{id} dans firestore.rules. */
export function canVoirEquipes(user: AuthUser | null): boolean {
  return user !== null;
}

/** Modifier l'organigramme : les admins, plus les comptes à qui un admin a
 *  donné le droit « Équipes » (Timothée, 18/09/2026 — D4 rouverte). Le droit
 *  porte sur tout l'organigramme, d'où un booléen et non une liste. Miroir
 *  serveur : isEquipier() dans firestore.rules pour equipes/{id}, et
 *  exigerDroitEquipes (src/lib/equipes/serveur.ts) pour le rattachement, qui reste
 *  écrit par le serveur seul — `allow update` des profils ne bouge pas.
 *  Lot AO (`backOffice`, A2) : plus de case « Équipes » — vrai pour qui tient quelque chose dans
 *  l'organigramme (Orga, un référent d'équipe, un référent de sous-équipe) ; `peutModifierEquipe`,
 *  `peutPlacerSousEquipe` et `peutPlacerMembre` disent quoi. */
export function canEditerEquipes(
  user: AuthUser | null,
  profile: ({ equipes?: boolean } & ProfilOrganigramme) | null,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (!backOffice) return profile?.equipes === true;
  const t = org.tientOrganigramme(profile);
  return t.tout || t.equipes.length > 0 || t.sousEquipes.length > 0;
}

type ProfilTenir = { equipes?: boolean } & ProfilOrganigramme;

/** Tenir toute une équipe (lot AO) : ancien mode, le droit Équipes (tout l'organigramme) ; nouveau, Orga et le
 *  référent de cette équipe (le référent Louange tient Louange). Les admins dans les deux. */
export function peutModifierEquipe(
  user: AuthUser | null, profile: ProfilTenir | null, equipeId: string, backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  return isAdminUser(user) || (backOffice ? org.peutTenirEquipe(profile, equipeId) : profile?.equipes === true);
}

/** Tenir une sous-équipe de Louange (lot AO, B3, F2) : Orga, le référent Louange, ou le référent de cette
 *  sous-équipe — ajouter, retirer de la sienne, cocher « Où il sert » et « Ce qu'il joue ». */
export function peutPlacerSousEquipe(
  user: AuthUser | null, profile: ProfilTenir | null, sous: SousEquipe, backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  return isAdminUser(user) || (backOffice ? org.peutTenirSousEquipe(profile, sous) : profile?.equipes === true);
}

/** Placer ce membre (lot AO) : tenir son équipe ou, dans Louange, l'une des sous-équipes concernées (celles qu'il a,
 *  ou celle où on l'ajoute) — le référent Musiciens place un musicien, pas un choriste. */
export function peutPlacerMembre(
  user: AuthUser | null, profile: ProfilTenir | null, equipeId: string, sousEquipes: readonly string[] = [],
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  return isAdminUser(user) || (backOffice ? org.peutPlacerMembre(profile, equipeId, sousEquipes) : profile?.equipes === true);
}

/** Changer les référents d'une équipe (lot AO, B3) : Orga, le référent Louange pour Louange et ses sous-équipes,
 *  les admins — ni un référent de sous-équipe, ni celui d'une autre équipe. Ancien mode : comme tenir l'organigramme. */
export function peutChangerReferents(
  user: AuthUser | null, profile: ProfilTenir | null, equipeId: string, backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  return isAdminUser(user) || (backOffice ? org.peutChangerReferents(profile, equipeId) : profile?.equipes === true);
}

/** Tenir l'organigramme d'un groupe (lot 2, OG9, OG26) : admin, ou président / VP du groupe — leur
 *  `referentDe` porte le comité du groupe, recopié par le serveur seul. Le droit Équipes ne le donne
 *  pas (décision 44). Miroir : tientGroupe(g) dans firestore.rules ; serveur : exigerTenirGroupe. */
export function canTenirGroupe(user: AuthUser | null, profile: { referentDe?: string[] } | null, groupe: string): boolean {
  if (!user) return false;
  const def = groupeDef(groupe);
  return !!def && (isAdminUser(user) || (profile?.referentDe ?? []).includes(def.comite));
}

/** Président ou VP d'au moins un groupe (entrée Équipes du Back-Office, OG26). Par la liste des
 *  comités, jamais par le préfixe : `comite-franco` est une équipe de l'église. */
export function tientUnGroupe(user: AuthUser | null, profile: { referentDe?: string[] } | null): boolean {
  if (!user) return false;
  return isAdminUser(user) || (profile?.referentDe ?? []).some((id) => COMITES.includes(id));
}

export { audiencesNotifiables };

/** Créneau sur scène : son auteur + la coordination. Miroir : programmes/{id}/creneaux dans firestore.rules. */
export function canEditCreneau(
  user: AuthUser,
  profile: ProfilCoordination | null,
  creneau: { auteurUid: string }
): boolean {
  return creneau.auteurUid === user.uid || isCoordination(user, profile);
}

// ─── Scène : saison de réservation (lot U1, docs/spec-scene-saison.md) ───────

/** Réserver pour ces groupes : la coordination toujours ; un membre si la saison
 *  est ouverte et que chaque groupe est permis (liste vide = tous).
 *  Miroir serveur : reservable() sous programmes/{id}/creneaux, firestore.rules. */
export function canReserverPour(
  user: AuthUser | null,
  profile: ProfilCoordination | null,
  programme: { ouvert?: boolean; fermees?: boolean; quiAutorises?: string[] },
  qui: string[]
): boolean {
  if (!user) return false;
  if (isCoordination(user, profile)) return true;
  if (programme.ouvert === false) return false;
  // Fermée à la main (docs/spec-fermer-reservations.md, FR10) : miroir de reservable().
  if (programme.fermees === true) return false;
  const permis = programme.quiAutorises ?? [];
  return permis.length === 0 || qui.every((q) => permis.includes(q));
}

// ─── Évènements (lot 6, docs/spec-evenements.md) — miroir : firestore.rules ───

type EvenementDroits = { pour: string; organisateurUid: string; reunion?: boolean | null };
/** Profil lu par les droits des évènements : sections, coordination, droit d'annonces, et les
 *  équipes de l'organigramme recopiées par le serveur (lot U6, R4 : `recalculerRattachement`). */
type ProfilEvenement = {
  serviceRoles?: Record<string, unknown>; coordination?: boolean; annonces?: string[];
  dansEquipes?: string[]; referentDe?: string[];
} & ProfilOrganigramme;

/** Réunion d'équipe (lot U6, R4, Q8) : `pour` = « equipe:<id> » ; null sinon.
 *  Même motif que les règles (`equipe:[a-z0-9-]+`). */
export function equipeDuPour(pour: string): string | null {
  const m = /^equipe:([a-z0-9-]+)$/.exec(pour);
  return m ? m[1] : null;
}

/** Public qui peut être celui d'une réunion : une équipe (EQ19). */
export function publicDeReunion(pour: string): boolean {
  return equipeDuPour(pour) !== null;
}

/** Réunion : sans inscriptions, avec sujets et compte rendu. Son public est une équipe, et son
 *  champ `reunion` n'est pas `false` (retouches v18, lot E1) : absent, comme avant le lot E, tout
 *  évènement d'équipe est une réunion ; « Nouvel évènement » écrit `false`, « + Nouvelle réunion » `true`. */
export function estReunion(e: { pour: string; reunion?: boolean | null }): boolean {
  return publicDeReunion(e.pour) && e.reunion !== false;
}

/** Qui voit un évènement : « toute l'église » = tout le monde, compte ou non ;
 *  une section = ses membres connectés (clé de serviceRoles), l'organisateur,
 *  la coordination ; une réunion d'équipe = les membres de l'équipe (Louange élargi,
 *  estDeLEquipe), l'organisateur et les admins (lot U6, R4 ; EQ20). Un évènement d'équipe
 *  qui n'est pas une réunion (retouches v18, D22) : les mêmes, plus la coordination.
 *  Un visiteur sans compte ne voit que « eglise ».
 *  Lot AO (`backOffice`) : une section se voit par la catégorie qu'on voit en setlists (le lieu où l'on sert, son
 *  groupe) et non plus par `serviceRoles` — la spec ne dit rien de cette ligne, lecture à confirmer. */
export function canSeeEvenement(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  e: EvenementDroits,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (e.pour === "eglise") return true;
  if (!user) return false;
  if (e.organisateurUid === user.uid) return true;
  const equipe = equipeDuPour(e.pour);
  if (equipe) return estDeLEquipe(user, profile, equipe, backOffice) || (!estReunion(e) && isCoordination(user, profile, backOffice));
  if (isCoordination(user, profile, backOffice)) return true;
  return backOffice ? org.categoriesVisibles(profile).includes(e.pour) : e.pour in (profile?.serviceRoles ?? {});
}

/** S'inscrire (route /api/evenements/inscription, retouches v18, E6) : un évènement d'équipe, ceux
 *  qui le voient ; les autres publics, comme avant (la période, les places et
 *  « sans compte » se vérifient à part, refusInscription). */
export function canInscrireEvenement(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  e: EvenementDroits,
  backOffice: boolean = BACK_OFFICE
): boolean {
  return !publicDeReunion(e.pour) || canSeeEvenement(user, profile, e, backOffice);
}

/** Qui crée pour un public donné : une réunion ou un évènement d'équipe, ses référents et les
 *  admins (lot U6, R4 ; décisions 3 et 43) ; sinon la coordination pour tout, ou un membre dont
 *  le droit d'annonces couvre la section (le droit d'annonces devient un droit de création pour
 *  sa section, tranché le 15/09/2026). Un autre public préfixé (EQ19) ne se crée plus :
 *  miroir de la garde des règles. Lot AO (`backOffice`) : plus de droit d'annonces — le référent Louange crée
 *  pour le Culte Francophone, président et VP pour leur groupe (`sectionsCreables`). */
export function canCreateEvenement(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  pour: string,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  const equipe = equipeDuPour(pour);
  if (equipe) return estReferentDe(user, profile, equipe);
  if (pour.includes(":")) return false;
  if (isCoordination(user, profile, backOffice)) return true;
  return backOffice ? org.sectionsCreables(profile, [pour]).length > 0 : (profile?.annonces ?? []).includes(pour);
}

/** Publics pour lesquels la personne peut créer (vide = aucun bouton) : ses
 *  sections, puis les équipes dont elle est référente (lot U6, R4 ; décision 43) —
 *  toutes les équipes pour un admin. */
export function creatableEvenementPours(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  sections: readonly string[],
  backOffice: boolean = BACK_OFFICE
): string[] {
  if (!user) return [];
  const equipes = ORDRE_EQUIPES.filter((id) => estReferentDe(user, profile, id)).map((id) => `equipe:${id}`);
  if (isCoordination(user, profile, backOffice)) return ["eglise", ...sections, ...equipes];
  const siennes = backOffice ? org.sectionsCreables(profile, sections) : sections.filter((s) => (profile?.annonces ?? []).includes(s));
  return [...siennes, ...equipes];
}

/** Voir qui est inscrit (noms et invités) : tout membre connecté (Timothée,
 *  17/09/2026) ; sans compte, le nombre seulement. Miroir :
 *  `evenements/{id}/inscriptions` dans firestore.rules. */
export function canSeeInscrits(user: AuthUser | null): boolean {
  return user !== null;
}

/** Modifier, dupliquer, supprimer, fermer les inscriptions, retirer un inscrit : organisateur + coordination. */
export function canEditEvenement(
  user: AuthUser | null,
  profile: ProfilCoordination | null,
  e: EvenementDroits,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  return e.organisateurUid === user.uid || isCoordination(user, profile, backOffice);
}

// ─── Sujets d'une réunion (lot U6, R1, docs/spec-back-office.md) — miroir : ───
// estDeLaReunion, organise et match /sujets/{sid} dans firestore.rules.
// Compte rendu (R3) : estDeLaReunion colle ou retire le lien (allow update de
// evenements/{id}, champ compteRendu seul) ; lien vérifié par lienCompteRendu.

/** Personne de la réunion (EQ22) : membre de l'équipe (estDeLEquipe : `dansEquipes`, et le
 *  public Louange élargi), l'organisateur, un admin. Comme dans les règles, l'organisateur et
 *  les admins passent même pour un évènement qui n'est pas une réunion : la carte des sujets ne
 *  s'affiche que sur une réunion (estReunion). */
export function estDeLaReunion(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  e: EvenementDroits,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  if (isAdminUser(user) || e.organisateurUid === user.uid) return true;
  const equipe = equipeDuPour(e.pour);
  return equipe !== null && estDeLEquipe(user, profile, equipe, backOffice);
}

/** Ajouter un sujet : une personne de la réunion, jusqu'au début. La borne se
 *  vérifie dans le navigateur seulement : les règles ne lisent pas une heure de
 *  Paris écrite en texte (Q7, choix de confiance). */
export function peutAjouterSujet(
  user: AuthUser | null,
  profile: ProfilEvenement | null,
  e: EvenementDroits & Pick<Evenement, "type" | "date" | "heure">,
  nowIso: string,
  backOffice: boolean = BACK_OFFICE
): boolean {
  return estDeLaReunion(user, profile, e, backOffice) && !aCommence(e, nowIso);
}

/** Retirer un sujet : son auteur, l'organisateur, un admin. */
export function peutRetirerSujet(
  user: AuthUser | null,
  e: EvenementDroits,
  sujet: { auteurUid: string }
): boolean {
  if (!user) return false;
  return sujet.auteurUid === user.uid || peutOrdonnerSujets(user, e);
}

/** Ordonner les sujets et cocher « traité » : l'organisateur, un admin. */
export function peutOrdonnerSujets(user: AuthUser | null, e: EvenementDroits): boolean {
  if (!user) return false;
  return isAdminUser(user) || e.organisateurUid === user.uid;
}

/** Remplir les cases d'un planning dans l'app (lot 17, docs/spec-planning-grille.md) :
 *  les admins, et les profils dont `plannings` contient sa clé — coché par un
 *  admin, planning par planning — ou `remplitParRole` (rôle d'un groupe, lot 2, OG22 ; pour un
 *  rôle, Publier inclut Remplir). Ne donne PAS le droit de publier un trimestre
 *  (canPublishPlanning, src/lib/planning/releases.ts, qui dépend de `notify`) :
 *  deux gestes différents, deux droits (D10).
 *  Lot AO (`backOffice`) : plus de case `plannings` — `colonnesRemplies` de l'organigramme (référent Louange :
 *  le culte ; référent Régie : le culte, Sono / Sono Live / PPT ; référent EDD : l'EDD ; Orga : la Table ; un
 *  rôle de groupe) ; `colonnesModifiables` dit lesquelles. PAS le référent Musiciens (E2).
 *  Miroir serveur : plannings/{key}/dimanches dans firestore.rules (ancien ∪ nouveau, tranche AO-C). */
export function canEditPlanning(
  user: { email?: string | null } | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  key: string,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (backOffice) return org.colonnesRemplies(profile, key) !== null;
  return (profile?.plannings ?? []).includes(key) || (profile?.remplitParRole ?? []).includes(key);
}

/** Les colonnes qu'on remplit sur un planning (lot AO) : `"toutes"`, la liste de celles de la Régie, ou `null`.
 *  Ancien mode : toutes ou rien (`canEditPlanning`). Les admins : toutes. */
export function colonnesModifiables(
  user: { email?: string | null } | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  key: string,
  backOffice: boolean = BACK_OFFICE
): "toutes" | readonly string[] | null {
  if (!user) return null;
  if (isAdminUser(user)) return "toutes";
  if (backOffice) return org.colonnesRemplies(profile, key);
  return canEditPlanning(user, profile, key, false) ? "toutes" : null;
}

/** Congés et absences (SC3, docs/spec-createur-corbeille-absences.md ; Q8, Q9) : « ceux qui font les
 *  plannings », c'est-à-dire les admins et les profils dont `plannings` n'est pas vide. Ils saisissent une
 *  absence pour quelqu'un d'autre et lisent celles de tous.
 *  Lot AO (`backOffice`) : qui remplit au moins un planning par l'organigramme (`remplitUnPlanning`).
 *  Miroir serveur : faitDesPlannings() et users/{uid}/absences/{id} dans firestore.rules. */
export function faitDesPlannings(
  user: { email?: string | null } | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return backOffice ? org.remplitUnPlanning(profile) : (profile?.plannings ?? []).length > 0;
}

/** Saisir ou supprimer une absence : la personne elle-même, ou qui fait les plannings. */
export function canSaisirAbsence(
  user: { uid: string; email?: string | null } | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  uidCible: string,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user) return false;
  return user.uid === uidCible || faitDesPlannings(user, profile, backOffice);
}

/** Lire les absences de tous (la grille des plannings). */
export function canVoirAbsencesDeTous(
  user: { email?: string | null } | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  backOffice: boolean = BACK_OFFICE
): boolean {
  return faitDesPlannings(user, profile, backOffice);
}

/** Le motif d'une absence : la personne et les admins. Côté navigateur seulement, comme le reste de la
 *  confidentialité du site (les rules laissent lire l'absence entière à qui fait les plannings). */
export function canVoirMotifAbsence(
  user: { uid: string; email?: string | null } | null,
  uidCible: string
): boolean {
  if (!user) return false;
  return user.uid === uidCible || isAdminUser(user);
}

/** Petit déj (lot U3, docs/spec-petit-dej.md, Q8) : poser une ligne pour
 *  quelqu'un, réécrire ou retirer n'importe laquelle — les écrivains du planning
 *  Table et les admins, le droit qui remplit déjà la grille Table. Poser SA
 *  ligne (« Je m'inscris ») : tout connecté. Miroir serveur : petitDej/{id}
 *  dans firestore.rules. */
export function canGererPetitDej(
  user: { email?: string | null } | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  backOffice: boolean = BACK_OFFICE
): boolean {
  return canEditPlanning(user, profile, "table", backOffice);
}

/** Réécrire ou retirer une ligne : l'inscrit (`ligne.uid`) ou canGererPetitDej,
 *  tant que le dimanche n'est pas passé (Q2 : la borne du passé vaut pour tous,
 *  côté client seulement, comme le reste du filtrage du site). */
export function canEditPetitDej(
  user: AuthUser | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  ligne: { uid: string; dimanche: string },
  dimancheEnCours: string,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (!user || ligne.dimanche < dimancheEnCours) return false;
  return ligne.uid === user.uid || canGererPetitDej(user, profile, backOffice);
}

/** Lot U2 (Q10, docs/spec-planning-2027.md) : les plannings dont les dates se
 *  choisissent (`dates: "choisies"` dans grilles.ts) — les seuls où une date
 *  posée par erreur se retire ; ailleurs, on vide les cases. */
export const PLANNINGS_DATES_CHOISIES = ["interfranco", "intergroupe", "campusMatin", "campusSoir"] as const;

/** Retirer une date (supprimer son document) : qui peut remplir ce planning,
 *  sur un planning à dates choisies seulement. Lot AO (`backOffice`) : il faut pouvoir remplir TOUTES les colonnes —
 *  le retrait efface toutes les cases, le référent Régie (Sono, Sono Live, PPT) ne retire donc pas une date.
 *  Miroir serveur : `allow delete` de plannings/{key}/dimanches dans firestore.rules. */
export function canRetirerDate(
  user: { email?: string | null } | null,
  profile: ({ plannings?: string[] } & ProfilOrganigramme) | null,
  key: string,
  backOffice: boolean = BACK_OFFICE
): boolean {
  return (PLANNINGS_DATES_CHOISIES as readonly string[]).includes(key)
    && colonnesModifiables(user, profile, key, backOffice) === "toutes";
}

/** Harmonie (lot 9, docs/spec-harmonie.md) : le catalogue et les « Idées
 *  d'harmonie » sont pour les **pianistes et les guitaristes**, plus les
 *  admins. L'instrument n'est pas dans le profil : il est écrit dans les
 *  colonnes Piano / Guitare des plannings, d'où les services passés en
 *  argument (`findMyServices` sur le nom de planning du compte). Chacun voit
 *  d'abord son instrument ; qui tient les deux voit les deux.
 *  Filtrage côté navigateur, comme le reste du site (choix de confiance
 *  assumé, cf. CLAUDE.md) — aucune règle Firestore : les fiches sont des
 *  fichiers publics. */
/** Cours d'Harmonie (C2, C4) : chacun coche ses chapitres ; seuls les admins
 *  voient la progression des autres. Miroir serveur : firestore.rules,
 *  `coursProgres/{uid}` (lecture : soi ou admin ; écriture : soi). */
export function canSeeTeamCoursProgres(user: { email?: string | null } | null): boolean {
  return isAdminUser(user);
}

/** Lot AO (`backOffice`, A1) : l'instrument vient de l'organigramme — Musiciens avec piano ou guitare dans
 *  « Ce qu'il joue » (`joue`) — et non plus des colonnes du planning ; `services` est alors ignoré. */
export function canUseHarmonie(
  user: { email?: string | null } | null,
  services: { role: string }[],
  profile: ProfilOrganigramme | null = null,
  backOffice: boolean = BACK_OFFICE,
): { piano: boolean; guitare: boolean } {
  if (isAdminUser(user)) return { piano: true, guitare: true };
  if (backOffice) return org.harmonie(profile);
  const roles = new Set(services.map((s) => s.role));
  return { piano: roles.has("Piano"), guitare: roles.has("Guitare") };
}

const LEVEL_RANK: Record<AccessLevel, number> = { view: 0, create: 1, edit: 2 };

const isGroupeOrEdd = (category: string): boolean =>
  (GROUPES as readonly string[]).includes(category) ||
  (EDD_CLASSES as readonly string[]).includes(category);

/** Niveau d'accès d'une personne à une catégorie, dérivé de ses rôles dans cette
 *  catégorie. Échelon view < create < edit :
 *   - musicien / présidence → edit ;
 *   - choriste → create ;
 *   - sans rôle exécutant : groupe & EDD = membre (create) ; culte = view
 *     (régie, observateur — le lieu donne la visibilité). */
export function categoryLevel(category: string, roles: ServiceRole[]): AccessLevel {
  if (roles.includes("musicien") || roles.includes("presidence")) return "edit";
  if (roles.includes("chanteur")) return "create";
  return isGroupeOrEdd(category) ? "create" : "view";
}

/** Catégories visibles (la personne y sert, tout niveau) : la régie voit ses cultes en lecture seule.
 *  Lot AO (`backOffice`, C2, C3) : ce qui vient de l'organigramme — les lieux où un membre de Louange sert, son
 *  groupe, l'EDD, plus les lieux de la Régie en lecture ; la lecture d'une date où l'on sert (F1) est à part
 *  (`canSeeSetlist`). Sans équipe : aucune catégorie de lieu. */
export function visibleCategories(profile: UserProfile, backOffice: boolean = BACK_OFFICE): string[] {
  return backOffice ? org.categoriesVisibles(profile) : Object.keys(profile.serviceRoles);
}

/** Catégories où la personne peut CRÉER une setlist (niveau ≥ create — la régie en est exclue).
 *  Lot AO (`backOffice`) : les lieux de Louange, le groupe, les trois classes de l'EDD. */
export function creatableCategories(profile: UserProfile, backOffice: boolean = BACK_OFFICE): string[] {
  if (backOffice) return org.categoriesCreables(profile);
  return Object.keys(profile.serviceRoles).filter(
    (c) => LEVEL_RANK[categoryLevel(c, profile.serviceRoles[c])] >= LEVEL_RANK.create
  );
}

/** Peut-on créer au moins une setlist (bouton « Créer ») ? Admins toujours. */
export function canCreateSetlist(
  user: { email?: string | null } | null,
  profile: UserProfile | null,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (isAdminUser(user)) return true;
  return !!profile && creatableCategories(profile, backOffice).length > 0;
}

/** Peut-on dupliquer cette setlist ? Qui la voit (SC1.3, docs/spec-createur-corbeille-absences.md) :
 *  la copie est privée, au duplicateur, dans la même catégorie (Q4) — c'est le moyen d'y mettre
 *  ses notes quand on ne peut pas la modifier. */
export function canDuplicateSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist,
  backOffice: boolean = BACK_OFFICE
): boolean {
  // Une setlist de fête naît d'un passage (docs/spec-chants-fetes.md, CF15) : pas de copie, admin compris.
  if (setlist.fete) return false;
  return canSeeSetlist(user, profile, setlist, undefined, backOffice);
}

/** Une date où la personne sert, tirée du planning (`datesServies`, src/lib/planning/names.ts). `moment` : Campus. */
export type DateServie = { date: string; categorie: string; moment?: "matin" | "soir" };

/** Voir une setlist. Lot AO (`backOffice`, F1) : en plus de la catégorie visible, la setlist de la date et de la
 *  catégorie où la personne est inscrite au planning (`datesServies`) — lecture seule, cette setlist seulement
 *  (ni la semaine suivante, ni une autre catégorie), sans rien ouvrir d'autre : modifier, supprimer, créer
 *  restent aux droits ci-dessous. Sans `datesServies`, pas de F1. */
export function canSeeSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist,
  datesServies?: readonly DateServie[],
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (setlist.ownerId === user.uid) return true;
  if (setlist.editeurs?.includes(user.uid)) return true;
  // Une setlist de fête se voit de tout connecté (CF12, décision 32) ; elle n'est jamais privée.
  if (setlist.fete) return true;
  if (setlist.isPrivate) return false;
  if (isAdminUser(user)) return true;
  if (profile && visibleCategories(profile, backOffice).includes(setlist.category)) return true;
  return backOffice && !!datesServies?.some((d) =>
    d.date === setlist.date && d.categorie === setlist.category && (!d.moment || !setlist.moment || d.moment === setlist.moment));
}

/** Lien de la présentation (PPT) : qui peut modifier la setlist, plus la régie
 *  inscrite au planning ce jour-là. `regie` = régie de service (serveur, qui lit
 *  le planning) ou, côté client, simple rôle régie dans la catégorie pour
 *  afficher le bouton — le serveur tranche. Miroir : /api/setlist/presentation
 *  (écriture Admin, firestore.rules inchangé). */
export function canSetPresentationLink(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist,
  regie: boolean,
  backOffice: boolean = BACK_OFFICE
): boolean {
  return canEditSetlist(user, profile, setlist, backOffice) || (!setlist.isPrivate && regie);
}

/** Version perso d'un chant dans une setlist (docs/spec-version-perso.md) :
 *  qui voit la setlist peut avoir la sienne. Miroir serveur dans
 *  firestore.rules (setlists/{id}/versions/{uid} : écrit par son propriétaire). */
export const canHaveSetlistVersion = canSeeSetlist;

export function canEditSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist,
  backOffice: boolean = BACK_OFFICE
): boolean {
  return canDeleteSetlist(user, profile, setlist, backOffice) || !!setlist.editeurs?.includes(user.uid);
}

/** Suppression : le créateur seul (SC1, docs/spec-createur-corbeille-absences.md), plus les admins sur
 *  une setlist non privée (Q1) et la coordination sur une setlist de fête (Q3). Le niveau « edit » de
 *  la catégorie (musiciens, présidence) n'y donne plus droit. L'équipe d'une setlist (`editeurs`) la
 *  modifie mais ne la supprime pas ni ne change sa visibilité (Q2). Miroir serveur :
 *  `canDeleteSetlistDoc` dans firestore.rules (`allow delete`). */
export function canDeleteSetlist(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist,
  backOffice: boolean = BACK_OFFICE
): boolean {
  if (setlist.ownerId === user.uid) return true;
  // Setlist de fête : la coordination la supprime (et la modifie, via canEditSetlist) ; ownerId est
  // `null` et personne ne sert dans la catégorie Noël ou Pâques. Miroir : canDeleteSetlistDoc.
  if (setlist.fete && isCoordination(user, profile, backOffice)) return true;
  if (setlist.isPrivate) return false;
  return isAdminUser(user);
}

/** Changer la catégorie d'une setlist : qui peut la supprimer (propriétaire, admin),
 *  pas l'équipe — sinon un membre d'équipe se donnerait, par la nouvelle catégorie, le droit de la
 *  supprimer. Miroir : la garde sur `category` de `allow update` (firestore.rules). */
export const canChangeSetlistCategory = canDeleteSetlist;

/** Choisir l'équipe de la setlist (`editeurs`, `rolesPartage`) : le propriétaire, ou un admin sur
 *  une setlist qu'il peut modifier. Miroir : `allow update` de setlists/{id}. */
export function canSetSetlistTeam(
  user: AuthUser,
  profile: UserProfile | null,
  setlist: FSSetlist,
  backOffice: boolean = BACK_OFFICE
): boolean {
  // Une setlist de fête a ses `editeurs` écrits par le serveur seul (CF18), même pour un admin.
  if (setlist.fete) return false;
  return canEditSetlist(user, profile, setlist, backOffice) && (setlist.ownerId === user.uid || isAdminUser(user));
}

/** Lien de présentation d'une setlist de fête (CF27, décision 45, Q7) : la régie hors planning =
 *  les membres de TEAM RÉGIE (`dansEquipes` ∋ `regie`). Sert de drapeau `regie` à
 *  `canSetPresentationLink` (client pour le bouton, /api/setlist/presentation pour l'écriture). */
export function estRegieDeFete(
  profile: { dansEquipes?: string[] } | null,
  setlist: Pick<FSSetlist, "fete">
): boolean {
  return !!setlist.fete && !!profile?.dansEquipes?.includes("regie");
}

// ─── Back-Office (lot U6, docs/spec-back-office.md) ──────────────────────────
// Affichage seulement : le sélecteur et le menu ne protègent aucune donnée,
// chaque sous-partie garde sa règle dans firestore.rules (signalements, profils,
// plannings…). Aucune règle miroir ici.

type ProfilResponsable = {
  serviceRoles?: Record<string, unknown>; coordination?: boolean; plannings?: string[];
  notify?: string[]; annonces?: string[]; equipes?: boolean; referentDe?: string[]; dansEquipes?: string[];
  groupe?: string | null; remplitParRole?: string[]; publieParRole?: string[]; notifieParRole?: string[];
} & ProfilOrganigramme;
const nonVide = (l: string[] | undefined) => (l?.length ?? 0) > 0;

/** Responsable (Q1) : admin, ou au moins un droit donné par un admin ou par l'organigramme —
 *  coordination (EQ18), `plannings`, `notify`, `annonces`,
 *  droit Équipes, référent d'une équipe, un droit venu d'un rôle de groupe (lot 2, OG26). Être membre d'une équipe ou du public Louange (un rôle
 *  de service) ne fait pas un responsable (question 2). Lot AO (`backOffice`) : plus aucune case — la
 *  coordination (Orga, référents Louange et EDD), un référent d'équipe ou de sous-équipe, un droit venu
 *  d'un rôle de groupe. */
export function estResponsable(user: AuthUser | null, profile: ProfilResponsable | null, backOffice: boolean = BACK_OFFICE): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (!profile) return false;
  if (backOffice) {
    return org.coordination(profile) || nonVide(profile.referentDe) || nonVide(profile.referentSous)
      || nonVide(profile.remplitParRole) || nonVide(profile.publieParRole) || nonVide(profile.notifieParRole);
  }
  return profile.coordination === true || nonVide(profile.plannings) || nonVide(profile.notify)
    || nonVide(profile.annonces) || profile.equipes === true || nonVide(profile.referentDe)
    || nonVide(profile.remplitParRole) || nonVide(profile.publieParRole) || nonVide(profile.notifieParRole);
}

/** Statistiques des chants (lot U7, docs/spec-statistiques.md, Q2) : admins seulement (T1).
 *  Sans règle Firestore : rien de nouveau n'est lu ni écrit (précédent `canUseHarmonie`). */
export function canVoirStatistiques(user: { email?: string | null } | null): boolean {
  return isAdminUser(user);
}

/** Entrées et widgets qui arrivent avec leur lot (Q17). Chaque lot retire la sienne de ces
 *  listes ; le rang est déjà gardé. U7 (Statistiques, Chants les plus joués) et U8 (l'entrée
 *  Calendrier en C3, son widget en C8) : arrivés. */
const ENTREES_A_VENIR: readonly Entree[] = [];
const WIDGETS_A_VENIR: readonly WidgetId[] = [];

/** Les entrées du Back-Office d'une personne, dans l'ordre du menu (piste A, BO1 et BO4,
 *  docs/spec-back-office-piste-a.md) : À faire et Calendrier pour tout responsable, puis Planning,
 *  Équipes et Messages selon les droits. Qui n'est pas responsable n'a aucune entrée, même membre
 *  d'une équipe (BO4) ; rien sans compte. Tâches, Réunions, Évènements et Statistiques ne sont plus des
 *  entrées : leurs pages gardent leur adresse (`droitsDesPages` dit qui les ouvre). */
export function entreesBackOffice(user: AuthUser | null, profile: ProfilResponsable | null, backOffice: boolean = BACK_OFFICE): Entree[] {
  if (!user) return [];
  if (!estResponsable(user, profile, backOffice)) return [];
  const admin = isAdminUser(user);
  const visible: Record<Entree, boolean> = {
    afaire: true,
    calendrier: true,
    planning: admin || (!backOffice && nonVide(profile?.plannings)) || planningsDuBackOffice(user, profile, backOffice).length > 0,
    equipes: canEditerEquipes(user, profile, backOffice) || tientUnGroupe(user, profile),
    // Le Back-Office n'existe qu'interrupteur ouvert (OG27) : les rôles comptent ici, sans dépendre de
    // la variable du processus (un test pur ne la voit pas).
    // Ancien mode : `notify` ∪ rôles de groupe (les rôles comptent ici sans dépendre de la variable du processus).
    messages: admin || (backOffice ? audiencesNotifiables(profile, true).length > 0 : nonVide(profile?.notify) || nonVide(profile?.notifieParRole)),
  };
  return ENTREES.filter((e) => visible[e] && !ENTREES_A_VENIR.includes(e));
}

/** Les pages du Back-Office qui ne sont plus des entrées du menu (BO1) mais gardent leur adresse
 *  (`/back-office/taches`, `/evenements`, `/reunions`) : qui les ouvre, d'après les mêmes droits que
 *  les anciennes entrées. Tout faux pour qui n'est pas responsable (BO4). Affichage seulement. */
export function droitsDesPages(
  user: AuthUser | null,
  profile: ProfilResponsable | null,
  backOffice: boolean = BACK_OFFICE
): { taches: boolean; evenements: boolean; reunions: boolean } {
  if (!user || !estResponsable(user, profile, backOffice)) return { taches: false, evenements: false, reunions: false };
  const admin = isAdminUser(user);
  const equipes = equipesDe(profile, backOffice).length > 0;
  return {
    taches: admin || equipes,
    // Agencement v18 (B15) : Évènements = ceux qu'on gère ou crée (un référent crée pour son
    // équipe, décision 43) ; Réunions = ses équipes (Louange élargi). Affichage seulement :
    // evenements/{id} garde ses règles.
    evenements: admin || isCoordination(user, profile, backOffice) || (!backOffice && nonVide(profile?.annonces)) || nonVide(profile?.referentDe),
    reunions: admin || equipes || nonVide(profile?.referentDe),
  };
}

/** Les onglets du planning (`/planning/<onglet>`), dans leur ordre. */
export const ONGLETS_PLANNING = ["culte", "table", "groupes", "edd", "campus", "intergroupe", "interfranco"] as const;
export type OngletPlanning = (typeof ONGLETS_PLANNING)[number];

/** L'onglet qui porte une grille (clé de `GRILLES` ou de `PUBLISHABLE_PLANNINGS`). */
export function ongletDeLaGrille(key: string): OngletPlanning | null {
  if (key === "paix" || key === "bonte" || key.startsWith("fidelite")) return "groupes";
  if (key.startsWith("edd")) return "edd";
  if (key.startsWith("campus")) return "campus";
  return (ONGLETS_PLANNING as readonly string[]).includes(key) ? (key as OngletPlanning) : null;
}

/** Les plannings du Back-Office (lot U6, B2, table Q2) : ceux qu'on remplit (`plannings`,
 *  `remplitParRole`), publie (`canPublishPlanning`) ou dont on prévient des changements
 *  (`peutPrevenir` : un rôle « Notifier » seul y voit la grille en lecture, lot 2, OG26), dans
 *  l'ordre des onglets ; tous pour un admin. */
export function planningsDuBackOffice(
  user: { email?: string | null } | null,
  profile: ({ plannings?: string[]; notify?: string[]; remplitParRole?: string[]; publieParRole?: string[]; notifieParRole?: string[] } & ProfilOrganigramme) | null,
  backOffice: boolean = BACK_OFFICE
): OngletPlanning[] {
  if (!user) return [];
  if (isAdminUser(user)) return [...ONGLETS_PLANNING];
  if (backOffice) {
    // Lot AO : les grilles remplies par l'organigramme ou un rôle de groupe, plus les publications ou prévenances.
    const publiees = PUBLISHABLE_PLANNINGS.filter((p) => droitsDePrevenir(p, false, profile, true)).map((p) => p.key);
    const remplies = org.TOUS_LES_PLANNINGS.filter((k) => org.colonnesRemplies(profile, k) !== null);
    const siens = new Set([...remplies, ...(profile?.remplitParRole ?? []), ...(profile?.publieParRole ?? []), ...publiees].map(ongletDeLaGrille));
    return ONGLETS_PLANNING.filter((o) => siens.has(o));
  }
  const publies = PUBLISHABLE_PLANNINGS.filter((p) =>
    peutPrevenir(p, false, profile?.notify ?? [], profile?.publieParRole ?? [], profile?.notifieParRole ?? [])).map((p) => p.key);
  const siens = new Set([...(profile?.plannings ?? []), ...(profile?.remplitParRole ?? []), ...publies].map(ongletDeLaGrille));
  return ONGLETS_PLANNING.filter((o) => siens.has(o));
}

/** Les widgets qu'une personne peut ajouter à son tableau de bord (table des widgets), dans
 *  l'ordre du catalogue. Vide pour qui n'est pas responsable (il n'a pas de tableau de bord). */
export function widgetsPermis(user: AuthUser | null, profile: UserProfile | null, backOffice: boolean = BACK_OFFICE): WidgetId[] {
  if (!estResponsable(user, profile, backOffice)) return [];
  const entrees = entreesBackOffice(user, profile, backOffice);
  const pages = droitsDesPages(user, profile, backOffice);
  const admin = isAdminUser(user);
  const permis: Record<WidgetId, boolean> = {
    dimanche: true,
    calendrier: true,
    afaire: pages.taches,
    setlists: canCreateSetlist(user, profile, backOffice),
    planning: entrees.includes("planning"),
    // Depuis TB2 les réunions ont leur widget et sortent d'Évènements : seule l'entrée Évènements le permet (TB2-corrections).
    evenements: pages.evenements,
    reunions: pages.reunions,
    chants: canVoirStatistiques(user),
    petitdej: true,
    scene: true,
    comptes: admin,
    raccourcis: true,
  };
  return WIDGETS.filter((w) => permis[w] && !WIDGETS_A_VENIR.includes(w));
}

/** Sous-parties de Back-Office › Évènements (lot U6, B3, table Q2) : Évènements (ceux qu'on
 *  gère ou crée : admin, coordination, droit d'annonces, référent d'une équipe, décision 43) ·
 *  Scène (coordination, U1). Les réunions ont leur entrée depuis l'agencement v18 (B15).
 *  Affichage seulement. */
export type SousPartieEvenements = "evenements" | "scene";
export function sousPartiesEvenements(
  user: AuthUser | null,
  profile: ProfilResponsable | null,
  backOffice: boolean = BACK_OFFICE
): SousPartieEvenements[] {
  if (!user) return [];
  const admin = isAdminUser(user);
  const coordination = isCoordination(user, profile, backOffice);
  const parties: SousPartieEvenements[] = [];
  if (admin || coordination || (!backOffice && nonVide(profile?.annonces)) || nonVide(profile?.referentDe)) parties.push("evenements");
  if (coordination) parties.push("scene");
  return parties;
}
