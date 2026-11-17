"use client"

// Le champ « Salle de l'église » d'un évènement ou d'une réunion (docs/spec-salles.md, lot 4, SA12, AR5, AR15) : les
// neuf salles, groupées comme Salles, plus « Ailleurs » qui fait paraître le lieu en texte libre. Une salle choisie
// fait paraître l'heure de fin (exigée avec l'heure de début) ; à l'enregistrement, `verifierSalle` relit les
// occupations du jour et un chevauchement bloque l'écriture avec le refus de SA8 (`RefusSalle`). Le lieu écrit devient
// le nom de la salle (`valeursSalle`).

import { useTranslation } from "react-i18next"
import { Champ } from "@/components/ui/champ"
import { ChampSelect } from "@/components/ui/champ-select"
import { Input } from "@/components/ui/input"
import { RefusSalle } from "@/components/salles/RefusSalle"
import { occupationsPourEvenement } from "@/lib/salles/charger"
import { chevauchement, decalage, sallesLibres } from "@/lib/salles/conflit"
import type { Occupation } from "@/lib/salles/occupations"
import { SALLES, type GroupeSalle, type SalleId } from "@/lib/salles/salles"
import type { Evenement } from "@/types/evenement"

type Valeurs = Pick<Evenement, "date" | "heure" | "heureFin" | "lieu" | "salle">

/** Le refus d'un enregistrement (SA8), pour le moment et la salle où il a été vu (`cle`). */
export type RefusEvenement = { cle: string; salle: SalleId; bloque: Occupation; libres: SalleId[]; decale: { debut: string; fin: string } | null }

const cleDe = (v: Valeurs) => `${v.date}|${v.salle ?? ""}|${v.heure}|${v.heureFin}`
const nomDe = (id: SalleId) => SALLES.find((s) => s.id === id)!.nom
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

/** Ce qui s'écrit : avec une salle, le lieu est son nom ; « Ailleurs » écrit `salle: null` (le champ retiré). */
export function valeursSalle(v: Valeurs): Pick<Evenement, "lieu" | "salle"> {
  return v.salle ? { salle: v.salle, lieu: nomDe(v.salle) } : { salle: null, lieu: v.lieu.trim() }
}

export function ChampSalle({ v, set, refus }: {
  v: Valeurs
  set: (patch: Partial<Valeurs>) => void
  /** Le dernier refus ; montré tant que le moment et la salle n'ont pas changé. */
  refus: RefusEvenement | null
}) {
  const { t, i18n } = useTranslation()
  const langue = i18n.language?.startsWith("zh") ? "zh" : "fr"
  const choisir = (id: SalleId | null) =>
    // Revenir à « Ailleurs » : le nom d'une salle laissé dans le lieu n'a plus de sens.
    set({ salle: id, ...(!id && SALLES.some((s) => s.nom === v.lieu) ? { lieu: "" } : {}) })
  return (
    <>
      <Champ id="ev-salle" label={t("salles.formulaire.salle")}>
        <ChampSelect id="ev-salle" value={v.salle ?? ""} onChange={(e) => choisir((e.target.value || null) as SalleId | null)}>
          <option value="">{t("salles.formulaire.ailleurs")}</option>
          {GROUPES.map((g) => (
            <optgroup key={g} label={t(`salles.groupes.${g}`)}>
              {SALLES.filter((s) => s.groupe === g).map((s) => (
                <option key={s.id} value={s.id}>{s.autreNom ? `${s.nom} · ${s.autreNom}` : s.nom}</option>
              ))}
            </optgroup>
          ))}
        </ChampSelect>
      </Champ>
      {v.salle ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Sous l'heure de début (colonne de droite), comme « De | À » (critique-design T4a). */}
          <Champ id="ev-heure-fin" label={t("evenements.form.heureFin")} className="col-start-2">
            <Input id="ev-heure-fin" className="h-11" type="time" value={v.heureFin} onChange={(e) => set({ heureFin: e.target.value })} />
          </Champ>
        </div>
      ) : (
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
