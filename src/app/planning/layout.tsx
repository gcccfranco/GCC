"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { label: "Accueil", href: "/planning" },
  { label: "Culte Franco", href: "/planning/culte" },
  { label: "Prépa. Table", href: "/planning/table" },
  { label: "Groupes", href: "/planning/groupes" },
  { label: "EDD", href: "/planning/edd" },
  { label: "Campus", href: "/planning/campus" },
]

function PlanningTabs() {
  const pathname = usePathname() || ""
  return (
    <div className="sticky top-[57px] z-40 border-b border-border bg-background/95 backdrop-blur-md print:hidden">
      <div className="max-w-[1080px] mx-auto px-4">
        <nav className="flex overflow-x-auto gap-0 scrollbar-none -mb-px">
          {TABS.map(tab => {
            const isActive = tab.href === "/planning"
              ? pathname === "/planning" || pathname === "/planning/"
              : pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-shrink-0 px-4 py-3 text-[12.5px] font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default function PlanningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PlanningTabs />
      <main className="max-w-[1080px] mx-auto px-4 py-6 pb-16">
        {children}
      </main>
    </div>
  )
}
