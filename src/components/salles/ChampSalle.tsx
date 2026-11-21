"use client"

// Le « Où ? » d'un évènement ou d'une réunion (docs/spec-salles.md, lot 4, SA12, AR5, AR15 ; AS17) : « À l'église » /
// « Ailleurs » d'abord. « À l'église » : « Réserver une salle ? » (les huit salles, groupées comme Salles, ou « Pas besoin
// de salle » : lieu « Église ») ; « Ailleurs » : le lieu en texte libre, aucune salle. Une salle choisie fait paraître
// l'heure de fin (exigée avec l'heure de début) ; à l'enregistrement, `verifierSalle` relit les occupations du jour et
// un chevauchement bloque l'écriture avec le refus de SA8 (`RefusSalle`). Le lieu écrit devient le nom de la salle
// (`valeursSalle`). Le mode (`eglise`) n'est pas un champ de l'évènement : l'état est dans le formulaire.

import { useTranslation } from "react-i18next"
import { Champ } from "@/components/ui/champ"
import { ChampSelect } from "@/components/ui/champ-select"
import { segmentOption, segmentPiste } from "@/components/ui/segment"
import { Input } from "@/components/ui/input"
import { RefusSalle } from "@/components/salles/RefusSalle"
import { occupationsPourEvenement } from "@/lib/salles/charger"
import { chevauchement, decalage, sallesLibres } from "@/lib/salles/conflit"
import type { Occupation } from "@/lib/salles/occupations"
import { salleLue, SALLES, type GroupeSalle, type SalleId } from "@/lib/salles/salles"
import type { Evenement } from "@/types/evenement"

type Valeurs = Pick<Evenement, "date" | "heure" | "heureFin" | "lieu" | "salle">

/** Le refus d'un enregistrement (SA8), pour le moment et la salle où il a été vu (`cle`). */
export type RefusEvenement = { cle: string; salle: SalleId; bloque: Occupation; libres: SalleId[]; decale: { debut: string; fin: string } | null }

const cleDe = (v: Valeurs) => `${v.date}|${v.salle ?? ""}|${v.heure}|${v.heureFin}`
const nomDe = (id: SalleId) => SALLES.find((s) => s.id === salleLue(id))!.nom
const GROUPES: GroupeSalle[] = ["grande", "groupe", "bureaux"]

/** SA12 avant la relecture : la clé du message si la salle choisie n'a pas ses deux heures ou les a à l'envers. */
export function erreurSalle(v: Valeurs): string | null {
  if (!v.salle) return null
  if (!v.heure || !v.heureFin) return "salles.formulaire.heures"
  if (v.heureFin <= v.heure) return "salles.feuille.erreurs.finAvantDebut"
  return null
}

/** SA12 : les occupations du jour relues, l'occupation qui bloque la salle (hors l'évènement lui-même, `sauf`), les
 *  salles libres et « Décaler » ; null si la salle est libre ou si l'évènement est ailleurs. Rejette si la lecture
 *  échoue. */
export async function verifierSalle(v: Valeurs, sauf: string | undefined, today: string, voir: (e: Evenement) => boolean): Promise<RefusEvenement | null> {
  if (!v.salle) return null
  const occupations = (await occupationsPourEvenement(v.date, today, voir)).filter((o) => !sauf || o.source !== "evenement" || o.id !== sauf)
  const plage = { debut: v.heure, fin: v.heureFin }
  const bloque = chevauchement(occupations, v.salle, plage)
  if (!bloque) return null
  return { cle: cleDe(v), salle: v.salle, bloque, libres: sallesLibres(occupations, plage), decale: decalage(occupations, v.salle, plage) }
}

/** Le mode d'ouverture (AS17) : une salle ou le lieu « Église » → à l'église ; un autre lieu (même vide) → ailleurs ;
 *  une création sans lieu → à l'église. */
export const egliseInitiale = (i: Pick<Evenement, "lieu" | "salle">, creation: boolean) => !!i.salle || i.lieu === "Église" || (creation && !i.lieu)

/** Ce qui s'écrit : avec une salle, le lieu est son nom ; à l'église sans salle, « Église » ; « Ailleurs » écrit
 *  `salle: null` (le champ retiré) et le lieu libre. */
export function valeursSalle(v: Valeurs, eglise: boolean): Pick<Evenement, "lieu" | "salle"> {
  if (v.salle) return { salle: v.salle, lieu: nomDe(v.salle) }
  return { salle: null, lieu: eglise ? "Église" : v.lieu.trim() }
}

export function ChampSalle({ v, set, refus, eglise, setEglise }: {
  v: Valeurs
  eglise: boolean
  setEglise: (eglise: boolean) => void
  set: (patch: Partial<Valeurs>) => void
  /** Le dernier refus ; montré tant que le moment et la salle n'ont pas changé. */
  refus: RefusEvenement | null
}) {
  const { t, i18n } = useTranslation()
  const langue = i18n.language?.startsWith("zh") ? "zh" : "fr"
  const choisir = (id: SalleId | null) =>
    // Revenir à « Ailleurs » : le nom d'une salle laissé dans le lieu n'a plus de sens.
    set({ salle: id, ...(!id && SALLES.some((s) => s.nom === v.lieu) ? { lieu: "" } : {}) })
  // Ailleurs retire la salle ; à l'église vide un lieu libre (le lieu sera le nom de la salle ou « Église »).
  const mode = (e: boolean) => { setEglise(e); set(e ? { lieu: "" } : { salle: null, lieu: SALLES.some((s) => s.nom === v.lieu) || v.lieu === "Église" ? "" : v.lieu }) }
  return (
    <>
      <div role="radiogroup" aria-labelledby="ev-ou" className="space-y-1.5">
        <p id="ev-ou" className="text-sm font-semibold text-muted-foreground">{t("evenements.form.ou")}</p>
        <div className={`flex w-full sm:inline-flex sm:w-auto ${segmentPiste()}`}>
          {([true, false] as const).map((e) => (
            <label key={String(e)} className={`relative flex-1 cursor-pointer justify-center text-center sm:flex-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${segmentOption(eglise === e)}`}>
              <input type="radio" name="ev-ou" checked={eglise === e} onChange={() => mode(e)} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
              {t(e ? "evenements.form.aLEglise" : "evenements.form.ailleurs")}
            </label>
          ))}
        </div>
      </div>
      {eglise && <>
      <Champ id="ev-salle" label={t("evenements.form.reserverSalle")}>
        <ChampSelect id="ev-salle" value={v.salle ?? ""} onChange={(e) => choisir((e.target.value || null) as SalleId | null)}>
          <option value="">{t("evenements.form.pasBesoinSalle")}</option>
          {GROUPES.map((g) => (
            <optgroup key={g} label={t(`salles.groupes.${g}`)}>
              {SALLES.filter((s) => s.groupe === g).map((s) => (
                <option key={s.id} value={s.id}>{s.autreNom ? `${s.nom} · ${s.autreNom}` : s.nom}</option>
              ))}
            </optgroup>
          ))}
        </ChampSelect>
      </Champ>
      {v.salle && (
        <div className="grid grid-cols-2 gap-3">
          {/* Sous l'heure de début (colonne de droite), comme « De | À » (critique-design T4a). */}
          <Champ id="ev-heure-fin" label={t("evenements.form.heureFin")} className="col-start-2">
            <Input id="ev-heure-fin" className="h-11" type="time" value={v.heureFin} onChange={(e) => set({ heureFin: e.target.value })} />
          </Champ>
        </div>
      )}
      </>}
      {!eglise && (
        <Champ id="ev-lieu" label={t("evenements.form.lieu")}>
          <Input id="ev-lieu" className="h-11" value={v.lieu} maxLength={120} onChange={(e) => set({ lieu: e.target.value })} />
        </Champ>
      )}
      {refus && refus.cle === cleDe(v) && (
        <RefusSalle discret salle={refus.salle} bloque={refus.bloque} libres={refus.libres} decale={refus.decale} langue={langue}
          decaler={(p) => set({ heure: p.debut, heureFin: p.fin })} choisir={(id) => choisir(id)} />
      )}
    </>
  )
}
