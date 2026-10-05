// Petit déj (lot U3, docs/spec-petit-dej.md) : les inscriptions `petitDej/{id}`,
// une ligne par document, seule source interrupteur ouvert (T8).
//
// Lecture PUBLIQUE en REST, sans jeton, comme `fetchGrille` (Q10) : les pages et
// le cron lisent le même code. Aucun import de `src/lib/firebase/*` ici : ce
// module est appelé par `sheets.ts`, donc aussi par le cron (runtime Node), où
// le SDK client n'a rien à faire. Les écritures, avec jeton :
// src/lib/firebase/petitDej.ts. Le reste du module est pur.

import type { LignePetitDej } from "@/types/petitDej"
import { normalizeName, splitNames, type ServiceEntry } from "@/lib/planning/names"

const FS_DOCS =
  "https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents"

// Même cache court que `fetchGrille` : une page appelle `fetchTable`,
// `fetchDejeuner` et `fetchPetitDej` au montage, une seule requête part.
const TTL_MS = 5 * 60_000
let cache: { at: number; lignes: LignePetitDej[] } | null = null
let enVol: Promise<LignePetitDej[]> | null = null
// Une lecture partie AVANT une écriture ne doit pas remettre en cache l'état d'avant.
let generation = 0

type Doc = { name: string; fields?: Record<string, { stringValue?: string }> }

/** Par dimanche, puis dans l'ordre d'inscription. */
const parOrdre = (a: LignePetitDej, b: LignePetitDej) =>
  a.dimanche.localeCompare(b.dimanche) || a.creeLe.localeCompare(b.creeLe) || a.id.localeCompare(b.id)

/**
 * Toutes les lignes, par dimanche puis dans l'ordre d'inscription. **Une
 * lecture en échec est une erreur**, jamais « personne » (Q10) : à l'appelant
 * de ne dire ni « Libre » ni d'envoyer la ligne du mercredi.
 */
export function lirePetitDej(): Promise<LignePetitDej[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.lignes)
  if (!enVol) {
    const promesse = lire(generation).finally(() => { if (enVol === promesse) enVol = null })
    enVol = promesse
  }
  return enVol
}

async function lire(gen: number): Promise<LignePetitDej[]> {
  const res = await fetch(`${FS_DOCS}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "petitDej" }],
        orderBy: [{ field: { fieldPath: "dimanche" }, direction: "ASCENDING" }],
      },
    }),
  })
  if (!res.ok) throw new Error(`Inscriptions au petit déj illisibles (HTTP ${res.status})`)
  const lignes = ((await res.json()) as { document?: Doc }[]).flatMap(({ document }) => {
    const champ = (cle: string) => document?.fields?.[cle]?.stringValue ?? ""
    if (!document || !champ("dimanche")) return []
    return [{
      id: document.name.split("/").pop()!,
      dimanche: champ("dimanche"),
      nom: champ("nom"),
      uid: champ("uid"),
      auteurUid: champ("auteurUid"),
      creeLe: champ("creeLe"),
      modifieLe: champ("modifieLe"),
    }]
  }).sort(parOrdre)
  if (gen === generation) cache = { at: Date.now(), lignes }
  return lignes
}

/** Oublie le cache — après chaque écriture, pour que la page relue reparte de la base. */
export function oublierPetitDej(): void {
  generation++
  cache = null
  enVol = null
}

/** `[dimanche, textes joints par « , »]`, la forme de `PlanningData.petitDej` :
 *  `loadPlanningData` et ses appelants ne changent pas. Un dimanche sans ligne est absent. */
export function rangeesPetitDej(lignes: LignePetitDej[]): string[][] {
  const parDimanche = new Map<string, string[]>()
  for (const l of [...lignes].sort(parOrdre)) parDimanche.set(l.dimanche, [...(parDimanche.get(l.dimanche) ?? []), l.nom])
  return [...parDimanche].map(([dimanche, noms]) => [dimanche, noms.join(", ")])
}

/** Un dimanche sans aucune ligne (T2 : pas de compteur de places). */
export function estLibre(lignes: LignePetitDej[], dimanche: string): boolean {
  return !lignes.some((l) => l.dimanche === dimanche)
}

/**
 * Les petits déj rattachés à un compte par son `uid` (Q9) : une ligne posée par
 * « Je m'inscris » compte pour son inscrit même réécrite (« Famille Martin ») et
 * sans nom de planning. Un dimanche dont une ligne porte déjà son nom de
 * planning est laissé à `findMyServices`, qui le trouve dans les rangées : pas
 * de doublon. Une ligne posée pour quelqu'un (`uid` vide) ne se rattache que par
 * son texte.
 */
export function servicesPetitDejDuCompte(lignes: LignePetitDej[], uid: string, planningName: string): ServiceEntry[] {
  if (!uid) return []
  const nom = normalizeName(planningName)
  const porteSonNom = (texte: string) => !!nom && splitNames(texte).some((n) => normalizeName(n) === nom)
  const trouvesParLeNom = new Set(lignes.filter((l) => porteSonNom(l.nom)).map((l) => l.dimanche))
  const dates = new Set(lignes.filter((l) => l.uid === uid && !trouvesParLeNom.has(l.dimanche)).map((l) => l.dimanche))
  return [...dates].sort().map((date) => ({ date, service: "Petit déj", role: "Équipe", leader: "" }))
}

/**
 * La reprise, une fois (T11, Q13) : `grille` est la grille Table telle qu'elle
 * s'affichait avant U3 (`[date, équipe, petit déj]`). Une ligne par case
 * remplie d'un dimanche ≥ `dimancheEnCours` qui n'a encore aucune ligne, texte
 * tel quel ; `ignores` compte les dimanches déjà inscrits. Relancer n'écrit rien.
 */
export function planifierReprise(
  grille: string[][],
  lignes: LignePetitDej[],
  dimancheEnCours: string,
): { aEcrire: { dimanche: string; nom: string }[]; ignores: number } {
  const aEcrire: { dimanche: string; nom: string }[] = []
  let ignores = 0
  for (const [dimanche, , texte] of grille) {
    const nom = (texte ?? "").trim()
    if (dimanche < dimancheEnCours || !nom) continue
    if (estLibre(lignes, dimanche)) aEcrire.push({ dimanche, nom })
    else ignores++
  }
  return { aEcrire, ignores }
}
