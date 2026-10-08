"use client"

import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { OngletsRail } from "@/components/layout/Onglets"
import { BarreDeGrille, FiltreDeNom, compterCasesVides, ongletsDePeriode, useFiltreNom, useTrimestreEnLettres } from "@/components/planning/BarreDeGrille"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { PetitDejCarte, TonPetitDej, usePetitDej } from "@/components/planning/PetitDejCarte"
import { Tile } from "@/components/ui/tile"
import { StaleBanner } from "@/components/planning/StaleBanner"
import { currentSundayStr, filterByTri, getCurrentTri, getTri } from "@/lib/planning/utils"
import { useDisposition } from "@/hooks/useDisposition"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { BandeauAnnee } from "@/components/planning/BandeauAnnee"
import { useSheet } from "@/lib/planning/useSheet"
import { DEJEUNER_FALLBACK } from "@/lib/planning/data"
import { fetchTable } from "@/lib/planning/sheets"
import { GRILLE_TABLE, anneeRemplie, anneesDuPlanning, dimanchesDe, lignesDeLAnnee, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, canGererPetitDej, isAdminUser } from "@/lib/access"
import { BACK_OFFICE } from "@/lib/backOffice"
import { useGestionPlanning } from "@/lib/planning/gestion"
import { avecPetitDej, rangeesPetitDej } from "@/lib/petitdej/lignes"
import type { LignePetitDej } from "@/types/petitDej"
import { AncienTableau } from "./AncienTableau"

// Prépa. Table du Seigneur + petit déjeuner : une grille à deux cases par
// dimanche, remplie dans l'app depuis le 19/09/2026 (lot 17, G6) par qui en a
// le droit ; les dimanches non écrits viennent encore du Sheet. Les données de
// secours (équipes de 2026) restent le repli si le Sheet est injoignable.
// Lot U3, PD2 (docs/spec-petit-dej.md) : la carte « Petit déj » en tête, où
// chacun s'inscrit ; la case Petit déj de la grille l'affiche, sans se modifier.
// Lot U6, B2 (Q14) : dans l'App, la carte Petit déj et la carte compacte de la
// Table (le dimanche qui vient), sans grille ; au Back-Office, la grille seule —
// la carte Petit déj reste le seul endroit où l'on écrit ses lignes.
// Agencement v18, A4 (piste A) : dans l'App, deux colonnes en grand — la carte Petit déj du
// trimestre à gauche, « Prépa. Table du Seigneur » (les équipes du trimestre) et « Ton petit
// déj » à droite ; l'une sous l'autre ailleurs.

const REPLI = DEJEUNER_FALLBACK.map((r) => [r[0], r[1], ""])

function TablePage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const { rows: lues, status } = useSheet<string[]>(fetchTable, REPLI)
  // Les inscriptions lues par la carte, après chacune de ses écritures : la case
  // Petit déj de la grille les suit sans attendre un rechargement.
  const [inscriptions, setInscriptions] = useState<LignePetitDej[] | null>(null)
  const rows = inscriptions ? avecPetitDej(lues, rangeesPetitDej(inscriptions)) : lues
  const [tri, setTri] = useState(getCurrentTri())
  const gestion = useGestionPlanning()
  const filtre = useFiltreNom()
  const trimestre = useTrimestreEnLettres()
  const peutModifier = gestion && canEditPlanning(user, profile, GRILLE_TABLE.key)
  // Les comptes : « Choisir » de la grille (Back-Office), suggestions de la carte Petit
  // déj (App) — les mêmes personnes, écrivains de la Table et admins.
  const { datesDansLApp, comptes } = useGrilleApp(GRILLE_TABLE.key, canGererPetitDej(user, profile))
  // Lot U3 : la carte Petit déj suggère les noms de planning des comptes.
  const nomsDesComptes = comptes.map((c) => c.nom).filter(Boolean)
  // Lot U2 : l'année suivante s'ouvre à qui remplit, et à tous dès une case remplie.
  const anneeCourante = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeCourante)
  const annees = anneesDuPlanning(anneeCourante, peutModifier || anneeRemplie(rows, anneeCourante + 1))
  const effAnnee = annees.includes(annee) ? annee : anneeCourante
  const suivante = effAnnee > anneeCourante && peutModifier
  const lignes = lignesSimples(filterByTri(lignesDeLAnnee(GRILLE_TABLE, effAnnee, rows), tri))

  return (
    <div className="max-w-full space-y-4 mx-auto">
      {/* Agencement v18 (T4a) : la rangée de la grille ; dessous, les deux colonnes de l'App (T4b). */}
      <BarreDeGrille
        titre={t("planning.pages.table")}
        couleur={GRILLE_TABLE.couleur}
        detail={trimestre(tri, effAnnee)}
        sousTitreBO={[t("planning.pages.table"), t("planning.barre.casesVidesTrimestre", { count: compterCasesVides(GRILLE_TABLE, lignes) })].join(" · ")}
        chargement={status === "loading"}
      >
        <AnneeSelecteur
          annees={annees}
          annee={effAnnee}
          onChange={(a) => { setAnnee(a); setTri(a === anneeCourante ? getCurrentTri() : "T1") }}
        />
        <OngletsRail etiquette={t("planning.barre.trimestre")} onglets={ongletsDePeriode(["T1", "T2", "T3", "T4"])} actif={tri} choisir={setTri} />
        {gestion && <FiltreDeNom filtre={filtre} couleur={GRILLE_TABLE.couleur} />}
      </BarreDeGrille>

      <StaleBanner show={status === "stale"} />
      <BandeauAnnee annee={effAnnee} brouillon={false} dimanches={suivante ? dimanchesDe(effAnnee).length : null} />

      {!gestion && <PetitDejEtTable rows={rows} annee={effAnnee} tri={tri} nomsDesComptes={nomsDesComptes} onLignes={setInscriptions} />}

      {gestion && <PlanningGrille
        definition={GRILLE_TABLE}
        periode={`${tri} ${effAnnee}`}
        filtre={filtre}
        lignes={lignes}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        comptes={comptes}
        exporter={peutModifier ? { annee: effAnnee, rang: Number(tri.slice(1)), tout: isAdminUser(user) } : undefined}
      />}
    </div>
  )
}

/** L'App (A4) : la carte Petit déj, puis la Table du Seigneur et « Ton petit déj », côte à côte
 *  en grand. Un seul état pour les deux cartes du petit déj (`usePetitDej`) : il n'est monté que
 *  dans l'App, le Back-Office n'en lit rien. */
function PetitDejEtTable({ rows, annee, tri, nomsDesComptes, onLignes }: {
  rows: string[][]
  annee: number
  tri: string
  nomsDesComptes: readonly string[]
  onLignes: (lignes: LignePetitDej[]) => void
}) {
  const etat = usePetitDej(onLignes)
  const grand = useDisposition() === "grand"
  return (
    <div className={grand ? "grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start gap-5" : "flex flex-col gap-4"}>
      <PetitDejCarte etat={etat} annee={annee} tri={tri} nomsDesComptes={nomsDesComptes} />
      <div className="flex min-w-0 flex-col gap-4">
        <TableDuSeigneur rows={rows} annee={annee} tri={tri} />
        <TonPetitDej etat={etat} annee={annee} tri={tri} />
      </div>
    </div>
  )
}

/** « Prépa. Table du Seigneur » : les équipes du trimestre choisi, une par dimanche de sainte cène
 *  qui en a une (planche v18-app-planning-table-a : tuile de date, noms, « Dimanche de sainte
 *  cène ») ; les dimanches passés en gris. */
function TableDuSeigneur({ rows, annee, tri }: { rows: string[][]; annee: number; tri: string }) {
  const { t, i18n } = useTranslation()
  const titreId = useId()
  const dimanche = currentSundayStr()
  const langue = i18n.language === "zh-CN" ? "zh-CN" : "fr-FR"
  const lignes = rows
    .filter((r) => r[0].startsWith(`${annee}-`) && getTri(r[0]) === tri && r[1]?.trim())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  return (
    <section aria-labelledby={titreId} className="raised min-w-0 rounded-2xl px-4 pt-3 pb-1.5">
      <div className="flex items-baseline gap-2 pb-2">
        <h3 id={titreId} className="text-[17px] font-bold text-foreground">{t("planning.pages.table")}</h3>
      </div>
      {lignes.length ? (
        <ul>
          {lignes.map((r) => {
            const jour = new Date(`${r[0]}T12:00:00`)
            return (
              <li key={r[0]} data-dimanche={r[0]} className={`flex items-center gap-3 border-t border-border py-2.5 ${r[0] < dimanche ? "opacity-60" : ""}`}>
                <Tile color={GRILLE_TABLE.couleur} big={jour.getDate()} small={new Intl.DateTimeFormat(langue, { month: "short" }).format(jour)} size="lg" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r[1]}</p>
                  <p className="text-[12.5px] text-muted-foreground">{t("planning.table.dimancheSainteCene")}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="border-t border-border py-2.5 text-sm text-muted-foreground">{t("planning.table.noData")}</p>
      )}
    </section>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? TablePage : AncienTableau
