import { PlanningTabs } from "@/components/planning/PlanningTabs"
import { PullToRefresh } from "@/components/layout/PullToRefresh"
import { RequireAuth } from "@/components/auth/RequireAuth"

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <PullToRefresh />
        <PlanningTabs />
        <main className="max-w-[1080px] mx-auto px-4 py-6 pb-16">
          {children}
        </main>
      </div>
    </RequireAuth>
  )
}
