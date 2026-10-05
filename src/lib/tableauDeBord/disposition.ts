// Tableau de bord du Back-Office (lot U6, B4, docs/spec-back-office.md § Widgets, Q5, Q10, Q11).
// Module pur : la disposition par défaut selon le rôle, et celle qu'on affiche à partir du
// document `backOffice/{uid}`.
import { isAdminUser, isCoordination, widgetsPermis } from "@/lib/access";
import type { UserProfile } from "@/types/user";
import { WIDGETS, type PreferencesBackOffice, type Reglages, type Taille, type Widget, type WidgetId } from "@/types/backOffice";

type AuthUser = { uid: string; email?: string | null };

/** L'ordre de la planche `bo-tableau-de-bord` (Scène et Comptes à la suite, question 6). */
export const ORDRE_DU_CATALOGUE: WidgetId[] = [
  "dimanche", "calendrier", "afaire", "setlists", "planning", "evenements", "chants", "petitdej", "raccourcis", "scene", "comptes",
];

/** Taille de la table des widgets. */
export const TAILLE_PAR_DEFAUT: Record<WidgetId, Taille> = {
  dimanche: "m", calendrier: "m", afaire: "m", setlists: "s", planning: "s", evenements: "m",
  chants: "m", petitdej: "s", scene: "s", comptes: "s", raccourcis: "s",
};

const TAILLES: readonly Taille[] = ["s", "m", "l"];
const nonVide = (l: unknown[] | undefined) => (l?.length ?? 0) > 0;

/**
 * Défaut selon le rôle (Q11) : admin = tout ; « évènement » (coordination ou droit
 * d'annonces) = Ce dimanche, À faire, Prochains évènements, Scène ; « louange » (rôle de
 * service ou `plannings`) = Ce dimanche, À faire, Cases vides, Setlists ; les deux =
 * l'union ; sinon Ce dimanche et À faire. Toujours filtré par les droits du widget, dans
 * l'ordre et aux tailles de la planche.
 */
export function dispositionParDefaut(user: AuthUser | null, profile: UserProfile | null): Widget[] {
  const permis = widgetsPermis(user, profile);
  let voulus: WidgetId[] = permis;
  if (!isAdminUser(user)) {
    voulus = ["dimanche", "afaire"];
    if (isCoordination(user, profile) || nonVide(profile?.annonces)) voulus.push("evenements", "scene");
    if (Object.keys(profile?.serviceRoles ?? {}).length > 0 || nonVide(profile?.plannings)) voulus.push("planning", "setlists");
  }
  return ORDRE_DU_CATALOGUE
    .filter((id) => voulus.includes(id) && permis.includes(id))
    .map((id) => ({ id, taille: TAILLE_PAR_DEFAUT[id], reglages: {} }));
}

/**
 * La disposition à afficher (Q5) : absente du document = le défaut du rôle, recalculé à
 * chaque fois ; présente (même vide) = la sienne, sans widget inconnu, à venir, non permis
 * ni doublon ; une taille illisible reprend celle de la table.
 */
export function dispositionAffichee(
  prefs: Partial<PreferencesBackOffice> | null, user: AuthUser | null, profile: UserProfile | null,
): Widget[] {
  if (!Array.isArray(prefs?.tableauDeBord)) return dispositionParDefaut(user, profile);
  const permis = widgetsPermis(user, profile);
  const vus = new Set<WidgetId>();
  return prefs.tableauDeBord.flatMap((w) => {
    const id = w?.id as WidgetId;
    if (!(WIDGETS as readonly string[]).includes(id) || !permis.includes(id) || vus.has(id)) return [];
    vus.add(id);
    const taille = TAILLES.includes(w.taille) ? w.taille : TAILLE_PAR_DEFAUT[id];
    const reglages: Reglages = w.reglages && typeof w.reglages === "object" ? w.reglages : {};
    return [{ id, taille, reglages }];
  });
}
