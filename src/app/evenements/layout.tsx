import { notFound } from "next/navigation"
import { BACK_OFFICE } from "@/lib/backOffice"
import { PullToRefresh } from "@/components/layout/PullToRefresh"
import { SectionEvenements } from "./SectionEvenements"

// Section « Évènements » de l'app GCC : le calendrier (/evenements) se lit sans
// compte ; le programme de scène (/evenements/scene) protège sa propre page.
// Lot U4 bis, B2 : l'agenda vit ici (deux volets en grand), la fiche est la page de l'adresse.
export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  // Back-office coupé (lot 18) : toute la section répond 404, fiches et scène comprises.
  if (!BACK_OFFICE) notFound()
  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh />
      <SectionEvenements>{children}</SectionEvenements>
    </div>
  )
}
