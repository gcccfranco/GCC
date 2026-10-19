// Audiences des notifications manuelles (envoyées par les personnes autorisées via
// le champ profil `notify`). Importable côté client (composer, admin) et serveur
// (route notify-audience) — constantes pures, aucune dépendance serveur.

import { SERVICE_LIEUX, GROUPES } from "@/types/user";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { categoryLabel } from "@/lib/serviceColors";
import { BACK_OFFICE } from "@/lib/backOffice";

/** Sentinelle « tout le monde » (tous les abonnés). */
export const NOTIFY_ALL = "*";

/** Groupes sans planning (lot 2 du chantier « équipes et groupes », OG25) : audiences du seul
 *  Back-Office, leurs membres viennent des organigrammes. */
const GROUPES_SANS_PLANNING = ["Groupe Amour", "Groupe Joie"];

/** Catégories ciblables individuellement, groupées pour l'UI. Amour et Joie seulement si
 *  `backOffice` (OG27) : un test pur le passe lui-même. */
export function notifyGroups(backOffice: boolean = BACK_OFFICE): { label: string; audiences: string[] }[] {
  return [
    { label: "Cultes", audiences: [...SERVICE_LIEUX] },
    { label: "Groupes", audiences: [...GROUPES, ...(backOffice ? GROUPES_SANS_PLANNING : [])] },
    { label: "EDD", audiences: [...EDD_CLASSES] },
  ];
}

export const NOTIFY_GROUPS = notifyGroups();

/** Toutes les catégories ciblables (hors « tout le monde »). */
export const NOTIFY_CATEGORIES: string[] = NOTIFY_GROUPS.flatMap((g) => g.audiences);

/** Audience valide ? (« tout le monde » ou une catégorie connue) */
export function isValidAudience(a: string, backOffice: boolean = BACK_OFFICE): boolean {
  return a === NOTIFY_ALL || notifyGroups(backOffice).some((g) => g.audiences.includes(a));
}

/** Ce que lit une personne qui notifie : `notify`, coché par un admin, et `notifieParRole`, recopié
 *  depuis les organigrammes des groupes (OG19). */
type ProfilNotifie = { notify?: string[]; notifieParRole?: string[] };

/** Les audiences qu'une personne notifie (OG24) : `notify` ∪ `notifieParRole`. Les rôles ne comptent
 *  que si `backOffice` (OG27 : local et en ligne partagent Firestore). Exporté aussi par access.ts. */
export function audiencesNotifiables(profil: ProfilNotifie | null, backOffice: boolean = BACK_OFFICE): string[] {
  return [...new Set([...(profil?.notify ?? []), ...(backOffice ? profil?.notifieParRole ?? [] : [])])];
}

/** Notifier une audience (route notify-audience, OG24) : admin, « tout le monde », ou l'audience
 *  parmi `audiencesNotifiables`. */
export function peutNotifierAudience(
  audience: string, isAdmin: boolean, profil: ProfilNotifie | null, backOffice: boolean = BACK_OFFICE,
): boolean {
  if (!isValidAudience(audience, backOffice)) return false;
  const droits = audiencesNotifiables(profil, backOffice);
  return isAdmin || droits.includes(NOTIFY_ALL) || droits.includes(audience);
}

/** Libellé lisible d'une audience (« tout le monde » ou une catégorie). */
export function audienceLabel(a: string): string {
  return a === NOTIFY_ALL ? "Tout le monde" : categoryLabel(a);
}
