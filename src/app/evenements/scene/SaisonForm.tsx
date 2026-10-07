"use client"

// Carte « Mettre en place la saison » (lot U1, docs/spec-scene-saison.md) :
// ouverture et fermeture, jours réservables, plages horaires, durée d'un
// créneau, qui peut réserver. Enregistrement à chaque changement, comme
// l'éditeur de setlist ; une erreur s'affiche sous le champ et rien n'est écrit.
// Pâques · Noël, P7 (Q8, Q19) : le jour J en tête (calculé pour la fête, modifiable), les aides
// (premier jour réservable, fin, créneaux par jour) et le refus d'une période qui croise celle
// de l'autre fête (`autre`) ; `onErreur` dit à l'écran si une erreur bloque « Lancer ».

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import {
  compteCreneaux, DATE, DUREES, erreursSaison, FAMILLES, famillesDe, joursDes, joursReservables, ORDRE_JOURS, PLAGES_DEFAUT,
  quiDesFamilles, saisonDe, triPlages, type Famille, type Saison,
} from "@/lib/scene/saison"
import type { Plage, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { jourEnLettres, nomDuJour } from "./libelles"

type Champ = "jourJ" | "dates" | "jours" | "plages" | "duree" | "qui"
export type SaisonPatch = Partial<Pick<Programme, "jourJ" | "debut" | "fin" | "plages" | "duree" | "quiAutorises">>

/** La période de réservation de l'édition de l'autre fête (Q8), et son titre pour l'erreur. */
export type AutreFete = { debut: string; fin: string; titre: string }

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

/** Un réglage : son titre, ses commandes, l'aide et l'erreur dessous. */
function Reglage({ titre, aide, erreurs, children }: { titre: string; aide?: string; erreurs?: string[]; children: ReactNode }) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="space-y-1.5">
      <p id={id} className="text-[13px] font-semibold text-muted-foreground">{titre}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
      {aide && <p className="text-[12.5px] text-muted-foreground">{aide}</p>}
      {erreurs?.map((e) => <p key={e} role="alert" className="text-sm text-destructive">{e}</p>)}
    </div>
  )
}

const pastille = "h-9 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 text-sm font-semibold whitespace-nowrap"

/** « du jeudi 1er octobre » en toutes lettres, comme la planche ; le champ date
 *  natif, transparent, couvre la pastille : un clic ouvre le sélecteur du système. */
function DatePastille({ prefixe, label, value, max, avecAnnee = false, onChange }: {
  prefixe?: string
  label: string
  value: string
  max?: string
  /** « dimanche 28 mars 2027 » (le jour J) plutôt que « dimanche 28 mars ». */
  avecAnnee?: boolean
  onChange: (value: string) => void
}) {
  const { i18n } = useTranslation()
  const ref = useRef<HTMLInputElement>(null)
  const date = DATE.test(value) ? jourEnLettres(value, i18n.language) : "…"
  const texte = avecAnnee && DATE.test(value)
    ? (i18n.language === "zh-CN" ? `${value.slice(0, 4)}年${date}` : `${date} ${value.slice(0, 4)}`)
    : date
  return (
    <label className={`${pastille} relative cursor-pointer focus-within:ring-2 focus-within:ring-ring`}>
      <span aria-hidden>{prefixe ? `${prefixe} ${texte}` : texte}</span>
      <input
        ref={ref} type="date" aria-label={label} value={value} max={max}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        // showPicker : Chrome n'ouvre sinon le calendrier que sur son icône.
        onClick={() => { try { ref.current?.showPicker() } catch { /* sélecteur déjà ouvert ou indisponible */ } }}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function SaisonForm({ programme, onSave, jourJCalcule, autre, onErreur }: {
  programme: Programme
  /** Écrit les champs changés (updateMask), puis recharge la page ; ne rejette
   *  jamais (un échec d'écriture s'affiche en haut de l'écran de la saison). */
  onSave: (patch: SaisonPatch) => Promise<void>
  /** Le jour J calculé pour la fête (Q3) et son nom : l'aide « Calculé pour Pâques ; modifiable. ». */
  jourJCalcule?: { date: string; fete: string }
  autre?: AutreFete
  /** Vrai tant qu'une erreur s'affiche (rien n'est écrit) : « Lancer » attend. */
  onErreur?: (erreur: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  // La saison montrée est celle du programme, sauf le temps d'une erreur (rien
  // n'est écrit) ou d'une écriture : une copie gardée plus longtemps resterait
  // périmée quand le programme change ailleurs (jour J, autre coordinateur) et
  // repartirait en base au réglage suivant.
  const [local, setLocal] = useState<Saison | null>(null)
  const s = local ?? saisonDe(programme)
  const [erreur, setErreur] = useState<{ champ: Champ; textes: string[] } | null>(null)
  const [editeur, setEditeur] = useState<{ index: number | null; plage: Plage } | null>(null)
  // Le jour J montré : celui du programme, sauf le temps d'une erreur ou d'une écriture.
  const [jourJLocal, setJourJLocal] = useState<string | null>(null)
  const jourJ = jourJLocal ?? programme.jourJ

  useEffect(() => { onErreur?.(erreur !== null) }, [erreur, onErreur])

  const jourCourt = (j: number) => t(`planning.saison.jourCourt.${j}`)
  const erreursDe = (champ: Champ) => (erreur?.champ === champ ? erreur.textes : undefined)
  const verifier = (next: Saison, jj = jourJ) => erreursSaison(next, jj, autre).map((c) =>
    t(`planning.saison.erreurs.${c}`, autre ? { edition: autre.titre, date: jourEnLettres(autre.fin, lang) } : {}))

  /** Le jour J : vérifié avec la saison qu'il donne (la fermeture par défaut le suit), écrit seul. */
  function changerJourJ(v: string) {
    setJourJLocal(v)
    if (!DATE.test(v)) return
    const textes = verifier(saisonDe({ ...programme, jourJ: v }), v)
    setErreur(textes.length > 0 ? { champ: "jourJ", textes } : null)
    if (textes.length > 0 || v === programme.jourJ) { if (v === programme.jourJ) setJourJLocal(null); return }
    onSave({ jourJ: v }).then(() => setJourJLocal((l) => (l === v ? null : l)))
  }

  /** Affiche `next` ; s'il est valable, écrit ce qui a changé, sinon montre l'erreur sous le champ. */
  function appliquer(next: Saison, champ: Champ) {
    setLocal(next)
    const textes = verifier(next)
    setErreur(textes.length > 0 ? { champ, textes } : null)
    if (textes.length > 0) return
    const patch = difference(saisonDe(programme), next)
    if (Object.keys(patch).length === 0) { setLocal(null); return }
    // Écrit puis relu (un échec se dit en haut de l'écran) : on revient au
    // programme, sauf si un autre réglage a suivi entre-temps.
    onSave(patch).then(() => setLocal((l) => (l === next ? null : l)))
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

  // Les aides (Q19) : premier jour réservable et fin ; créneaux par jour de la semaine.
  const jours = joursReservables(s, jourJ)
  const finParDefaut = programme.fin === undefined && s.fin === saisonDe(programme).fin
  const aideDates = jours.length === 0 ? undefined : [
    t("planning.gestion.premierJour", { date: jourEnLettres(jours[0], lang) }),
    finParDefaut ? t("planning.gestion.finParDefaut") : t("planning.gestion.dernierJour", { date: jourEnLettres(jours.at(-1)!, lang) }),
  ].join(" ")
  const aideDuree = compteCreneaux(s, jourJ).parJour
    .map(({ jour, creneaux }) => t("planning.gestion.creneauxDuJour", { jour: nomDuJour(jour, lang), count: creneaux }))
    .join(" ") || undefined

  return (
    <section aria-label={t("planning.saison.carte")} className="bg-card shadow-soft rounded-2xl p-5 space-y-4">

      <Reglage
        titre={t("planning.gestion.jourJ")}
        aide={jourJCalcule && jourJ === jourJCalcule.date ? t("planning.gestion.jourJCalcule", { fete: jourJCalcule.fete }) : undefined}
        erreurs={erreursDe("jourJ")}
      >
        <DatePastille label={t("planning.gestion.choisirJourJ")} value={jourJ} avecAnnee onChange={changerJourJ} />
      </Reglage>

      <Reglage titre={t("planning.saison.periode")} aide={aideDates} erreurs={erreursDe("dates")}>
        <DatePastille prefixe={t("planning.saison.du")} label={t("planning.saison.ouverture")} value={s.debut} max={jourJ}
          onChange={(debut) => appliquer({ ...s, debut }, "dates")} />
        <DatePastille prefixe={t("planning.saison.au")} label={t("planning.saison.fermeture")} value={s.fin}
          onChange={(fin) => appliquer({ ...s, fin }, "dates")} />
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

      <Reglage titre={t("planning.saison.duree")} aide={aideDuree} erreurs={erreursDe("duree")}>
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
