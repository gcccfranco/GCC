import { Suspense } from "react"
import { ModifierClient } from "./ModifierClient"

// Back-Office › Évènements › modifier (lot U6, B3).
export default function ModifierEvenementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ModifierClient />
    </Suspense>
  )
}
