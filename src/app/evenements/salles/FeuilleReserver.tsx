"use client"

// La feuille « Réserver » (docs/spec-salles.md, lot 3, T3a ; SA6, SA7, SA10, AR8, AR16) : le moment d'abord (date, de,
// à), puis les salles, libres en tête, occupées grisées et non choisissables avec leur raison (« Groupe Bonté jusqu'à
// 14:30 »), puis pour qui et pour quoi. La même feuille modifie une réservation : elle-même ne compte pas dans les
// occupations (SA10). Feuille du bas au téléphone, panneau à droite dès les deux volets (`FeuilleOuPanneau`).
// Le refus d'un chevauchement nommé, les salles libres au même moment et « Décaler » viennent en T3b (SA8).

import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { FeuilleOuPanneau } from "@/components/stats/FeuilleOuPanneau"
import { Champ } from "@/components/ui/champ"
import { ChampSelect } from "@/components/ui/champ-select"
import { Input } from "@/components/ui/input"
import { cleNomEquipe, EQUIPES } from "@/lib/equipes/table"
import { libelleQui } from "@/lib/fetes/qui"
import type { Reservation } from "@/lib/firebase/reservations"
import { croise, etatA, etatEnMots, occupationsDe, type Occupation } from "@/lib/salles/occupations"
import { SALLES, type SalleId } from "@/lib/salles/salles"
import { QUI } from "@/types/programme"

type Langue = "fr" | "zh"

/** Ce que la feuille écrit. */
export type Saisie = Pick<Reservation, "salle" | "date" | "debut" | "fin" | "pour" | "quoi">

/** La feuille ouverte : une nouvelle réservation (moment pré-rempli) ou celle à modifier. */
export type Ouverture = { date: string; debut: string; fin: string; reservation?: undefined } | { reservation: Reservation }

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

export function FeuilleReserver({ ouverture, fermer, today, langue, occupationsDu, enregistrer }: {
  ouverture: Ouverture | null
  fermer: () => void
  today: string
  langue: Langue
  occupationsDu: (date: string) => Occupation[]
  /** Écrit la réservation (création, ou modification de `id`) ; rejette en cas d'échec. */
  enregistrer: (saisie: Saisie, id?: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const titre = ouverture?.reservation ? t("salles.feuille.modifierTitre") : t("salles.reserver")
  return (
    <FeuilleOuPanneau ouvert={Boolean(ouverture)} onOpenChange={(o) => { if (!o) fermer() }} titre={titre} testidPanneau="salles-reserver-panneau" testidFeuille="salles-reserver-feuille">
      {/* Une clé par ouverture : le formulaire repart de ce qui l'a ouvert. */}
      {ouverture && <Formulaire key={JSON.stringify(ouverture)} ouverture={ouverture} fermer={fermer} today={today} langue={langue} occupationsDu={occupationsDu} enregistrer={enregistrer} />}
    </FeuilleOuPanneau>
  )
}

function Formulaire({ ouverture, fermer, today, langue, occupationsDu, enregistrer }: {
  ouverture: Ouverture
  fermer: () => void
  today: string
  langue: Langue
  occupationsDu: (date: string) => Occupation[]
  enregistrer: (saisie: Saisie, id?: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const id = useId()
  const r = ouverture.reservation
  // Le moment de départ : celui de la réservation à modifier, ou celui qui a ouvert la feuille.
  const depart = r ?? ouverture
  const [date, setDate] = useState(depart.date)
  const [debut, setDebut] = useState(depart.debut)
  const [fin, setFin] = useState(depart.fin)
  const [salle, setSalle] = useState<SalleId | null>(r?.salle ?? null)
  const [choixPour, setChoixPour] = useState(r ? (estDeLaListe(r.pour) ? r.pour : AUTRE) : "")
  const [autre, setAutre] = useState(r && !estDeLaListe(r.pour) ? r.pour : "")
  const [quoi, setQuoi] = useState(r?.quoi ?? "")
  const [envoi, setEnvoi] = useState(false)
  const [echec, setEchec] = useState(false)

  const erreur = erreurDuMoment(date, debut, fin, today)
  // Les occupations du jour, sans la réservation qu'on modifie (SA10).
  const occupations = erreur ? [] : occupationsDu(date).filter((o) => !r || o.id !== r.id)
  const raisonDe = (s: SalleId): string | null => {
    const o = occupationsDe(occupations, s).find((x) => croise(x, { debut, fin }))
    return o ? etatEnMots({ type: "occupe", occupation: o, jusqua: o.fin, avecGrande: s === "scene" && o.salle === "grande" }, langue) : null
  }
  // Une salle libre dit jusqu'à quand, comme la Liste (critique-design T3a : lignes de même hauteur).
  const libreDe = (s: SalleId): string | null => (erreur ? null : etatEnMots(etatA(occupations, s, debut), langue))
  const lignes = SALLES.map((s) => ({ s, raison: raisonDe(s.id) }))
  const triees = [...lignes.filter((l) => !l.raison), ...lignes.filter((l) => l.raison)]
  const salleLibre = salle !== null && !lignes.find((l) => l.s.id === salle)?.raison
  const pour = (choixPour === AUTRE ? autre : choixPour).trim().slice(0, 60)
  const pret = !erreur && salleLibre && quoi.trim().length > 0 && !envoi

  async function envoyer(ev: React.FormEvent) {
    ev.preventDefault()
    if (!pret || !salle) return
    setEnvoi(true)
    setEchec(false)
    try {
      await enregistrer({ salle, date, debut, fin, pour, quoi: quoi.trim().slice(0, 80) }, r?.id)
      fermer()
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

      {/* Les salles : libres en tête, occupées grisées avec leur raison (SA6). */}
      <div data-champ="salle" className="space-y-1.5">
        <p id={`${id}-salle`} className="text-sm font-semibold text-muted-foreground">{t("salles.feuille.salle")}</p>
        <div role="radiogroup" aria-labelledby={`${id}-salle`} className="carte-groupe divide-y divide-border/60 overflow-hidden">
          {triees.map(({ s, raison }) => (
            <label
              key={s.id}
              data-salle={s.id}
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
                  <span className="font-semibold">{s.nom}</span>
                  {s.autreNom && <span className="text-sm text-muted-foreground">{s.autreNom}</span>}
                </span>
                {(raison ?? libreDe(s.id)) && <span className="block text-sm text-muted-foreground">{(raison ?? libreDe(s.id))!.replace(/ (\d\d:\d\d)/g, "\u00a0$1")}</span>}
              </span>
            </label>
          ))}
        </div>
      </div>

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

      {echec && <p role="alert" className="text-sm text-destructive">{t("salles.feuille.echec")}</p>}

      {/* Pied collant : l’action reste à portée sans faire défiler les neuf salles (critique-design T3a) ; collé au bord
          de la feuille, par-dessus le pb-6 de `FeuilleOuPanneau`. */}
      <div className="sticky -bottom-6 -mx-4 -mb-6 border-t border-border/60 bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="submit"
          disabled={!pret}
          className="flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-base font-semibold text-background transition-opacity disabled:opacity-40"
        >
          {r ? t("common.buttons.save") : t("salles.feuille.valider")}
        </button>
      </div>
    </form>
  )
}
