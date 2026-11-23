"use client"

// AS15 (lot AS, T8) : « Des personnes… » dans « Pour qui » : les comptes (profils `users/{uid}`, lisibles par tout connecté,
// RS10), recherche locale par nom ; les choisies en pastilles (un clic décoche), 20 au plus. Modèle : la recherche de
// `PartagerMaPartition`.
import { useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Pastille } from "@/components/salles/Pastille"
import { Input } from "@/components/ui/input"
import { listProfiles } from "@/lib/firebase/users"
import { normalizeName } from "@/lib/planning/names"
import { nomCourt } from "@/lib/setlist/partage"

export type Personne = { uid: string; nom: string }

export function ChoixPersonnes({ value, onChange }: { value: Personne[]; onChange: (v: Personne[]) => void }) {
  const { t } = useTranslation()
  const id = useId()
  // null : la liste se charge ; false : son chargement a échoué (« Réessayer »).
  const [profils, setProfils] = useState<Personne[] | null | false>(null)
  const [essai, setEssai] = useState(0)
  const [recherche, setRecherche] = useState("")
  useEffect(() => {
    let vivant = true
    listProfiles()
      .then((l) => vivant && setProfils(l.map((p) => ({ uid: p.uid, nom: nomCourt(p).slice(0, 60) })).filter((p) => p.nom)))
      .catch(() => vivant && setProfils(false))
    return () => { vivant = false }
  }, [essai])
  const q = normalizeName(recherche)
  const trouves = q && profils ? profils.filter((p) => !value.some((v) => v.uid === p.uid) && normalizeName(p.nom).includes(q)).slice(0, 8) : []
  const plein = value.length >= 20
  // Les résultats apparaissent sous le champ : on les amène au-dessus du pied collant de la feuille (scroll-mb-32).
  const listeRef = useRef<HTMLUListElement>(null)
  useEffect(() => { if (trouves.length > 0) listeRef.current?.scrollIntoView({ block: "nearest" }) }, [trouves.length])

  return (
    <div data-personnes className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p) => <Pastille key={p.uid} type="checkbox" name={`${id}-choisies`} label={p.nom} checked onChange={() => onChange(value.filter((v) => v.uid !== p.uid))} />)}
        </div>
      )}
      <Input type="search" className="h-11 scroll-mb-32 [&::-webkit-search-cancel-button]:hidden" value={recherche} onChange={(e) => setRecherche(e.target.value)}
        // Entrée (ou « Rechercher » du clavier du téléphone) cherche, n'envoie pas la feuille.
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }} aria-label={t("salles.feuille.chercherPersonne")} placeholder={t("salles.feuille.chercherPersonne")} />
      {trouves.length > 0 && (
        <ul ref={listeRef} className="carte-groupe scroll-mb-32 divide-y divide-border/60 overflow-hidden border border-border/60">
          {trouves.map((p) => (
            <li key={p.uid}>
              <label className={`flex min-h-11 items-center gap-3 px-4 ${plein ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer hover:bg-secondary/60"}`}>
                <input type="checkbox" name={`${id}-trouvees`} checked={false} disabled={plein} onChange={() => onChange([...value, p])} className="h-4 w-4 shrink-0 accent-[hsl(var(--foreground))]" />
                {p.nom}
              </label>
            </li>
          ))}
        </ul>
      )}
      {profils === false ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          {t("salles.feuille.personnesEchec")}
          <button type="button" className="min-h-11 font-semibold underline underline-offset-2" onClick={() => { setProfils(null); setEssai((n) => n + 1) }}>{t("common.retry")}</button>
        </p>
      ) : q && profils === null ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : q && trouves.length === 0 && <p className="text-sm text-muted-foreground">{t("maPartition.partage.personne")}</p>}
    </div>
  )
}
