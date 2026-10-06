import { Suspense } from "react"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { VersLaFete } from "./VersLaFete"

// Pâques · Noël (Q9) : l'ancienne adresse de la scène (calendrier, notifications) mène à la
// fête dont l'édition a le jour J le plus proche.
export default function ScenePage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <VersLaFete />
      </Suspense>
    </RequireAuth>
  )
}
