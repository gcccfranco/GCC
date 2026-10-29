"use client"

// `/evenements/scene` → `/evenements/scene/{fete}` (Q9) : la fête dont l'édition courante a le
// jour J le plus proche d'aujourd'hui (le jour J du document, sinon celui par défaut, Q3). Même
// chose au Back-Office (P7) : `base` = `/back-office/evenements/scene`.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { listProgrammes } from "@/lib/firebase/programmes"
import { todayIso } from "@/lib/scene/dimanches"
import { editionCourante, FETES, jourJParDefaut, type Fete } from "@/lib/scene/fetes"
import type { Programme } from "@/types/programme"

function feteLaPlusProche(programmes: Programme[], today: string): Fete {
  const ecart = (f: Fete) => {
    const e = editionCourante(f, programmes, today)
    const jourJ = e.programme?.jourJ ?? jourJParDefaut(f, e.annee)
    return Math.abs(Date.parse(jourJ) - Date.parse(today))
  }
  return FETES.reduce((m, f) => (ecart(f) < ecart(m) ? f : m))
}

export function VersLaFete({ base = "/evenements/scene" }: { base?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  useEffect(() => {
    let fini = false
    listProgrammes()
      .catch(() => [] as Programme[])
      .then((programmes) => { if (!fini) router.replace(`${base}/${feteLaPlusProche(programmes, todayIso())}`) })
    return () => { fini = true }
  }, [router, base])
  return <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("common.loading")}</p>
}
