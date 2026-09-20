import { Suspense } from "react"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { ModifierClient } from "./ModifierClient"

export default function ModifierEvenementPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <ModifierClient />
      </Suspense>
    </RequireAuth>
  )
}
