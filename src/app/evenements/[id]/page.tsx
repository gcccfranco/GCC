import { Suspense } from "react"
import { EvenementClient } from "./EvenementClient"

export default function EvenementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EvenementClient />
    </Suspense>
  )
}
