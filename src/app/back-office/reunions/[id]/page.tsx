import { Suspense } from "react"
import { EvenementClient } from "@/app/evenements/[id]/EvenementClient"

// Back-Office › Réunions › fiche d'une réunion (agencement v18, B15) : la fiche de la planche
// bo-reunion-avant, telle qu'elle était sous Évènements. Un évènement repart sous Évènements.
export default function FicheReunionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EvenementClient espace="back-office" />
    </Suspense>
  )
}
