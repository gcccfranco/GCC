import { Suspense } from "react"
import { NouveauClient } from "@/app/back-office/evenements/nouveau/NouveauClient"

// Back-Office › Réunions › nouvelle (agencement v18, B15) : créer une réunion, ou dupliquer
// la précédente (`?from=`) ; seuls les publics de réunion sont proposés.
export default function NouvelleReunionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <NouveauClient reunion />
    </Suspense>
  )
}
