// Les modèles d'export des plannings, onglet par onglet du Google Sheet (lot
// U2, tranche P6, docs/spec-planning-2027.md : « Les modèles, onglet par
// onglet » et « Relevé T0 »).
//
// Module PUR : aucune dépendance réseau ni Firebase. Il dit QUOI écrire sur
// chaque page — église, titre, période, horaire, colonnes et lignes déjà mises
// en forme ; le PDF (P7, PlanningModelePDF.tsx) et le .xlsx (P8) ne font que
// dessiner. Une page A4 = un onglet du Sheet ou un trimestre de l'onglet (Q9).
// Le texte est celui du Sheet, en français, quelle que soit la langue de
// l'interface (Q10) ; les cases vides restent vides ; rien en bas de page.

import fr from "@/locales/fr.json"
import { grilleDe, lignesDeLAnnee, marquerDimanchesSpeciaux } from "./grilles"
import { MOIS, getAnnee, getMois } from "./utils"

export type Portee = "affiche" | "annee" | "tout"

export type ColonneModele = {
  /** « date », « moment » (Campus), sinon la clé de la colonne de grille. */
  cle: string
  /** Libellé du Sheet. Deux colonnes voisines au même libellé partagent un en-tête fusionné (Choristes). */
  entete: string
  /** Largeur relevée dans le Sheet (px) : les colonnes se partagent la page dans ces proportions. */
  largeur: number
  /** Retirée d'une page dont aucune case ne la porte (Percussion des groupes). */
  optionnelle?: boolean
  /** Couleurs propres à la colonne (Petit déj de la Table, Répétition du Campus). */
  fond?: string
  texte?: string
  fondEntete?: string
}

export type ModeleOnglet = {
  /** Nom de l'onglet du Sheet ; les groupes ont une feuille par trimestre (« Paix » → « Paix_T1 »). */
  onglet: string
  feuilleParTrimestre?: boolean
  /** Grilles de l'app lues pour cet onglet (l'EDD en a trois, le Campus deux). */
  grilles: string[]
  /** EDD : une classe par bloc ; Campus : matin et soir mêlés dans l'ordre des dates. */
  assemblage?: "classes" | "moments"
  decoupage: "trimestre" | "periodeEdd" | "annee"
  eglise: "fr" | "zh"
  titre: (annee: number) => string
  periode: (annee: number, rang: number, dates: string[]) => string
  /** Bandeau en tête du tableau (Culte : « TRIMESTRE 1 »). */
  bandeau?: (rang: number) => string
  horaire?: string
  colonnes: ColonneModele[]
  /** Colonne dont la case couvre tout un bloc : le mois (Fidélité musiciens, en tête), la classe (EDD, en fin). */
  fusion?: { entete: string; largeur: number; position: "debut" | "fin" }
  policeTableau: "Calibri" | "Georgia"
  taille: 11 | 12
  alignement: "centre" | "gauche"
  couleurs: {
    texteEntete: string
    fondEntete?: string
    bandeau?: string
    mois?: string
    texteMois?: string
    date?: string
    texteDate?: string
    alterne?: string
    fusion?: string
    bordure: string
  }
  /** aucun · une ligne de titre par mois (Culte, Table) · le mois en colonne (Fidélité musiciens). */
  mois: "aucun" | "ligneTitre" | "colonne"
  dateGras: boolean
  formatDate: "jj/mm" | "jj/mm/aaaa"
  orientation: "portrait" | "paysage"
  /** Groupes : la présidence d'un dimanche d'Interfranco ou d'Intergroupe porte le nom du service (P4). */
  dimanchesSpeciaux?: boolean
}

export type LigneExport = {
  /** Une case par colonne de la page (hors colonne fusionnée), la date déjà mise en forme. */
  cellules: string[]
  /** Teinte « une ligne sur deux », dès la première de la page. */
  alterne: boolean
  /** Fidélité musiciens : dimanche spécial écrit sur toute la ligne (Présidence → Percussion). */
  special?: string
}

export type BlocExport = { titre?: string; fusion?: string; lignes: LigneExport[] }

export type PageExport = {
  /** Feuille du .xlsx (P8) : le nom de l'onglet, sans les espaces parasites du Sheet. */
  feuille: string
  modele: ModeleOnglet
  eglise: string
  titre: string
  periode: string
  horaire?: string
  bandeau?: string
  /** Colonnes retenues pour cette page (une optionnelle vide est retirée). */
  colonnes: ColonneModele[]
  blocs: BlocExport[]
}

const EGLISE = { fr: "Grace Church Christian Chinese de Paris", zh: "基督教会巴黎华人恩典堂" } as const

/** Premier et dernier mois d'un trimestre (rang 1 à 4). */
const moisDuTrimestre = (rang: number) => [MOIS[(rang - 1) * 3], MOIS[(rang - 1) * 3 + 2]]
/** « de Janvier », « d'Avril », « d'Octobre ». */
const de = (mois: string) => (/^[AEIOU]/.test(mois) ? `d'${mois}` : `de ${mois}`)
const annee = (a: number) => `Année ${a}`

const col = (cle: string, entete: string, largeur: number, extra: Partial<ColonneModele> = {}): ColonneModele => ({
  cle, entete, largeur, ...extra,
})

// Groupes Paix, Bonté et Fidélité : même mise en forme (décision du 05/10/2026,
// « les trois groupes homogènes, en gras ») ; seul le nom de l'église change.
const GROUPE = {
  feuilleParTrimestre: true,
  decoupage: "trimestre",
  periode: (a: number, rang: number) => {
    const [debut, fin] = moisDuTrimestre(rang)
    return `Planning ${de(debut)} à ${fin} ${a}`
  },
  policeTableau: "Calibri",
  taille: 12,
  alignement: "centre",
  couleurs: { texteEntete: "#1F3A5F", alterne: "#EAF2FB", bordure: "#000000" },
  mois: "aucun",
  dateGras: true,
  formatDate: "jj/mm",
  orientation: "portrait",
  dimanchesSpeciaux: true,
} as const

const PAIX_BONTE_COLONNES = [
  col("date", "DATE", 88), col("presidence", "PRÉSIDENCE", 112), col("musiciens", "MUSICIENS", 111),
  col("orateur", "ORATEUR", 127), col("theme", "THÈME", 200), col("percussion", "PERCUSSION", 125, { optionnelle: true }),
]

// Intergroupe et Interfranco : le gabarit du Sheet, l'un violet, l'autre rose.
const inter = (onglet: string, choristes: number, fondEntete: string, date: string): ModeleOnglet => ({
  onglet,
  grilles: [onglet.toLowerCase()],
  decoupage: "annee",
  eglise: "fr",
  titre: () => onglet.toUpperCase(),
  periode: annee,
  colonnes: [
    col("date", "DATE", 100), col("presidence", "Présidence", 100),
    ...Array.from({ length: choristes }, (_, i) => col(`choriste${i + 1}`, "Choristes", 100)),
    col("piano", "Pianiste", 100), col("guitare", "Guitariste", 100), col("cajonBatterie", "Cajon/Batterie", 100),
    col("sonoLive", "Sono + Live", 100), col("ppt", "PPT", 100), col("orateur", "Orateur", 100), col("traduction", "Traducteur", 100),
  ],
  policeTableau: "Calibri",
  taille: 11,
  alignement: "centre",
  couleurs: { texteEntete: "#FFFFFF", fondEntete, date, bordure: "#9AA7B1" },
  mois: "aucun",
  dateGras: true,
  formatDate: "jj/mm",
  orientation: "paysage",
})

const PAIRES_EDD = ["JANVIER FÉVRIER", "MARS AVRIL", "MAI JUIN", "JUILLET AOÛT", "SEPTEMBRE OCTOBRE", "NOVEMBRE DÉCEMBRE"]

/** Première et dernière séance du Campus : « 26 — 30 Juillet 2027 ». */
function periodeCampus(a: number, dates: string[]): string {
  if (!dates.length) return annee(a)
  const [d1, d2] = [dates[0], dates[dates.length - 1]].map((d) => ({ jour: Number(d.slice(8, 10)), mois: MOIS[getMois(d) - 1] }))
  if (dates.length === 1 || (d1.jour === d2.jour && d1.mois === d2.mois)) return `${d1.jour} ${d1.mois} ${a}`
  if (d1.mois === d2.mois) return `${d1.jour} — ${d2.jour} ${d2.mois} ${a}`
  return `${d1.jour} ${d1.mois} — ${d2.jour} ${d2.mois} ${a}`
}

/** Les modèles, dans l'ordre des onglets du Sheet (celui des feuilles du .xlsx « Tous les plannings »). */
export const MODELES: ModeleOnglet[] = [
  {
    onglet: "Franco_Louange",
    grilles: ["culte"],
    decoupage: "trimestre",
    eglise: "fr",
    titre: () => "CULTE FRANCO",
    periode: (a, rang) => {
      const [debut, fin] = moisDuTrimestre(rang)
      return `${debut} à ${fin} ${a}`
    },
    bandeau: (rang) => `TRIMESTRE ${rang}`,
    horaire: fr.planning.horaires.culte,
    // La Sainte cène est toujours là : les quatre blocs de 2026 la portent (Q6).
    colonnes: [
      col("date", "DATE", 100), col("presidence", "Présidence", 141),
      col("choriste1", "Choristes", 117), col("choriste2", "Choristes", 110),
      col("piano", "Pianiste", 119), col("guitare", "Guitariste", 118), col("batterie", "Cajon/Batterie", 117),
      col("sono", "Sono + Live", 108), col("ppt", "PPT", 100), col("orateur", "Orateur", 197),
      col("traduction", "Traducteur", 106), col("sainteCene", "Sainte cène", 131),
    ],
    policeTableau: "Calibri",
    taille: 11,
    alignement: "centre",
    couleurs: {
      texteEntete: "#FFFFFF", fondEntete: "#2F6E73", bandeau: "#24575B", mois: "#D7E7EA", texteMois: "#000000",
      date: "#BFD9DC", bordure: "#9AA7B1",
    },
    mois: "ligneTitre",
    dateGras: true,
    formatDate: "jj/mm",
    orientation: "paysage",
  },
  {
    onglet: "Franco_Table_PtD",
    grilles: ["table"],
    decoupage: "trimestre",
    eglise: "fr",
    titre: () => "PRÉPARATION TABLE DÉJEUNER",
    periode: (a, rang) => `DÉJEUNER PRÉPARATION T${rang} ${a}`,
    // Un tableau par trimestre (Q9) plutôt que les blocs côte à côte du Sheet.
    colonnes: [
      col("date", "DATE", 100), col("equipe", "Équipe", 300),
      col("petitDej", "Petit déj", 200, { fond: "#F5FFF2" }),
    ],
    policeTableau: "Calibri",
    taille: 11,
    alignement: "centre",
    couleurs: { texteEntete: "#FFFFFF", fondEntete: "#93C47D", mois: "#93C47D", texteMois: "#FFFFFF", date: "#D9EAD3", bordure: "#000000" },
    mois: "ligneTitre",
    dateGras: true,
    formatDate: "jj/mm",
    orientation: "portrait",
  },
  inter("Intergroupe", 3, "#B4A7D6", "#D9D2E9"),
  inter("Interfranco", 2, "#D5A6BD", "#EAD1DC"),
  {
    onglet: "EDD",
    grilles: ["eddZhongban", "eddDaban", "eddGaoban"],
    assemblage: "classes",
    decoupage: "periodeEdd",
    eglise: "fr",
    titre: (a) => `EDD — Planning par classe (bimensuel) — ${a}`,
    periode: (_a, rang) => `PÉRIODE ${rang} — ${PAIRES_EDD[rang - 1]}`,
    colonnes: [
      col("date", "DATE", 100), col("presidence", "PRESIDENCE", 100), col("suppleant", "SUPPLÉANT", 100),
      col("piano", "PIANO", 100), col("cajon", "CAJON", 100), col("guitare", "GUITARE", 100), col("cours", "COURS", 100),
    ],
    fusion: { entete: "", largeur: 100, position: "fin" },
    policeTableau: "Calibri",
    taille: 11,
    alignement: "centre",
    couleurs: { texteEntete: "#FFFFFF", fondEntete: "#1F5B57", date: "#CFE8DD", fusion: "#A9D18E", bordure: "#000000" },
    mois: "aucun",
    dateGras: false,
    formatDate: "jj/mm/aaaa",
    orientation: "portrait",
  },
  {
    onglet: "Campus_Louange",
    grilles: ["campusMatin", "campusSoir"],
    assemblage: "moments",
    decoupage: "annee",
    eglise: "fr",
    titre: (a) => `CAMPUS ${a}`,
    periode: (a, _rang, dates) => periodeCampus(a, dates),
    colonnes: [
      col("date", "DATE SEANCE", 107), col("moment", "MOMENT", 100), col("presidence", "PRESIDENT", 100),
      col("choriste1", "CHORISTE 1", 100), col("choriste2", "CHORISTE 2", 100), col("piano", "PIANO", 100),
      col("guitare", "GUITARE", 100), col("batterie", "BATTERIE", 100), col("sono", "SONO", 100), col("ppt", "PPT", 100),
      col("chant1", "CHANT 1", 100), col("chant2", "CHANT 2", 127), col("chant3", "CHANT 3", 222), col("chant4", "CHANT 4", 127),
      col("repetition", "DATE RÉPÉTITION", 193, { fondEntete: "#6B4A8E", fond: "#EDE4F5", texte: "#6B4A8E" }),
    ],
    policeTableau: "Calibri",
    taille: 11,
    alignement: "gauche",
    couleurs: { texteEntete: "#FFFFFF", fondEntete: "#2D5A65", texteDate: "#2D5A65", alterne: "#F5F9FA", bordure: "#000000" },
    mois: "aucun",
    dateGras: true,
    formatDate: "jj/mm/aaaa",
    orientation: "paysage",
  },
  {
    ...GROUPE,
    onglet: "Paix",
    grilles: ["paix"],
    eglise: "fr",
    titre: () => "GROUPE PAIX",
    horaire: fr.planning.horaires.groupes,
    colonnes: PAIX_BONTE_COLONNES,
  },
  {
    ...GROUPE,
    onglet: "Fidélité",
    grilles: ["fidelite"],
    eglise: "zh",
    titre: () => "GROUPE FIDÉLITÉ",
    horaire: fr.planning.horaires.fidelite,
    colonnes: [
      col("date", "DATE", 100), col("presidence", "PRÉSIDENCE", 132), col("orateur", "ORATEUR", 145),
      col("theme", "THÈME", 198), col("pianiste", "PIANISTE", 149),
    ],
  },
  {
    onglet: "Fidélité_Musicien",
    grilles: ["fideliteMusiciens"],
    decoupage: "trimestre",
    eglise: "zh",
    titre: (a) => `Groupe Fidélité Planning Musiciens ${a}`,
    periode: (a, rang) => {
      const [debut, fin] = moisDuTrimestre(rang)
      return `Groupe Fidélité Planning ${a} - T${rang} (${debut} - ${fin})`
    },
    colonnes: [
      col("date", "Date", 100), col("presidence", "Présidence", 119), col("piano", "Piano", 116),
      col("guitare", "Guitare", 128), col("batterie", "Percussion", 103),
    ],
    fusion: { entete: "", largeur: 100, position: "debut" },
    policeTableau: "Georgia",
    taille: 12,
    alignement: "centre",
    couleurs: { texteEntete: "#000000", fondEntete: "#B4A7D6", fusion: "#D9D2E9", bordure: "#000000" },
    mois: "colonne",
    dateGras: false,
    formatDate: "jj/mm",
    orientation: "portrait",
    dimanchesSpeciaux: true,
  },
  {
    ...GROUPE,
    onglet: "Bonté",
    grilles: ["bonte"],
    eglise: "fr",
    titre: () => "GROUPE BONTÉ",
    horaire: fr.planning.horaires.groupes,
    colonnes: PAIX_BONTE_COLONNES,
  },
]

export function modeleDe(key: string): ModeleOnglet | undefined {
  return MODELES.find((m) => m.grilles.includes(key))
}

const nombreDePages = (m: ModeleOnglet) => (m.decoupage === "trimestre" ? 4 : m.decoupage === "periodeEdd" ? 6 : 1)

/** Le rang de la page d'une date : trimestre (1 à 4), période de l'EDD (1 à 6), 1 pour l'année. */
function rangDe(m: ModeleOnglet, date: string): number {
  if (m.decoupage === "trimestre") return Math.ceil(getMois(date) / 3)
  if (m.decoupage === "periodeEdd") return Math.ceil(getMois(date) / 2)
  return 1
}

/** Ce que le menu « Exporter » propose pour un planning (Q9, Q13 : « Tous les plannings » aux admins). */
export function porteesExport(key: string, admin: boolean): Portee[] {
  const m = modeleDe(key)
  const portees: Portee[] = m && nombreDePages(m) === 1 ? ["annee"] : ["affiche", "annee"]
  return admin ? [...portees, "tout"] : portees
}

/** Les grilles à lire pour exporter : celles de l'onglet, plus Interfranco et Intergroupe pour les groupes. */
export function grillesAExporter(portee: Portee, key: string): string[] {
  if (portee === "tout") return MODELES.flatMap((m) => m.grilles)
  const m = modeleDe(key)
  if (!m) return []
  return m.dimanchesSpeciaux ? [...m.grilles, "interfranco", "intergroupe"] : m.grilles
}

/**
 * Le nom du fichier, d'après l'onglet du Sheet — le fichier en porte toutes les
 * grilles (les trois classes de l'EDD, matin et soir du Campus) —, sans accents
 * ni ponctuation, que toute messagerie garde : Paix → `Paix_T1_2027.pdf`,
 * `Paix_2027.pdf` ; EDD → `EDD_P1_2027.pdf` ; tout : `Plannings_2027.pdf`.
 */
export function nomFichierExport(portee: Portee, key: string, periode: string, an: number, extension: "pdf" | "xlsx"): string {
  if (portee === "tout") return `Plannings_${an}.${extension}`
  const base = (modeleDe(key)?.onglet ?? key)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return portee === "affiche" ? `${base}_${periode}_${an}.${extension}` : `${base}_${an}.${extension}`
}

const formaterDate = (iso: string, format: ModeleOnglet["formatDate"]) => {
  const [a, m, j] = iso.split("-")
  return format === "jj/mm" ? `${j}/${m}` : `${j}/${m}/${a}`
}

const MOTS_SPECIAUX = /^(interfranco|intergroupe|anniversaire|bapt[eê]me)/i

/** Une page : les lignes de ses grilles, mises au modèle de l'onglet. */
function construirePage(
  m: ModeleOnglet,
  an: number,
  rang: number,
  lignes: Readonly<Record<string, string[][]>>,
): PageExport {
  // Lignes de l'année (dimanches posés d'office dès 2027), puis celles de la page.
  const parGrille = m.grilles.map((key) => {
    const def = grilleDe(key)!
    let rows = lignesDeLAnnee(def, an, lignes[key] ?? [])
    if (m.dimanchesSpeciaux) rows = marquerDimanchesSpeciaux(rows, lignes.interfranco ?? [], lignes.intergroupe ?? [])
    return { key, def, rows: rows.filter((r) => getAnnee(r[0]) === an && rangDe(m, r[0]) === rang) }
  })

  const valeur = (c: ColonneModele, key: string, row: string[]) => {
    if (c.cle === "date") return formaterDate(row[0], m.formatDate)
    if (c.cle === "moment") return key === "campusMatin" ? "Matin" : "Soir"
    const g = grilleDe(key)?.colonnes.find((x) => x.cle === c.cle)
    return g ? (row[g.index] ?? "").trim() : ""
  }

  const toutes = parGrille.flatMap(({ key, rows }) => rows.map((row) => ({ key, row })))
  const colonnes = m.colonnes.filter((c) => !c.optionnelle || toutes.some(({ key, row }) => valeur(c, key, row)))

  let rangLigne = 0
  const ligne = (key: string, row: string[]): LigneExport => {
    const cellules = colonnes.map((c) => valeur(c, key, row))
    const out: LigneExport = { cellules, alterne: Boolean(m.couleurs.alterne) && rangLigne++ % 2 === 0 }
    // Fidélité musiciens : un dimanche spécial sans musicien s'écrit sur toute la ligne.
    if (m.mois === "colonne" && MOTS_SPECIAUX.test(cellules[1] ?? "") && cellules.slice(2).every((x) => !x)) out.special = cellules[1]
    return out
  }

  let blocs: BlocExport[]
  if (m.assemblage === "classes") {
    blocs = parGrille
      .filter(({ rows }) => rows.length)
      .map(({ key, def, rows }) => ({ fusion: def.sousTitre ?? "", lignes: rows.map((r) => ligne(key, r)) }))
  } else {
    // Campus : matin avant soir le même jour (tri stable, matin lu d'abord).
    const ordonnees = [...toutes].sort((a, b) => (a.row[0] < b.row[0] ? -1 : a.row[0] > b.row[0] ? 1 : 0))
    if (m.mois === "aucun") {
      blocs = [{ lignes: ordonnees.map(({ key, row }) => ligne(key, row)) }]
    } else {
      // Un bloc par mois : ligne de titre (Culte, Table) ou case fusionnée (Fidélité musiciens).
      blocs = []
      let moisCourant = ""
      for (const { key, row } of ordonnees) {
        const nom = MOIS[getMois(row[0]) - 1]
        if (nom !== moisCourant) {
          blocs.push(m.mois === "ligneTitre" ? { titre: nom, lignes: [] } : { fusion: nom, lignes: [] })
          moisCourant = nom
        }
        blocs[blocs.length - 1].lignes.push(ligne(key, row))
      }
    }
  }

  const feuille = m.feuilleParTrimestre ? `${m.onglet}_T${rang}` : m.onglet
  return {
    feuille,
    modele: m,
    eglise: EGLISE[m.eglise],
    titre: m.titre(an),
    periode: m.periode(an, rang, toutes.map(({ row }) => row[0]).sort()),
    ...(m.horaire ? { horaire: m.horaire } : {}),
    ...(m.bandeau ? { bandeau: m.bandeau(rang) } : {}),
    colonnes,
    blocs,
  }
}

/**
 * Les pages d'un export (Q9) : `affiche` = la page de la période montrée
 * (`rang` : trimestre, période de l'EDD, 1 pour l'année) ; `annee` = toutes
 * les pages de l'onglet du planning ; `tout` = tous les onglets, dans l'ordre
 * du Sheet. `lignes` : les lignes que la personne voit, par clé de grille, au
 * format des lecteurs du Sheet (toutes années confondues).
 */
export function pagesExport(p: {
  portee: Portee
  annee: number
  key: string
  rang: number
  lignes: Readonly<Record<string, string[][]>>
}): PageExport[] {
  const modeles = p.portee === "tout" ? MODELES : [modeleDe(p.key)].filter((m): m is ModeleOnglet => Boolean(m))
  return modeles.flatMap((m) => {
    const rangs = p.portee === "affiche" ? [Math.min(p.rang, nombreDePages(m))] : Array.from({ length: nombreDePages(m) }, (_, i) => i + 1)
    return rangs.map((r) => construirePage(m, p.annee, r, p.lignes))
  })
}
