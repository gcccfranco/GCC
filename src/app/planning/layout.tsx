import { PlanningTabs } from "@/components/planning/PlanningTabs"
import { PlanningHalo } from "@/components/planning/PlanningHalo"
import { PullToRefresh } from "@/components/layout/PullToRefresh"
import { RequireAuth } from "@/components/auth/RequireAuth"

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="relative min-h-screen bg-background">
        <PullToRefresh />
        <PlanningHalo />
        <PlanningTabs />
        {/* Toute la zone de contenu (retours du 06/10/2026) : sur grand écran, l'accueil est en deux
            colonnes et les plannings sont des grilles ; une borne centrée laissait une bande vide
            à côté de la barre latérale. Téléphone et tablette debout n'atteignent pas 1 080 px. */}
        <main className="relative px-4 py-6 pb-16">
          {children}
        </main>
      </div>
    </RequireAuth>
  )
}
