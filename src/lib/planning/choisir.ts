// « Choisir » une personne dans une case (lot U2, P9, docs/spec-planning-2027.md,
// question 5) : remplace la datalist du lot 17 (D12). D'abord les comptes qui
// ont le rôle de la colonne dans la catégorie du planning (`serviceRoles`),
// puis les autres comptes et les noms déjà écrits dans la grille ; un nom sans
// compte s'écrit à la main.
//
// Module PUR : aucune dépendance Firebase ni réseau.

import type { ServiceRole } from "@/types/user"
import type { DefinitionGrille } from "./grilles"
import { normalizeName, splitNames } from "./names"

/** Un compte tel que « Choisir » le lit (users/{uid}). */
export type CompteDuPlanning = {
  /** Nom de planning (`planningName`) : ce qui s'écrit dans la case. */
  nom: string
  prenom: string
  nomDeFamille: string
  serviceRoles: Record<string, readonly string[]>
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
  fideliteMusiciens: "Groupe Fidélité",
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
  piano: "musicien", pianiste: "musicien", guitare: "musicien", batterie: "musicien",
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

  const personnes = definition.colonnes.filter((c) => colonneDePersonnes(c.cle))
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
