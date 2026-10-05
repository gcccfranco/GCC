"use client"

import { useState } from "react"
import { Send, EyeOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import { authHeader } from "@/lib/firebase/setlists"

// « Publier le T1 » / « Masquer le T1 » sur la page du planning (lot U2, Q4) :
// la route existante (/api/planning/release) avec l'année de la page. La
// première publication envoie une VRAIE notification : confirmation d'abord.

export function BoutonPublication({ planningKey, planningLabel, annee, tri, publie, onChange }: {
  planningKey: string
  planningLabel: string
  annee: number
  tri: string
  /** Le trimestre est-il déjà publié ? Oui : « Masquer » ; non : « Publier ». */
  publie: boolean
  onChange: (published: string[]) => void
}) {
  const { t } = useTranslation()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState("")

  async function agir() {
    const publish = !publie
    if (publish && !window.confirm(t("planning.publierConfirm", { tri, annee, planning: planningLabel }))) return
    setEnCours(true)
    setErreur("")
    try {
      const res = await fetch("/api/planning/release", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ key: planningKey, tri, publish, year: annee }),
      })
      const data = (await res.json().catch(() => ({}))) as { published?: string[]; error?: string }
      if (res.ok) onChange(data.published ?? [])
      else setErreur(data.error || t("planning.publierEchec"))
    } catch {
      setErreur(t("planning.publierEchec"))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <span className="inline-flex flex-col gap-1 max-sm:w-full">
      <button
        type="button"
        onClick={() => void agir()}
        disabled={enCours}
        className={`h-10 sm:h-9 px-4 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] cursor-pointer disabled:opacity-60 ${
          publie ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-foreground text-background"
        }`}
      >
        {publie ? <EyeOff className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        {t(publie ? "planning.masquer" : "planning.publier", { tri })}
      </button>
      {erreur && <span role="alert" className="text-xs text-destructive">{erreur}</span>}
    </span>
  )
}
