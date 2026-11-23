"use client"

// Salles, vue Grille (docs/spec-salles.md, lot 2, T2c ; SA3, SA4, AR6, AR17) : les neuf salles en colonnes, de 8:00 à
// 22:00 en lignes, un bloc par occupation à sa hauteur, coloré selon AR17. Au téléphone, la grille défile à
// l'horizontale (et en tablette portrait, critique-design T2c) et la colonne des heures reste figée ; dès 1 024 px, elle
// tient dans la largeur. Une occupation d'un lieu
// lié (la Grande salle dans la colonne de la Scène, et l'inverse, AR6) se voit en hachures, nommée pour les lecteurs
// d'écran seulement : la salle est prise, le bloc se lit dans sa colonne. Toucher un bloc ouvre son détail ; celui d'un créneau de scène ou d'un jour J
// mène à la page de la fête. Le repère d'heure (AR12) est une ligne en travers, sous les blocs.
// T3a : le détail d'une réservation offre « Modifier » et « Supprimer » à son auteur et à la coordination (SA10).
// T3c (SA11, SA6) : sous les blocs, une case par heure et par salle ouvre la feuille « Réserver » sur sa salle. Glisser
// (souris, trackpad, stylet) dessine la plage au quart d'heure ; un clic ou un appui ouvre l'heure de la case, pour une
// heure ; au clavier, une seule case est dans l'ordre de tabulation, les flèches changent de case et Entrée l'ouvre. Le
// toucher n'est pas capté : le défilement horizontal du téléphone (SA3) et le toucher d'un bloc (SA4) restent.
// T7 (AS13, RS8) : l'en-tête de colonne prend la couleur de la salle (fond à 13 %, filet de 2 px) avec sa pastille.

import { useRef, useState } from "react"
import Link from "next/link"
import { ChevronRight, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { couleurDe, nomOccupant, occupationsDe, type Occupation } from "@/lib/salles/occupations"
import { styleTexteService } from "@/lib/couleurSombre"
import { COULEUR_SALLE, salleLue, SALLES, type SalleId } from "@/lib/salles/salles"
import { useSalles } from "./SallesClient"

type Langue = "fr" | "zh"

const DEBUT = 8 * 60
const FIN = 22 * 60
/** Hauteur d'une heure, en px. */
const H = 44
const HEURES = Array.from({ length: (FIN - DEBUT) / 60 + 1 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`)

const minutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
/** Place d'une heure dans le corps (0 à 1), bornée à 8:00 – 22:00. */
const place = (h: string) => (Math.min(FIN, Math.max(DEBUT, minutes(h))) - DEBUT) / (FIN - DEBUT)
const pct = (x: number) => `${(x * 100).toFixed(3)}%`
const journee = (o: Occupation) => o.debut === "00:00" && o.fin === "24:00"
const enHeure = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

/** Ce qu'une case de la Grille donne à la feuille « Réserver » (SA11). */
export type MomentCase = { salle: SalleId; debut: string; fin: string }

/** La plage d'un glisser, de `y0` à `y1` (px depuis 8:00) : les quarts d'heure touchés, 15 min au moins, 8:00 – 22:00. */
function plageGlissee(y0: number, y1: number): { debut: number; fin: number } {
  const m = (y: number) => Math.min(FIN - DEBUT, Math.max(0, (y / H) * 60))
  const debut = Math.floor(Math.min(m(y0), m(y1)) / 15) * 15
  const fin = Math.max(debut + 15, Math.ceil(Math.max(m(y0), m(y1)) / 15) * 15)
  return { debut: DEBUT + Math.min(debut, FIN - DEBUT - 15), fin: DEBUT + Math.min(fin, FIN - DEBUT) }
}

export function GrilleSalles({ occupations, heure, ouvrir, langue, dateLongue }: {
  occupations: Occupation[]
  /** Une case ouvre la feuille « Réserver » (SA11) ; null sans droit ou un jour passé. */
  ouvrir: ((m: MomentCase) => void) | null
  /** Le repère (« HH:MM ») : une ligne en travers de la grille. */
  heure: string
  langue: Langue
  dateLongue: string
}) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<Occupation | null>(null)
  const repere = minutes(heure) >= DEBUT && minutes(heure) <= FIN ? place(heure) : null
  const hauteur = (FIN - DEBUT) / 60 * H
  const grille = useRef<HTMLElement>(null)
  // Le glisser en cours (souris, trackpad, stylet) et la plage qu'il dessine.
  const geste = useRef<{ salle: SalleId; haut: number; y0: number; glisse: boolean } | null>(null)
  const finDuGlisser = useRef(0)
  const [plage, setPlage] = useState<{ salle: SalleId; debut: number; fin: number } | null>(null)
  // La case dans l'ordre de tabulation : d'abord celle du repère, dans la première colonne.
  const [focus, setFocus] = useState(() => ({ col: 0, h: repere === null ? 0 : Math.min(HEURES.length - 2, Math.floor(minutes(heure) / 60) - 8) }))

  const fleches = (e: React.KeyboardEvent, col: number, h: number) => {
    const pas = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]
    if (!pas) return
    e.preventDefault()
    const c = Math.min(SALLES.length - 1, Math.max(0, col + pas[0]))
    const i = Math.min(HEURES.length - 2, Math.max(0, h + pas[1]))
    grille.current?.querySelector<HTMLElement>(`[data-colonne="${SALLES[c].id}"] [data-case="${HEURES[i]}"]`)?.focus()
  }

  return (
    <section ref={grille} data-grille-salles aria-label={t("salles.grille")} className="carte-groupe overflow-hidden">
      <div data-defile className="overflow-x-auto overscroll-x-contain">
        <div className="flex w-full min-w-max lg:min-w-0">
          {/* Colonne des heures, figée au défilement horizontal. */}
          <div data-heures className="sticky left-0 z-20 w-12 shrink-0 border-r border-border/60 bg-card">
            <div className="h-14 border-b border-border/60" />
            <div className="py-3">
              <div className="relative" style={{ height: hauteur }}>
                {HEURES.map((h, i) => (
                  <span key={h} data-heure className="absolute right-1.5 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground" style={{ top: i * H }}>{h}</span>
                ))}
                {repere !== null && (
                  <span data-repere className="absolute right-0.5 z-10 -translate-y-1/2 rounded-full bg-foreground px-1 text-[11px] font-semibold tabular-nums text-background" style={{ top: pct(repere) }}>
                    {heure}
                  </span>
                )}
              </div>
            </div>
          </div>

          {SALLES.map((s, c) => {
            const ici = occupationsDe(occupations, s.id)
            return (
              <div key={s.id} data-colonne={s.id} className="min-w-[6.5rem] flex-1 border-r border-border/60 last:border-r-0 lg:min-w-0">
                <div
                  data-entete
                  className="couleur-salle flex h-14 flex-col items-center justify-center border-b-2 border-[color:var(--salle)] bg-[color-mix(in_srgb,var(--salle)_13%,transparent)] px-1 text-center leading-tight"
                  style={styleTexteService(COULEUR_SALLE[s.id])}
                >
                  <span className="text-xs font-semibold">
                    {/* Dans le flux du texte : la pastille reste collée au premier mot quand le nom passe sur deux lignes. */}
                    <span aria-hidden data-couleur-salle className="mr-1.5 inline-block h-[9px] w-[9px] rounded-full bg-[var(--salle)] align-[0.05em]" />
                    {s.nom}
                  </span>
                  {s.autreNom && <span className="text-[11px] text-muted-foreground">{s.autreNom}</span>}
                </div>
                <div className="py-3">
                  <div
                    data-corps
                    data-glisse={plage?.salle === s.id ? "" : undefined}
                    className="group/corps relative select-none"
                    style={{ height: hauteur, backgroundImage: `repeating-linear-gradient(to bottom, hsl(var(--border) / .6) 0 1px, transparent 1px ${H}px)` }}
                    // SA11 : glisser sur les cases (pas au toucher, qui défile) ; la plage suit le pointeur.
                    onPointerDown={(e) => {
                      if (!ouvrir || e.pointerType === "touch" || e.button !== 0 || !(e.target as HTMLElement).closest("[data-case]")) return
                      geste.current = { salle: s.id, haut: e.currentTarget.getBoundingClientRect().top, y0: e.clientY, glisse: false }
                    }}
                    onPointerMove={(e) => {
                      const g = geste.current
                      if (!g || g.salle !== s.id || (!g.glisse && Math.abs(e.clientY - g.y0) < 6)) return
                      if (!g.glisse) {
                        g.glisse = true
                        e.currentTarget.setPointerCapture(e.pointerId)
                      }
                      setPlage({ salle: s.id, ...plageGlissee(g.y0 - g.haut, e.clientY - g.haut) })
                    }}
                    onPointerUp={(e) => {
                      const g = geste.current
                      geste.current = null
                      if (!g?.glisse || !ouvrir) return
                      const p = plageGlissee(g.y0 - g.haut, e.clientY - g.haut)
                      finDuGlisser.current = Date.now()
                      setPlage(null)
                      ouvrir({ salle: s.id, debut: enHeure(p.debut), fin: enHeure(p.fin) })
                    }}
                    onPointerCancel={() => {
                      geste.current = null
                      setPlage(null)
                    }}
                  >
                    {ouvrir && HEURES.slice(0, -1).map((h, i) => (
                      <button
                        key={h}
                        type="button"
                        data-case={h}
                        data-salle={s.id}
                        tabIndex={focus.col === c && focus.h === i ? 0 : -1}
                        aria-label={t("salles.case", { salle: s.nom, heure: h })}
                        onFocus={() => setFocus({ col: c, h: i })}
                        onKeyDown={(e) => fleches(e, c, i)}
                        onClick={() => {
                          // Le clic qui suit un glisser n'ouvre pas une seconde fois.
                          if (Date.now() - finDuGlisser.current < 400) return
                          ouvrir({ salle: s.id, debut: h, fin: HEURES[i + 1] })
                        }}
                        // Survol coupé pendant un glisser (la plage reste d'un seul ton) ; au clavier, la case dit son heure
                        // (critique-design T3c).
                        className="group/case absolute inset-x-0 cursor-pointer px-1.5 py-0.5 text-left transition-colors hover:bg-foreground/[.04] active:bg-foreground/[.07] group-data-[glisse]/corps:hover:bg-transparent focus-visible:z-[6] focus-visible:rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                        style={{ top: i * H, height: H }}
                      >
                        <span aria-hidden className="hidden text-[11px] tabular-nums text-muted-foreground group-focus-visible/case:block">{h} +</span>
                      </button>
                    ))}
                    {ici.map((o, i) => {
                      const haut = place(journee(o) ? "08:00" : o.debut)
                      const bas = place(journee(o) ? "22:00" : o.fin)
                      const couleur = couleurDe(o)
                      const style = { top: pct(haut), height: pct(bas - haut), "--c": couleur } as React.CSSProperties
                      // Lieu lié (AR6) : la salle est prise, le bloc se lit dans la colonne voisine.
                      if (o.salle !== s.id) {
                        return (
                          <div
                            key={`lie-${o.id ?? i}`}
                            data-lie
                            className="absolute inset-x-0.5 rounded-md"
                            style={{ ...style, backgroundImage: "repeating-linear-gradient(135deg, color-mix(in srgb, var(--c) 13%, transparent) 0 4px, transparent 4px 8px)" }}
                          >
                            <span className="sr-only">{t("salles.detail.avec", { salle: SALLES.find((x) => x.id === salleLue(o.salle))?.nom, quoi: nomOccupant(o, langue), debut: o.debut, fin: o.fin })}</span>
                          </div>
                        )
                      }
                      const court = (bas - haut) * hauteur < 34
                      return (
                        <button
                          key={o.id ?? i}
                          type="button"
                          data-bloc
                          data-debut={o.debut}
                          data-fin={o.fin}
                          data-couleur={couleur}
                          onClick={() => setDetail(o)}
                          className="absolute inset-x-0.5 z-10 overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight text-foreground transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                          style={{ ...style, minHeight: 22, borderColor: "var(--c)", background: "color-mix(in srgb, var(--c) 16%, hsl(var(--card)))" }}
                        >
                          <span lang={langue === "zh" ? "zh-CN" : "fr"} className={`block font-semibold hyphens-auto [overflow-wrap:anywhere] ${court ? "truncate" : "line-clamp-2"}`}>{nomOccupant(o, langue)}</span>
                          {!court && !journee(o) && <span className="block tabular-nums text-foreground/75">{o.debut}–<wbr />{o.fin}</span>}
                        </button>
                      )
                    })}
                    {plage?.salle === s.id && (
                      <div
                        aria-hidden
                        data-plage
                        className="pointer-events-none absolute inset-x-0.5 z-20 rounded-md border-2 border-dashed border-primary bg-background/80 px-1.5 py-0.5 text-[11px] font-semibold leading-tight tabular-nums text-foreground"
                        style={{ top: pct((plage.debut - DEBUT) / (FIN - DEBUT)), height: pct((plage.fin - plage.debut) / (FIN - DEBUT)) }}
                      >
                        {enHeure(plage.debut)} – {enHeure(plage.fin)}
                      </div>
                    )}
                    {repere !== null && <div aria-hidden data-repere-ligne className="pointer-events-none absolute inset-x-0 z-[5] h-px bg-foreground/70" style={{ top: pct(repere) }} />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Detail occupation={detail} langue={langue} dateLongue={dateLongue} fermer={() => setDetail(null)} />
    </section>
  )
}

/** Le détail d'un bloc (SA4) : qui, où, quand, qui l'a inscrit ; la page de la fête pour un créneau de scène ; pour
 *  sa réservation, « Modifier » et « Supprimer » (SA10). Partagé avec la journée d'une salle. */
export function Detail({ occupation: o, langue, dateLongue, fermer }: { occupation: Occupation | null; langue: Langue; dateLongue: string; fermer: () => void }) {
  const { t } = useTranslation()
  const etat = useSalles()
  const salle = o && SALLES.find((s) => s.id === salleLue(o.salle))
  const reservation = o && etat?.modifiable(o)
  const fete = o?.lien?.split("/").pop()
  return (
    <Dialog open={Boolean(o)} onOpenChange={(ouvert) => { if (!ouvert) fermer() }}>
      {o && salle && (
        <DialogContent
          aria-describedby={undefined}
          className="left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card [box-shadow:var(--shadow-flottant)]"
        >
          <div className="flex items-start gap-3 py-1 pl-4 pr-1">
            <span aria-hidden className="mt-[18px] h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: couleurDe(o) }} />
            <DialogTitle className="min-w-0 flex-1 py-3 text-base font-semibold">{nomOccupant(o, langue)}</DialogTitle>
            <DialogClose aria-label={t("salles.detail.fermer")} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
              <X aria-hidden className="h-4 w-4" />
            </DialogClose>
          </div>
          <dl className="space-y-1 px-4 pb-4 text-sm">
            <div>
              <dt className="sr-only">{t("salles.detail.salle")}</dt>
              <dd className="font-medium">{salle.nom}{salle.autreNom && <span className="ml-1.5 text-muted-foreground">{salle.autreNom}</span>}</dd>
            </div>
            <div>
              <dt className="sr-only">{t("salles.detail.quand")}</dt>
              <dd className="text-muted-foreground tabular-nums">
                <span className="first-letter:uppercase inline-block">{dateLongue}</span>
                {" · "}
                {journee(o) ? t("salles.detail.journee") : `${o.debut} – ${o.fin}`}
              </dd>
            </div>
            {o.auteurNom && (
              <div>
                <dt className="sr-only">{t("salles.detail.auteur")}</dt>
                <dd className="text-muted-foreground">{t("salles.detail.par", { nom: o.auteurNom })}</dd>
              </div>
            )}
          </dl>
          {/* « Supprimer » à gauche, l'action sûre sous le pouce (critique-design T3a). */}
          {reservation && (
            <div className="flex gap-2 border-t border-border/60 px-4 py-3">
              <button
                type="button"
                onClick={() => { fermer(); void etat!.supprimer(reservation) }}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-destructive transition-colors hover:bg-secondary/70"
              >
                {etat!.annule(reservation) ? t("salles.annuler.titre") : t("common.buttons.delete")}
              </button>
              <button
                type="button"
                onClick={() => { fermer(); etat!.modifier(reservation) }}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-secondary text-sm font-semibold transition-colors hover:bg-secondary/70"
              >
                {t("common.buttons.edit")}
              </button>
            </div>
          )}
          {/* Lot 4 (SA4) : le détail d'un évènement mène à sa fiche ; une réunion privée n'a pas de lien. */}
          {o.source === "evenement" && o.lien && (
            <div className="border-t border-border/60 px-4 py-1">
              <Link href={o.lien} onClick={fermer} className="flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                {t("salles.detail.evenement")}
                <ChevronRight aria-hidden className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          )}
          {o.lien && (fete === "noel" || fete === "paques") && (
            <div className="border-t border-border/60 px-4 py-1">
              <Link href={o.lien} onClick={fermer} className="flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
                {t("salles.detail.fete", { fete: t(`evenements.tabs.${fete}`) })}
                <ChevronRight aria-hidden className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
