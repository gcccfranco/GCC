"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from "react"

// Sélection d'une plage de cases au clavier (lot 3, PG22 à PG26, PG31) : une case choisie (l'ancre),
// une plage avec Maj + clic, les flèches, ⌘C, ⌘V et ⌫. Réservée au pointeur fin avec survol : un
// doigt sur une tablette sans clavier ne laisse ni sélection ni barre.

// Pointeur fin ET tableau affiché (`sm`, 640 px) : sous cette largeur les cartes n'ont pas de sélection.
const POINTEUR_FIN = "(hover: hover) and (pointer: fine) and (min-width: 640px)"
const suivre = (rappel: () => void) => {
  const mq = window.matchMedia(POINTEUR_FIN)
  mq.addEventListener("change", rappel)
  return () => mq.removeEventListener("change", rappel)
}
export const useClavier = () => useSyncExternalStore(suivre, () => window.matchMedia(POINTEUR_FIN).matches, () => false)

export type CaseChoisie = { date: string; cle: string }
export type Plage = { r0: number; r1: number; c0: number; c1: number }

/** Ce que le clavier demande à la grille ; la grille le relit à chaque rendu. */
export interface Poignees {
  /** Un menu, un champ ou une fenêtre est ouvert : le clavier le laisse faire. */
  occupe: boolean
  /** Un aperçu de collage attend : Entrée colle, Échap annule. */
  apercu: boolean
  texte: () => string
  coller: (texte: string) => void
  vider: () => void
  ouvrir: (c: CaseChoisie) => void
  validerApercu: () => void
  annulerApercu: () => void
}

// Une seule grille de la page a une sélection (Campus en a deux) : la dernière choisie prend la main.
let efface: (() => void) | null = null

/** Le clavier ne parle qu'au corps de la page ou à ce qui est dans une grille (ni onglets, ni autres boutons). */
const surLaGrille = (cible: EventTarget | null) =>
  cible === document.body || cible === document.documentElement || (cible instanceof HTMLElement && !!cible.closest("[data-grille]"))

const dansUnChamp = (cible: EventTarget | null) =>
  cible instanceof HTMLElement &&
  !!cible.closest("input,textarea,select,[contenteditable='true'],[role=dialog],[role=alertdialog],[role=menu],[role=listbox]")

export function useSelectionGrille(
  dates: readonly string[],
  cles: readonly string[],
  actif: boolean,
  poignees: MutableRefObject<Poignees>,
) {
  const [sel, setSel] = useState<{ ancre: CaseChoisie; fin: CaseChoisie } | null>(null)
  const effacer = useCallback(() => { setSel(null); if (efface === effacer) efface = null }, [])

  const rang = (c: CaseChoisie) => ({ r: dates.indexOf(c.date), c: cles.indexOf(c.cle) })
  const a = sel && rang(sel.ancre)
  const f = sel && rang(sel.fin)
  // Une case qui n'est plus affichée (autre trimestre, « Mes dates ») : plus de sélection.
  const plage: Plage | null = a && f && a.r >= 0 && a.c >= 0 && f.r >= 0 && f.c >= 0
    ? { r0: Math.min(a.r, f.r), r1: Math.max(a.r, f.r), c0: Math.min(a.c, f.c), c1: Math.max(a.c, f.c) }
    : null

  const choisir = (c: CaseChoisie) => {
    if (efface && efface !== effacer) efface()
    efface = effacer
    setSel({ ancre: c, fin: c })
  }
  const etendre = (c: CaseChoisie) => setSel((s) => (s ? { ...s, fin: c } : { ancre: c, fin: c }))
  const deplacer = (dr: number, dc: number) => {
    if (!a || a.r < 0 || a.c < 0) return
    const r = Math.min(dates.length - 1, Math.max(0, a.r + dr))
    const c = Math.min(cles.length - 1, Math.max(0, a.c + dc))
    choisir({ date: dates[r], cle: cles[c] })
  }

  // Les évènements du clavier lisent l'état par une référence : un seul jeu d'écouteurs.
  const etat = useRef({ actif, plage, ancre: sel?.ancre ?? null, deplacer, effacer })
  etat.current = { actif, plage, ancre: sel?.ancre ?? null, deplacer, effacer }

  useEffect(() => {
    const pret = () => etat.current.actif && !!etat.current.plage
    // En capture : on voit l'Échap avant le menu qui le ferme, et on sait s'il était ouvert.
    const touche = (e: KeyboardEvent) => {
      if (!pret()) return
      const p = poignees.current
      const { ancre, deplacer: aller, effacer: fermer } = etat.current
      if (e.key === "Escape") {
        if (p.occupe || dansUnChamp(e.target) || document.querySelector("[role=dialog],[role=alertdialog],[role=menu]")) return
        if (p.apercu) p.annulerApercu()
        else fermer()
        return
      }
      if (p.occupe || dansUnChamp(e.target) || !surLaGrille(e.target)) return
      // Un bouton hors des cases (une pastille, la barre) garde son Entrée.
      const surBouton = e.target instanceof HTMLElement && !!e.target.closest("button,a") && !e.target.closest("[data-case]")
      if (p.apercu) {
        if (e.key === "Enter" && !surBouton) { e.preventDefault(); p.validerApercu() }
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const fleche: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
      if (fleche[e.key]) { e.preventDefault(); aller(...fleche[e.key]) }
      else if (e.key === "Enter" && ancre) {
        if (surBouton) return
        e.preventDefault()
        p.ouvrir(ancre)
      } else if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); p.vider() }
    }
    const copie = (e: ClipboardEvent) => {
      if (!pret() || poignees.current.occupe || dansUnChamp(e.target) || !surLaGrille(e.target)) return
      if (window.getSelection()?.toString()) return
      e.clipboardData?.setData("text/plain", poignees.current.texte())
      e.preventDefault()
    }
    const colle = (e: ClipboardEvent) => {
      if (!pret() || poignees.current.occupe || dansUnChamp(e.target) || !surLaGrille(e.target)) return
      // Un aperçu attend : un second collage ne l'écrase pas.
      if (poignees.current.apercu) { e.preventDefault(); return }
      const texte = e.clipboardData?.getData("text/plain") ?? ""
      if (!texte) return
      e.preventDefault()
      poignees.current.coller(texte)
    }
    document.addEventListener("keydown", touche, true)
    document.addEventListener("copy", copie)
    document.addEventListener("paste", colle)
    return () => {
      document.removeEventListener("keydown", touche, true)
      document.removeEventListener("copy", copie)
      document.removeEventListener("paste", colle)
    }
  }, [poignees])

  useEffect(() => () => { if (efface === effacer) efface = null }, [effacer])

  return { sel, plage, choisir, etendre, effacer }
}
