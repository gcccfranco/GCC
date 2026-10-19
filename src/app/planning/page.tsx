"use client"

import { GuideLien } from "@/components/guide/GuideLien"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { currentSundayStr, fdLongL, getCurrentTri, EDD_PERIODES } from "@/lib/planning/utils"
import {
  FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK,
  PAIX_FALLBACK, BONTE_FALLBACK, DEJEUNER_FALLBACK, EDD_FALLBACK, CAMP_LOUANGE_FALLBACK
} from "@/lib/planning/data"
import { fetchCulte, fetchDejeuner, fetchPetitDej, fetchPaix, fetchFidelite, fetchBonte, fetchEDD, fetchCampus, fetchIntergroupe, fetchInterfranco } from "@/lib/planning/sheets"
import { StaleBanner } from "@/components/planning/StaleBanner"
import type { EddDataStructure, CampusSeance } from "@/lib/planning/utils"
import { useProfile } from "@/lib/firebase/users"
import { completerMusiciensFidelite } from "@/lib/planning/grilles"
import { avecDimanchesSpeciaux, sansBrouillon, trimestresPublies, type PlanningData } from "@/lib/planning/names"
import { lirePetitDej } from "@/lib/petitdej/lignes"
import { servicesDuCompte } from "@/lib/petitdej/services"
import type { LignePetitDej } from "@/types/petitDej"
import { pourMoi, setlistDuService } from "@/lib/planning/accueil"
import { getSetlistsFrom, type FSSetlist } from "@/lib/firebase/setlists"
import { listEvenements } from "@/lib/firebase/evenements"
import { isExpired, isInfo, isPast } from "@/lib/evenements/agenda"
import { canSeeEvenement, canSeeSetlist, estReunion } from "@/lib/access"
import { BACK_OFFICE } from "@/lib/backOffice"
import { useDisposition } from "@/hooks/useDisposition"
import type { Evenement } from "@/types/evenement"
import type { SongIndexEntry } from "@/types/song"
import { PourMoi } from "@/components/accueil/PourMoi"
import { CeDimanche } from "@/components/accueil/CeDimanche"

// Accueil A (lot U4 bis, B1, docs/spec-pages-en-grand.md, Q14). En grand (deux volets de U5,
// Q1) : « Ce dimanche » à gauche, « Pour moi » à droite. Tablette portrait (dès 768 px) :
// « Pour moi » en deux cartes côte à côte, puis « Ce dimanche ». Téléphone : une carte, puis
// « Ce dimanche ». Les données sont celles d'aujourd'hui. La disposition : `useDisposition`.

/** Date du jour en heure locale (pas UTC : décalée autour de minuit). */
function aujourdhuiLocal(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function PlanningAccueil() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useProfile()
  // G5 (19/09/2026) : le Culte n’a plus de données de secours de 2026.
  const [culte, setCulte] = useState<string[][]>([])
  const [dej, setDej] = useState(DEJEUNER_FALLBACK)
  // Petit déj : aucune donnée de secours, il ne s'affiche que s'il est lu.
  const [petitDej, setPetitDej] = useState<string[][]>([])
  const [paix, setPaix] = useState(PAIX_FALLBACK)
  // Lot F : un seul planning, guitare et batterie reprises du planning des musiciens.
  const [fid, setFid] = useState(() => completerMusiciensFidelite(FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK))
  const [bonte, setBonte] = useState(BONTE_FALLBACK)
  const [edd, setEdd] = useState<EddDataStructure>(EDD_FALLBACK)
  const [campus, setCampus] = useState<CampusSeance[]>(CAMP_LOUANGE_FALLBACK)
  const [intergroupe, setIntergroupe] = useState<string[][]>([])
  const [interfranco, setInterfranco] = useState<string[][]>([])
  // Ses lignes comptent pour l'inscrit (U3, Q9), même réécrites et sans nom de planning.
  const [lignesPetitDej, setLignesPetitDej] = useState<LignePetitDej[]>([])
  // « Libre » seulement si les inscriptions ont été lues : illisibles, pas de ligne (U3, T8).
  const [petitDejLu, setPetitDejLu] = useState(false)
  // « Ce dimanche » s'appuie sur les fallbacks compilés : si les fetchs
  // échouent, on le signale pour ne pas laisser lire un planning périmé.
  const [stale, setStale] = useState(false)
  // Lot U2 (Q4) : trimestres publiés, cette année et la suivante — le brouillon n'entre pas dans « Pour moi ».
  const [publies, setPublies] = useState<Record<number, Record<string, string[]>>>({})

  useEffect(() => {
    if (!BACK_OFFICE) return
    const an = new Date().getFullYear()
    void Promise.all([trimestresPublies(an), trimestresPublies(an + 1)]).then(([courante, suivante]) => setPublies({ [an]: courante, [an + 1]: suivante }))
  }, [])

  useEffect(() => {
    Promise.allSettled([
      fetchCulte().then(d => setCulte(d)),
      fetchDejeuner().then(d => { if (d.length) setDej(d) }),
      fetchPetitDej().then(d => { if (d.length) setPetitDej(d) }),
      fetchPaix().then(d => { if (d.length) setPaix(d) }),
      fetchFidelite().then(d => { if (d.length) setFid(d) }),
      fetchBonte().then(d => { if (d.length) setBonte(d) }),
      fetchEDD().then(d => setEdd(d)),
      fetchCampus().then(({ louange }) => { if (louange.length) setCampus(louange) }),
      fetchIntergroupe().then(d => { if (d.length) setIntergroupe(d) }),
      fetchInterfranco().then(d => { if (d.length) setInterfranco(d) }),
    ]).then(results => setStale(results.some(r => r.status === "rejected")))
    // Même lecture que fetchPetitDej (cache partagé) ; en échec, rien de plus.
    if (BACK_OFFICE) lirePetitDej().then(l => { setLignesPetitDej(l); setPetitDejLu(true) }, () => {})
  }, [])

  const disposition = useDisposition()
  const aujourdhui = aujourdhuiLocal()

  // « Pour moi » : le prochain service de la personne connectée (d'après son nom de
  // planning, et ses petits déj par son compte, U3) et les suivants — deux en grand, trois sur
  // tablette, aucun sur téléphone.
  const mesServices = useMemo(() => {
    if (!user || !profile) return null
    const lu: PlanningData = { culte, dejeuner: dej, petitDej, paix, fidelite: fid, bonte, edd, campus, intergroupe, interfranco }
    // Lot U2 (Q4, Q5) : comme `loadPlanningData`, ni trimestre à venir non
    // publié, ni président de groupe fantôme un dimanche d'Interfranco ou d'Intergroupe.
    const data = BACK_OFFICE ? avecDimanchesSpeciaux(sansBrouillon(lu, new Date().getFullYear(), getCurrentTri(), publies)) : lu
    return pourMoi(servicesDuCompte(data, lignesPetitDej, user.uid, profile.planningName ?? ""), aujourdhui, disposition === "tablette" ? 3 : 2)
  }, [user, profile, culte, dej, petitDej, lignesPetitDej, paix, fid, bonte, edd, campus, intergroupe, interfranco, publies, aujourdhui, disposition])

  // La setlist de ce service (règle de Mes services), puis les titres et tonalités de ses chants.
  // L'accueil est la page la plus visitée : jamais toute la collection, seulement les setlists
  // datées du prochain service ou après (30 au plus), et rien sans service à venir.
  const uid = user?.uid
  const depuis = mesServices ? mesServices.prochain.map(s => s.setlistDate ?? s.date).sort()[0] : null
  const [setlists, setSetlists] = useState<FSSetlist[]>([])
  useEffect(() => {
    if (!uid || !depuis) return
    getSetlistsFrom(depuis).then(l => setSetlists(l.filter(s => !s.isPrivate && !s.isDraft))).catch(() => {})
  }, [uid, depuis])
  // Seulement une setlist que la personne peut ouvrir (même règle que sa page) : jamais un lien vers « pas d'accès ».
  const setlist = useMemo(() => {
    if (!user || !mesServices) return null
    const lisibles = setlists.filter(s => canSeeSetlist(user, profile, s))
    return mesServices.prochain.map(s => setlistDuService(lisibles, s)).find(Boolean) ?? null
  }, [user, profile, mesServices, setlists])
  const setlistId = setlist?.id
  const [songs, setSongs] = useState<Record<string, SongIndexEntry>>({})
  useEffect(() => {
    if (!setlistId) return
    fetch("/songs-index.json").then(r => r.json())
      .then((index: { songs?: SongIndexEntry[] }) => setSongs(Object.fromEntries((index.songs ?? []).map(s => [s.slug, s]))))
      .catch(() => {})
  }, [setlistId])

  // Prochains évènements : derrière l'interrupteur jusqu'à U9 (Q14).
  const [evenements, setEvenements] = useState<Evenement[] | null>(null)
  useEffect(() => {
    if (!BACK_OFFICE || !user) return
    listEvenements(false).then(setEvenements).catch(() => {})
  }, [user])
  const prochainsEvenements = useMemo(
    () => BACK_OFFICE && evenements
      // Lot G (G1) : une réunion n'est pas un évènement de l'App.
      ? evenements.filter(e => canSeeEvenement(user, profile, e) && !estReunion(e) && !isInfo(e) && !isPast(e, aujourdhui) && !isExpired(e, aujourdhui)).slice(0, 2)
      : null,
    [evenements, user, profile, aujourdhui],
  )

  const sun = currentSundayStr()
  const sunParts = sun.split("-")

  const cRow = culte.find(r => r[0] === sun) ?? null
  const dRow = dej.find(r => r[0] === sun) ?? null
  const pdRow = petitDej.find(r => r[0] === sun) ?? null
  const paixRow = paix.find(r => r[0] === sun) ?? null
  const fidRow = fid.find(r => r[0] === sun) ?? null
  const bonteRow = bonte.find(r => r[0] === sun) ?? null

  // Dimanche d'Interfranco ou d'Intergroupe (jamais les deux) : ce service
  // remplace toute la section Groupes. Intergroupe a 3 choristes, Interfranco 2 ;
  // les colonnes suivantes sont les mêmes (piano … traduction).
  const interfrancoRow = interfranco.find(r => r[0] === sun)
  const intergroupeRow = intergroupe.find(r => r[0] === sun)
  const inter = interfrancoRow
    ? { key: "interfranco" as const, choristes: interfrancoRow.slice(2, 4), rest: interfrancoRow.slice(4), pres: interfrancoRow[1] }
    : intergroupeRow
      ? { key: "intergroupe" as const, choristes: intergroupeRow.slice(2, 5), rest: intergroupeRow.slice(5), pres: intergroupeRow[1] }
      : null

  const m = +sunParts[1]
  const pk = EDD_PERIODES[m<=2?0:m<=4?1:m<=6?2:m<=8?3:m<=10?4:5]
  const eddP = edd[pk]?.classes ?? null
  const eddZb = eddP?.["中班"]?.find(r => r[0] === sun) ?? null
  const eddDb = eddP?.["大班"]?.find(r => r[0] === sun) ?? null
  const eddGb = eddP?.["高班"]?.find(r => r[0] === sun) ?? null

  const ceDimanche = (
    <CeDimanche
      titre={t("planning.thisSunday", { date: fdLongL(sun, i18n.language) })}
      disposition={disposition}
      monNom={profile?.planningName ?? ""}
      culte={cRow}
      inter={inter}
      // Lot U2, P5 : la percussion, quand le dimanche en a une, rejoint les musiciens du groupe.
      groupes={[
        { cle: "paix", presidence: paixRow?.[1] ?? "", musiciens: [paixRow?.[2], paixRow?.[5]].filter(v => v?.trim()).join(", ") },
        // Lot F : pianiste du groupe (D26), guitare et batterie, d'un seul planning.
        { cle: "fidelite", presidence: fidRow?.[1] ?? "", musiciens: [fidRow?.[4], fidRow?.[5], fidRow?.[6]].filter(v => v?.trim()).join(", ") },
        { cle: "bonte", presidence: bonteRow?.[1] ?? "", musiciens: [bonteRow?.[2], bonteRow?.[5]].filter(v => v?.trim()).join(", ") },
      ]}
      edd={[["中班", eddZb], ["大班", eddDb], ["高班", eddGb]].map(([classe, row]) => ({ classe: classe as string, presidence: (row as string[] | null)?.[1] ?? "" }))}
      table={dRow?.[1] ?? ""}
      petitDej={pdRow?.[1] ?? ""}
      inscriptionPetitDej={BACK_OFFICE && petitDejLu && sun >= aujourdhui}
      evenements={prochainsEvenements}
    />
  )
  const pourMoiBloc = mesServices && (
    <PourMoi
      prochain={mesServices.prochain}
      ensuite={disposition === "telephone" ? [] : mesServices.ensuite}
      setlist={setlist}
      songs={songs}
      aujourdhui={aujourdhui}
      disposition={disposition}
    />
  )

  return (
    <div className="relative space-y-6">
      <StaleBanner show={stale} />

      {disposition === "grand" ? (
        <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] items-start gap-5">
          {ceDimanche}
          {pourMoiBloc}
        </div>
      ) : (
        <>
          {pourMoiBloc}
          {ceDimanche}
        </>
      )}

      {/* Verset (question 1 de la spec : gardé en bas) */}
      <blockquote className="bg-secondary rounded-xl p-5">
        <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">
          {t("planning.verse.text")}
        </p>
        <footer className="text-xs font-semibold text-muted-foreground text-right">{t("planning.verse.ref")}</footer>
      </blockquote>
      <GuideLien section="planning" />
    </div>
  )
}
