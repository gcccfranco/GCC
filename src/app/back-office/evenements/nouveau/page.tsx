import { Suspense } from "react"
import { NouveauClient } from "./NouveauClient"

// Back-Office › Évènements › nouveau (lot U6, B3) : créer, ou dupliquer (`?from=`).
export default function NouveauEvenementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <NouveauClient />
    </Suspense>
  )
}
