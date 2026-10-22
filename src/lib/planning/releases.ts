// Publication des plannings par trimestre.
//
// Les pages planning (Culte, Groupes) lisent le Google Sheet en direct : dès
// qu'une cellule du trimestre suivant est remplie, elle s'affiche. Pour ne
// révéler un trimestre que lorsqu'il est prêt, on garde dans Firestore la liste
// des trimestres « publiés » par planning et par année
// (planningReleases/{key}_{year}, champ `published: string[]`). Un trimestre
// futur non publié est masqué aux membres ; le trimestre courant et les passés
// restent toujours visibles (filet de sécurité).
//
// Module PUR (aucune dépendance Firebase/serveur) : importable par les pages
// client, le panneau de publication ET la route serveur /api/planning/release.

import { NOTIFY_ALL } from "@/lib/push/audiences"
import { BACK_OFFICE } from "@/lib/backOffice"
import { publiePlanning, type ProfilOrganigramme } from "@/lib/acces/organigramme"
import type { EtatAnnonce } from "./prevenir"

export interface PublishablePlanning {
  /** Clé stable : id Firestore + sélecteur de groupe de la page Groupes. */
  key: string
  /** Libellé affiché (panneau de publication, texte de notification). */
  label: string
  /** Audience qui reçoit la notif à la publication (NOTIFY_ALL ou une catégorie). */
  notifyAudience: string
  /** Droit `notify` requis pour publier (en plus des admins). */
  permission: string
}

// Périmètre actuel : Culte Franco + les 3 groupes. Les clés des groupes
// correspondent au sélecteur de la page Groupes ("paix" | "fidelite" | "bonte").
export const PUBLISHABLE_PLANNINGS: PublishablePlanning[] = [
  { key: "culte",    label: "Culte Franco",    notifyAudience: NOTIFY_ALL,        permission: "Culte Francophone" },
  { key: "paix",     label: "Groupe Paix",     notifyAudience: "Groupe Paix",     permission: "Groupe Paix" },
  { key: "fidelite", label: "Groupe Fidélité", notifyAudience: "Groupe Fidélité", permission: "Groupe Fidélité" },
  { key: "bonte",    label: "Groupe Bonté",    notifyAudience: "Groupe Bonté",    permission: "Groupe Bonté" },
]

export function getPlanning(key: string): PublishablePlanning | undefined {
  return PUBLISHABLE_PLANNINGS.find((p) => p.key === key)
}

export const TRI_ORDER = ["T1", "T2", "T3", "T4"] as const
export type Tri = (typeof TRI_ORDER)[number]

export function triRank(tri: string): number {
  return TRI_ORDER.indexOf(tri as Tri)
}

/** Admins + porteurs du droit notif « tout le monde » + porteurs du droit notif
 *  propre à ce planning peuvent le publier ; plus, lot 2 (OG23), qui le publie par un rôle de
 *  son groupe (`publieParRole`, recopié par le serveur). « Notifier » ne donne pas « Publier ». */
export function canPublishPlanning(
  planning: PublishablePlanning,
  isAdmin: boolean,
  notifyRights: string[],
  publieParRole: string[] = []
): boolean {
  return isAdmin || notifyRights.includes(NOTIFY_ALL) || notifyRights.includes(planning.permission)
    || publieParRole.includes(planning.key)
}

/** Lot 3 (PG35), étendu au lot 2 (OG23, décision 25 : « ceux qui publient ou notifient ce planning ») :
 *  qui voit « Prévenir des changements » et peut l'envoyer. Un rôle « Notifier » seul prévient donc
 *  sans pouvoir publier. Un seul endroit, la page et la route l'appellent. */
export function peutPrevenir(
  planning: PublishablePlanning,
  isAdmin: boolean,
  notifyRights: string[],
  publieParRole: string[] = [],
  notifieParRole: string[] = []
): boolean {
  return canPublishPlanning(planning, isAdmin, notifyRights, publieParRole) || notifieParRole.includes(planning.notifyAudience)
}

/** Les listes d'un profil que lisent la publication et « Prévenir » ; celles des rôles ne comptent
 *  que si `backOffice` (OG27 : local et en ligne partagent Firestore). Lot AO : l'organigramme aussi. */
type ProfilPublie = { notify?: string[]; publieParRole?: string[]; notifieParRole?: string[] } & ProfilOrganigramme

/** Publier ce planning, profil relu (route /api/planning/release, pages du planning). Lot AO (`backOffice`) :
 *  plus de droit `notify` — le référent Louange ou le référent Régie publie le culte, un rôle de groupe son
 *  groupe (`publiePlanning`, src/lib/acces/organigramme.ts). */
export function droitsDePublication(
  planning: PublishablePlanning, isAdmin: boolean, profil: ProfilPublie | null, backOffice: boolean = BACK_OFFICE
): boolean {
  if (backOffice) return isAdmin || publiePlanning(profil, planning.key)
  return canPublishPlanning(planning, isAdmin, profil?.notify ?? [], backOffice ? profil?.publieParRole ?? [] : [])
}

/** Prévenir des changements de ce planning, profil relu (route /api/planning/changements, pages). Lot AO
 *  (`backOffice`) : ceux qui le publient, plus un rôle « Notifier » du groupe (`notifieParRole`). */
export function droitsDePrevenir(
  planning: PublishablePlanning, isAdmin: boolean, profil: ProfilPublie | null, backOffice: boolean = BACK_OFFICE
): boolean {
  if (backOffice) return isAdmin || publiePlanning(profil, planning.key) || (profil?.notifieParRole ?? []).includes(planning.notifyAudience)
  return peutPrevenir(planning, isAdmin, profil?.notify ?? [],
    backOffice ? profil?.publieParRole ?? [] : [], backOffice ? profil?.notifieParRole ?? [] : [])
}

export interface TriVisibility {
  tri: string
  /** Affiché à l'utilisateur courant ? (membre : courant/passé OU publié ; publieur : toujours) */
  visible: boolean
  /** Trimestre futur non encore publié → badge « Non publié » (vu par les publieurs uniquement). */
  unpublished: boolean
}

/** Décide, pour chaque trimestre, sa visibilité et l'état « non publié ».
 *  Règle membre : visible si `triRank(tri) <= triRank(courant)` (le trimestre
 *  courant et les passés s'affichent toujours) OU s'il est publié. Un publieur
 *  (`canPublish`) voit tout, les trimestres futurs non publiés étant marqués
 *  pour relecture avant publication. */
export function triVisibilities(
  available: readonly string[],
  published: string[],
  currentTri: string,
  canPublish: boolean
): TriVisibility[] {
  const cur = triRank(currentTri)
  return available.map((tri) => {
    const futureUnpublished = triRank(tri) > cur && !published.includes(tri)
    return { tri, visible: canPublish || !futureUnpublished, unpublished: futureUnpublished }
  })
}

/** Lot U2 : les trimestres d'une année choisie dans le sélecteur. Année passée :
 *  tout se lit. Année en cours : `triVisibilities`. Année suivante : un
 *  trimestre sort quand il est publié ; avant, seuls ceux qui voient le
 *  brouillon (qui remplit ou publie ce planning, les admins) le voient, marqué. */
export function triVisibilitiesAnnee(
  annee: number,
  anneeCourante: number,
  published: string[],
  currentTri: string,
  voitBrouillon: boolean
): TriVisibility[] {
  if (annee < anneeCourante) return TRI_ORDER.map((tri) => ({ tri, visible: true, unpublished: false }))
  if (annee === anneeCourante) return triVisibilities(TRI_ORDER, published, currentTri, voitBrouillon)
  return TRI_ORDER.map((tri) => {
    const pub = published.includes(tri)
    return { tri, visible: pub || voitBrouillon, unpublished: !pub }
  })
}

// ─── Lecture publique de l'état de publication (REST Firestore, sans auth) ─────
// Les pages planning sont consultées sans compte → lecture publique du doc
// planningReleases/{key}_{year}. Doc absent / erreur réseau = rien de publié.

const FS_DOCS =
  "https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents"

export async function getPublishedQuarters(key: string, year: number): Promise<string[]> {
  try {
    const res = await fetch(`${FS_DOCS}/planningReleases/${key}_${year}`, { cache: "no-store" })
    if (!res.ok) return []
    const raw = (await res.json()) as {
      fields?: { published?: { arrayValue?: { values?: { stringValue?: string }[] } } }
    }
    return (raw.fields?.published?.arrayValue?.values ?? [])
      .map((v) => v.stringValue ?? "")
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Lot 3 (PG36) : ce qui a été annoncé de chaque trimestre d'une année (champ `annonces` du même
 * document), par trimestre. Absent ou illisible = aucun état.
 */
export async function lireAnnonces(key: string, year: number): Promise<Record<string, EtatAnnonce>> {
  type Champs = Record<string, { stringValue?: string; mapValue?: { fields?: Champs } }>
  try {
    const res = await fetch(`${FS_DOCS}/planningReleases/${key}_${year}`, { cache: "no-store" })
    if (!res.ok) return {}
    const raw = (await res.json()) as { fields?: { annonces?: { mapValue?: { fields?: Champs } } } }
    const out: Record<string, EtatAnnonce> = {}
    for (const [tri, v] of Object.entries(raw.fields?.annonces?.mapValue?.fields ?? {})) {
      const f = v.mapValue?.fields ?? {}
      const cases: Record<string, string> = {}
      for (const [k, x] of Object.entries(f.cases?.mapValue?.fields ?? {})) if (x.stringValue) cases[k] = x.stringValue
      out[tri] = { cases, le: f.le?.stringValue, par: f.par?.stringValue, publieLe: f.publieLe?.stringValue }
    }
    return out
  } catch {
    return {}
  }
}
