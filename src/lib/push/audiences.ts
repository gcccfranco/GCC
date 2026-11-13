// Audiences des notifications manuelles (envoyées par les personnes autorisées via
// le champ profil `notify`). Importable côté client (composer, admin) et serveur
// (route notify-audience) — constantes pures, aucune dépendance serveur.

import { SERVICE_LIEUX, GROUPES } from "@/types/user";
import { EDD_CLASSES } from "@/lib/planning/utils";
import { categoryLabel } from "@/lib/serviceColors";
import { BACK_OFFICE } from "@/lib/backOffice";
import { EQUIPES } from "@/lib/equipes/table";
import { audienceOrganigrammeValide, audiencesOrganigramme, type ProfilOrganigramme } from "@/lib/acces/organigramme";

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

/** Audience valide ? (« tout le monde » ou une catégorie connue). Lot AO (`backOffice`) : aussi `equipe:<id>`
 *  (une des 13 équipes) et `louange:<sous-équipe>`. */
export function isValidAudience(a: string, backOffice: boolean = BACK_OFFICE): boolean {
  return a === NOTIFY_ALL || notifyGroups(backOffice).some((g) => g.audiences.includes(a))
    || (backOffice && audienceOrganigrammeValide(a));
}

/** Ce que lit une personne qui notifie : `notify`, coché par un admin, et `notifieParRole`, recopié
 *  depuis les organigrammes des groupes (OG19) ; lot AO : l'organigramme de l'église (`referentDe`,
 *  `referentSous`, `dansEquipes`). */
type ProfilNotifie = { notify?: string[]; notifieParRole?: string[] } & ProfilOrganigramme;

/** Les audiences qu'une personne notifie (OG24) : `notify` ∪ `notifieParRole`. Les rôles ne comptent
 *  que si `backOffice` (OG27 : local et en ligne partagent Firestore). Exporté aussi par access.ts.
 *  Lot AO (`backOffice`, A2) : le droit coché `notify` n'est plus lu. Lot RS (Q10, Q11) : le Comité Orga, toute
 *  l'Église (`*`) ; un gestionnaire de planning, l'audience de son service ; ni les référents (leurs réunions
 *  seulement) ni `notifieParRole` (groupes) ne notifient plus. */
export function audiencesNotifiables(profil: ProfilNotifie | null, backOffice: boolean = BACK_OFFICE): string[] {
  if (backOffice) return audiencesOrganigramme(profil);
  return [...new Set(profil?.notify ?? [])];
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

const SOUS_EQUIPES_LIBELLES: Record<string, string> = { presidence: "Présidence", musiciens: "Musiciens", choristes: "Choristes" };

/** Libellé lisible d'une audience (« tout le monde », une catégorie, ou, lot AO, une équipe ou une sous-équipe de Louange). */
export function audienceLabel(a: string): string {
  if (a === NOTIFY_ALL) return "Tout le monde";
  if (a.startsWith("equipe:")) {
    const id = a.slice("equipe:".length);
    return id === "louange" ? "Toute la Louange" : EQUIPES.find((e) => e.id === id)?.nom ?? a;
  }
  if (a.startsWith("louange:")) return `Louange · ${SOUS_EQUIPES_LIBELLES[a.slice("louange:".length)] ?? a}`;
  return categoryLabel(a);
}
