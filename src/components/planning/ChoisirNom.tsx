"use client"

import { Fragment, useId, useState, useSyncExternalStore } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock"
import { datesCourtes, periodeAbsence, rangerParAbsence, type Proposition, type PropositionsReliees } from "@/lib/planning/choisir"
import type { Absence } from "@/types/absence"

// « Choisir » une personne dans une case (lot U2, P9, docs/spec-planning-2027.md,
// question 5 ; planche bo-planning-2027) : une recherche, les comptes qui ont le
// rôle de la colonne d'abord, puis les autres ; « Écrire un nom sans compte… ».
// Menu contre la case sur ordinateur (≥ 1024 px, tablette paysage comprise),
// feuille sur tablette portrait et téléphone (spec, « Écrans »).

type OuvertureChoix = {
  /** « Présidence · 10/1 » : titre de la feuille, nom du menu. */
  titre: string
  /** Libellé de la colonne : la marque des comptes du rôle, le nom du champ libre. */
  libelle: string
  /** Valeur actuelle de la case (« Vider la case » si elle n'est pas vide). */
  valeur: string
  /** La case cliquée, pour poser le menu contre elle. */
  ancre: DOMRect
}

const LARGE = "(min-width: 1024px)"
const suivreLargeur = (rappel: () => void) => {
  const mq = window.matchMedia(LARGE)
  mq.addEventListener("change", rappel)
  return () => mq.removeEventListener("change", rappel)
}
export const useOrdinateur = () =>
  useSyncExternalStore(suivreLargeur, () => window.matchMedia(LARGE).matches, () => false)

const LARGEUR_MENU = 264
const HAUTEUR_MENU = 440

/** « Remplir vers le bas » (lot 3, PG18 à PG20) : absent, l'entrée n'est pas offerte. */
type RemplirVersLeBas = {
  /** Sa phrase d'aide (ou « Aucune case vide plus bas ce trimestre. »). */
  aide: string
  /** Aucune case vide à remplir : l'entrée est grisée. */
  grise: boolean
  onRemplir: () => void
}

export function ChoisirNom({
  ouverture,
  onFermer,
  proposer,
  onEcrire,
  remplir,
  reliees,
  absenceDe,
}: {
  ouverture: OuvertureChoix | null
  onFermer: () => void
  proposer: (recherche: string) => Proposition[]
  /** Le nom à écrire dans la case ("" : la vider). */
  onEcrire: (nom: string) => void
  remplir?: RemplirVersLeBas
  /** Lot 2 (OG29) : les titulaires du rôle relié à la colonne, le groupe replié, la recherche ; `null` (ou absent) = « Choisir » d'avant. */
  reliees?: (recherche: string) => PropositionsReliees | null
  /** SC3.4 : l'absence d'un nom à la date de la case ; les absents se rangent à part, en dernier, et restent choisissables (SC3.5). Absent, rien ne change. */
  absenceDe?: (nom: string) => Absence | null
}) {
  const ordinateur = useOrdinateur()
  useStandaloneScrollLock(!!ouverture && !ordinateur)
  const changer = (ouvert: boolean) => { if (!ouvert) onFermer() }
  const menu = ouverture && <Menu key={ouverture.titre} ouverture={ouverture} proposer={proposer} onEcrire={onEcrire} remplir={remplir} reliees={reliees} absenceDe={absenceDe} />

  if (ordinateur) {
    const a = ouverture?.ancre
    // Sous la case, ou au-dessus quand la place manque en bas de l'écran.
    const enHaut = !!a && a.bottom + HAUTEUR_MENU > window.innerHeight && a.top > window.innerHeight - a.bottom
    const place = a && {
      left: Math.max(8, Math.min(a.left, window.innerWidth - LARGEUR_MENU - 8)),
      ...(enHaut ? { bottom: window.innerHeight - a.top + 4 } : { top: a.bottom + 4 }),
    }
    return (
      <DialogPrimitive.Root open={!!ouverture} onOpenChange={changer}>
        <DialogPrimitive.Portal>
          {/* Voile transparent : un clic à côté ferme le menu, la page ne défile pas dessous. */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-50" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            style={{ ...place, width: LARGEUR_MENU }}
            className="fixed z-50 rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
          >
            <DialogPrimitive.Title className="sr-only">{ouverture?.titre}</DialogPrimitive.Title>
            {menu}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  }

  return (
    <Drawer open={!!ouverture} onOpenChange={changer}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader className="pb-1">
          <DrawerTitle>{ouverture?.titre}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">{menu}</div>
      </DrawerContent>
    </Drawer>
  )
}

function Menu({
  ouverture,
  proposer,
  onEcrire,
  remplir,
  reliees,
  absenceDe,
}: {
  ouverture: OuvertureChoix
  proposer: (recherche: string) => Proposition[]
  onEcrire: (nom: string) => void
  remplir?: RemplirVersLeBas
  reliees?: (recherche: string) => PropositionsReliees | null
  absenceDe?: (nom: string) => Absence | null
}) {
  const { t, i18n } = useTranslation()
  const zh = i18n.language === "zh-CN"
  const id = useId()
  const [recherche, setRecherche] = useState("")
  const [actif, setActif] = useState(0)
  const [saisie, setSaisie] = useState<string | null>(null)
  const [groupeOuvert, setGroupeOuvert] = useState(false)
  const rel = reliees?.(recherche) ?? null
  const cherche = recherche.trim() !== ""
  // Une recherche déplie le groupe : ce qu'elle trouve se voit (OG29).
  const voirGroupe = groupeOuvert || cherche
  // SC3.4 : les absents ce jour-là, rangés à part en dernier (toutes sections réunies).
  const trier = <T extends { nom: string }>(l: T[]) =>
    absenceDe ? rangerParAbsence(l, absenceDe) : { disponibles: l, absents: [] as Array<T & { absence: Absence }> }
  const relT = rel && trier(rel.titulaires)
  const relG = rel && trier(rel.groupe)
  const relA = rel && trier(rel.autres)
  const plat = rel ? null : trier(proposer(recherche))
  const absents: Array<Proposition & { absence: Absence }> = rel
    ? [...relT!.absents.map((x) => ({ nom: x.nom, duRole: true, absence: x.absence })),
       ...(voirGroupe ? relG!.absents.map((x) => ({ nom: x.nom, duRole: false, absence: x.absence })) : []),
       ...relA!.absents.map((x) => ({ nom: x.nom, duRole: false, absence: x.absence }))]
    : plat!.absents
  const noms: Array<Proposition & { absence?: Absence }> = rel
    ? [
        ...relT!.disponibles.map((x) => ({ nom: x.nom, duRole: true })),
        ...(voirGroupe ? relG!.disponibles.map((x) => ({ nom: x.nom, duRole: false })) : []),
        ...relA!.disponibles,
        ...absents,
      ]
    : [...plat!.disponibles, ...plat!.absents]
  const nbDisponibles = noms.length - absents.length
  const deuxGroupes = !rel && plat!.disponibles.some((p) => p.duRole) && plat!.disponibles.some((p) => !p.duRole)
  const langue = zh ? "zh" : "fr"

  // « Écrire un nom sans compte… » : le champ reprend la recherche, ou la case.
  const ecrireALaMain = () => setSaisie(recherche.trim() || ouverture.valeur)

  if (saisie !== null) {
    return (
      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); onEcrire(saisie.trim()) }}
      >
        <input
          autoFocus
          type="text"
          aria-label={ouverture.libelle}
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-[16px] sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <Button type="submit" className="h-10">{t("common.buttons.save")}</Button>
      </form>
    )
  }

  const option = (p: Proposition, i: number, sous?: string, sansCompte?: boolean, absence?: Absence) => (
    <li
      key={`${id}-${i}`}
      id={`${id}-${i}`}
      role="option"
      aria-selected={i === actif}
      aria-label={absence ? t("planning.choisir.absentCeJour", { nom: p.nom }) : undefined}
      // Le champ de recherche garde le focus (et le clavier du téléphone).
      onMouseDown={(e) => e.preventDefault()}
      onMouseMove={() => setActif(i)}
      onClick={() => onEcrire(p.nom)}
      className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[15px] sm:text-sm ${
        i === actif ? "bg-secondary" : ""
      } ${absence ? "text-muted-foreground opacity-70" : ""}`}
    >
      <span className="min-w-[4rem] shrink-0 truncate">
        {p.nom}
        {sansCompte && <span className="ml-1.5 text-[11px] text-muted-foreground">{t("groupes.sansCompte")}</span>}
      </span>
      {absence ? <span title={periodeAbsence(absence, langue)} className="min-w-0 max-w-[55%] truncate text-xs">{periodeAbsence(absence, langue)}</span>
        : sous !== undefined ? <span title={sous} className="min-w-0 max-w-[55%] truncate text-xs text-muted-foreground">{sous}</span>
        : p.duRole && <span className="shrink-0 text-xs text-muted-foreground">{ouverture.libelle}</span>}
    </li>
  )
  const entete = (cle: string) => (
    <li role="presentation" className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {t(cle)}
    </li>
  )
  const premierAutre = noms.findIndex((p) => !p.duRole)

  return (
    <div>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          role="combobox"
          aria-expanded
          aria-autocomplete="list"
          aria-controls={rel && voirGroupe && (rel.groupe.length > 0 || rel.autres.length > 0) ? `${id}-liste ${id}-liste2` : `${id}-liste`}
          aria-activedescendant={noms.length ? `${id}-${actif}` : undefined}
          aria-label={t("planning.choisir.chercher")}
          placeholder={t("planning.choisir.chercher")}
          value={recherche}
          onChange={(e) => { setRecherche(e.target.value); setActif(0) }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActif((i) => Math.min(i + 1, noms.length - 1)) }
            if (e.key === "ArrowUp") { e.preventDefault(); setActif((i) => Math.max(i - 1, 0)) }
            if (e.key === "Enter") {
              e.preventDefault()
              if (noms[actif]) onEcrire(noms[actif].nom)
              else ecrireALaMain()
            }
          }}
          className="h-10 w-full rounded-full bg-secondary pl-8 pr-3 text-[16px] sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/30"
        />
      </div>
      {rel ? (
        <div className="mt-1 max-h-[40vh] overflow-y-auto overscroll-contain lg:max-h-60">
          <ul id={`${id}-liste`} role="listbox" aria-label={t("groupes.choisir.titulaires", { role: (zh && rel.role.nomZh) || rel.role.nom })}>
            {relT!.disponibles.length > 0 && (
              <li role="presentation" className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("groupes.choisir.titulaires", { role: (zh && rel.role.nomZh) || rel.role.nom })}
              </li>
            )}
            {relT!.disponibles.map((x, i) => option(
              { nom: x.nom, duRole: true }, i,
              x.deja.length ? t("groupes.choisir.deja", { dates: datesCourtes(x.deja, i18n.language) }) : t("groupes.choisir.libre"),
              x.sansCompte,
            ))}
          </ul>
          {!cherche && rel.groupe.length > 0 && (
            <button
              type="button"
              aria-expanded={groupeOuvert}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setGroupeOuvert((o) => !o); setActif(0) }}
              className="flex min-h-10 w-full items-center rounded-lg px-2.5 py-2 text-left text-[15px] sm:text-sm font-medium text-foreground hover:bg-secondary"
            >
              {t("groupes.choisir.voirGroupe", { n: rel.groupe.length })}
            </button>
          )}
          {voirGroupe && (relG!.disponibles.length > 0 || relA!.disponibles.length > 0) && (
            <ul id={`${id}-liste2`} role="listbox" aria-label={t("groupes.choisir.groupe")}>
              {relG!.disponibles.map((m, k) => option(
                { nom: m.nom, duRole: false }, relT!.disponibles.length + k,
                m.roles.length
                  ? m.roles.map((r) => (r.fixe === "president" ? t("groupes.enTete.president") : r.fixe === "vp" ? t("groupes.enTete.vicePresident") : (zh && r.nomZh) || r.nom)).join(", ")
                  : t("groupes.choisir.aucunRole"),
                m.sansCompte,
              ))}
              {relA!.disponibles.length > 0 && entete("planning.choisir.autres")}
              {relA!.disponibles.map((p, k) => option({ nom: p.nom, duRole: false }, relT!.disponibles.length + relG!.disponibles.length + k))}
            </ul>
          )}
          {absents.length > 0 && (
            <ul id={`${id}-absents`} role="listbox" aria-label={t("planning.choisir.absent")}>
              {entete("planning.choisir.absent")}
              {absents.map((p, k) => option(p, nbDisponibles + k, undefined, false, p.absence))}
            </ul>
          )}
        </div>
      ) : (
      <ul
        id={`${id}-liste`}
        role="listbox"
        aria-label={ouverture.libelle}
        className="mt-1 max-h-[40vh] overflow-y-auto overscroll-contain lg:max-h-60"
      >
        {deuxGroupes && entete("planning.choisir.avecRole")}
        {noms.map((p, i) => (
          <Fragment key={p.nom}>
            {deuxGroupes && i === premierAutre && entete("planning.choisir.autres")}
            {p.absence && i === nbDisponibles && entete("planning.choisir.absent")}
            {option(p, i, undefined, false, p.absence)}
          </Fragment>
        ))}
      </ul>
      )}
      {remplir && (
        <button
          type="button"
          disabled={remplir.grise}
          onClick={remplir.onRemplir}
          className="flex min-h-10 w-full flex-col items-start justify-center rounded-lg px-2.5 py-2 text-left text-[15px] sm:text-sm text-foreground hover:bg-secondary disabled:opacity-60 disabled:hover:bg-transparent"
        >
          <span className="font-medium">{t("planning.gestes.remplirBas")}</span>
          <span className="text-xs text-muted-foreground">{remplir.aide}</span>
        </button>
      )}
      <button
        type="button"
        onClick={ecrireALaMain}
        className="flex min-h-10 w-full items-center rounded-lg px-2.5 py-2 text-left text-[15px] sm:text-sm text-muted-foreground hover:bg-secondary"
      >
        {t("planning.choisir.sansCompte")}
      </button>
      {ouverture.valeur && (
        <button
          type="button"
          onClick={() => onEcrire("")}
          className="flex min-h-10 w-full items-center rounded-lg px-2.5 py-2 text-left text-[15px] sm:text-sm text-destructive hover:bg-secondary"
        >
          {t("planning.choisir.vider")}
        </button>
      )}
    </div>
  )
}
