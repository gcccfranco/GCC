// Données des widgets du tableau de bord (lot U6, B4, docs/spec-back-office.md § Widgets).
// Module pur : les widgets (src/components/backOffice/widgets/) lisent la base, puis
// passent ici ce qu'ils ont lu. Dates ISO « AAAA-MM-JJ », comparées comme du texte.
import {
  canCreateSetlist, canSeeEvenement, creatableCategories, droitsDesPages, entreesBackOffice, equipesDesTaches, estDeLaReunion, estReunion, isAdminUser,
  visibleCategories,
} from "@/lib/access";
import { COLONNES_REGIE, PLANNINGS_DU_CULTE, PLANNINGS_EDD } from "@/lib/acces/organigramme";
import { borneInscription, byDate, isExpired, isInfo, isPast, modeInscriptions, refusInscription } from "@/lib/evenements/agenda";
import type { EntreeSheet } from "@/lib/evenements/sheet";
import type { FSSetlist } from "@/lib/firebase/setlists";
import { casesVides, colonnesVides } from "@/lib/planning/casesVides";
import { absenceLe } from "@/lib/planning/choisir";
import {
  CLES_EDD, GRILLES, GRILLES_EDD, GRILLE_BONTE, GRILLE_CAMPUS_MATIN, GRILLE_CAMPUS_SOIR, GRILLE_CULTE, GRILLE_FIDELITE,
  GRILLE_INTERFRANCO, GRILLE_INTERGROUPE, GRILLE_PAIX, GRILLE_TABLE, grilleDe, lignesDeLAnnee, type DefinitionGrille,
} from "@/lib/planning/grilles";
import { normalizeName, splitNames, type SetlistSeance } from "@/lib/planning/names";
import { PUBLISHABLE_PLANNINGS, canPublishPlanning } from "@/lib/planning/releases";
import { getAnnee } from "@/lib/planning/utils";
import { todayIso } from "@/lib/scene/dimanches";
import { addDays, resteAFaire, type Ligne } from "@/lib/taches/echeances";
import type { Absence } from "@/types/absence";
import type { Reglages } from "@/types/backOffice";
import type { SousEquipe } from "@/types/equipe";
import type { Evenement } from "@/types/evenement";
import type { LignePetitDej } from "@/types/petitDej";
import type { Creneau } from "@/types/programme";
import type { UserProfile } from "@/types/user";

type AuthUser = { uid: string; email?: string | null };

/** Les `n` dimanches à partir du dimanche courant (aujourd'hui s'il est dimanche). */
export function prochainsDimanches(today: string, n: number): string[] {
  const [y, m, d] = today.split("-").map(Number);
  const premier = addDays(today, (7 - new Date(Date.UTC(y, m - 1, d)).getUTCDay()) % 7);
  return Array.from({ length: n }, (_, i) => addDays(premier, 7 * i));
}

// ─── Services : catégories de setlist et leurs grilles ────────────────────────

/** Les grilles d'un service (catégorie de setlist), dans l'ordre des réglages. */
export const GRILLES_DU_SERVICE: Record<string, DefinitionGrille[]> = {
  "Culte Francophone": [GRILLE_CULTE],
  Campus: [GRILLE_CAMPUS_MATIN, GRILLE_CAMPUS_SOIR],
  Intergroupe: [GRILLE_INTERGROUPE],
  Interfranco: [GRILLE_INTERFRANCO],
  "Groupe Paix": [GRILLE_PAIX],
  // Lot F (D24) : un seul planning, ses musiciens compris.
  "Groupe Fidélité": [GRILLE_FIDELITE],
  "Groupe Bonté": [GRILLE_BONTE],
  ...Object.fromEntries(Object.keys(CLES_EDD).map((classe, i) => [classe, [GRILLES_EDD[i]]])),
};
export const SERVICES = Object.keys(GRILLES_DU_SERVICE);
const CULTE = "Culte Francophone";

/** Moment de séance d'une grille du Campus, pour l'appariement avec une setlist. */
const momentDe = (def: DefinitionGrille): "matin" | "soir" | undefined =>
  def.key === GRILLE_CAMPUS_MATIN.key ? "matin" : def.key === GRILLE_CAMPUS_SOIR.key ? "soir" : undefined;

/** La ligne d'une grille à une date (`lignesDeLAnnee` : dès 2027, un dimanche vide en a une). */
const ligneA = (def: DefinitionGrille, rows: string[][], date: string) =>
  lignesDeLAnnee(def, getAnnee(date), rows).find((r) => r[0] === date);

// ─── 1. Ce dimanche ──────────────────────────────────────────────────────────

/** Réglage « services » (défaut : ceux où l'on sert, sinon le Culte Franco), dans l'ordre de la table. */
export function servicesDuDimanche(r: Reglages, _user: AuthUser | null, profile: UserProfile | null): string[] {
  if (r.services) return SERVICES.filter((s) => r.services!.includes(s));
  // Lot AO (AO-F) : `visibleCategories` = les clés de `serviceRoles` (interrupteur coupé) ou ce que l'organigramme ouvre.
  const mesCategories = profile ? visibleCategories(profile) : [];
  const siens = SERVICES.filter((s) => mesCategories.includes(s));
  return siens.length ? siens : [CULTE];
}

export type LigneDuDimanche = { cle: string; i18n: string; valeur: string };
export type ServiceDuDimanche = {
  categorie: string; libelle: string; lignes: LigneDuDimanche[]; vides: number; setlist: boolean; presentation: boolean;
};
export type SetlistDuDimanche = Pick<FSSetlist, "category" | "date"> &
  Partial<Pick<FSSetlist, "moment" | "isDraft" | "isPrivate" | "presentationUrl" | "leader">>;

/**
 * Un bloc par grille des services qui a une ligne ce dimanche : ses cases (une optionnelle
 * vide est omise, une case vide vaut ""), le nombre de cases à remplir, la setlist publiée
 * (ni brouillon ni privée ; au Campus, du même moment) et sa présentation.
 */
export function ceDimanche(
  rows: Record<string, string[][]>, setlists: SetlistDuDimanche[], services: string[], dimanche: string,
): ServiceDuDimanche[] {
  return services.flatMap((categorie) => (GRILLES_DU_SERVICE[categorie] ?? []).flatMap((def) => {
    const row = ligneA(def, rows[def.key] ?? [], dimanche);
    if (!row) return [];
    const moment = momentDe(def);
    const setlist = setlists.find((s) => s.category === categorie && s.date === dimanche && !s.isDraft && !s.isPrivate
      && (!moment || !s.moment || s.moment === moment));
    return [{
      categorie,
      libelle: def.label,
      lignes: def.colonnes
        .filter((c) => !c.lectureSeule && (!c.optionnelle || (row[c.index] ?? "").trim()))
        .map((c) => ({ cle: c.cle, i18n: c.i18n, valeur: (row[c.index] ?? "").trim() })),
      vides: colonnesVides(def, row).length,
      setlist: !!setlist,
      presentation: !!setlist?.presentationUrl,
    }];
  }));
}

// ─── 4. Cases vides du planning ──────────────────────────────────────────────

/** Réglage « plannings » : ceux qu'on remplit (sinon ceux qu'on publie) ; le Culte pour un admin. */
export function planningsCasesVides(r: Reglages, user: AuthUser | null, profile: UserProfile | null): string[] {
  const admin = isAdminUser(user);
  // Lot 2 (OG22, OG23) : aussi ce qu'on remplit ou publie par un rôle de groupe.
  const remplis = [...new Set([...(profile?.plannings ?? []), ...(profile?.remplitParRole ?? [])])].filter((k) => GRILLES.some((g) => g.key === k));
  const publies = PUBLISHABLE_PLANNINGS.filter((p) => canPublishPlanning(p, admin, profile?.notify ?? [], profile?.publieParRole ?? [])).map((p) => p.key);
  const permis = admin ? GRILLES.map((g) => g.key) : [...new Set([...remplis, ...publies])];
  if (r.plannings) return permis.filter((k) => r.plannings!.includes(k));
  if (admin) return [GRILLE_CULTE.key];
  return remplis.length ? remplis : publies;
}

// ─── 5. Setlists à préparer ──────────────────────────────────────────────────

/** Réglage « services » : ceux où l'on crée des setlists (défaut : les siens ; le Culte pour un admin qui n'en a pas). */
export function servicesSetlists(r: Reglages, user: AuthUser | null, profile: UserProfile | null): string[] {
  const admin = isAdminUser(user);
  const siens = profile ? SERVICES.filter((s) => creatableCategories(profile).includes(s)) : [];
  const permis = admin ? SERVICES : siens;
  if (r.services) return permis.filter((s) => r.services!.includes(s));
  return siens.length ? siens : admin ? [CULTE] : [];
}

/** Les séances des services d'après leurs grilles (`prochainsServicesSansSetlist` les filtre) :
 *  une par ligne, présidence en tête ; `annees` ajoute les dimanches calculés dès 2027. */
export function seancesDesServices(rows: Record<string, string[][]>, services: string[], annees: number[] = []): SetlistSeance[] {
  return services.flatMap((category) => (GRILLES_DU_SERVICE[category] ?? [])
    .flatMap((def) => {
      const lues = rows[def.key] ?? [];
      const toutes = [...new Set([...lues.map((r) => getAnnee(r[0])), ...annees])].sort();
      const moment = momentDe(def);
      return toutes.flatMap((a) => lignesDeLAnnee(def, a, lues)).map((r) => ({
        category, date: r[0], leader: splitNames(r[1] ?? "")[0] ?? "", label: r[0], ...(moment ? { moment } : {}),
      }));
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── 2. À faire ──────────────────────────────────────────────────────────────

/** Réglage « équipes » (EQ15) : les siennes, Louange élargi (toutes pour un admin), dans l'ordre de
 *  la table. Une équipe sans tâche n'affiche rien : rien à masquer ici (EQ9). */
export function equipesAFaire(r: Reglages, user: AuthUser | null, profile: UserProfile | null): string[] {
  const siennes = equipesDesTaches(user, profile);
  return r.equipes ? siennes.filter((e) => r.equipes!.includes(e)) : siennes;
}

/** Ce qui reste à faire jusqu'à J+7, en retard d'abord ; `max` lignes, le retard compté en entier. */
export function aFaireDuTableau(lignes: Ligne[], today: string, max = 5): { enRetard: number; lignes: Ligne[] } {
  const horizon = addDays(today, 7);
  const aFaire = lignes.filter((l) => resteAFaire(l) && l.date <= horizon).sort((a, b) => a.date.localeCompare(b.date));
  return { enRetard: aFaire.filter((l) => l.date < today).length, lignes: aFaire.slice(0, max) };
}

// ─── 6. Petit déj ────────────────────────────────────────────────────────────

/** Par dimanche, les lignes inscrites (« » = libre). */
export function petitDejAVenir(lignes: LignePetitDej[], dimanches: string[]): { date: string; noms: string }[] {
  return dimanches.map((date) => ({ date, noms: lignes.filter((l) => l.dimanche === date).map((l) => l.nom).join(", ") }));
}

// ─── 3. Prochains évènements ─────────────────────────────────────────────────

/** Ceux qu'on voit, datés, pas encore finis ni expirés, hors réunions ; section choisie ; 3 par défaut. */
export function evenementsAVenir(
  evenements: Evenement[], user: AuthUser | null, profile: UserProfile | null, today: string, r: Reglages,
): Evenement[] {
  return evenements
    .filter((e) => canSeeEvenement(user, profile, e) && !estReunion(e) && !isInfo(e) && !isPast(e, today)
      && !isExpired(e, today) && (!r.section || e.pour === r.section))
    .sort(byDate)
    .slice(0, r.nombre ?? 3);
}

/** Une ligne du widget 3 : un évènement de l'app, ou une entrée du Sheet des évènements. */
export type ProchainEvenement =
  | { du: "app"; date: string; heure: string; evenement: Evenement }
  | { du: "sheet"; date: string; heure: string; entree: EntreeSheet };

/**
 * Le widget 3 avec le Sheet (lot U8, C8) : les entrées du Sheet à venir (toute l'église,
 * donc seulement sans section choisie) mêlées aux évènements de l'app (`evenementsAVenir`,
 * déjà filtrés, 10 au plus), par date puis heure, 3 / 5 / 10. Après le 31/12/2026 le
 * lecteur ne lit plus rien (U9) : seuls restent ceux de l'app.
 */
export function avecLeSheet(app: Evenement[], sheet: EntreeSheet[], today: string, r: Reglages): ProchainEvenement[] {
  const lignes: ProchainEvenement[] = [
    ...app.map((evenement) => ({ du: "app" as const, date: evenement.date, heure: evenement.heure, evenement })),
    ...(r.section ? [] : sheet.filter((s) => s.date >= today).map((entree) => ({ du: "sheet" as const, date: entree.date, heure: entree.heure, entree }))),
  ];
  return lignes
    .sort((a, b) => a.date.localeCompare(b.date) || (a.heure || "99").localeCompare(b.heure || "99"))
    .slice(0, r.nombre ?? 3);
}

export type EtatInscriptions =
  | { cas: "fermees" } | { cas: "externe" } | { cas: "places"; inscrits: number; max: number } | { cas: "sansLimite"; inscrits: number };

/** Ce que la ligne dit des inscriptions, d'après la règle des inscriptions (`refusInscription`). */
export function etatInscriptions(e: Evenement, nowIso: string): EtatInscriptions {
  const refus = refusInscription(e, 0, nowIso);
  if (refus === "externe") return { cas: "externe" };
  if (refus === "fermee" || refus === "terminee" || refus === "commencee") return { cas: "fermees" };
  return e.placesMax !== null ? { cas: "places", inscrits: e.inscrits, max: e.placesMax } : { cas: "sansLimite", inscrits: e.inscrits };
}

// ─── 8. Scène ────────────────────────────────────────────────────────────────

/** Les `n` prochains créneaux, par dimanche puis heure. */
export function creneauxAVenir(creneaux: Creneau[], today: string, n: number): Creneau[] {
  return creneaux
    .filter((c) => c.dimanche >= today)
    .sort((a, b) => (a.dimanche + a.debut).localeCompare(b.dimanche + b.debut))
    .slice(0, n);
}

// ─── 9. Comptes ──────────────────────────────────────────────────────────────

/** Noms du planning qu'aucun profil ne porte (casse, accents et ponctuation ignorés). */
export function nomsSansCompte(noms: string[], profiles: { planningName: string }[]): string[] {
  const relies = new Set(profiles.map((p) => normalizeName(p.planningName ?? "")).filter(Boolean));
  return noms.filter((n) => !relies.has(normalizeName(n)));
}

/** Comptes créés ces `jours` derniers jours, les plus récents d'abord. */
export function nouveauxComptes<P extends { createdAt?: Date }>(profiles: P[], today: string, jours = 7): P[] {
  const depuis = addDays(today, -jours);
  return profiles
    .filter((p) => p.createdAt && todayIso(p.createdAt) >= depuis)
    .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
}

// ─── 10. Raccourcis ──────────────────────────────────────────────────────────

export const RACCOURCIS = ["tache", "evenement", "notifier", "setlist"] as const;
export type Raccourci = (typeof RACCOURCIS)[number];

/** Adresses de la spec (Q4) ; « Setlist » ouvre « Pour quel service ? » (U5 bis). */
const HREF_RACCOURCI: Record<Raccourci, string> = {
  tache: "/back-office/taches",
  evenement: "/back-office/evenements/nouveau",
  notifier: "/back-office/messages/notifier",
  setlist: "/setlists/new",
};

/** Les raccourcis permis (réglage : ceux choisis parmi eux). */
export function raccourcisPermis(user: AuthUser | null, profile: UserProfile | null, r: Reglages): { id: Raccourci; href: string }[] {
  const entrees = entreesBackOffice(user, profile);
  const pages = droitsDesPages(user, profile);
  const permis: Record<Raccourci, boolean> = {
    tache: pages.taches,
    evenement: pages.evenements,
    notifier: entrees.includes("messages"),
    setlist: canCreateSetlist(user, profile),
  };
  return RACCOURCIS
    .filter((id) => permis[id] && (!r.raccourcis || r.raccourcis.includes(id)))
    .map((id) => ({ id, href: HREF_RACCOURCI[id] }));
}

// ─── Lot TB2 (docs/spec-tableau-de-bord-v2.md) ───────────────────────────────

/** Le prochain dimanche, aujourd'hui compris jusqu'à midi ; `nowIso` = « AAAA-MM-JJTHH:MM » (heure de Paris). */
export function prochainDimanche(nowIso: string): string {
  const jour = nowIso.slice(0, 10);
  const [y, m, d] = jour.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (dow === 0 && nowIso.slice(11, 16) < "12:00") return jour;
  return addDays(jour, 7 - dow);
}

// ─── Ce dimanche ─────────────────────────────────────────────────────────────

export type Manque = { cle: string; i18n: string };
export type EtatDuDimanche = { categorie: string; planning: string; libelle: string; manques: Manque[] };

const estPlanningDuCulte = (key: string) => (PLANNINGS_DU_CULTE as readonly string[]).includes(key);
const estPlanningEdd = (key: string) => (PLANNINGS_EDD as readonly string[]).includes(key);

/**
 * Par grille des services qui a une ligne ce dimanche, ce qui manque : cases vides, puis (cultes) la setlist publiée,
 * sinon sa présentation ; puis la Table (si le petit déj est lu) avec son petit déj. `manques` vide = prêt.
 */
export function etatsDuDimanche(
  rows: Record<string, string[][]>, setlists: SetlistDuDimanche[], services: string[], dimanche: string,
  petitDej: LignePetitDej[] | null,
): EtatDuDimanche[] {
  const etats = services.flatMap((categorie) => (GRILLES_DU_SERVICE[categorie] ?? []).flatMap((def): EtatDuDimanche[] => {
    const row = ligneA(def, rows[def.key] ?? [], dimanche);
    if (!row) return [];
    const manques: Manque[] = colonnesVides(def, row).map((c) => ({ cle: c.cle, i18n: c.i18n }));
    if (estPlanningDuCulte(def.key)) {
      const moment = momentDe(def);
      const setlist = setlists.find((s) => s.category === categorie && s.date === dimanche && !s.isDraft && !s.isPrivate
        && (!moment || !s.moment || s.moment === moment));
      if (!setlist) manques.push({ cle: "setlist", i18n: "tableauDeBord.dimanche.manque.setlist" });
      else if (!setlist.presentationUrl) manques.push({ cle: "presentation", i18n: "tableauDeBord.dimanche.manque.presentation" });
    }
    return [{ categorie, planning: def.key, libelle: def.label, manques }];
  }));
  const rowTable = petitDej !== null ? ligneA(GRILLE_TABLE, rows.table ?? [], dimanche) : undefined;
  if (petitDej !== null && rowTable) {
    const manques: Manque[] = colonnesVides(GRILLE_TABLE, rowTable).map((c) => ({ cle: c.cle, i18n: c.i18n }));
    if (!petitDej.some((l) => l.dimanche === dimanche)) manques.push({ cle: "petitDej", i18n: "tableauDeBord.dimanche.manque.petitDej" });
    etats.push({ categorie: "table", planning: "table", libelle: GRILLE_TABLE.label, manques });
  }
  return etats;
}

// ─── Qui relancer ────────────────────────────────────────────────────────────

export type ProfilReferent = { uid: string; firstName: string; lastName: string; referentDe?: string[]; referentSous?: string[] };
export type EquipeDeColonne = { equipe: string; sous?: SousEquipe };

/** L'équipe (et la sous-équipe de Louange) qui remplit une colonne d'un planning ; `null` pour un planning de groupe. */
export function equipeDeLaColonne(planning: string, colonne: string): EquipeDeColonne | null {
  if (estPlanningDuCulte(planning)) {
    if ((COLONNES_REGIE as readonly string[]).includes(colonne)) return { equipe: "regie" };
    if (colonne === "presidence" || colonne === "suppleant") return { equipe: "louange", sous: "presidence" };
    if (["choriste1", "choriste2", "choriste3"].includes(colonne)) return { equipe: "louange", sous: "choristes" };
    if (["piano", "guitare", "batterie", "cajon", "cajonBatterie", "musiciens", "percussion", "pianiste", "guitariste"].includes(colonne)) {
      return { equipe: "louange", sous: "musiciens" };
    }
    return { equipe: "louange" };
  }
  if (estPlanningEdd(planning)) return { equipe: "edd" };
  if (planning === "table") return { equipe: "orga" };
  return null;
}

export type Referent = { uid: string; prenom: string; nom: string; equipe: string; sous?: SousEquipe };

/** Le référent à relancer pour une case vide : celui de la sous-équipe, sinon celui de l'équipe ; le premier par prénom puis nom. */
export function quiRelancer(planning: string, colonne: string, profils: ProfilReferent[]): Referent | null {
  const cible = equipeDeLaColonne(planning, colonne);
  if (!cible) return null;
  const premier = (l: ProfilReferent[]) =>
    [...l].sort((a, b) => a.firstName.localeCompare(b.firstName, "fr") || a.lastName.localeCompare(b.lastName, "fr"))[0];
  const deEquipe = profils.filter((p) => (p.referentDe ?? []).includes(cible.equipe));
  const deSous = cible.sous ? profils.filter((p) => (p.referentSous ?? []).includes(cible.sous!)) : [];
  const p = deSous.length ? premier(deSous) : premier(deEquipe);
  if (!p) return null;
  return {
    uid: p.uid, prenom: p.firstName.trim() || p.lastName, nom: `${p.firstName} ${p.lastName}`.trim(), equipe: cible.equipe,
    ...(deSous.length ? { sous: cible.sous } : {}),
  };
}

// ─── Absences en conflit ─────────────────────────────────────────────────────

export type AbsenceEnConflit = { planning: string; date: string; nom: string; colonne: { cle: string; i18n: string } };

/** Les personnes planifiées (cases non en lecture seule) qui se sont déclarées absentes ce jour-là. Jamais le motif. */
export function absencesEnConflit(
  def: DefinitionGrille, rows: string[][], dates: string[], profils: { uid: string; planningName: string }[], absences: Absence[],
): AbsenceEnConflit[] {
  const profilDe = (nom: string) => {
    const n = normalizeName(nom);
    return n ? profils.find((p) => p.planningName && normalizeName(p.planningName) === n) : undefined;
  };
  return dates.flatMap((date) => {
    const row = ligneA(def, rows, date);
    if (!row) return [];
    return def.colonnes.filter((c) => !c.lectureSeule).flatMap((c) => splitNames(row[c.index] ?? "").flatMap((nom) => {
      const p = profilDe(nom);
      if (!p || !absenceLe(absences.filter((a) => a.uid === p.uid), date)) return [];
      return [{ planning: def.key, date, nom, colonne: { cle: c.cle, i18n: c.i18n } }];
    }));
  });
}

// ─── Plannings (widget L) ────────────────────────────────────────────────────

export type CaseVideARelancer = { planning: string; date: string; colonne: { cle: string; i18n: string }; relancer: Referent | null };
export type PlanningsDuTableau = {
  vides: CaseVideARelancer[]; conflits: AbsenceEnConflit[];
  plusTard: { jusquau: string; nombre: number; parPlanning: { planning: string; colonnes: { cle: string; i18n: string; n: number }[] }[] };
};

/** Les cases vides du prochain dimanche (avec qui relancer), les absences en conflit des 5 dimanches, et le décompte des 4 suivants. */
export function planningsDuTableau(
  rows: Record<string, string[][]>, plannings: string[], dimanche: string, suivants: string[],
  profils: (ProfilReferent & { planningName: string })[], absences: Absence[],
): PlanningsDuTableau {
  const defs = plannings.flatMap((k) => { const d = grilleDe(k); return d ? [d] : []; });
  const vides = defs.flatMap((def) => casesVides(def, rows[def.key] ?? [], [dimanche]).flatMap((c) =>
    c.colonnes.map((col) => ({
      planning: def.key, date: c.date, colonne: { cle: col.cle, i18n: col.i18n }, relancer: quiRelancer(def.key, col.cle, profils),
    }))));
  const conflits = defs.flatMap((def) => absencesEnConflit(def, rows[def.key] ?? [], [dimanche, ...suivants], profils, absences));
  const parPlanning = defs.flatMap((def) => {
    const n = new Map<string, number>();
    for (const c of casesVides(def, rows[def.key] ?? [], suivants)) for (const col of c.colonnes) n.set(col.cle, (n.get(col.cle) ?? 0) + 1);
    const colonnes = def.colonnes.filter((c) => n.has(c.cle)).map((c) => ({ cle: c.cle, i18n: c.i18n, n: n.get(c.cle)! }));
    return colonnes.length ? [{ planning: def.key, colonnes }] : [];
  });
  return {
    vides, conflits,
    plusTard: {
      jusquau: suivants[suivants.length - 1] ?? "",
      nombre: parPlanning.reduce((t, p) => t + p.colonnes.reduce((s, c) => s + c.n, 0), 0),
      parPlanning,
    },
  };
}

// ─── Texte du rappel (français) ──────────────────────────────────────────────

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « 2026-10-25 » → « 25 octobre » ; « 2026-11-01 » → « 1er novembre ». */
const dateCourte = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d === 1 ? "1er" : d} ${MOIS[m - 1]}`;
};
const SERVICE_RAPPEL: Record<string, string> = {
  culte: "le culte", intergroupe: "le culte Intergroupe", interfranco: "le culte Interfranco",
  campusMatin: "le culte du Campus (matin)", campusSoir: "le culte du Campus (soir)", table: "la Table du Seigneur",
};
const POSTE_RAPPEL: Record<string, string> = {
  presidence: "à la présidence", suppleant: "à la suppléance", choriste1: "au chant (choriste 1)", choriste2: "au chant (choriste 2)",
  choriste3: "au chant (choriste 3)", piano: "au piano", guitare: "à la guitare", batterie: "à la batterie", cajon: "au cajón",
  cajonBatterie: "au cajón", sono: "à la sono", sonoLive: "à la sono live", ppt: "au PPT", orateur: "pour la prédication",
  traduction: "à la traduction", musiciens: "aux instruments", percussion: "aux percussions", pianiste: "au piano",
  guitariste: "à la guitare", theme: "pour le thème", cours: "pour le cours", equipe: "pour l'équipe", sainteCene: "pour la sainte cène",
};

/** Le message à copier pour relancer quelqu'un sur une case vide. */
export function texteDuRappel(p: { prenom: string; planning: string; colonne: string; date: string; lien: string }): string {
  const label = grilleDe(p.planning)?.label ?? p.planning;
  const service = SERVICE_RAPPEL[p.planning] ?? (estPlanningEdd(p.planning) ? `le cours de l'EDD (${label})` : `le ${label}`);
  const poste = POSTE_RAPPEL[p.colonne] ?? `au poste « ${p.colonne} »`;
  return `Salut ${p.prenom}, pour ${service} de dimanche ${dateCourte(p.date)}, il manque encore quelqu'un ${poste}. `
    + `Tu peux t'en occuper d'ici samedi ? Merci ! ${p.lien}`;
}

// ─── Évènements ──────────────────────────────────────────────────────────────

/** Organisé par soi, ou porté par une de ses équipes (`pour` = `equipe:<id>`). */
export function estSienEvenement(e: Pick<Evenement, "organisateurUid" | "pour">, uid: string, equipes: string[]): boolean {
  return e.organisateurUid === uid || (e.pour.startsWith("equipe:") && equipes.includes(e.pour.slice("equipe:".length)));
}

/** Les inscriptions sont encore possibles et leur fin tombe dans les `jours` jours (fin posée en automatique, sinon début). */
export function fermeBientot(e: Evenement, nowIso: string, jours = 7): boolean {
  if (refusInscription(e, 0, nowIso) !== null) return false;
  const fin = modeInscriptions(e) === "auto" && e.inscriptionFin
    ? borneInscription(e.inscriptionFin, "23:59")
    : `${e.date}T${e.heure || "00:00"}`;
  return fin <= `${addDays(nowIso.slice(0, 10), jours)}T${nowIso.slice(11, 16)}`;
}

/** Les créneaux de scène sans personne, un dimanche de l'évènement (de `date` à `dateFin`, bornes comprises). */
export function creneauxVides(e: Pick<Evenement, "date" | "dateFin">, creneaux: Creneau[]): Creneau[] {
  const fin = e.dateFin || e.date;
  return creneaux.filter((c) => c.dimanche >= e.date && c.dimanche <= fin && c.qui.every((q) => !q.trim()));
}

/** Les siens d'abord (tels quels), puis les autres (avec le Sheet) ; `nombre` au plus en tout, réunions exclues. */
export function evenementsDuTableau(
  app: Evenement[], sheet: EntreeSheet[], user: AuthUser | null, profile: UserProfile | null, today: string, r: Reglages,
): { siens: Evenement[]; autres: ProchainEvenement[] } {
  const nombre = r.nombre ?? 3;
  const venir = evenementsAVenir(app, user, profile, today, { ...r, nombre: 50 });
  const equipes = profile?.dansEquipes ?? [];
  const estSien = (e: Evenement) => !!user && estSienEvenement(e, user.uid, equipes);
  const siens = venir.filter(estSien).slice(0, nombre);
  const autres = avecLeSheet(venir.filter((e) => !estSien(e)), sheet, today, { ...r, nombre: Math.max(0, nombre - siens.length) });
  return { siens, autres };
}

// ─── Tâches ──────────────────────────────────────────────────────────────────

/** Comme `aFaireDuTableau`, trié : en retard d'abord, puis les siennes, puis par date ; le retard compté en entier. */
export function tachesDuTableau(lignes: Ligne[], uid: string, today: string, max = 5): { enRetard: number; lignes: (Ligne & { aMoi: boolean })[] } {
  const horizon = addDays(today, 7);
  const aFaire = lignes
    .filter((l) => resteAFaire(l) && l.date <= horizon)
    .map((l) => ({ ...l, aMoi: l.tache.responsableUid === uid }))
    .sort((a, b) => Number(b.date < today) - Number(a.date < today) || Number(b.aMoi) - Number(a.aMoi) || a.date.localeCompare(b.date));
  return { enRetard: aFaire.filter((l) => l.date < today).length, lignes: aFaire.slice(0, max) };
}

// ─── Réunions ────────────────────────────────────────────────────────────────

export type ReunionDuTableau = { reunion: Evenement; precedenteSansCompteRendu: Evenement | null };

/** Ses réunions à venir (celles dont on est), par date puis heure, `n` au plus, avec la précédente restée sans compte rendu. */
export function reunionsDuTableau(
  evenements: Evenement[], user: AuthUser | null, profile: UserProfile | null, nowIso: string, n = 3,
): ReunionDuTableau[] {
  const miennes = evenements.filter((e) => estReunion(e) && !!e.date && estDeLaReunion(user, profile, e));
  const debut = (e: Evenement) => `${e.date}T${e.heure || "00:00"}`;
  const aVenir = (e: Evenement) => `${e.date}T${e.heure || "23:59"}` >= nowIso;
  return miennes
    .filter(aVenir)
    .sort((a, b) => debut(a).localeCompare(debut(b)))
    .slice(0, n)
    .map((reunion) => {
      const derniere = miennes.filter((e) => !aVenir(e) && e.pour === reunion.pour).sort((a, b) => debut(b).localeCompare(debut(a)))[0];
      return { reunion, precedenteSansCompteRendu: derniere && !derniere.compteRendu?.url ? derniere : null };
    });
}

/** Le nombre de sujets pas encore traités. */
export function sujetsOuverts(sujets: { traite: boolean }[]): number {
  return sujets.filter((s) => !s.traite).length;
}
