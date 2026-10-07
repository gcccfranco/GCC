"use client"

// « Ce dimanche » de l'accueil A (lot U4 bis, B1, docs/spec-pages-en-grand.md, Q14 ; planches
// `accueil-a-*`). Le Culte (ou, ces dimanches-là, Interfranco / Intergroupe) avec ses rôles en
// deux colonnes, une sur téléphone, la personne en évidence ; Groupes et EDD en une ligne par
// groupe, leur détail reste dans leur onglet ; la Table et le petit déj ; les évènements à
// venir (derrière l'interrupteur jusqu'à U9). Le contenu est celui d'aujourd'hui.

import { Fragment } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { serviceButtonFill } from "@/lib/serviceButton"
import { porteLeNom } from "@/lib/planning/accueil"
import { Tile } from "@/components/ui/tile"
import type { Evenement } from "@/types/evenement"
import type { Disposition } from "./PourMoi"

const vide = (v?: string) => !v?.trim() || v.trim() === "—"
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const svc = (couleur: string) => ({ "--svc": couleur }) as React.CSSProperties

function Point({ couleur, className = "" }: { couleur: string; className?: string }) {
  return <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${className}`} style={{ background: couleur }} />
}

/** Une case de planning, la personne connectée en évidence (pastille d'encre).
 *  La pastille reste d'un seul tenant (retours du 06/10/2026 : « Timothée / C. »). */
function Noms({ valeur, monNom }: { valeur: string; monNom: string }) {
  const noms = valeur.split(/\s*,\s*/)
  return (
    <>
      {noms.map((n, i) => (
        <Fragment key={i}>
          {i > 0 && ", "}
          {porteLeNom(n, monNom)
            ? <b data-testid="moi" className="inline-block whitespace-nowrap rounded-md bg-foreground px-1.5 py-px font-semibold text-background">{n}</b>
            : n}
        </Fragment>
      ))}
    </>
  )
}

/** Un service et ses rôles : deux colonnes en grand et sur tablette, une sur téléphone. */
function CarteService({ titre, couleur, roles, colonnes, monNom, testId, vide: messageVide }: {
  titre: string
  couleur: string
  roles: [string, string][]
  /** « large » : deux colonnes, trois quand « Ce dimanche » dépasse 720 px (requête de conteneur, en grand). */
  colonnes: 1 | 2 | "large"
  monNom: string
  testId?: string
  vide?: string
}) {
  const remplis = roles.filter(([, v]) => !vide(v))
  return (
    <article data-testid={testId} className="raised rounded-2xl px-4 py-3.5">
      <h3 className="mb-1.5 flex items-center gap-2">
        <Point couleur={couleur} />
        <span className="svc-ink text-base font-bold" style={svc(couleur)}>{titre}</span>
      </h3>
      {remplis.length ? (
        <dl className={colonnes === "large" ? "grid grid-cols-2 gap-x-6 [@container(min-width:720px)]:grid-cols-3" : colonnes === 2 ? "grid grid-cols-2 gap-x-6" : ""}>
          {remplis.map(([label, valeur]) => (
            <div key={label} className="flex min-w-0 gap-2.5 border-t border-border/70 py-1.5 text-sm">
              <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0"><Noms valeur={valeur} monNom={monNom} /></dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{messageVide}</p>
      )}
    </article>
  )
}

export type Groupe = { cle: "paix" | "fidelite" | "bonte"; presidence: string; musiciens: string }
export type Inter = { key: "interfranco" | "intergroupe"; choristes: string[]; rest: string[]; pres: string }

export function CeDimanche({
  titre,
  disposition,
  monNom,
  culte,
  inter,
  groupes,
  edd,
  table,
  petitDej,
  inscriptionPetitDej,
  evenements,
}: {
  titre: string
  disposition: Disposition
  monNom: string
  culte: string[] | null
  inter: Inter | null
  groupes: Groupe[]
  edd: { classe: string; presidence: string }[]
  table: string
  petitDej: string
  /** Interrupteur ouvert : un dimanche sans petit déj est « Libre », avec « Je m'inscris ». */
  inscriptionPetitDej: boolean
  /** Les prochains évènements ; `null` : le bloc n'est pas montré (interrupteur coupé). */
  evenements: Evenement[] | null
}) {
  const { t, i18n } = useTranslation()
  const colonnes = disposition === "telephone" ? 1 : disposition === "grand" ? "large" : 2
  const r = (cle: string) => t(`planning.roles.${cle}`)
  const locale = i18n.language === "zh-CN" ? "zh-CN" : "fr-FR"

  const carteCulte = (
    <CarteService
      testId="carte-culte"
      titre={t("planning.tabs.culte")}
      couleur={PLANNING_COLORS.culte}
      colonnes={colonnes}
      monNom={monNom}
      vide={t("planning.dataPending")}
      roles={culte ? [
        [r("presidence"), culte[1]],
        [r("choristes"), [culte[2], culte[3]].filter((v) => v?.trim()).join(", ")],
        [r("piano"), culte[4]],
        [r("guitare"), culte[5]],
        [r("batterie"), culte[6]],
        [r("sono"), culte[7]],
        [r("ppt"), culte[8]],
        [r("orateur"), culte[9]],
        [r("trad"), culte[10]],
        [r("sainteCene"), culte[11]],
      ] : []}
    />
  )

  const carteGroupes = inter ? (
    <CarteService
      testId="carte-inter"
      titre={t(`planning.tabs.${inter.key}`)}
      couleur={PLANNING_COLORS[inter.key]}
      colonnes={colonnes === "large" ? 2 : colonnes}
      monNom={monNom}
      roles={[
        [r("presidence"), inter.pres],
        [r("choristes"), inter.choristes.filter((v) => v?.trim()).join(", ")],
        [r("piano"), inter.rest[0]],
        [r("guitare"), inter.rest[1]],
        [r("cajonBatt"), inter.rest[2]],
        [r("sono"), inter.rest[3]],
        [r("ppt"), inter.rest[4]],
        [r("orateur"), inter.rest[5]],
        [r("trad"), inter.rest[6]],
      ]}
    />
  ) : (
    <article className="raised rounded-2xl px-4 py-3.5">
      <h3 className="mb-1 text-[13px] font-semibold text-muted-foreground">{t("planning.tabs.groupes")}</h3>
      <ul>
        {groupes.map((g) => {
          const resume = ([["presidence", g.presidence], ["musiciens", g.musiciens]] as const).filter(([, v]) => !vide(v))
          return (
            <li key={g.cle} data-testid="ligne-groupe" className="flex items-start gap-2.5 border-t border-border/70 py-2 text-sm">
              <Point couleur={PLANNING_COLORS[g.cle]} className="mt-1.5" />
              <div className="min-w-0">
                <b className="font-semibold">{t(`planning.groupes.${g.cle}`)}</b>
                <p className="text-[13px] text-muted-foreground">
                  {resume.length ? resume.map(([cle, v], i) => (
                    <Fragment key={cle}>{i > 0 && " · "}{r(cle)} <Noms valeur={v} monNom={monNom} /></Fragment>
                  )) : "—"}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </article>
  )

  const carteEdd = (
    <article className="raised rounded-2xl px-4 py-3.5">
      <h3 className="svc-ink mb-1 text-[13px] font-semibold" style={svc(PLANNING_COLORS.edd)}>{t("planning.tabs.edd")}</h3>
      <ul>
        {edd.map((c) => (
          <li key={c.classe} data-testid="ligne-edd" className="flex gap-2.5 border-t border-border/70 py-2 text-sm">
            <b className="svc-ink w-12 shrink-0 font-semibold" style={svc(PLANNING_COLORS.edd)}>{c.classe}</b>
            <span className="min-w-0">{vide(c.presidence) ? "—" : <>{r("presidence")} <Noms valeur={c.presidence} monNom={monNom} /></>}</span>
          </li>
        ))}
      </ul>
    </article>
  )

  const libre = vide(petitDej) && inscriptionPetitDej
  // Agencement v18 (A1) : barre réduite, la Table rejoint Groupes et EDD sur une rangée ; à un
  // tiers de largeur, chaque ligne passe sur deux étages (le libellé au-dessus). Requête de
  // conteneur sur « Ce dimanche » (R15), en grand seulement : la tablette garde sa disposition.
  const etages = disposition === "grand" && !inter
  const ligneTable = etages
    ? "flex min-h-10 flex-wrap items-center gap-2.5 py-1 text-sm [@container(min-width:720px)]:gap-x-2 [@container(min-width:720px)]:gap-y-0.5 [@container(min-width:720px)]:py-2"
    : "flex min-h-10 items-center gap-2.5 py-1 text-sm"
  const pointTable = etages ? "[@container(min-width:720px)]:hidden" : ""
  const libelleTable = etages
    ? "w-28 shrink-0 font-semibold [@container(min-width:720px)]:w-full [@container(min-width:720px)]:text-[13px] [@container(min-width:720px)]:text-muted-foreground"
    : "w-28 shrink-0 font-semibold"
  const carteTable = (
    <article
      data-testid="carte-table"
      className={etages
        ? "raised col-span-2 rounded-2xl px-4 py-2 [@container(min-width:720px)]:col-span-1 [@container(min-width:720px)]:py-3"
        : "raised rounded-2xl px-4 py-2"}
    >
      {/* Sur deux étages, un en-tête comme Groupes et EDD (planche : `table_empilee`). */}
      {etages && (
        <h3 className="svc-ink mb-1 hidden text-[13px] font-semibold [@container(min-width:720px)]:block" style={svc(PLANNING_COLORS.table)}>
          {t("planning.accueil.carteTable")}
        </h3>
      )}
      <div className={etages ? `${ligneTable} [@container(min-width:720px)]:border-t [@container(min-width:720px)]:border-border/70` : ligneTable}>
        <Point couleur={PLANNING_COLORS.table} className={pointTable} />
        <b className={libelleTable}>{t("planning.tabs.table")}</b>
        <span className="min-w-0">{vide(table) ? "—" : <Noms valeur={table} monNom={monNom} />}</span>
      </div>
      {(!vide(petitDej) || libre) && (
        <div className={`${ligneTable} border-t border-border/70`}>
          <Point couleur={PLANNING_COLORS.table} className={pointTable} />
          <b className={libelleTable}>{t("planning.tabs.petitDej")}</b>
          {libre ? (
            <>
              <span className="font-semibold text-amber-700 dark:text-amber-400">{t("planning.accueil.libre")}</span>
              <Link
                href="/planning/table"
                className="ml-auto inline-flex h-8 items-center rounded-full px-3.5 text-[13px] font-semibold text-white transition-transform duration-150 active:scale-[.97]"
                style={{ background: serviceButtonFill(PLANNING_COLORS.table) }}
              >
                {t("planning.accueil.inscrire")}
              </Link>
            </>
          ) : (
            <span className="min-w-0"><Noms valeur={petitDej} monNom={monNom} /></span>
          )}
        </div>
      )}
    </article>
  )

  const carteEvenements = evenements && evenements.length > 0 ? (
    <article className="raised rounded-2xl px-4 py-3.5">
      <h3 className="mb-1 text-[13px] font-semibold text-muted-foreground">{t("planning.accueil.evenements")}</h3>
      <ul className={disposition === "grand" ? "grid grid-cols-2 gap-4 pt-1.5" : ""}>
        {evenements.map((e) => {
          const jour = new Date(`${e.date}T12:00:00`)
          const quand = [
            majuscule(new Intl.DateTimeFormat(locale, { weekday: "long" }).format(jour)),
            e.heure,
            e.lieu,
          ].filter(Boolean).join(" · ")
          return (
            <li key={e.id} className={disposition === "grand" ? "min-w-0" : "border-t border-border/70 py-2 first:border-t-0"}>
              <Link href={`/evenements/${e.id}`} className="flex min-w-0 items-center gap-3">
                <Tile color={PLANNING_COLORS.scene} big={jour.getDate()} small={new Intl.DateTimeFormat(locale, { month: "short" }).format(jour)} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{e.titre}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{quand}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </article>
  ) : null

  return (
    <section aria-labelledby="ce-dimanche" className={disposition === "grand" ? "min-w-0 [container-type:inline-size]" : "min-w-0"}>
      <h2 id="ce-dimanche" className="mb-3 text-[17px] font-bold">{titre}</h2>
      <div className="flex flex-col gap-3.5">
        {carteCulte}
        {disposition === "telephone" ? (
          <>{carteGroupes}{carteEdd}{carteTable}{carteEvenements}</>
        ) : etages ? (
          <>
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3.5 [@container(min-width:720px)]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              {carteGroupes}{carteEdd}{carteTable}
            </div>
            {carteEvenements}
          </>
        ) : (
          <>
            <div className={inter ? "flex flex-col gap-3.5" : "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3.5"}>
              {carteGroupes}{carteEdd}
            </div>
            {disposition === "tablette" && carteEvenements ? (
              <div className="grid grid-cols-2 items-start gap-3.5">{carteTable}{carteEvenements}</div>
            ) : (
              <>{carteTable}{carteEvenements}</>
            )}
          </>
        )}
      </div>
    </section>
  )
}
