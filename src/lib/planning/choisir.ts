// « Choisir » une personne dans une case (lot U2, P9, docs/spec-planning-2027.md,
// question 5) : remplace la datalist du lot 17 (D12). D'abord les comptes qui
// ont le rôle de la colonne dans la catégorie du planning (`serviceRoles`),
// puis les autres comptes et les noms déjà écrits dans la grille ; un nom sans
// compte s'écrit à la main.
//
// Module PUR : aucune dépendance Firebase ni réseau.

import type { OrganigrammeGroupe, Titulaire } from "@/types/groupe"
import type { ServiceRole } from "@/types/user"
import { groupeDef } from "@/lib/groupes/table"
import type { DefinitionGrille } from "./grilles"
import { normalizeName, splitNames } from "./names"

/** Un compte tel que « Choisir » le lit (users/{uid}). */
export type CompteDuPlanning = {
  /** Nom de planning (`planningName`) : ce qui s'écrit dans la case. */
  nom: string
  prenom: string
  nomDeFamille: string
  serviceRoles: Record<string, readonly string[]>
  /** Lot 2 (OG29) : l'uid, que les titulaires d'un rôle désignent, et `groupeDe(profil)`. Absents,
   *  « Choisir » ne change pas (OG30). */
  uid?: string
  groupe?: string | null
}

export type Proposition = { nom: string; duRole: boolean }

/** Catégorie de `serviceRoles` de chaque planning ; la Table n'en a pas. */
const CATEGORIES: Record<string, string> = {
  culte: "Culte Francophone",
  intergroupe: "Intergroupe",
  interfranco: "Interfranco",
  paix: "Groupe Paix",
  bonte: "Groupe Bonté",
  fidelite: "Groupe Fidélité",
  eddZhongban: "中班",
  eddDaban: "大班",
  eddGaoban: "高班",
  campusMatin: "Campus",
  campusSoir: "Campus",
}

/** Rôle de setlist de chaque colonne (comme les *_ROLE_MAP de names.ts) ;
 *  absente = présence sans rôle (orateur, traduction, suppléant, cours…). */
const ROLES: Record<string, ServiceRole> = {
  presidence: "presidence",
  choriste1: "chanteur", choriste2: "chanteur", choriste3: "chanteur",
  piano: "musicien", pianiste: "musicien", guitare: "musicien", guitariste: "musicien", batterie: "musicien",
  cajon: "musicien", cajonBatterie: "musicien", musiciens: "musicien", percussion: "musicien",
  sono: "regie", sonoLive: "regie", ppt: "regie",
}

/** Colonnes de texte libre : pas de « Choisir », la case s'écrit comme au lot 17. */
const TEXTE_LIBRE = new Set(["theme", "chant1", "chant2", "chant3", "chant4", "repetition"])

/** Mots du Sheet écrits dans des colonnes de personnes sans être des noms
 *  (relevé T0) ; `splitNames` écarte déjà Interfranco, Intergroupe, Louange… */
const PAS_DES_NOMS = new Set(["bapteme", "seance de louange"])

export function colonneDePersonnes(cle: string): boolean {
  return !TEXTE_LIBRE.has(cle)
}

/**
 * Les noms proposés pour une case, dans l'ordre du menu : les comptes qui ont
 * le rôle de la colonne dans la catégorie du planning (`duRole`), puis les
 * autres comptes et les noms sans compte déjà écrits dans `rows`, chaque groupe
 * par ordre alphabétique. Un compte sans nom de planning n'est pas proposé :
 * « Mes services » ne le retrouverait pas. `recherche` filtre sans accents ni
 * casse, sur le nom de planning, le prénom ou le nom.
 */
export function propositions(
  definition: DefinitionGrille,
  colonne: string,
  comptes: readonly CompteDuPlanning[],
  rows: readonly string[][],
  recherche: string,
): Proposition[] {
  const categorie = CATEGORIES[definition.key]
  const role = ROLES[colonne]
  const aiguille = normalizeName(recherche)
  const vus = new Set<string>()
  const duRole: Proposition[] = []
  const autres: Proposition[] = []

  for (const c of comptes) {
    const nom = c.nom.trim()
    const cle = normalizeName(nom)
    if (!nom || vus.has(cle)) continue
    vus.add(cle)
    if (aiguille && ![nom, c.prenom, c.nomDeFamille, `${c.prenom} ${c.nomDeFamille}`].some((x) => normalizeName(x).includes(aiguille))) continue
    const aLeRole = !!categorie && !!role && (c.serviceRoles[categorie] ?? []).includes(role)
    ;(aLeRole ? duRole : autres).push({ nom, duRole: aLeRole })
  }

  // Une colonne en lecture seule (le petit déj, lot U3) n'écrit pas des noms de personnes.
  const personnes = definition.colonnes.filter((c) => colonneDePersonnes(c.cle) && !c.lectureSeule)
  for (const r of rows) {
    for (const c of personnes) {
      for (const nom of splitNames(r[c.index] ?? "")) {
        const cle = normalizeName(nom)
        if (vus.has(cle) || PAS_DES_NOMS.has(cle)) continue
        vus.add(cle)
        if (!aiguille || cle.includes(aiguille)) autres.push({ nom, duRole: false })
      }
    }
  }

  const alpha = (a: Proposition, b: Proposition) => a.nom.localeCompare(b.nom, "fr")
  return [...duRole.sort(alpha), ...autres.sort(alpha)]
}

// ─── « Choisir » relié à un rôle de groupe (lot 2, OG29, OG30) ───────────────

export type PropositionTitulaire = {
  nom: string
  sansCompte: boolean
  /** Les dimanches affichés (AAAA-MM-JJ) où ce nom est déjà dans la colonne ; vide = « Libre ». */
  deja: string[]
}

/** `fixe` : « Président » ou « Vice-président » (absent pour un rôle créé, même du même nom). */
export type RoleAffiche = { nom: string; nomZh: string; fixe?: "president" | "vp" }

export type PropositionMembre = {
  nom: string
  sansCompte: boolean
  /** Ses rôles dans le groupe, président et VP compris ; vide = « Aucun rôle ». */
  roles: RoleAffiche[]
}

export type PropositionsReliees = {
  role: { id: string; nom: string; nomZh: string }
  /** ① Tous les titulaires du rôle, dans l'ordre de l'organigramme. */
  titulaires: PropositionTitulaire[]
  /** ② Les autres membres du groupe, par ordre alphabétique (repliés à l'écran). */
  groupe: PropositionMembre[]
  /** Hors du groupe : par la recherche seulement (décision 45, Q4), après le groupe. */
  autres: Proposition[]
}

const PRESIDENT: RoleAffiche = { nom: "Président", nomZh: "主席", fixe: "president" }
const VICE_PRESIDENT: RoleAffiche = { nom: "Vice-président", nomZh: "副主席", fixe: "vp" }

/**
 * « Choisir » d'une case dont la colonne est reliée à un rôle du groupe (D17, OG29) : ① les titulaires
 * du rôle, libres ou déjà placés ; ② le reste du groupe ; ③ par la recherche seulement, les comptes
 * d'ailleurs et les noms déjà écrits. `null` quand rien n'est relié — pas de document, autre planning
 * que celui du groupe, colonne sans rôle — : l'appelant garde alors `propositions` (OG30).
 * Un titulaire dont le compte est d'un autre groupe est ignoré (OG3) ; un compte sans nom de planning
 * est absent, comme partout dans « Choisir ». Une recherche filtre tout, sans accents ni casse.
 */
export function propositionsReliees(
  definition: DefinitionGrille,
  colonne: string,
  groupe: OrganigrammeGroupe | undefined,
  comptes: readonly CompteDuPlanning[],
  rows: readonly string[][],
  recherche: string,
): PropositionsReliees | null {
  if (!groupe || groupeDef(groupe.id)?.planning !== definition.key) return null
  const role = groupe.roles.find((r) => r.colonne === colonne)
  const col = definition.colonnes.find((c) => c.cle === colonne)
  if (!role || !col || !colonneDePersonnes(colonne)) return null

  const aiguille = normalizeName(recherche)
  const parUid = new Map(comptes.filter((c) => c.uid).map((c) => [c.uid!, c]))
  const correspond = (...textes: string[]) => !aiguille || textes.some((x) => normalizeName(x).includes(aiguille))
  const textesDe = (c: CompteDuPlanning) => [c.nom, c.prenom, c.nomDeFamille, `${c.prenom} ${c.nomDeFamille}`]
  // Le compte d'un titulaire : lu, avec un nom de planning, et pas d'un autre groupe (OG3).
  const compteDe = (t: Titulaire) => {
    const c = t.uid ? parUid.get(t.uid) : undefined
    return c && c.nom.trim() && (c.groupe == null || c.groupe === groupe.id) ? c : undefined
  }
  const estLui = (t: Titulaire, uid: string, cle: string) => (uid ? t.uid === uid : !t.uid && normalizeName(t.nom) === cle)

  // ① Les titulaires du rôle.
  const vus = new Set<string>()
  const titulaires: PropositionTitulaire[] = []
  for (const t of role.titulaires) {
    const c = compteDe(t)
    if (t.uid && !c) continue
    const nom = (c ? c.nom : t.nom).trim()
    const cle = normalizeName(nom)
    if (!nom || vus.has(cle)) continue
    vus.add(cle)
    if (!correspond(...(c ? textesDe(c) : [nom]))) continue
    const deja = rows
      .filter((r) => splitNames(r[col.index] ?? "").some((n) => normalizeName(n) === cle))
      .map((r) => r[0])
    titulaires.push({ nom, sansCompte: !c, deja })
  }

  // ② Les autres membres : comptes du groupe, titulaires du document (avec compte, ou sans).
  const candidats = new Map<string, { nom: string; uid: string; sansCompte: boolean; textes: string[] }>()
  const ajoute = (nom: string, uid: string, sansCompte: boolean, textes: string[]) => {
    const cle = normalizeName(nom)
    if (cle && !vus.has(cle) && !candidats.has(cle)) candidats.set(cle, { nom, uid, sansCompte, textes })
  }
  for (const c of comptes) if (c.groupe === groupe.id && c.nom.trim()) ajoute(c.nom.trim(), c.uid ?? "", false, textesDe(c))
  const cites = [...(groupe.president ? [groupe.president] : []), ...groupe.vp, ...groupe.roles.flatMap((r) => r.titulaires)]
  for (const t of cites) {
    const c = compteDe(t)
    if (t.uid && !c) continue
    if (c) ajoute(c.nom.trim(), t.uid, false, textesDe(c))
    else ajoute(t.nom.trim(), "", true, [t.nom])
  }
  const rolesDe = (uid: string, cle: string): RoleAffiche[] => {
    const lui = (t: Titulaire) => estLui(t, uid, cle)
    return [
      ...(groupe.president && lui(groupe.president) ? [PRESIDENT] : []),
      ...(groupe.vp.some(lui) ? [VICE_PRESIDENT] : []),
      ...groupe.roles.filter((r) => r.titulaires.some(lui)).map((r) => ({ nom: r.nom, nomZh: r.nomZh })),
    ]
  }
  const membres: PropositionMembre[] = [...candidats.entries()]
    .filter(([, m]) => correspond(...m.textes))
    .map(([cle, m]) => ({ nom: m.nom, sansCompte: m.sansCompte, roles: rolesDe(m.uid, cle) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))

  // ③ Hors du groupe : seulement quand on cherche.
  const connus = new Set([...vus, ...candidats.keys()])
  const autres = aiguille
    ? propositions(definition, colonne, comptes, rows, recherche)
        .filter((p) => !connus.has(normalizeName(p.nom)))
        .map((p) => ({ nom: p.nom, duRole: false }))
    : []

  return { role: { id: role.id, nom: role.nom, nomZh: role.nomZh }, titulaires, groupe: membres, autres }
}
