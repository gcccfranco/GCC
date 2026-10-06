// Petit déj (lot U3, docs/spec-petit-dej.md) : les inscriptions `petitDej/{id}`,
// une ligne par document, seule source interrupteur ouvert (T8).
//
// Lecture PUBLIQUE en REST, sans jeton, comme `fetchGrille` (Q10) : les pages et
// le cron lisent le même code. Aucun import de `src/lib/firebase/*` ici : ce
// module est appelé par `sheets.ts`, donc aussi par le cron (runtime Node), où
// le SDK client n'a rien à faire. Les écritures, avec jeton :
// src/lib/firebase/petitDej.ts. Le reste du module est pur.

import type { LignePetitDej } from "@/types/petitDej"
import type { ReminderService } from "@/lib/push/reminderMessage"

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

/** La grille Table `[date, équipe, petit déj]` dont la colonne 2 devient les
 *  rangées des inscriptions (T9), même un dimanche que la grille ignore : la
 *  lecture (`fetchTable`) et la page, qui la suit après chaque écriture de la carte. */
export function avecPetitDej(rows: string[][], rangees: string[][]): string[][] {
  const parDate = new Map(rows.map((r) => [r[0], [r[0], r[1] ?? "", ""]]))
  for (const [date, noms] of rangees) parDate.set(date, [date, parDate.get(date)?.[1] ?? "", noms])
  return [...parDate.values()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
}

/** Un dimanche sans aucune ligne (T2 : pas de compteur de places). */
export function estLibre(lignes: Pick<LignePetitDej, "dimanche">[], dimanche: string): boolean {
  return !lignes.some((l) => l.dimanche === dimanche)
}

/**
 * Rappels J-7 / J-3 / J-1 (PD3, Q9), sur le patron des créneaux de scène :
 * « Petit déj » ajouté aux services de chaque inscrit (`uid`) du dimanche
 * `date`, même sans nom de planning ; une seule fois (déjà trouvé par son nom
 * de planning : rien de plus). Une ligne posée pour quelqu'un (`uid` vide) ne
 * prévient personne par ce chemin. Les listes de `parUid` ne sont pas modifiées
 * (le cron en partage une entre les comptes d'un même nom) : remplacées.
 */
export function ajouterPetitDejAuxRappels(parUid: Map<string, ReminderService[]>, lignes: LignePetitDej[], date: string): void {
  for (const uid of new Set(lignes.filter((l) => l.dimanche === date && l.uid).map((l) => l.uid))) {
    const siens = parUid.get(uid) ?? []
    if (!siens.some((s) => s.service === "Petit déj")) parUid.set(uid, [...siens, { service: "Petit déj", roles: [] }])
  }
}
