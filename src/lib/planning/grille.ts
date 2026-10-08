// Lecture de la grille remplie dans l'app (lot 17, décisions D1 à D3).
//
// Lecture PUBLIQUE en REST, sans jeton, exactement comme `planningReleases`
// (releases.ts l. 83-102) : les pages planning se consultent sans compte, et le
// CSV gviz du Google Sheet l'est déjà aujourd'hui. Aucun import de
// `src/lib/firebase/*` ici : ce module est appelé par `sheets.ts`, donc aussi
// par le cron (runtime Node), où le SDK client n'a rien à faire.

import { GRILLES, grilleDe, type DefinitionGrille } from "./grilles"

/** Plannings dont la source est l’app (D2) : tous depuis le 19/09/2026
 *  (« pouvoir modifier tous les plannings sur le site »). */
export const PLANNINGS_APP = GRILLES.map((g) => g.key)

export function ecritDansLApp(key: string): boolean {
  return PLANNINGS_APP.includes(key)
}

const FS_DOCS =
  "https://firestore.googleapis.com/v1/projects/gcclouange/databases/(default)/documents"

// Même cache court que `fetchSheet` (sheets.ts l. 64-83) : les pages planning
// sont des composants client, sans quoi chaque montage relit la grille.
const TTL_MS = 5 * 60_000
/** `ecrites` : les cases présentes dans les documents, `date|clé` (voir `fetchCasesEcrites`). */
type EnCache = { at: number; rows: string[][]; ecrites: Set<string> }
const cache = new Map<string, EnCache>()
// La page appelle `fetchGrille` deux fois au montage (par `fetchCulte` et pour
// savoir quels dimanches existent déjà) : une seule requête part.
const enVol = new Map<string, Promise<string[][]>>()

type Doc = { fields?: Record<string, { stringValue?: string }> }

/**
 * Les dimanches écrits dans l'app, dans la forme de `fetchCulte` (date ISO puis
 * les cases à l'index de leur colonne), triés. Erreur réseau : dernier cache,
 * sinon vide — la grille vide laisse simplement le Google Sheet parler.
 */
export function fetchGrille(key: string): Promise<string[][]> {
  const def = grilleDe(key)
  if (!def) return Promise.resolve([])
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.rows)
  const enCours = enVol.get(key)
  if (enCours) return enCours
  const promesse = lireGrille(key, def, hit).finally(() => enVol.delete(key))
  enVol.set(key, promesse)
  return promesse
}

async function lireGrille(
  key: string,
  def: DefinitionGrille,
  hit: EnCache | undefined
): Promise<string[][]> {
  try {
    const res = await fetch(`${FS_DOCS}/plannings/${key}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "dimanches" }],
          orderBy: [{ field: { fieldPath: "date" }, direction: "ASCENDING" }],
        },
      }),
    })
    if (!res.ok) return hit?.rows ?? []
    const largeur = Math.max(...def.colonnes.map((c) => c.index)) + 1
    const ecrites = new Set<string>()
    const rows = ((await res.json()) as { document?: Doc }[]).flatMap(({ document }) => {
      const champs = document?.fields
      const date = champs?.date?.stringValue
      if (!date) return []
      const row = Array<string>(largeur).fill("")
      row[0] = date
      for (const c of def.colonnes) {
        row[c.index] = champs?.[c.cle]?.stringValue ?? ""
        if (champs?.[c.cle] !== undefined) ecrites.add(`${date}|${c.cle}`)
      }
      return [row]
    })
    cache.set(key, { at: Date.now(), rows, ecrites })
    return rows
  } catch {
    return hit?.rows ?? []
  }
}

/**
 * Les cases présentes dans les documents de la grille, `date|clé`. `fetchGrille` rend "" aussi bien
 * pour une case vidée dans l'app (écrite à "") que pour un champ jamais écrit : seul ce dernier peut
 * être repris d'un autre planning (lot F, `completerMusiciensFidelite`), sans quoi une case vidée
 * reviendrait à la relecture. Même lecture et même cache que `fetchGrille`.
 */
export async function fetchCasesEcrites(key: string): Promise<Set<string>> {
  await fetchGrille(key)
  return cache.get(key)?.ecrites ?? new Set()
}

/** Oublie le cache d'un planning — après une écriture, pour que la page relue
 *  reparte de la grille et non d'un instantané d'il y a cinq minutes. */
export function oublierGrille(key: string): void {
  cache.delete(key)
}
