import { Suspense } from "react"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { SceneClient } from "./SceneClient"

export default function ScenePage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <SceneClient />
      </Suspense>
    </RequireAuth>
  )
}
