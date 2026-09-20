import { Suspense } from "react"
import { CalendrierClient } from "./CalendrierClient"

export default function EvenementsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CalendrierClient />
    </Suspense>
  )
}
