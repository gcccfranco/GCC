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
        {/* Agencement v18 (A1, A2, R6) : l'en-tête « Planning » et les plannings, au-dessus de toute
            page de la section ; puis toute la zone de contenu, à la marge de la zone. */}
        <PlanningTabs />
        <main className="relative px-[var(--marge-page)] pb-16">
          {children}
        </main>
      </div>
    </RequireAuth>
  )
}
