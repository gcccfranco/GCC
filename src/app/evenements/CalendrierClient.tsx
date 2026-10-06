"use client"

// Calendrier des évènements (lot 6) : lisible sans compte (« toute l'église »
// seulement), plus les évènements de ses sections quand on est connecté.
// Infos épinglées en tête, puis agenda par mois, passés derrière un lien.
//
// Lot U4 bis, B2 (docs/spec-pages-en-grand.md, Q2, Q3, Q5) : l'agenda vit dans le layout de
// la section (`SectionEvenements`), la fiche est la page de l'adresse. En grand : l'agenda en
// lignes à gauche (titre, onglets, « Nouvel évènement » en encre), la fiche à droite — sur
// l'adresse de l'agenda, celle du prochain évènement. Un volet : les cartes à bannière
// d'aujourd'hui (deux colonnes sur tablette portrait), puis la fiche seule sur son adresse.
// Lot U9, B2 : jusqu'au 31/12/2026, les entrées du Sheet des évènements s'y mêlent.

import { GuideLien } from "@/components/guide/GuideLien"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"
import { PageTitle } from "@/components/layout/PageTitle"
import { DeuxVolets } from "@/components/layout/DeuxVolets"
import { EvenementsTabs } from "@/components/evenements/EvenementsTabs"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canSeeEvenement, creatableEvenementPours, estResponsable } from "@/lib/access"
import { ANNONCE_SECTIONS } from "@/types/annonce"
import { EVENEMENTS_CHANGED, getInscription, listEvenements } from "@/lib/firebase/evenements"
import { agendaPublic, daysAgo, isExpired, isInfo } from "@/lib/evenements/agenda"
import { avantBascule, BASCULE_EVENEMENTS, jourDeParis } from "@/lib/evenements/bascule"
import { lireSheetEvenements, type LectureSheet } from "@/lib/evenements/sheet"
import { estSurLaListe } from "@/lib/deuxVolets"
import { useDisposition } from "@/hooks/useDisposition"
import type { Evenement } from "@/types/evenement"
import { EntreeSheetCarte, EvenementCard, EvenementCarte } from "./EvenementCard"
import { EvenementClient } from "./[id]/EvenementClient"

export function CalendrierClient({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const pathname = usePathname() || "/evenements"
  const disposition = useDisposition()
  const grand = disposition === "grand"
  // Un volet, sur une fiche : l'agenda n'est pas montré, il n'est pas lu.
  const avecAgenda = grand || estSurLaListe(pathname, "/evenements")
  const [evenements, setEvenements] = useState<Evenement[] | null>(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (authLoading || !avecAgenda) return
    const load = () => { listEvenements(!user).then(setEvenements).catch(() => setEvenements([])) }
    load()
    window.addEventListener(EVENEMENTS_CHANGED, load)
    return () => window.removeEventListener(EVENEMENTS_CHANGED, load)
  }, [authLoading, user, avecAgenda])

  // Mes inscriptions (une lecture par évènement daté) : la carte affiche « Inscrit ».
  const [inscrits, setInscrits] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    if (!user || !evenements) return
    const ids = evenements.filter((e) => !isInfo(e)).map((e) => e.id)
    Promise.all(ids.map((id) => getInscription(id, user.uid).then((i) => (i ? id : null)).catch(() => null)))
      .then((r) => setInscrits(new Set(r.filter((id): id is string => id !== null))))
  }, [user, evenements])

  // Le jour de Paris, comme les inscriptions (`nowIsoParis`) : la bascule (U9) tombe à minuit de
  // Paris sur tous les appareils.
  const today = jourDeParis()

  // Lot U9, B2 : jusqu'au 31/12/2026, les entrées du Sheet (trois derniers mois compris, pour les
  // passés). À partir du 01/01/2027, aucune requête ; ni sur une fiche en un volet (pas d'agenda).
  // `null` : lecture en cours.
  const [sheet, setSheet] = useState<LectureSheet | null>(null)
  useEffect(() => {
    if (!avecAgenda || !avantBascule(today)) return
    lireSheetEvenements(daysAgo(today, 92), BASCULE_EVENEMENTS).then(setSheet).catch(() => setSheet({ entrees: [], injoignable: true }))
  }, [today, avecAgenda])
  const sheetEnLecture = avantBascule(today) && sheet === null

  const visible = useMemo(
    () => (evenements ?? []).filter((e) => canSeeEvenement(user, profile, e) && !isExpired(e, today)),
    [evenements, user, profile, today],
  )

  const chargement = authLoading || (user && profileLoading) || evenements === null
  const infos = visible.filter(isInfo).sort((a, b) => Number(b.epingle) - Number(a.epingle) || b.createdAt.localeCompare(a.createdAt))
  const { aVenir: upcoming, passes: past } = agendaPublic(visible, sheet?.entrees ?? [], !!user, today, i18n.language)

  // Lot U6, B3 : le formulaire est au Back-Office, ouvert aux responsables.
  const peutCreer = estResponsable(user, profile) && creatableEvenementPours(user, profile, ANNONCE_SECTIONS).length > 0

  // En grand, sans fiche choisie : le prochain évènement de l'agenda, sinon la première info (Q3).
  // Une entrée du Sheet (U9) n'a pas de fiche : le prochain évènement de l'app.
  const prochain = upcoming.flatMap((g) => g.elements).find((x) => x.source === "app")
  const premier = (prochain?.source === "app" ? prochain.evenement : null) ?? infos[0] ?? null
  const surLaListe = estSurLaListe(pathname, "/evenements")
  const idActif = surLaListe ? premier?.id : decodeURIComponent(pathname.replace(/\/+$/, "").split("/")[2] ?? "")

  // « Nouvel évènement » en encre (Q5) ; en grand, un rond « + » à côté du titre (planche
  // `evenements-ipad-paysage`) : le libellé ne tient pas dans la liste.
  const nouvel = peutCreer && (
    <Link href="/back-office/evenements/nouveau" aria-label={t("evenements.nouveau")} title={grand ? t("evenements.nouveau") : undefined}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-foreground text-sm font-semibold text-background transition-transform duration-150 active:scale-[.97] ${grand ? "w-9" : "px-4"}`}>
      <Plus className="h-4 w-4" aria-hidden />
      {!grand && t("evenements.nouveau")}
    </Link>
  )

  const agenda = chargement ? (
    <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  ) : (
    <div className={grand ? "space-y-5" : "max-w-2xl mx-auto space-y-6 md:max-w-none"}>
      {/* En grand, le titre de la page (h1) est celui de la fiche à droite ; sans fiche (agenda vide), celui-ci. */}
      <PageTitle title={t("evenements.title")} niveau={grand && (premier || !surLaListe) ? 2 : 1} action={nouvel || undefined} />
      {grand && <EvenementsTabs enLigne />}

      {infos.length > 0 && (
        <section className="space-y-2" aria-label={t("evenements.infos")}>
          {infos.map((e) => <EvenementCard key={e.id} evenement={e} actif={grand && e.id === idActif} />)}
        </section>
      )}

      {/* Rien de prévu : on ne l'affirme qu'une fois le Sheet lu (U9), et pas s'il n'a pu l'être. */}
      {upcoming.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {sheetEnLecture ? t("common.loading") : sheet?.injoignable ? t("evenements.sheetInjoignable") : (
            <>
              {t("evenements.none")}
              {peutCreer && ` ${t("evenements.noneHint")}`}
            </>
          )}
        </p>
      )}
      {upcoming.map((g) => (
        <section key={g.key} className={grand ? "space-y-1" : "space-y-3"}>
          <h2 className="text-sm font-semibold text-muted-foreground px-1 capitalize">{g.label}</h2>
          {grand ? (
            g.elements.map((x, i) => x.source === "app"
              ? <EvenementCard key={x.evenement.id} evenement={x.evenement} actif={x.evenement.id === idActif} inscrit={!!user && inscrits.has(x.evenement.id)} />
              : <EntreeSheetCarte key={`sheet-${i}`} entree={x.entree} />)
          ) : (
            // Tablette portrait : les cartes sur deux colonnes (planche `evenements-tablette`).
            <div className="space-y-3 md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0">
              {g.elements.map((x, i) => x.source === "app"
                ? <EvenementCarte key={x.evenement.id} evenement={x.evenement} inscrit={!!user && inscrits.has(x.evenement.id)} />
                : <EntreeSheetCarte key={`sheet-${i}`} entree={x.entree} />)}
            </div>
          )}
        </section>
      ))}

      {past.length > 0 && (
        <section className="space-y-2">
          <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => setShowPast(!showPast)}>
            {showPast ? t("evenements.hidePast") : t("evenements.past")} ({past.length})
          </button>
          {showPast && past.map((x, i) => x.source === "app"
            ? <EvenementCard key={x.evenement.id} evenement={x.evenement} past actif={grand && x.evenement.id === idActif} />
            : <EntreeSheetCarte key={`sheet-${i}`} entree={x.entree} past />)}
        </section>
      )}

      {!user && (
        <p className="text-xs text-muted-foreground">
          {t("evenements.loginHint")} <Link href="/login?from=%2Fevenements" className="font-semibold underline">{t("evenements.login")}</Link>
        </p>
      )}
      <GuideLien section="evenements" />
    </div>
  )

  if (grand) {
    return (
      <DeuxVolets
        racine="/evenements"
        liste={<div className="px-5 pb-10 pt-6">{agenda}</div>}
        premier={
          <div className="px-6 pb-16 pt-6">
            {chargement ? null : premier ? <EvenementClient id={premier.id} /> : <p className="text-sm text-muted-foreground">{t("evenements.none")}</p>}
          </div>
        }
      >
        <div className="px-6 pb-16 pt-6">{children}</div>
      </DeuxVolets>
    )
  }
  return (
    <>
      <EvenementsTabs />
      <main className="max-w-[1080px] mx-auto px-4 py-6 pb-16">
        <DeuxVolets racine="/evenements" liste={agenda}>{children}</DeuxVolets>
      </main>
    </>
  )
}
