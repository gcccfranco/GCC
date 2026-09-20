import { Suspense } from "react"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { NouveauClient } from "./NouveauClient"

export default function NouveauEvenementPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <NouveauClient />
      </Suspense>
    </RequireAuth>
  )
}
