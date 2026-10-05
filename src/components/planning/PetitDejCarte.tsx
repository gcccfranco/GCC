"use client"

// Carte « Petit déj » en tête de Planning › Table (lot U3, tranche PD2,
// docs/spec-petit-dej.md ; planche `petit-dej-telephone`). Une rangée par
// dimanche du trimestre choisi (Q11) : « Libre » et « Je m'inscris », ou les
// lignes, une équipe chacune. Son inscrit réécrit (✎) et retire sa ligne ; les
// écrivains du planning Table et les admins posent, réécrivent et retirent pour
// d'autres (T10). Rien ne bouge un dimanche passé (Q2). Une lecture en échec
// n'est pas « personne » : la carte le dit, sans « Libre » ni bouton (Q10).
// Droits : canEditPetitDej / canGererPetitDej (access.ts), firestore.rules.

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Coffee, Pencil, Plus } from "lucide-react"
import { canEditPetitDej, canGererPetitDej } from "@/lib/access"
import { ajouterLigne, inscrire, renommerLigne, retirerLigne } from "@/lib/firebase/petitDej"
import { historyAuthor } from "@/lib/firebase/setlistHistory"
import { useProfile } from "@/lib/firebase/users"
import { lirePetitDej } from "@/lib/petitdej/lignes"
import { dimanchesDe } from "@/lib/planning/grilles"
import { currentSundayStr, getTri } from "@/lib/planning/utils"
import { serviceButtonFill } from "@/lib/serviceButton"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { LignePetitDej } from "@/types/petitDej"

const COULEUR = PLANNING_COLORS.table
/** Fond des boutons pleins : la Table assombrie, libellé blanc lisible (Q15). */
const FOND = serviceButtonFill(COULEUR)
const NOM_MAX = 80

/** « 4 oct. », « 1er nov. » ; 中文 « 10月4日 ». */
export function dateCourte(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (lang === "zh-CN") return `${m}月${d}日`
  return `${d === 1 ? "1er" : d} ${new Date(y, m - 1, d).toLocaleDateString("fr-FR", { month: "short" })}`
}

/** Une saisie en cours : réécrire une ligne (`id`), ou en ajouter une (`id` nul). */
type Saisie = { dimanche: string; id: string | null; valeur: string }

export function PetitDejCarte({ annee, tri, nomsDesComptes, onLignes }: {
  annee: number
  /** « T1 » … « T4 », le trimestre choisi par la page. */
  tri: string
  /** Noms de planning des comptes, suggérés à qui pose une ligne pour quelqu'un. */
  nomsDesComptes: readonly string[]
  /** Les lignes lues, après chaque lecture : la case de la grille les suit. */
  onLignes?: (lignes: LignePetitDej[]) => void
}) {
  const { t, i18n } = useTranslation()
  const { user, profile } = useProfile()
  const titreId = useId()
  const listeId = useId()
  const [lignes, setLignes] = useState<LignePetitDej[] | "illisible" | null>(null)
  const [saisie, setSaisie] = useState<Saisie | null>(null)
  // Un message sous un dimanche : « X vient de s'inscrire. », ou un refus.
  const [annonce, setAnnonce] = useState<{ dimanche: string; texte: string } | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Entrée puis la sortie du champ (démonté) : une seule fin de saisie.
  const fini = useRef(false)

  const sun = currentSundayStr()
  const peutGerer = canGererPetitDej(user, profile)
  const dimanches = dimanchesDe(annee).filter((d) => getTri(d) === tri)

  function lire() {
    return lirePetitDej().then(
      (l) => { setLignes(l); onLignes?.(l) },
      () => setLignes("illisible"),
    )
  }

  useEffect(() => {
    let vivant = true
    lirePetitDej().then(
      (l) => { if (vivant) { setLignes(l); onLignes?.(l) } },
      () => { if (vivant) setLignes("illisible") },
    )
    return () => { vivant = false }
  }, [onLignes])

  /** Écrit, dit le refus éventuel sous le dimanche, puis relit (le cache est oublié par l'écriture). */
  async function ecrire(dimanche: string, action: () => Promise<void>) {
    setAnnonce(null)
    setEnCours(true)
    try {
      await action()
    } catch {
      const horsLigne = typeof navigator !== "undefined" && navigator.onLine === false
      setAnnonce({ dimanche, texte: t(`planning.grille.${horsLigne ? "horsLigne" : "droitRetire"}`) })
    } finally {
      setEnCours(false)
      await lire()
    }
  }

  function sInscrire(dimanche: string) {
    if (!user) return
    const nom = historyAuthor(profile)?.name || user.email?.split("@")[0] || ""
    void ecrire(dimanche, async () => {
      const r = await inscrire(dimanche, nom, user.uid)
      // Quelqu'un vient de prendre ce dimanche : rien n'est écrit (Q11).
      if ("deja" in r) setAnnonce({ dimanche, texte: t("planning.petitDej.vientDeSInscrire", { nom: r.deja.map((l) => l.nom).join(", ") }) })
    })
  }

  function retirer(l: LignePetitDej) {
    if (!window.confirm(t("planning.petitDej.confirmerRetrait"))) return
    void ecrire(l.dimanche, () => retirerLigne(l.id))
  }

  function commencer(s: Saisie) {
    fini.current = false
    setAnnonce(null)
    setSaisie(s)
  }

  /** Entrée ou sortie du champ enregistre, Échap annule ; un texte vide est refusé. */
  function terminer(enregistrer: boolean) {
    if (fini.current || !saisie || !user) return
    fini.current = true
    const { dimanche, id } = saisie
    const nom = saisie.valeur.trim()
    setSaisie(null)
    if (!enregistrer || !nom) return
    if (id) {
      const avant = Array.isArray(lignes) ? lignes.find((l) => l.id === id)?.nom : undefined
      if (avant !== nom) void ecrire(dimanche, () => renommerLigne(id, nom))
    } else {
      void ecrire(dimanche, async () => { await ajouterLigne(dimanche, nom, user.uid) })
    }
  }

  // Fonction, pas composant : un composant défini ici serait remonté à chaque
  // frappe et le champ perdrait le focus (même raison que PlanningGrille).
  const champ = (label: string, suggestions: boolean) => (
    <input
      autoFocus
      type="text"
      maxLength={NOM_MAX}
      aria-label={label}
      list={suggestions ? listeId : undefined}
      value={saisie?.valeur ?? ""}
      onChange={(e) => setSaisie((s) => (s ? { ...s, valeur: e.target.value } : s))}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); terminer(true) }
        if (e.key === "Escape") { e.preventDefault(); terminer(false) }
      }}
      onBlur={() => terminer(true)}
      className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-[16px] sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
      style={{ borderColor: COULEUR }}
    />
  )

  const bouton = "h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.96] disabled:opacity-60"
  const boutonGris = `${bouton} bg-secondary text-foreground hover:bg-secondary/70`

  function laLigne(l: LignePetitDej): ReactNode {
    if (saisie?.id === l.id) return <div key={l.id} className="flex min-h-9 items-center">{champ(t("planning.petitDej.modifier"), false)}</div>
    return (
      <div key={l.id} className="flex min-h-9 items-center gap-2">
        <span className="min-w-0 flex-1 break-words font-semibold text-foreground">{l.nom}</span>
        {canEditPetitDej(user, profile, l, sun) && (
          <>
            <button
              type="button"
              aria-label={t("planning.petitDej.modifier")}
              disabled={enCours}
              onClick={() => commencer({ dimanche: l.dimanche, id: l.id, valeur: l.nom })}
              className={`${boutonGris} grid w-9 place-items-center px-0`}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" disabled={enCours} onClick={() => retirer(l)} className={boutonGris}>
              {t("planning.petitDej.retirer")}
            </button>
          </>
        )}
      </div>
    )
  }

  function laRangee(d: string): ReactNode {
    const passe = d < sun
    const ouvert = !passe && !!user
    const siennes = (lignes as LignePetitDej[]).filter((l) => l.dimanche === d)
    return (
      <li key={d} data-dimanche={d} className="flex gap-3 border-t border-border py-2">
        <span className={`flex h-9 w-[62px] shrink-0 items-center text-sm font-bold ${passe ? "text-muted-foreground" : "text-foreground"}`}>
          {dateCourte(d, i18n.language)}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          {siennes.length === 0 && (
            <div className="flex min-h-9 items-center gap-2">
              {passe
                ? <span className="text-muted-foreground">—</span>
                : <span className="flex-1 font-semibold text-amber-700 dark:text-amber-400">{t("planning.petitDej.libre")}</span>}
              {ouvert && (
                <button type="button" disabled={enCours} onClick={() => sInscrire(d)} className={`${bouton} text-white`} style={{ background: FOND }}>
                  {t("planning.petitDej.inscrire")}
                </button>
              )}
            </div>
          )}
          {siennes.map(laLigne)}
          {ouvert && peutGerer && (
            saisie && saisie.dimanche === d && saisie.id === null ? (
              <div className="flex min-h-9 items-center">{champ(t("planning.petitDej.ajouter"), true)}</div>
            ) : (
              <button
                type="button"
                disabled={enCours}
                onClick={() => commencer({ dimanche: d, id: null, valeur: "" })}
                className={`${boutonGris} inline-flex items-center gap-1.5 text-muted-foreground`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("planning.petitDej.ajouter")}
              </button>
            )
          )}
          {annonce?.dimanche === d && (
            <p role="status" className="text-[13px] text-muted-foreground">{annonce.texte}</p>
          )}
        </div>
      </li>
    )
  }

  return (
    <section aria-labelledby={titreId} className="rounded-xl bg-card px-4 pt-3 pb-3.5 shadow-soft lg:max-w-lg">
      <div className="flex items-center gap-2 pb-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${COULEUR}24`, color: FOND }} aria-hidden>
          <Coffee className="h-4 w-4" />
        </span>
        <h3 id={titreId} className="text-[17px] font-bold text-foreground">{t("planning.tabs.petitDej")}</h3>
        <span className="ml-auto text-[13px] text-muted-foreground">{t("planning.petitDej.trimestre", { n: tri.slice(1) })}</span>
      </div>
      {lignes === "illisible" ? (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">{t("planning.petitDej.illisible")}</p>
      ) : lignes === null ? (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <ul>{dimanches.map(laRangee)}</ul>
          <p className="mt-1 text-[13px] text-muted-foreground">{t("planning.petitDej.astuce")}</p>
        </>
      )}
      {peutGerer && (
        <datalist id={listeId}>
          {nomsDesComptes.map((n) => <option key={n} value={n} />)}
        </datalist>
      )}
    </section>
  )
}
