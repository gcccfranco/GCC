import { notFound } from "next/navigation"
import { EvenementsTabs } from "@/components/evenements/EvenementsTabs"
import { BACK_OFFICE } from "@/lib/backOffice"
import { PullToRefresh } from "@/components/layout/PullToRefresh"

// Section « Évènements » de l'app GCC : le calendrier (/evenements) se lit sans
// compte ; le programme de scène (/evenements/scene) protège sa propre page.
export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  // Back-office coupé (lot 18) : toute la section répond 404, fiches et scène comprises.
  if (!BACK_OFFICE) notFound()
  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh />
      <EvenementsTabs />
      <main className="max-w-[1080px] mx-auto px-4 py-6 pb-16">
        {children}
      </main>
    </div>
  )
}
