import { Suspense } from "react"
import { ModifierClient } from "@/app/back-office/evenements/[id]/modifier/ModifierClient"

// Back-Office › Réunions › modifier (agencement v18, B15).
export default function ModifierReunionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ModifierClient />
    </Suspense>
  )
}
