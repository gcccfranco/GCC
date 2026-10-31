"use client"

// La case « Petit déj » de la grille Planning › Prépa. Table au Back-Office (30/10/2026, Timothée :
// dans l'App on n'inscrit plus les autres, on les gère ici). Les lignes ne sont pas des champs de la
// grille mais des documents `petitDej/{id}` : la page donne cette case à `PlanningGrille` (`casesAPart`)
// et lit/écrit par `usePetitDejGrille`. Plusieurs personnes à la fois : un champ, des noms séparés par
// des virgules ou des retours à la ligne. Droits : canGererPetitDej (access.ts), firestore.rules.
// Composants au niveau du module : définis dans un rendu, le champ perdrait le focus à chaque frappe.

import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus, X } from "lucide-react"
import { useConfirmer } from "@/components/layout/Confirmer"
import { RefusDesRegles, ajouterLigne, renommerLigne, retirerLigne } from "@/lib/firebase/petitDej"
import { useProfile } from "@/lib/firebase/users"
import { lirePetitDej } from "@/lib/petitdej/lignes"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { LignePetitDej } from "@/types/petitDej"

const COULEUR = PLANNING_COLORS.table
const NOM_MAX = 80

/** Les noms à écrire d'une saisie : séparés par des virgules ou des retours à la ligne, sans bords,
 *  sans vides, tronqués à 80 caractères, sans doublon (casse et espaces de bord ignorés) ni de ce que
 *  le dimanche porte déjà (`existants`) ni entre eux. */
export function nomsAAjouter(texte: string, existants: readonly string[]): string[] {
  const cle = (n: string) => n.trim().toLowerCase()
  const vus = new Set(existants.map(cle))
  const noms: string[] = []
  for (const brut of texte.split(/[,，\n]/)) {
    const nom = brut.trim().slice(0, NOM_MAX).trim()
    if (!nom || vus.has(cle(nom))) continue
    vus.add(cle(nom))
    noms.push(nom)
  }
  return noms
}

type Annonce = { dimanche: string; texte: string }

/** Les lignes du petit déj lues et écrites pour la grille. `actif` : lit seulement pour qui gère.
 *  `onLignes` : appelé avec les lignes après chaque lecture (la page les passe à la grille). */
export function usePetitDejGrille(actif: boolean, onLignes: (lignes: LignePetitDej[]) => void) {
  const { t } = useTranslation()
  const confirmer = useConfirmer()
  const { user } = useProfile()
  const [lignes, setLignes] = useState<LignePetitDej[] | "illisible" | null>(null)
  const [annonce, setAnnonce] = useState<Annonce | null>(null)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    if (!actif) return
    let vivant = true
    lirePetitDej().then(
      (l) => { if (vivant) { setLignes(l); onLignes(l) } },
      () => { if (vivant) setLignes("illisible") },
    )
    return () => { vivant = false }
  }, [actif, onLignes])

  /** Écrit, dit le refus éventuel sous le dimanche, puis relit (le cache est oublié par l'écriture). */
  async function ecrire(dimanche: string, action: () => Promise<void>) {
    setAnnonce(null)
    setEnCours(true)
    try {
      await action()
    } catch (e) {
      const horsLigne = typeof navigator !== "undefined" && navigator.onLine === false
      const cle = horsLigne ? "planning.grille.horsLigne" : e instanceof RefusDesRegles ? "planning.grille.droitRetire" : "planning.petitDej.echec"
      setAnnonce({ dimanche, texte: t(cle) })
    } finally {
      // `enCours` ne retombe qu'après la relecture : un ajout immédiat se dédoublonne contre la liste à jour.
      await lirePetitDej().then(
        (l) => { setLignes(l); onLignes(l) },
        () => setLignes("illisible"),
      )
      setEnCours(false)
    }
  }

  /** Une ligne par nom, en séquence et dans l'ordre tapé ; rien n'est écrit si tout est ignoré. */
  async function ajouter(dimanche: string, texte: string) {
    if (!user || !Array.isArray(lignes)) return
    const noms = nomsAAjouter(texte, lignes.filter((l) => l.dimanche === dimanche).map((l) => l.nom))
    if (!noms.length) return
    await ecrire(dimanche, async () => { for (const nom of noms) await ajouterLigne(dimanche, nom, user.uid) })
  }

  async function renommer(l: LignePetitDej, nom: string) {
    await ecrire(l.dimanche, () => renommerLigne(l.id, nom))
  }

  async function retirer(l: LignePetitDej) {
    if (!(await confirmer({ titre: t("planning.petitDej.confirmerRetrait"), action: t("common.buttons.remove"), destructif: true }))) return
    await ecrire(l.dimanche, () => retirerLigne(l.id))
  }

  return { lignes, annonce, enCours, ajouter, renommer, retirer }
}

type EtatPetitDejGrille = ReturnType<typeof usePetitDejGrille>

const BORD = "min-h-8 rounded-md border border-dashed px-1.5 py-1 text-[13px] sm:text-sm hover:bg-secondary active:bg-secondary disabled:opacity-60"
const CHAMP = "w-full min-w-0 rounded-md border bg-background px-2 py-1 text-[16px] sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"

/** Le champ d'ajout : plusieurs noms. Entrée valide (Maj+Entrée : retour à la ligne), Échap annule,
 *  la sortie du champ valide. */
function ChampAjout({ label, placeholder, onFini }: { label: string; placeholder: string; onFini: (texte: string | null) => void }) {
  const [valeur, setValeur] = useState("")
  // Entrée puis la sortie du champ (démonté) : une seule fin de saisie.
  const fini = useRef(false)
  function terminer(enregistrer: boolean) {
    if (fini.current) return
    fini.current = true
    onFini(enregistrer ? valeur : null)
  }
  return (
    <textarea
      autoFocus
      rows={2}
      aria-label={label}
      placeholder={placeholder}
      value={valeur}
      onChange={(e) => setValeur(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); terminer(true) }
        if (e.key === "Escape") { e.preventDefault(); terminer(false) }
      }}
      onBlur={() => terminer(true)}
      className={CHAMP}
      style={{ borderColor: COULEUR }}
    />
  )
}

/** Le champ de réécriture d'une ligne, prérempli : Entrée ou sortie enregistre, Échap annule. */
function ChampNom({ label, depart, onFini }: { label: string; depart: string; onFini: (nom: string | null) => void }) {
  const [valeur, setValeur] = useState(depart)
  const fini = useRef(false)
  function terminer(enregistrer: boolean) {
    if (fini.current) return
    fini.current = true
    onFini(enregistrer ? valeur : null)
  }
  return (
    <input
      autoFocus
      type="text"
      maxLength={NOM_MAX}
      aria-label={label}
      value={valeur}
      onChange={(e) => setValeur(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); terminer(true) }
        if (e.key === "Escape") { e.preventDefault(); terminer(false) }
      }}
      onBlur={() => terminer(true)}
      className={CHAMP}
      style={{ borderColor: COULEUR }}
    />
  )
}

/** Le contenu de la case Petit déj d'un dimanche : ses lignes (nom à réécrire, ✕ pour retirer) et « + ». */
export function CasePetitDej({ etat, dimanche }: { etat: EtatPetitDejGrille; dimanche: string }) {
  const { t } = useTranslation()
  const { lignes, annonce, enCours } = etat
  const [ajout, setAjout] = useState(false)
  const [renom, setRenom] = useState<string | null>(null)
  const siennes = Array.isArray(lignes) ? lignes.filter((l) => l.dimanche === dimanche) : []
  const bord = { borderColor: `${COULEUR}55` }
  const libelleAjout = t("planning.petitDej.ajouterNoms")

  return (
    <div data-case-a-part="" className="w-full space-y-1">
      {siennes.map((l) => (
        <div key={l.id} className="flex items-center gap-1">
          {renom === l.id ? (
            <ChampNom
              label={t("planning.petitDej.modifier")}
              depart={l.nom}
              onFini={(nom) => {
                setRenom(null)
                const n = nom?.trim()
                if (n && n !== l.nom) void etat.renommer(l, n)
              }}
            />
          ) : (
            <>
              <button type="button" disabled={enCours} onClick={() => setRenom(l.id)} className={`${BORD} min-w-0 flex-1 break-words text-left`} style={bord}>
                {l.nom}
              </button>
              <button
                type="button"
                disabled={enCours}
                aria-label={t("planning.petitDej.retirerNom", { nom: l.nom })}
                onClick={() => void etat.retirer(l)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10 disabled:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      ))}
      {ajout ? (
        <ChampAjout
          label={libelleAjout}
          placeholder={t("planning.petitDej.nomsSepares")}
          onFini={(texte) => {
            setAjout(false)
            if (texte) void etat.ajouter(dimanche, texte)
          }}
        />
      ) : (
        <button type="button" data-ouvrir="" disabled={enCours} aria-label={libelleAjout} onClick={() => setAjout(true)} className={`${BORD} ${siennes.length ? "inline-flex items-center justify-center" : "w-full text-left"} `} style={bord}>
          {siennes.length ? <Plus className="h-4 w-4" aria-hidden /> : <span className="text-muted-foreground">+</span>}
        </button>
      )}
      {annonce?.dimanche === dimanche && <p role="status" className="text-[13px] text-muted-foreground">{annonce.texte}</p>}
    </div>
  )
}
