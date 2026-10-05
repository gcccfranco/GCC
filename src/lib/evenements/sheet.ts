// Lecteur du Sheet « [2026-2027] Calendrier des événements » (lot U8, tranche
// C1, docs/spec-calendrier.md Q9-Q10). Il fait foi jusqu'en décembre 2026 ;
// lecture seule, jamais d'écriture.
//
// Un onglet par mois : en tête « OCTOBRE 2026 — … », puis une grille lundi →
// dimanche de quatre colonnes par jour (Nom, Heure, Lieu, Resp.) à partir de la
// colonne 1 ; chaque semaine tient trois lignes (les numéros de jour, puis deux
// lignes d'entrées). À droite (colonne 30 et au-delà) la liste « Aperçu », qui
// perd les entrées sans responsable : jamais lue. Dessous, les blocs
// « INSCRIPTIONS » (noms, téléphones) : la lecture s'arrête avant.
//
// Lu par l'export brut de chaque onglet, pas par gviz : gviz efface les noms de
// la colonne « Nom », où les numéros de jour dominent (vérifié le 04/10/2026).

export const SHEET_EVENEMENTS_ID = "12FxK1sMrk08bFrVnL7BjCTJd6FXTqvRXyZoyDYhgPU8"

/** Mois → gid de son onglet. Août → décembre 2026 : U9 n'en ajoute aucun. */
export const ONGLETS_SHEET: Record<string, number> = {
  "2026-08": 1458766095,
  "2026-09": 981833936,
  "2026-10": 439766955,
  "2026-11": 1033601810,
  "2026-12": 484545153,
}

export interface EntreeSheet {
  date: string        // AAAA-MM-JJ
  titre: string
  heure: string       // « HH:MM » ou ""
  heureFin: string
  horaire: string     // le texte de la case « Heure », tel quel
  lieu: string
  responsable: string
}

/** `injoignable` : un onglet n'a pu être lu et aucune copie n'en restait (bandeau). */
export interface LectureSheet {
  entrees: EntreeSheet[]
  injoignable: boolean
}

/** Ce que le lecteur prend du monde : remplacé dans les tests. */
export interface EnvSheet {
  fetch: (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>
  maintenant: () => number
  cache: Map<string, { at: number; entrees: EntreeSheet[] }>
}

const urlExport = (gid: number) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_EVENEMENTS_ID}/export?format=csv&gid=${gid}`

/** L'onglet du mois d'une date, à ouvrir dans le navigateur (fiche du calendrier, widget 3). */
export function lienOngletSheet(date: string): string {
  const gid = ONGLETS_SHEET[date.slice(0, 7)]
  return `https://docs.google.com/spreadsheets/d/${SHEET_EVENEMENTS_ID}/edit${gid ? `#gid=${gid}` : ""}`
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

/** CSV de l'export : virgules et retours à la ligne entre guillemets gardés, lignes vides comprises
 *  (les rangs comptent dans la grille). */
export function lireCSV(texte: string): string[][] {
  const lignes: string[][] = []
  let ligne: string[] = []
  let cellule = ""
  let entreGuillemets = false
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (entreGuillemets) {
      if (c !== '"') cellule += c
      else if (texte[i + 1] === '"') { cellule += '"'; i++ }
      else entreGuillemets = false
    } else if (c === '"') entreGuillemets = true
    else if (c === ",") { ligne.push(cellule); cellule = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++
      ligne.push(cellule); lignes.push(ligne)
      ligne = []; cellule = ""
    } else cellule += c
  }
  if (cellule || ligne.length) { ligne.push(cellule); lignes.push(ligne) }
  return lignes
}

// ─── Heures ───────────────────────────────────────────────────────────────────

const UNE_HEURE = String.raw`(\d{1,2})(?:[hH](\d{2})?|:(\d{2}))`
const PLAGE = new RegExp(`^${UNE_HEURE}(?:\\s*[-–—]\\s*${UNE_HEURE})?$`)

function hhmm(h: string, m = "0"): string | null {
  const H = Number(h), M = Number(m)
  return H < 24 && M < 60 ? `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}` : null
}

/** Heures en texte libre : « 20h » → 20:00, « 19h-21h » → 19:00 et 21:00 ; tout autre texte, sans heure. */
export function heureDuSheet(texte: string): { heure: string; heureFin: string } {
  const sans = { heure: "", heureFin: "" }
  const m = texte.trim().match(PLAGE)
  if (!m) return sans
  const heure = hhmm(m[1], m[2] ?? m[3])
  const heureFin = m[4] ? hhmm(m[4], m[5] ?? m[6]) : ""
  return heure && heureFin !== null ? { heure, heureFin } : sans
}

// ─── Onglet d'un mois ─────────────────────────────────────────────────────────

const MOIS_MAJ = ["JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOUT",
  "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"]
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()

/** Grille : sept jours de quatre colonnes (Nom, Heure, Lieu, Resp.), à partir de la colonne 1. */
const JOURS = 7, LARGEUR = 4, DEBUT = 1

/** Les numéros de jour d'une ligne de semaine (null hors du mois), ou null si la ligne n'en est
 *  pas une : dans la grille, rien d'autre qu'un nombre en tête de chaque jour. */
function numerosDuJour(ligne: string[]): (number | null)[] | null {
  const jours: (number | null)[] = []
  for (let k = 0; k < JOURS; k++) {
    const c = DEBUT + LARGEUR * k
    if (ligne.slice(c + 1, c + LARGEUR).some((v) => v.trim())) return null
    const v = (ligne[c] ?? "").trim()
    if (v && !/^\d{1,2}$/.test(v)) return null
    jours.push(v ? Number(v) : null)
  }
  return jours.some((j) => j !== null) ? jours : null
}

/** Les entrées de la grille d'un onglet (`mois` = AAAA-MM). Un titre d'onglet qui n'est pas ce
 *  mois (onglet déplacé, page de connexion) ne donne rien. */
export function lireMoisSheet(rows: string[][], mois: string): EntreeSheet[] {
  const [annee, m] = mois.split("-").map(Number)
  if (!sansAccents((rows[0]?.[0] ?? "").trim()).startsWith(`${MOIS_MAJ[m - 1]} ${annee}`)) return []
  const dernierJour = new Date(Date.UTC(annee, m, 0)).getUTCDate()
  const inscriptions = rows.findIndex((r) => /^INSCRIPTIONS/i.test((r[0] ?? "").trim()))
  const fin = inscriptions < 0 ? rows.length : inscriptions
  const cellule = (r: number, c: number) => (r < fin ? (rows[r][c] ?? "").trim() : "")

  const entrees: EntreeSheet[] = []
  for (let r = 1; r < fin; r++) {
    const jours = numerosDuJour(rows[r])
    if (!jours) continue
    jours.forEach((jour, k) => {
      if (!jour || jour > dernierJour) return
      const c = DEBUT + LARGEUR * k
      for (const sous of [r + 1, r + 2]) {
        const titre = cellule(sous, c)
        if (!titre) continue
        const horaire = cellule(sous, c + 1)
        entrees.push({
          date: `${mois}-${String(jour).padStart(2, "0")}`,
          titre,
          ...heureDuSheet(horaire),
          horaire,
          lieu: cellule(sous, c + 2),
          responsable: cellule(sous, c + 3),
        })
      }
    })
  }
  return entrees
}

// ─── Réseau, cache, panne ─────────────────────────────────────────────────────

/** Comme le planning (`fetchSheet`, src/lib/planning/sheets.ts) : 5 minutes en mémoire, vidée à
 *  chaque rechargement de la page ; la dernière copie resservie si le réseau tombe. Une requête
 *  qui pend est abandonnée au bout de 8 secondes (panne : copie ou bandeau). */
const TTL_MS = 5 * 60_000
const DELAI_MS = 8_000
const ENV: EnvSheet = {
  // `AbortSignal.timeout` manque aux vieux Safari (avant 16) : sans lui, pas de délai.
  fetch: (url) => fetch(url, { cache: "no-store", signal: AbortSignal.timeout?.(DELAI_MS) }),
  maintenant: () => Date.now(),
  cache: new Map(),
}

/** Lectures en cours, par cache puis par mois : deux widgets qui demandent le même onglet en même
 *  temps (tableau de bord) n'envoient qu'une requête. */
const enVol = new WeakMap<EnvSheet["cache"], Map<string, Promise<LectureSheet>>>()

/** L'onglet d'un mois (AAAA-MM). Un mois sans onglet (avant août, après décembre 2026) : rien. */
export function chargerMoisSheet(mois: string, env: Partial<EnvSheet> = {}): Promise<LectureSheet> {
  const { maintenant, cache } = { ...ENV, ...env }
  const gid = ONGLETS_SHEET[mois]
  if (typeof gid !== "number") return Promise.resolve({ entrees: [], injoignable: false })
  const copie = cache.get(mois)
  if (copie && maintenant() - copie.at < TTL_MS) return Promise.resolve({ entrees: copie.entrees, injoignable: false })
  const lectures = enVol.get(cache) ?? new Map<string, Promise<LectureSheet>>()
  enVol.set(cache, lectures)
  const deja = lectures.get(mois)
  if (deja) return deja
  const promesse = lireMois(mois, gid, { ...ENV, ...env }).finally(() => lectures.delete(mois))
  lectures.set(mois, promesse)
  return promesse
}

async function lireMois(mois: string, gid: number, { fetch: lire, maintenant, cache }: EnvSheet): Promise<LectureSheet> {
  const copie = cache.get(mois)
  try {
    const res = await lire(urlExport(gid))
    if (!res.ok) throw new Error("Sheet des évènements : réponse en erreur")
    const entrees = lireMoisSheet(lireCSV(await res.text()), mois)
    cache.set(mois, { at: maintenant(), entrees })
    return { entrees, injoignable: false }
  } catch {
    return copie ? { entrees: copie.entrees, injoignable: false } : { entrees: [], injoignable: true }
  }
}

/** Les mois (AAAA-MM) touchés par la période. */
function moisEntre(debut: string, fin: string): string[] {
  const liste: string[] = []
  let [a, m] = debut.slice(0, 7).split("-").map(Number)
  for (let cle = debut.slice(0, 7); cle <= fin.slice(0, 7); cle = `${a}-${String(m).padStart(2, "0")}`) {
    liste.push(cle)
    if (++m > 12) { m = 1; a++ }
  }
  return liste
}

/** Les entrées du Sheet entre `debut` et `fin` (AAAA-MM-JJ, bornes comprises) : l'onglet de chaque
 *  mois affiché. Un onglet en panne n'efface pas les autres. */
export async function lireSheetEvenements(debut: string, fin: string, env: Partial<EnvSheet> = {}): Promise<LectureSheet> {
  const lus = await Promise.all(moisEntre(debut, fin).map((mois) => chargerMoisSheet(mois, env)))
  return {
    entrees: lus.flatMap((l) => l.entrees).filter((e) => e.date >= debut && e.date <= fin),
    injoignable: lus.some((l) => l.injoignable),
  }
}
