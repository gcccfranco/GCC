// Données des widgets du tableau de bord (lot U6, B4, docs/spec-back-office.md § Widgets).
// Module pur : les widgets (src/components/backOffice/widgets/) lisent la base, puis
// passent ici ce qu'ils ont lu. Dates ISO « AAAA-MM-JJ », comparées comme du texte.
import {
  canCreateSetlist, canSeeEvenement, creatableCategories, entreesBackOffice, estReunion, isAdminUser, polesDe,
} from "@/lib/access";
import { byDate, isExpired, isInfo, isPast, refusInscription } from "@/lib/evenements/agenda";
import type { EntreeSheet } from "@/lib/evenements/sheet";
import type { FSSetlist } from "@/lib/firebase/setlists";
import { colonnesVides } from "@/lib/planning/casesVides";
import {
  CLES_EDD, GRILLES, GRILLES_EDD, GRILLE_BONTE, GRILLE_CAMPUS_MATIN, GRILLE_CAMPUS_SOIR, GRILLE_CULTE, GRILLE_FIDELITE,
  GRILLE_FIDELITE_MUSICIENS, GRILLE_INTERFRANCO, GRILLE_INTERGROUPE, GRILLE_PAIX, lignesDeLAnnee, type DefinitionGrille,
} from "@/lib/planning/grilles";
import { normalizeName, splitNames, type SetlistSeance } from "@/lib/planning/names";
import { PUBLISHABLE_PLANNINGS, canPublishPlanning } from "@/lib/planning/releases";
import { getAnnee } from "@/lib/planning/utils";
import { todayIso } from "@/lib/scene/dimanches";
import { addDays, resteAFaire, type Ligne } from "@/lib/taches/echeances";
import type { Reglages } from "@/types/backOffice";
import type { Evenement } from "@/types/evenement";
import type { LignePetitDej } from "@/types/petitDej";
import type { Creneau } from "@/types/programme";
import { TACHE_POLES, type TachePole } from "@/types/tache";
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
  "Groupe Fidélité": [GRILLE_FIDELITE, GRILLE_FIDELITE_MUSICIENS],
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
  const siens = SERVICES.filter((s) => s in (profile?.serviceRoles ?? {}));
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
  const remplis = (profile?.plannings ?? []).filter((k) => GRILLES.some((g) => g.key === k));
  const publies = PUBLISHABLE_PLANNINGS.filter((p) => canPublishPlanning(p, admin, profile?.notify ?? [])).map((p) => p.key);
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
    .filter((def) => def.key !== GRILLE_FIDELITE_MUSICIENS.key)
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

/** Réglage « pôles » : les siens (tous pour un admin), Louange compris. */
export function polesAFaire(r: Reglages, user: AuthUser | null, profile: UserProfile | null): TachePole[] {
  const siens = isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile);
  return r.poles ? siens.filter((p) => r.poles!.includes(p)) : siens;
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
  const permis: Record<Raccourci, boolean> = {
    tache: entrees.includes("taches"),
    evenement: entrees.includes("evenements"),
    notifier: entrees.includes("messages"),
    setlist: canCreateSetlist(user, profile),
  };
  return RACCOURCIS
    .filter((id) => permis[id] && (!r.raccourcis || r.raccourcis.includes(id)))
    .map((id) => ({ id, href: HREF_RACCOURCI[id] }));
}
