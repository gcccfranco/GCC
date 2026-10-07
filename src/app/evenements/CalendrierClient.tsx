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
// Agencement v18 (A10, docs/spec-agencement-v18.md) : l'en-tête de la section (`enTete`, posé par
// `SectionEvenements` : titre, « + Nouvel évènement », onglets) est au-dessus des deux volets ; la
// liste n'a plus de titre, c'est une carte (R10) ; la fiche du volet ne pose pas de marge. En un
// volet, l'en-tête est sur l'agenda ; la fiche en page n'a que son retour « ‹ Évènements ».

import { GuideLien } from "@/components/guide/GuideLien"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { DeuxVolets } from "@/components/layout/DeuxVolets"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canSeeEvenement } from "@/lib/access"
import { EVENEMENTS_CHANGED, getInscription, listEvenements } from "@/lib/firebase/evenements"
import { agendaPublic, daysAgo, isExpired, isInfo } from "@/lib/evenements/agenda"
import { avantBascule, BASCULE_EVENEMENTS, jourDeParis } from "@/lib/evenements/bascule"
import { lireSheetEvenements, type LectureSheet } from "@/lib/evenements/sheet"
import { estSurLaListe } from "@/lib/deuxVolets"
import { useDisposition } from "@/hooks/useDisposition"
import type { Evenement } from "@/types/evenement"
import { EntreeSheetCarte, EvenementCard, EvenementCarte } from "./EvenementCard"
import { EvenementClient } from "./[id]/EvenementClient"

export function CalendrierClient({ enTete, peutCreer, children }: {
  enTete: React.ReactNode
  /** Responsable qui peut créer un évènement (calculé par `SectionEvenements`, une seule source). */
  peutCreer: boolean
  children: React.ReactNode
}) {
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

  // En grand, sans fiche choisie : le prochain évènement de l'agenda, sinon la première info (Q3).
  // Une entrée du Sheet (U9) n'a pas de fiche : le prochain évènement de l'app.
  const prochain = upcoming.flatMap((g) => g.elements).find((x) => x.source === "app")
  const premier = (prochain?.source === "app" ? prochain.evenement : null) ?? infos[0] ?? null
  // Ni évènement de l'app ni info : la première entrée du Sheet (sa carte, faute de fiche).
  const premiereEntree = premier ? undefined : upcoming.flatMap((g) => g.elements).find((x) => x.source === "sheet")
  const surLaListe = estSurLaListe(pathname, "/evenements")
  const idActif = surLaListe ? premier?.id : decodeURIComponent(pathname.replace(/\/+$/, "").split("/")[2] ?? "")

  // Rien de prévu : on ne l'affirme qu'une fois le Sheet lu (U9), et pas s'il n'a pu l'être. En grand,
  // c'est aussi le volet de droite d'un agenda vide (Q3).
  const vide = (
    <p className="text-sm text-muted-foreground">
      {sheetEnLecture ? t("common.loading") : sheet?.injoignable ? t("evenements.sheetInjoignable") : (
        <>
          {t("evenements.none")}
          {peutCreer && ` ${t("evenements.noneHint")}`}
        </>
      )}
    </p>
  )

  const agenda = chargement ? (
    <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  ) : (
    <div className={grand ? "space-y-5" : "max-w-2xl mx-auto space-y-6 md:max-w-none"}>
      {infos.length > 0 && (
        <section className="space-y-2" aria-label={t("evenements.infos")}>
          {infos.map((e) => <EvenementCard key={e.id} evenement={e} actif={grand && e.id === idActif} />)}
        </section>
      )}

      {upcoming.length === 0 && vide}
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
      <div className="pb-16">
        {enTete}
        <DeuxVolets
          racine="/evenements"
          liste={<div className="px-3 py-4">{agenda}</div>}
          premier={
            chargement ? null
              : premier ? <EvenementClient id={premier.id} />
              : premiereEntree?.source === "sheet" ? <EntreeSheetCarte entree={premiereEntree.entree} />
              : vide
          }
        >
          {children}
        </DeuxVolets>
      </div>
    )
  }
  return (
    <>
      {surLaListe && enTete}
      <main className={`px-[var(--marge-page)] pb-16 ${surLaListe ? "" : "pt-6"}`}>
        <DeuxVolets racine="/evenements" liste={agenda}>{children}</DeuxVolets>
      </main>
    </>
  )
}
