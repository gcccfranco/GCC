import { Suspense } from "react"
import { notFound } from "next/navigation"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { FETES, type Fete } from "@/lib/scene/fetes"
import { FeteClient } from "../FeteClient"

// Pâques · Noël (Q9, P4) : `/evenements/scene/paques` et `/evenements/scene/noel` ; une autre
// fête n'existe pas.
export default async function FetePage({ params }: { params: Promise<{ fete: string }> }) {
  const { fete } = await params
  if (!(FETES as readonly string[]).includes(fete)) notFound()
  return (
    <RequireAuth>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <FeteClient fete={fete as Fete} />
      </Suspense>
    </RequireAuth>
  )
}
