"use client"

// Carte « Mettre en place la saison » (lot U1, docs/spec-scene-saison.md) :
// ouverture et fermeture, jours réservables, plages horaires, durée d'un
// créneau, qui peut réserver. Enregistrement à chaque changement, comme
// l'éditeur de setlist ; une erreur s'affiche sous le champ et rien n'est écrit.

import { useId, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import {
  DUREES, erreursSaison, FAMILLES, famillesDe, joursDes, ORDRE_JOURS, PLAGES_DEFAUT, quiDesFamilles, saisonDe, triPlages,
  type Famille, type Saison,
} from "@/lib/scene/saison"
import type { Plage, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Champ = "dates" | "jours" | "plages" | "duree" | "qui"
export type SaisonPatch = Partial<Pick<Programme, "debut" | "fin" | "plages" | "duree" | "quiAutorises">>

/** Les champs de la saison qui ont changé par rapport à ce qui est en base. */
function difference(avant: Saison, apres: Saison): SaisonPatch {
  const patch: SaisonPatch = {}
  if (apres.debut !== avant.debut) patch.debut = apres.debut
  if (apres.fin !== avant.fin) patch.fin = apres.fin
  if (JSON.stringify(apres.plages) !== JSON.stringify(avant.plages)) patch.plages = apres.plages
  if (apres.duree !== avant.duree) patch.duree = apres.duree
  if (JSON.stringify(apres.quiAutorises) !== JSON.stringify(avant.quiAutorises)) patch.quiAutorises = apres.quiAutorises
  return patch
}

/** Bouton à bascule, neutre ou en encre (comme les pilules de la planche). */
function Pilule({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 active:scale-[.97] ${
        actif ? "bg-foreground text-background" : "bg-secondary text-foreground/80 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

/** Un réglage : son titre, ses commandes, l'erreur dessous. */
function Reglage({ titre, erreurs, children }: { titre: string; erreurs?: string[]; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="space-y-1.5">
      <p id={id} className="text-[13px] font-semibold text-muted-foreground">{titre}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
      {erreurs?.map((e) => <p key={e} role="alert" className="text-sm text-destructive">{e}</p>)}
    </div>
  )
}

const pastille = "h-9 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 text-sm font-semibold whitespace-nowrap"

export function SaisonForm({ programme, onSave }: {
  programme: Programme
  /** Écrit les champs changés (updateMask), puis recharge la page. */
  onSave: (patch: SaisonPatch) => Promise<void>
}) {
  const { t } = useTranslation()
  const titreId = useId()
  const [s, setS] = useState<Saison>(() => saisonDe(programme))
  const [erreur, setErreur] = useState<{ champ: Champ; textes: string[] } | null>(null)
  const [editeur, setEditeur] = useState<{ index: number | null; plage: Plage } | null>(null)

  const jourCourt = (j: number) => t(`planning.saison.jourCourt.${j}`)
  const erreursDe = (champ: Champ) => (erreur?.champ === champ ? erreur.textes : undefined)
  const verifier = (next: Saison) => erreursSaison(next, programme.jourJ).map((c) => t(`planning.saison.erreurs.${c}`))

  /** Affiche `next` ; s'il est valable, écrit ce qui a changé, sinon montre l'erreur sous le champ. */
  function appliquer(next: Saison, champ: Champ) {
    setS(next)
    const textes = verifier(next)
    setErreur(textes.length > 0 ? { champ, textes } : null)
    if (textes.length > 0) return
    const patch = difference(saisonDe(programme), next)
    if (Object.keys(patch).length > 0) onSave(patch).catch(() => setErreur({ champ, textes: [t("planning.programmes.error")] }))
  }

  /** Cocher un jour lui donne une plage (celle du jour coché avant) ; décocher retire ses plages. */
  function basculerJour(j: number) {
    if (s.jours.includes(j)) {
      appliquer({ ...s, jours: s.jours.filter((x) => x !== j), plages: s.plages.filter((p) => p.jour !== j) }, "jours")
      return
    }
    const modele = s.plages.at(-1) ?? PLAGES_DEFAUT[0]
    const plages = triPlages([...s.plages, { jour: j, debut: modele.debut, fin: modele.fin }])
    appliquer({ ...s, jours: ORDRE_JOURS.filter((x) => x === j || s.jours.includes(x)), plages }, "jours")
  }

  function validerPlage() {
    if (!editeur) return
    const plages = triPlages(editeur.index === null
      ? [...s.plages, editeur.plage]
      : s.plages.map((p, i) => (i === editeur.index ? editeur.plage : p)))
    const next = { ...s, plages, jours: joursDes(plages) }
    const textes = verifier(next)
    // Plage refusée : l'éditeur reste ouvert sur elle, rien ne bouge.
    if (textes.length > 0) { setErreur({ champ: "plages", textes }); return }
    setEditeur(null)
    appliquer(next, "plages")
  }

  function retirerPlage() {
    if (editeur?.index == null) return
    const index = editeur.index
    setEditeur(null)
    // Le jour reste coché : s'il n'a plus de plage, l'erreur le dit et rien n'est écrit.
    appliquer({ ...s, plages: s.plages.filter((_, i) => i !== index) }, "plages")
  }

  const familles = famillesDe(s.quiAutorises)
  function basculerFamille(f: Famille) {
    const next = familles.includes(f) ? familles.filter((x) => x !== f) : [...familles, f]
    appliquer({ ...s, quiAutorises: quiDesFamilles(next) }, "qui")
  }

  return (
    <section aria-labelledby={titreId} className="bg-card shadow-soft rounded-2xl p-5 space-y-4">
      <h3 id={titreId} className="text-[17px] font-semibold">{t("planning.saison.carte")}</h3>

      <Reglage titre={t("planning.saison.periode")} erreurs={erreursDe("dates")}>
        <label className={pastille}>
          {t("planning.saison.du")}
          <input type="date" aria-label={t("planning.saison.ouverture")} value={s.debut} max={programme.jourJ}
            className="bg-transparent outline-none tabular-nums" onChange={(e) => appliquer({ ...s, debut: e.target.value }, "dates")} />
        </label>
        <label className={pastille}>
          {t("planning.saison.au")}
          <input type="date" aria-label={t("planning.saison.fermeture")} value={s.fin}
            className="bg-transparent outline-none tabular-nums" onChange={(e) => appliquer({ ...s, fin: e.target.value }, "dates")} />
        </label>
      </Reglage>

      <Reglage titre={t("planning.saison.jours")} erreurs={erreursDe("jours")}>
        {ORDRE_JOURS.map((j) => (
          <Pilule key={j} actif={s.jours.includes(j)} onClick={() => basculerJour(j)}>{jourCourt(j)}</Pilule>
        ))}
      </Reglage>

      <Reglage titre={t("planning.saison.plages")} erreurs={erreursDe("plages")}>
        {s.plages.map((p, i) => (
          <button key={`${p.jour}-${p.debut}-${i}`} type="button" className={pastille} aria-expanded={editeur?.index === i}
            onClick={() => setEditeur(editeur?.index === i ? null : { index: i, plage: p })}>
            {jourCourt(p.jour)} {p.debut} – {p.fin}
          </button>
        ))}
        <button type="button" aria-label={t("planning.saison.ajouterPlage")} aria-expanded={editeur?.index === null}
          className="h-[30px] self-center inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 text-[13px] font-semibold"
          onClick={() => setEditeur({ index: null, plage: { ...(s.plages.at(-1) ?? PLAGES_DEFAUT[0]) } })}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> {t("planning.saison.plage")}
        </button>
        {editeur && (
          <div className="basis-full mt-1 flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
            <label className="space-y-1 text-xs font-semibold">
              <span className="block">{t("planning.saison.jour")}</span>
              <select aria-label={t("planning.saison.jourPlage")} value={editeur.plage.jour}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) => setEditeur({ ...editeur, plage: { ...editeur.plage, jour: Number(e.target.value) } })}>
                {ORDRE_JOURS.map((j) => <option key={j} value={j}>{jourCourt(j)}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              <span className="block">{t("planning.programme.debut")}</span>
              <Input type="time" step={900} aria-label={t("planning.saison.debutPlage")} value={editeur.plage.debut} className="w-28"
                onChange={(e) => setEditeur({ ...editeur, plage: { ...editeur.plage, debut: e.target.value } })} />
            </label>
            <label className="space-y-1 text-xs font-semibold">
              <span className="block">{t("planning.programme.fin")}</span>
              <Input type="time" step={900} aria-label={t("planning.saison.finPlage")} value={editeur.plage.fin} className="w-28"
                onChange={(e) => setEditeur({ ...editeur, plage: { ...editeur.plage, fin: e.target.value } })} />
            </label>
            <div className="flex gap-1">
              <Button type="button" size="sm" onClick={validerPlage}>{t("planning.saison.validerPlage")}</Button>
              {editeur.index !== null && (
                <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={retirerPlage}>{t("planning.saison.retirerPlage")}</Button>
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditeur(null)}>{t("planning.saison.annuler")}</Button>
            </div>
          </div>
        )}
      </Reglage>

      <Reglage titre={t("planning.saison.duree")} erreurs={erreursDe("duree")}>
        {DUREES.map((d) => (
          <Pilule key={d} actif={s.duree === d} onClick={() => appliquer({ ...s, duree: d }, "duree")}>{t(`planning.saison.dureeCourte.${d}`)}</Pilule>
        ))}
      </Reglage>

      <Reglage titre={t("planning.saison.qui")} erreurs={erreursDe("qui")}>
        <Pilule actif={s.quiAutorises.length === 0} onClick={() => appliquer({ ...s, quiAutorises: [] }, "qui")}>{t("planning.saison.tous")}</Pilule>
        {FAMILLES.map((f) => (
          <Pilule key={f.cle} actif={familles.includes(f.cle)} onClick={() => basculerFamille(f.cle)}>{t(`planning.saison.familles.${f.cle}`)}</Pilule>
        ))}
      </Reglage>

      <p className="text-[13px] text-muted-foreground">{t("planning.saison.regle")}</p>
    </section>
  )
}
