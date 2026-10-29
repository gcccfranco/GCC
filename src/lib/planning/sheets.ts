import { delaiMax } from "@/lib/delaiMax";
import type { EddDataStructure, EddPeriode, CampusSeance } from "./utils"
import { EDD_CLASSES, EDD_PERIODES, getMois } from "./utils"
import { fetchCasesEcrites, fetchGrille } from "./grille"
import { BACK_OFFICE } from "@/lib/backOffice"
import { lireCSV } from "@/lib/csv"
import { CLES_EDD, completerMusiciensFidelite, fusionnerLignes } from "./grilles"
import { avecPetitDej, lirePetitDej, rangeesPetitDej } from "@/lib/petitdej/lignes"

/** Les dimanches écrits dans l'app. Back-office coupé (lot 18) : aucun — le site
 *  en ligne lit le Google Sheet seul. Local et en ligne partagent le même
 *  Firestore : sans cela, un dimanche saisi en local masquerait le Sheet en ligne. */
const grilleDeLApp = (key: string) => (BACK_OFFICE ? fetchGrille(key) : Promise.resolve([] as string[][]))


const SHEET_ID = "1khxUvrKSnrqtkkdCsmXiCjW3TjWcSV38otYOGMO5klU"
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`

function csvUrl(sheet: string) {
  return BASE_URL + encodeURIComponent(sheet)
}

/** CSV du planning : l'automate commun (`lireCSV`, src/lib/csv.ts) garde virgules, guillemets doublés
 *  et retours à la ligne entre guillemets. Cellules sans espaces de bord ; un retour à la ligne DANS
 *  une cellule devient une espace (« Pasteur X⏎(à confirmer) » → « Pasteur X (à confirmer) ») : les
 *  noms se découpent sur , ; / (`splitNames`), pas sur la fin de ligne, et un saut brut resterait
 *  dans le nom affiché. Les lignes blanches sont ignorées. */
export function parseCSV(txt: string): string[][] {
  const rows: string[][] = []
  for (const brute of lireCSV(txt)) {
    if (brute.length === 1 && !brute[0].trim()) continue
    rows.push(brute.map(c => c.replace(/\s*[\r\n]+\s*/g, " ").trim()))
  }
  return rows
}

/** Année des dates JJ/MM du Google Sheet : c'est le fichier du planning 2026
 *  (« [2026 QG] Planning »), qui le restera — le planning 2027 se fait dans
 *  l'app (lot U2, docs/spec-planning-2027.md). Deviner l'année d'après la date
 *  du jour rangeait, dès le 1er novembre, les dimanches de janvier-février du
 *  Sheet dans l'année suivante : services fantômes dans « Mes services » et les
 *  rappels. */
export const ANNEE_DU_SHEET = 2026

export function parseDate(s: string): string | null {
  if (!s) return null
  s = s.replace(/"+/g, "").trim()
  const m1 = s.match(/Date\((\d+),(\d+),(\d+)\)/)
  if (m1) return `${m1[1]}-${String(+m1[2]+1).padStart(2,"0")}-${String(+m1[3]).padStart(2,"0")}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}`
  const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (m3) return `20${m3[3]}-${m3[2].padStart(2,"0")}-${m3[1].padStart(2,"0")}`
  // DD/MM sans année — format utilisé par la plupart des feuilles (Culte, Groupes, Déjeuner…)
  const m4 = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (m4) return `${ANNEE_DU_SHEET}-${m4[2].padStart(2,"0")}-${m4[1].padStart(2,"0")}`
  return null
}

// Cache mémoire court des CSV récupérés. Les pages planning sont des composants
// client : sans ça, chaque montage / navigation entre onglets re-télécharge les
// ~10 feuilles. Vidé au rechargement complet de la page (et par instance serveur).
const SHEET_TTL_MS = 5 * 60_000
/** Une requête qui pend est abandonnée au bout de 8 secondes (comme le lecteur des évènements). */
const SHEET_DELAI_MS = 8_000
const sheetCache = new Map<string, { at: number; rows: string[][] }>()

// Lectures réseau tentées et ratées depuis la dernière remise à zéro : le cron du matin les compte
// (une panne du Sheet n'y doit pas passer pour un planning vide).
let tentativesSheet = 0
let echecsSheet: string[] = []
// Lectures ratées dont la dernière copie en mémoire a été resservie : le navigateur (useSheet) compare ce
// compteur avant et après une lecture pour savoir que les lignes reçues peuvent être périmées.
let copiesServies = 0

/** Remet à zéro le décompte des lectures (début du cron). */
export function reinitialiserLecturesSheet(): void {
  tentativesSheet = 0
  echecsSheet = []
}

/** Lectures réseau tentées et onglets dont la lecture a échoué (copie en mémoire resservie ou non). */
export function lecturesSheet(): { tentatives: number; echecs: string[] } {
  return { tentatives: tentativesSheet, echecs: [...echecsSheet] }
}

/** Nombre de fois où une lecture ratée a été remplacée par la copie en mémoire (jamais remis à zéro). */
export function copiesServiesSheet(): number {
  return copiesServies
}

/** Cellule comparable : sans accents ni casse, sans espaces de bord. */
const reperer = (c: string) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

/** Un mot qui se lit dans la ligne d'en-tête de l'onglet (une cellule le contient, parmi les 15 premières lignes).
 *  Un onglet renommé ou supprimé fait rendre à gviz le PREMIER onglet du classeur en 200 text/csv : sans ce
 *  repère, ses lignes passeraient pour celles de l'onglet demandé. Les onglets sans repère connu ne sont pas vérifiés
 *  (Franco_Table_PtD, Franco_Louange, Fidélité, Intergroupe, Interfranco) : pour eux, seul le repère commun du premier
 *  onglet joue. */
const REPERES_ENTETE: { onglet: RegExp; repere: string }[] = [
  { onglet: /^EDD$/, repere: "suppleant" },
  { onglet: /^Campus_Louange$/, repere: "moment" },
  { onglet: /^Paix[ _]*_T\d$/, repere: "musiciens" },
]

/** La ligne d'en-tête attendue de l'onglet se retrouve-t-elle dans ce CSV ? Un CSV vide : oui ; le calendrier des réunions
 *  (premier onglet) : non ; un onglet sans repère connu : oui. Repères relus sur le Sheet le 24/10/2026. */
export function enTeteAttendu(sheet: string, rows: string[][]): boolean {
  if (!rows.length) return true
  // Repère commun : le premier onglet du classeur (rendu pour un nom introuvable) est le calendrier des réunions,
  // qu'aucun planning lu ici n'est (vérifié sur le Sheet le 24/10/2026).
  if (reperer(rows[0]?.[0] ?? "").startsWith("calendrier des reunions")) return false
  const attendu = REPERES_ENTETE.find((r) => r.onglet.test(sheet))
  if (!attendu) return true
  return rows.slice(0, 15).some((r) => r.some((c) => reperer(c).includes(attendu.repere)))
}

export async function fetchSheet(sheet: string): Promise<string[][]> {
  const hit = sheetCache.get(sheet)
  if (hit && Date.now() - hit.at < SHEET_TTL_MS) return hit.rows
  tentativesSheet++
  try {
    const res = await fetch(csvUrl(sheet), { cache: "no-store", signal: delaiMax(SHEET_DELAI_MS) })
    if (!res.ok) throw new Error(`Sheet « ${sheet} » : réponse ${res.status}`)
    const texte = await res.text()
    // Google rend parfois une page HTML (connexion, erreur) avec un statut 200 : pas un CSV.
    if (/text\/html/i.test(res.headers?.get("content-type") ?? "") || texte.trimStart().startsWith("<")) {
      throw new Error(`Sheet « ${sheet} » : réponse HTML au lieu du CSV`)
    }
    const rows = parseCSV(texte)
    if (!enTeteAttendu(sheet, rows)) throw new Error(`Sheet « ${sheet} » : en-tête inattendu (onglet d'un autre nom ?)`)
    sheetCache.set(sheet, { at: Date.now(), rows })
    return rows
  } catch {
    // Un échec ne remplace JAMAIS la copie en mémoire : on réutilise la dernière si on en a une,
    // sinon vide (loadPlanningData basculera alors sur les données de secours statiques).
    echecsSheet.push(sheet)
    if (hit) copiesServies++
    return hit?.rows ?? []
  }
}

/** Relit une fois les onglets dont la lecture a échoué. Rend ceux qui échouent encore (chacun une fois). */
export async function relireOnglets(noms: readonly string[]): Promise<string[]> {
  const uniques = [...new Set(noms)]
  echecsSheet = echecsSheet.filter((n) => !uniques.includes(n))
  await Promise.all(uniques.map((n) => fetchSheet(n)))
  return uniques.filter((n) => echecsSheet.includes(n))
}

// ─── Lecture brute du Sheet, grille par grille ────────────────────────────────
//
// Chaque `lire…Sheet` rend l'onglet dans la forme de sa grille (date ISO puis
// les cases à l'index de leur colonne, cf. grilles.ts) SANS la grille de l'app.
// Chaque `fetch…` public rend la même forme, grille de l'app fusionnée dimanche
// par dimanche (lot 17, D2) : les dix appelants de `loadPlanningData` — « Ce
// dimanche », « Mes services », les rappels, les setlists — ne voient rien.
// La lecture brute sert à l'import initial (G4).

// Colonnes 1–11 : présidence … traduction, puis « Sainte cène » (index 11,
// ajoutée au T4 2026). Jamais au-delà : les colonnes suivantes portent des
// notes de travail.
export async function lireCulteSheet(): Promise<string[][]> {
  const rows = await fetchSheet("Franco_Louange")
  return rows.flatMap(r => {
    const dt = parseDate(r[0])
    if (!dt) return []
    return [[dt, r[1]||"", r[2]||"", r[3]||"", r[4]||"", r[5]||"", r[6]||"", r[7]||"", r[8]||"", r[9]||"", r[10]||"", r[11]||""]]
  })
}

export async function fetchCulte(): Promise<string[][]> {
  return fusionnerLignes(await grilleDeLApp("culte"), await lireCulteSheet())
}

// Prépa. Table + petit déjeuner : l'onglet Franco_Table_PtD porte deux paires
// DATE / équipe côte à côte (colonnes 1–5 et 7–11) et, plus loin, le bloc
// « PETIT DÉJEUNER » (deux paires DATE / NOM, colonnes 17–18 et 19–20, lot 1b).
// La grille « table » réunit les deux : [date, équipe, petit déj].
function equipeDe(cells: (string | undefined)[]): string {
  return cells.filter(v => v && v !== "---" && v !== "—" && !v.includes("Équipe") && v.trim()).join(", ")
}

/** Bloc « PETIT DÉJEUNER » (lot 1b) : les cases portent plusieurs personnes
 *  avec un « & » (« Charlie & Isabelle ») : on rend une liste séparée par des
 *  virgules, la seule que `splitNames` sache découper. Une case vide ne donne
 *  pas de ligne. Pur, donc testable. */
export function parsePetitDej(rows: string[][]): string[][] {
  const out: string[][] = []
  for (const r of rows) {
    for (const [iDate, iNom] of [[17, 18], [19, 20]]) {
      const date = parseDate(r[iDate] ?? "")
      const noms = (r[iNom] ?? "").replace(/"+/g, "").split("&").map(s => s.trim()).filter(Boolean).join(", ")
      if (date && noms) out.push([date, noms])
    }
  }
  return out
}

export async function lireTableSheet(): Promise<string[][]> {
  const rows = await fetchSheet("Franco_Table_PtD")
  const parDate = new Map<string, string[]>()
  const ligne = (d: string) => { const l = parDate.get(d) ?? [d, "", ""]; parDate.set(d, l); return l }
  for (const r of rows) {
    const dL = parseDate(r[1])
    if (dL) { const eq = equipeDe([r[2], r[3], r[4], r[5]]); if (eq && !ligne(dL)[1]) ligne(dL)[1] = eq }
    const dR = parseDate(r[7])
    if (dR) { const eq = equipeDe([r[8], r[9], r[10], r[11]]); if (eq && !ligne(dR)[1]) ligne(dR)[1] = eq }
  }
  for (const [d, noms] of parsePetitDej(rows)) ligne(d)[2] = noms
  return [...parDate.values()].sort((a, b) => a[0] < b[0] ? -1 : 1)
}

/** Petit déj, interrupteur ouvert (lot U3, docs/spec-petit-dej.md) : les
 *  inscriptions sont la seule source (T8), le Sheet ne parle plus. Une lecture en
 *  échec rend vide ici ; la carte de l'onglet Table, elle, le dit (Q10). Coupé :
 *  jamais lues, Firestore étant partagé entre le local et le site en ligne (Q14). */
const rangeesDesInscriptions = () => lirePetitDej().then(rangeesPetitDej, () => [] as string[][])

/** [date, équipe, petit déj] : la grille « table » réunie au Sheet ; ouvert, la
 *  colonne 2 porte les inscriptions (T9), même un dimanche que le Sheet ignore. */
export async function fetchTable(): Promise<string[][]> {
  const inscriptions = BACK_OFFICE ? rangeesDesInscriptions() : null
  const rows = fusionnerLignes(await grilleDeLApp("table"), await lireTableSheet())
  return inscriptions ? avecPetitDej(rows, await inscriptions) : rows
}

/** [date, équipe] des dimanches où une équipe est inscrite. */
export async function fetchDejeuner(): Promise<string[][]> {
  return (await fetchTable()).filter(r => r[1]).map(r => [r[0], r[1]])
}

/** [date, noms] des dimanches où un petit déj est inscrit. */
export async function fetchPetitDej(): Promise<string[][]> {
  if (BACK_OFFICE) return rangeesDesInscriptions()
  return (await fetchTable()).filter(r => r[2]).map(r => [r[0], r[2]])
}

async function fetchMulti(sheets: string[], cols: number): Promise<string[][]> {
  const all: string[][] = []
  await Promise.all(sheets.map(sh => fetchSheet(sh).then(rows => {
    for (const r of rows) {
      const dt = parseDate(r[0])
      if (!dt) continue
      const row = [dt]
      for (let i = 1; i <= cols; i++) row.push(r[i]||"")
      all.push(row)
    }
  })))
  return all.sort((a, b) => a[0] < b[0] ? -1 : 1)
}

// Paix et Bonté : PERCUSSION en colonne 5 (lot U2, P5 ; Paix T4, Bonté T3 et
// T4 en 2026), jamais MÉNAGES (colonne 6, vide). Lue derrière l'interrupteur
// (Q14) : en ligne, l'ancien tableau, « Mes services » et les rappels lisent le
// Sheet comme avant.
const COLONNES_GROUPE = BACK_OFFICE ? 5 : 4
export const lirePaixSheet = () => fetchMulti(["Paix_T1","Paix _T2","Paix _T3","Paix_T4"], COLONNES_GROUPE)
export const lireFideliteSheet = () => fetchMulti(["Fidélité_T1","Fidélité_T2","Fidélité_T3","Fidélité_T4"], 4)
export const lireBonteSheet = () => fetchMulti(["Bonté_T1","Bonté _T2","Bonté _T3","Bonté_T4"], COLONNES_GROUPE)

export async function lireFideliteMusiciensSheet(): Promise<string[][]> {
  const rows = await fetchSheet("Fidélité_Musicien")
  return rows.flatMap(r => {
    const dt = parseDate(r[1])
    if (!dt) return []
    return [[dt, r[2]||"", r[3]||"", r[4]||"", r[5]||""]]
  })
}

export async function fetchPaix(): Promise<string[][]> {
  return fusionnerLignes(await grilleDeLApp("paix"), await lirePaixSheet())
}

/** Fidélité, sept cases (lot F, D25 et D27) : Présidence, Guitariste et Batterie vides sont repris
 *  du planning des musiciens — sa grille de l'app, puis l'onglet `Fidélité_Musicien` du Sheet (seul
 *  lu quand le back-office est coupé) — sauf une case vidée dans l'app, qui reste vide. */
export async function fetchFidelite(): Promise<string[][]> {
  const [groupe, musiciens, ecrites] = await Promise.all([
    Promise.all([grilleDeLApp("fidelite"), lireFideliteSheet()]).then(([g, s]) => fusionnerLignes(g, s)),
    fetchFideliteMusic(),
    BACK_OFFICE ? fetchCasesEcrites("fidelite") : new Set<string>(),
  ])
  return completerMusiciensFidelite(groupe, musiciens, ecrites)
}

export async function fetchFideliteMusic(): Promise<string[][]> {
  return fusionnerLignes(await grilleDeLApp("fideliteMusiciens"), await lireFideliteMusiciensSheet())
}

export async function fetchBonte(): Promise<string[][]> {
  return fusionnerLignes(await grilleDeLApp("bonte"), await lireBonteSheet())
}

// Intergroupe / Interfranco : 1 séance par trimestre (4 lignes/an). Structure
// proche du culte. Intergroupe = 3 choristes, Interfranco = 2 choristes.
export async function lireIntergroupeSheet(): Promise<string[][]> {
  const rows = await fetchSheet("Intergroupe")
  return rows.flatMap(r => {
    const dt = parseDate(r[0])
    if (!dt) return []
    return [[dt, r[1]||"", r[2]||"", r[3]||"", r[4]||"", r[5]||"", r[6]||"", r[7]||"", r[8]||"", r[9]||"", r[10]||"", r[11]||""]]
  })
}

export async function lireInterfrancoSheet(): Promise<string[][]> {
  const rows = await fetchSheet("Interfranco")
  return rows.flatMap(r => {
    const dt = parseDate(r[0])
    if (!dt) return []
    return [[dt, r[1]||"", r[2]||"", r[3]||"", r[4]||"", r[5]||"", r[6]||"", r[7]||"", r[8]||"", r[9]||"", r[10]||""]]
  })
}

export async function fetchIntergroupe(): Promise<string[][]> {
  return fusionnerLignes(await grilleDeLApp("intergroupe"), await lireIntergroupeSheet())
}

export async function fetchInterfranco(): Promise<string[][]> {
  return fusionnerLignes(await grilleDeLApp("interfranco"), await lireInterfrancoSheet())
}

// EDD : l'onglet énumère les dimanches classe par classe (le nom de la classe
// en colonne 7 ouvre un bloc) ; cinq colonnes par ligne, plus COURS (colonne 6,
// lot U2, P5) derrière l'interrupteur, comme la percussion des groupes.
export async function lireEddSheet(classe: (typeof EDD_CLASSES)[number]): Promise<string[][]> {
  const rows = await fetchSheet("EDD")
  const out: string[][] = []
  let cls: string | null = null
  for (const r of rows) {
    if (r[0] === "DATE") continue
    const dt = parseDate(r[0])
    if (!dt) continue
    if (r[7] && (EDD_CLASSES as readonly string[]).includes(r[7].trim())) cls = r[7].trim()
    if (cls !== classe) continue
    const ligne = [dt, r[1]||"", r[2]||"", r[3]||"", r[4]||"", r[5]||""]
    out.push(BACK_OFFICE ? [...ligne, r[6]||""] : ligne)
  }
  return out
}

export function periodeEdd(dt: string): EddPeriode {
  const m = getMois(dt)
  return EDD_PERIODES[m<=2?0:m<=4?1:m<=6?2:m<=8?3:m<=10?4:5]
}

export async function fetchEDD(): Promise<EddDataStructure> {
  const res: EddDataStructure = {}
  for (const k of EDD_PERIODES) {
    res[k] = { label: k, classes: { "中班": [], "大班": [], "高班": [] } }
  }
  await Promise.all(EDD_CLASSES.map(async classe => {
    const rows = fusionnerLignes(await grilleDeLApp(CLES_EDD[classe]), await lireEddSheet(classe))
    for (const r of rows) res[periodeEdd(r[0])].classes[classe].push(r)
  }))
  return res
}

// Campus : une ligne par séance (colonne B = Matin / Soir) ; la grille de
// chaque moment porte les treize cases dans l'ordre du Sheet, la répétition
// en texte libre (« JJ/MM/AAAA HH:MM Salle »).
export async function lireCampusSheet(moment: "Matin" | "Soir"): Promise<string[][]> {
  const rows = await fetchSheet("Campus_Louange")
  return rows.flatMap(r => {
    if (!r[0] || r[1] !== moment) return []
    const dt = parseDate(r[0])
    if (!dt) return []
    return [[dt, r[2]||"", r[3]||"", r[4]||"", r[5]||"", r[6]||"", r[7]||"", r[8]||"", r[9]||"", r[10]||"", r[11]||"", r[12]||"", r[13]||"", (r[14]||"").trim()]]
  })
}

/** Une séance du Campus à partir d'une ligne de grille (pur, partagé avec les tests). */
export function seanceCampus(row: string[], moment: "Matin" | "Soir"): CampusSeance {
  const [, mm, dd] = row[0].split("-")
  const label = `${parseInt(dd)}/${parseInt(mm)}`
  const pres = (row[1] || "").trim()
  const ch = [row[2], row[3]].filter(v => v?.trim()).join(", ")
  const mu = [row[4]?"Piano: "+row[4]:"", row[5]?"Guitare: "+row[5]:"", row[6]?"Batterie: "+row[6]:""].filter(Boolean).join(", ")
  const rg = [row[7]?"Sono: "+row[7]:"", row[8]?"PPT: "+row[8]:""].filter(Boolean).join(", ")
  // Cellule répétition : "JJ/MM/AAAA[ HH:MM][ Salle…]" → date + heure + lieu
  const rawEnt = (row[13]||"").trim()
  let ent = "", entTime = "", entLieu = ""
  if (rawEnt) {
    const toks = rawEnt.split(/\s+/)
    ent = parseDate(toks[0]) || ""
    const rest = toks.slice(1)
    if (rest[0] && /^\d{1,2}[:hH]\d{2}$/.test(rest[0])) {
      entTime = rest.shift()!.replace(/[hH]/, ":")
    }
    entLieu = rest.join(" ").trim()
  }
  return { d: `${label} ${moment}`, date: row[0], pres, ch, mu, rg, ent, entTime, entLieu, chants: [row[9]||"", row[10]||"", row[11]||"", row[12]||""] }
}

/** Les deux grilles du Campus (matin, soir) réunies au Sheet, dans la forme de leur définition. */
export async function fetchCampusGrilles(): Promise<{ matin: string[][]; soir: string[][] }> {
  const [matin, soir] = await Promise.all([
    Promise.all([grilleDeLApp("campusMatin"), lireCampusSheet("Matin")]).then(([g, s]) => fusionnerLignes(g, s)),
    Promise.all([grilleDeLApp("campusSoir"), lireCampusSheet("Soir")]).then(([g, s]) => fusionnerLignes(g, s)),
  ])
  return { matin, soir }
}

export async function fetchCampus(): Promise<{ louange: CampusSeance[]; entrainement: CampusSeance[] }> {
  const seances: { key: string; obj: CampusSeance }[] = []
  for (const [moment, key] of [["Matin", "campusMatin"], ["Soir", "campusSoir"]] as const) {
    const rows = fusionnerLignes(await grilleDeLApp(key), await lireCampusSheet(moment))
    // Tri chronologique : date ISO de la séance + matin avant soir. La chaîne
    // d'affichage "JJ/MM" ne se trie pas correctement (ex. "10/6" avant "2/6").
    for (const row of rows) seances.push({ key: `${row[0]} ${moment === "Soir" ? "1" : "0"}`, obj: seanceCampus(row, moment) })
  }
  seances.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  return {
    louange: seances.map((s) => s.obj),
    entrainement: seances.filter((s) => s.obj.ent).map((s) => s.obj),
  }
}

/** Lecture brute du Sheet d'une grille, pour l'import initial (G4). */
export function lireSheetDe(key: string): Promise<string[][]> {
  switch (key) {
    case "culte": return lireCulteSheet()
    case "table": return lireTableSheet()
    case "intergroupe": return lireIntergroupeSheet()
    case "interfranco": return lireInterfrancoSheet()
    case "paix": return lirePaixSheet()
    case "fidelite": return lireFideliteSheet()
    case "fideliteMusiciens": return lireFideliteMusiciensSheet()
    case "bonte": return lireBonteSheet()
    case "eddZhongban": return lireEddSheet("中班")
    case "eddDaban": return lireEddSheet("大班")
    case "eddGaoban": return lireEddSheet("高班")
    case "campusMatin": return lireCampusSheet("Matin")
    case "campusSoir": return lireCampusSheet("Soir")
    default: return Promise.resolve([])
  }
}
