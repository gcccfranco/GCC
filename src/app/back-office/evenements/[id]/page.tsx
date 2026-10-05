import { Suspense } from "react"
import { EvenementClient } from "@/app/evenements/[id]/EvenementClient"

// Back-Office › Évènements › fiche de gestion (lot U6, B3) : Modifier, Dupliquer, Supprimer ;
// pour une réunion, l'en-tête et les cartes de la planche bo-reunion-avant.
export default function FicheGestionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EvenementClient espace="back-office" />
    </Suspense>
  )
}
