"use client"

// La feuille « Réserver » (docs/spec-salles.md, lot 3, T3a ; SA6, SA7, SA10, AR8, AR16) : le moment d'abord (date, de,
// à), puis les salles, libres en tête, occupées grisées et non choisissables avec leur raison (« Groupe Bonté jusqu'à
// 14:30 »), puis pour qui et pour quoi. La même feuille modifie une réservation : elle-même ne compte pas dans les
// occupations (SA10). Feuille du bas au téléphone, panneau à droite dès les deux volets (`FeuilleOuPanneau`).
// AS2 à AS7 (lot AS, T2) : la Grande salle se réserve toujours ; en saison d'une fête, la question « C'est pour <fête> ? »
// (Oui : pour qui, pour quoi, note de la fête ; Non : réservation ordinaire).
// T3b (SA8) : une salle choisie que le moment fait croiser une occupation (le moment changé, ou une réservation
// relue à l'envoi) est refusée en mots : l'occupant et son heure, les salles libres au même moment, « Décaler ».
// T7 (AS13, RS8) : la pastille de la salle devant son nom ; dans la phrase d'une salle libre, « Libre » en graisse 600.

import { Fragment, useId, useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { FeuilleOuPanneau } from "@/components/stats/FeuilleOuPanneau"
import { Check } from "lucide-react"
import { MotLibre } from "@/components/salles/MotLibre"
import { RefusSalle } from "@/components/salles/RefusSalle"
import { Champ } from "@/components/ui/champ"
import { ChampSelect } from "@/components/ui/champ-select"
import { Input } from "@/components/ui/input"
import { segmentOption, segmentPiste } from "@/components/ui/segment"
import { cleNomEquipe, EQUIPES } from "@/lib/equipes/table"
import { estQuiLibre, libelleQui, normaliserQui } from "@/lib/fetes/qui"
import { pourDe } from "@/lib/firebase/programmes"
import type { Reservation } from "@/lib/firebase/reservations"
import { chevauchement, decalage, sallesLibres } from "@/lib/salles/conflit"
import { etatA, etatEnMots, type Occupation } from "@/lib/salles/occupations"
import { styleTexteService } from "@/lib/couleurSombre"
import { COULEUR_SALLE, SALLES, type SalleId } from "@/lib/salles/salles"
import type { Saison } from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { QUI, QUOI } from "@/types/programme"

type Langue = "fr" | "zh"

/** Ce que la feuille écrit ; `fete`, `qui`, `note` : une réservation de fête (AS4), `libre` est posé par l'écriture. */
export type Saisie = Pick<Reservation, "salle" | "date" | "debut" | "fin" | "pour" | "quoi"> & Partial<Pick<Reservation, "fete" | "qui" | "note" | "libre">>

/** La feuille ouverte : une nouvelle réservation (moment pré-rempli, et la salle d'une case de la Grille, T3c) ou celle
 *  à modifier. */
export type Ouverture = { date: string; debut: string; fin: string; salle?: SalleId; /** RS4 : on vient de la page de la fête, « Oui, pour <fête> » d'avance. */ pourFete?: boolean; reservation?: undefined } | { reservation: Reservation; salle?: undefined }

const AUTRE = "autre"
const estDeLaListe = (pour: string) => pour === "" || (QUI as readonly string[]).includes(pour) || pour.startsWith("equipe:")

/** SA7 : le moment est-il valable ? La clé du message, sinon null. */
export function erreurDuMoment(date: string, debut: string, fin: string, today: string): string | null {
  if (!date || !debut || !fin) return "incomplet"
  if (date < today) return "datePassee"
  if (debut < "06:00" || fin > "23:59") return "horsHeures"
  if (fin <= debut) return "finAvantDebut"
  return null
}

/** AS3 : la fête dont la saison couvre une date, pour la question « C'est pour <fête> ? » ; null hors saison. */
export type FeteDeLaFeuille = {
  id: string
  /** « Noël 2026 ». */
  nom: string
  /** « Noël », sans l'année. */
  court: string
  ouverte: boolean
  permis: boolean
  quiOptions: string[]
  quiAutre: boolean
  /** Les familles permises, jointes (« Groupes et EDD »). */
  familles: string
  saison: Saison
}

export function FeuilleReserver({ ouverture, fermer, today, langue, occupationsDu, feteDu, nomFete, enregistrer }: {
  ouverture: Ouverture | null
  fermer: () => void
  today: string
  langue: Langue
  occupationsDu: (date: string) => Occupation[]
  feteDu?: (date: string) => FeteDeLaFeuille | null
  /** AS7 : le nom d'une fête (« Noël 2026 ») pour la ligne en lecture d'une réservation qui la porte. */
  nomFete?: (id: string) => string | null
  /** Écrit la réservation (création, ou modification de `id`) ; « refus » si, relue, la salle est prise (SA8) ;
   *  rejette en cas d'échec ; une autre chaîne est un message à afficher. */
  enregistrer: (saisie: Saisie, id?: string) => Promise<"ok" | "refus" | string>
}) {
  const { t } = useTranslation()
  const titre = ouverture?.reservation ? t("salles.feuille.modifierTitre") : t("salles.reserver")
  return (
    <FeuilleOuPanneau ouvert={Boolean(ouverture)} onOpenChange={(o) => { if (!o) fermer() }} titre={titre} testidPanneau="salles-reserver-panneau" testidFeuille="salles-reserver-feuille">
      {/* Une clé par ouverture : le formulaire repart de ce qui l'a ouvert. */}
      {ouverture && <Formulaire key={JSON.stringify(ouverture)} ouverture={ouverture} fermer={fermer} today={today} langue={langue} occupationsDu={occupationsDu} feteDu={feteDu} nomFete={nomFete} enregistrer={enregistrer} />}
    </FeuilleOuPanneau>
  )
}

function Formulaire({ ouverture, fermer, today, langue, occupationsDu, feteDu, nomFete, enregistrer }: {
  ouverture: Ouverture
  fermer: () => void
  today: string
  langue: Langue
  occupationsDu: (date: string) => Occupation[]
  feteDu?: (date: string) => FeteDeLaFeuille | null
  /** AS7 : le nom d'une fête (« Noël 2026 ») pour la ligne en lecture d'une réservation qui la porte. */
  nomFete?: (id: string) => string | null
  enregistrer: (saisie: Saisie, id?: string) => Promise<"ok" | "refus" | string>
}) {
  const { t } = useTranslation()
  const id = useId()
  const r = ouverture.reservation
  // Le moment de départ : celui de la réservation à modifier, ou celui qui a ouvert la feuille.
  const depart = r ?? ouverture
  const [date, setDate] = useState(depart.date)
  const [debut, setDebut] = useState(depart.debut)
  const [fin, setFin] = useState(depart.fin)
  const [salle, setSalle] = useState<SalleId | null>(r?.salle ?? ouverture.salle ?? null)
  const [choixPour, setChoixPour] = useState(r ? (estDeLaListe(r.pour) ? r.pour : AUTRE) : "")
  const [autre, setAutre] = useState(r && !estDeLaListe(r.pour) ? r.pour : "")
  const [quoi, setQuoi] = useState(r?.quoi ?? "")
  // AS3, AS4 : la réponse à « C'est pour <fête> ? » (aucune d'avance) et les champs de la fête.
  const [choisie, setReponse] = useState<"oui" | "non" | null>(!r && ouverture.pourFete ? "oui" : null)
  const [quiFete, setQuiFete] = useState<string[]>(r?.qui?.filter((q) => !estQuiLibre(q)) ?? [])
  const [autreCoche, setAutreCoche] = useState(Boolean(r?.qui?.some(estQuiLibre)))
  const [autreTexte, setAutreTexte] = useState(r?.qui?.find(estQuiLibre) ?? "")
  const [quoiFete, setQuoiFete] = useState(r?.fete ? r.quoi : "")
  const [note, setNote] = useState(r?.note ?? "")
  const [envoi, setEnvoi] = useState(false)
  const [echec, setEchec] = useState<string | boolean>(false)

  const erreur = erreurDuMoment(date, debut, fin, today)
  // Les occupations du jour, sans la réservation qu'on modifie (SA10).
  const occupations = erreur ? [] : occupationsDu(date).filter((o) => !r || o.id !== r.id)
  const raisonDe = (s: SalleId): string | null => {
    const o = chevauchement(occupations, s, { debut, fin })
    return o ? etatEnMots({ type: "occupe", occupation: o, jusqua: o.fin }, langue) : null
  }
  // Une salle libre dit jusqu'à quand, comme la Liste (critique-design T3a : lignes de même hauteur).
  const libreDe = (s: SalleId): string | null => (erreur ? null : etatEnMots(etatA(occupations, s, debut), langue))
  const lignes = SALLES.map((s) => ({ s, raison: raisonDe(s.id) }))
  const triees = [...lignes.filter((l) => !l.raison), ...lignes.filter((l) => l.raison)]
  const salleLibre = salle !== null && !lignes.find((l) => l.s.id === salle)?.raison
  // SA8 : la salle choisie est prise sur ce moment ; ce qui l'occupe, les salles libres et la fenêtre « Décaler ».
  const bloque = salle && !erreur ? chevauchement(occupations, salle, { debut, fin }) : null
  const libres = bloque ? sallesLibres(occupations, { debut, fin }) : []
  const decale = bloque && salle ? decalage(occupations, salle, { debut, fin }) : null
  const pour = (choixPour === AUTRE ? autre : choixPour).trim().slice(0, 60)
  const fete = salle === "grande" && !erreur ? feteDu?.(date) ?? null : null
  // La question : fête ouverte et permise, sur une nouvelle réservation seulement (AS7 : « pour la fête » ne se change pas en modification).
  const question = !r && fete !== null && fete.ouverte && fete.permis
  // La réponse ne vaut que tant que la question est posée ; gardée si elle revient (date changée puis remise, sources
  // arrivées après l'ouverture).
  const reponse = question ? choisie : null
  const modeFete = Boolean(r?.fete) || reponse === "oui"
  const quiFinal = [...new Set([...quiFete, ...(autreCoche ? [normaliserQui(autreTexte)] : [])].filter(Boolean))]
  const detailPret = modeFete
    ? quiFinal.length > 0 && (!autreCoche || normaliserQui(autreTexte) !== "") && (QUOI as readonly string[]).includes(quoiFete)
    : quoi.trim().length > 0
  const pret = !erreur && salleLibre && (!question || reponse !== null) && detailPret && !envoi
  const reponduA = fete?.court ?? ""

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault()
    if (!pret || !salle) return
    setEnvoi(true)
    setEchec(false)
    try {
      // « refus » : la feuille, relue, montre ce qui a pris la salle entre-temps (SA8) et reste ouverte.
      const saisie: Saisie = modeFete
        ? { salle, date, debut, fin, pour: pourDe(quiFinal), quoi: quoiFete, fete: r?.fete ?? fete!.id, qui: quiFinal, note: note.trim().slice(0, 120) }
        : { salle, date, debut, fin, pour, quoi: quoi.trim().slice(0, 80) }
      const res = await enregistrer(saisie, r?.id)
      if (res === "ok") return fermer()
      if (res !== "refus") setEchec(res)
      setEnvoi(false)
    } catch {
      setEchec(true)
      setEnvoi(false)
    }
  }

  return (
    <form onSubmit={envoyer} className="space-y-5">
      {/* Le moment d'abord (SA6, AR8). */}
      <div className="space-y-3">
        <Champ id={`${id}-date`} label={t("salles.feuille.date")}>
          <Input data-champ="date" id={`${id}-date`} className="h-11" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ id={`${id}-de`} label={t("salles.feuille.de")}>
            <Input data-champ="de" id={`${id}-de`} className="h-11" type="time" step={300} value={debut} onChange={(e) => setDebut(e.target.value)} />
          </Champ>
          <Champ id={`${id}-a`} label={t("salles.feuille.a")}>
            <Input data-champ="a" id={`${id}-a`} className="h-11" type="time" step={300} value={fin} onChange={(e) => setFin(e.target.value)} />
          </Champ>
        </div>
        {erreur && erreur !== "incomplet" && <p role="status" className="text-sm text-destructive">{t(`salles.feuille.erreurs.${erreur}`)}</p>}
      </div>

      {/* Le refus (SA8), sous le moment : ce qui prend la salle, les salles libres au même moment, « Décaler ». */}
      {bloque && salle && (
        <RefusSalle salle={salle} bloque={bloque} libres={libres} decale={decale} langue={langue}
          decaler={(p) => { setDebut(p.debut); setFin(p.fin) }} choisir={setSalle} />
      )}

      {/* Les salles : libres en tête, occupées grisées avec leur raison (SA6). */}
      <div data-champ="salle" className="space-y-1.5">
        <p id={`${id}-salle`} className="text-sm font-semibold text-muted-foreground">{t("salles.feuille.salle")}</p>
        <div role="radiogroup" aria-labelledby={`${id}-salle`} className="carte-groupe divide-y divide-border/60 overflow-hidden">
          {triees.map(({ s, raison }) => (
            <Fragment key={s.id}>
            <label
              data-salle={s.id}
              style={s.id === "grande" && modeFete ? { background: `${PLANNING_COLORS.scene}14` } : undefined}
              className={`flex min-h-12 items-start gap-3 px-4 py-2.5 ${raison ? "cursor-not-allowed" : "cursor-pointer hover:bg-secondary/60"} ${salle === s.id && !raison ? "bg-secondary" : ""}`}
            >
              <input
                type="radio"
                name={`${id}-salle`}
                value={s.id}
                checked={salle === s.id}
                disabled={Boolean(raison)}
                onChange={() => setSalle(s.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--foreground))]"
              />
              <span className="min-w-0 flex-1">
                <span className={`flex flex-wrap items-baseline gap-x-2 ${raison ? "text-muted-foreground" : ""}`}>
                  <span
                    aria-hidden
                    data-couleur-salle
                    className={`couleur-salle h-[9px] w-[9px] shrink-0 self-center rounded-full bg-[var(--salle)] ${raison ? "opacity-40" : ""}`}
                    style={styleTexteService(COULEUR_SALLE[s.id])}
                  />
                  <span className="font-semibold">{s.nom}</span>
                  {s.autreNom && <span className="text-sm text-muted-foreground">{s.autreNom}</span>}
                </span>
                {(raison ?? libreDe(s.id)) && (
                  <span className="block text-sm text-muted-foreground">
                    {raison ? raison.replace(/ (\d\d:\d\d)/g, "\u00a0$1") : <MotLibre texte={libreDe(s.id)!.replace(/ (\d\d:\d\d)/g, "\u00a0$1")} />}
                  </span>
                )}
              </span>
            </label>
            {s.id === "grande" && fete && (
              question ? (
                <div role="radiogroup" aria-labelledby={`${id}-fete`} data-fete-question className="space-y-1.5 pb-3 pl-11 pr-4 pt-2.5">
                  <p id={`${id}-fete`} className="text-sm font-semibold">{t("salles.feuille.pourFete", { fete: fete.nom })}</p>
                  <div className={`inline-flex ${segmentPiste()}`}>
                    {(["oui", "non"] as const).map((v) => (
                      <label key={v} className={`relative cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${segmentOption(reponse === v)}`}>
                        <input type="radio" name={`${id}-fete`} checked={reponse === v} onChange={() => setReponse(v)} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                        {v === "oui" ? t("salles.feuille.pourFeteOui", { court: fete.court }) : t("salles.feuille.pourFeteNon")}
                      </label>
                    ))}
                  </div>
                </div>
              ) : !r?.fete && (
                <p data-fete-ligne className="pb-2.5 pl-11 pr-4 text-sm text-muted-foreground">
                  {fete.ouverte ? t("salles.feuille.feteNonPermis", { fete: fete.nom, qui: fete.familles }) : t("salles.feuille.feteFermee", { fete: fete.nom })}
                </p>
              )
            )}
            </Fragment>
          ))}
        </div>
      </div>

      {modeFete ? (
        <>
          {r?.fete && <p data-fete-lecture className="text-sm font-semibold">{t("salles.feuille.pourFeteLecture", { fete: nomFete?.(r.fete) ?? r.fete })}</p>}
          <fieldset data-champ="pour" className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-muted-foreground">{t("salles.feuille.pourQui")}</legend>
            <div className="flex flex-wrap gap-2">
              {[...(fete?.quiOptions ?? []), ...quiFete.filter((q) => !fete?.quiOptions.includes(q))].map((q) => (
                <Pastille key={q} type="checkbox" name={`${id}-qui`} retire={!(QUI as readonly string[]).includes(q)}
                  label={(QUI as readonly string[]).includes(q) ? libelleQui(q, langue) : `${libelleQui(q, langue)} · ${t("planning.programme.quiRetire")}`} checked={quiFete.includes(q)}
                  onChange={() => setQuiFete(quiFete.includes(q) ? quiFete.filter((x) => x !== q) : [...quiFete, q])} />
              ))}
              {(fete?.quiAutre || autreCoche) && <Pastille type="checkbox" name={`${id}-qui`} label={t("salles.feuille.autre")} checked={autreCoche} onChange={() => setAutreCoche(!autreCoche)} />}
            </div>
            {autreCoche && <Input className="h-11 rounded-xl" maxLength={40} aria-label={t("planning.programme.quiAutreChamp")} placeholder={t("planning.programme.quiAutreChamp")} value={autreTexte} onChange={(e) => setAutreTexte(e.target.value)} />}
          </fieldset>
          <fieldset data-champ="quoi">
            <legend className="mb-2 text-sm font-semibold text-muted-foreground">{t("salles.feuille.pourQuoi")}</legend>
            <div className="flex flex-wrap gap-2">
              {QUOI.map((q) => <Pastille key={q} type="radio" name={`${id}-quoi`} label={q} checked={quoiFete === q} onChange={() => setQuoiFete(q)} />)}
            </div>
          </fieldset>
          <Champ id={`${id}-note`} label={t("salles.feuille.note")}>
            <Input id={`${id}-note`} className="h-11" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
          </Champ>
        </>
      ) : (
        <>
      {/* Pour qui (AR16) : les valeurs de QUI, les équipes, « Autre… » en texte. */}
      <div data-champ="pour" className="space-y-2">
        <Champ id={`${id}-pour`} label={t("salles.feuille.pourQui")}>
          <ChampSelect id={`${id}-pour`} value={choixPour} onChange={(e) => setChoixPour(e.target.value)}>
            <option value="">{t("salles.feuille.personne")}</option>
            <optgroup label={t("salles.feuille.groupes")}>
              {QUI.map((q) => <option key={q} value={q}>{libelleQui(q, langue)}</option>)}
            </optgroup>
            <optgroup label={t("salles.feuille.equipes")}>
              {EQUIPES.map((e) => <option key={e.id} value={`equipe:${e.id}`}>{t(cleNomEquipe(e.id, true))}</option>)}
            </optgroup>
            <option value={AUTRE}>{t("salles.feuille.autre")}</option>
          </ChampSelect>
        </Champ>
        {choixPour === AUTRE && (
          <Input className="h-11" aria-label={t("salles.feuille.autre")} maxLength={60} value={autre} onChange={(e) => setAutre(e.target.value)} />
        )}
      </div>

      <div data-champ="quoi">
        <Champ id={`${id}-quoi`} label={t("salles.feuille.pourQuoi")}>
          <Input id={`${id}-quoi`} className="h-11" maxLength={80} value={quoi} onChange={(e) => setQuoi(e.target.value)} />
        </Champ>
      </div>
        </>
      )}

      {echec && <p role="alert" className="text-sm text-destructive">{typeof echec === "string" ? echec : t("salles.feuille.echec")}</p>}

      {/* Pied collant : l’action reste à portée sans faire défiler les neuf salles (critique-design T3a) ; collé au bord
          de la feuille, par-dessus le pb-6 de `FeuilleOuPanneau`. */}
      <div className="sticky -bottom-6 -mx-4 -mb-6 border-t border-border/60 bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="submit"
          disabled={!pret}
          className="flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-base font-semibold text-background transition-opacity disabled:opacity-40"
        >
          {r ? t("common.buttons.save") : question && reponse === null ? t("salles.feuille.pourFeteRepondre", { court: reponduA }) : t("salles.feuille.valider")}
        </button>
      </div>
    </form>
  )
}

/** Une pastille de la feuille : case ou bouton radio posé sur toute la pastille (invisible), coche dessinée quand elle
 *  est choisie. */
function Pastille({ type, name, label, checked, onChange, retire }: {
  type: "radio" | "checkbox"
  name: string
  label: string
  checked: boolean
  onChange: () => void
  /** Valeur sortie de la liste : grisée (la marque « retiré » est dans `label`). */
  retire?: boolean
}) {
  return (
    <label
      className={`relative inline-flex h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${retire ? "opacity-60" : ""} ${checked ? "svc-ink" : "bg-card text-foreground/80 shadow-[inset_0_0_0_1px_hsl(var(--border))]"}`}
      style={checked ? { "--svc": PLANNING_COLORS.scene, background: `${PLANNING_COLORS.scene}1a`, boxShadow: `inset 0 0 0 1.5px ${PLANNING_COLORS.scene}` } as CSSProperties : undefined}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="absolute inset-0 cursor-pointer opacity-0" />
      {checked && <Check className="h-4 w-4" aria-hidden />}
      {label}
    </label>
  )
}
