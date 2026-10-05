"use client"

import { usePathname } from "next/navigation"
import { EvenementsTabs } from "@/components/evenements/EvenementsTabs"
import { CalendrierClient } from "./CalendrierClient"

// La section Évènements (lot U4 bis, B2) : l'agenda et ses fiches passent par le calendrier
// (deux volets en grand, `CalendrierClient`) ; le programme de scène garde sa page, sous ses onglets.
export function SectionEvenements({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  if (pathname.startsWith("/evenements/scene")) {
    return (
      <>
        <EvenementsTabs />
        <main className="max-w-[1080px] mx-auto px-4 py-6 pb-16">{children}</main>
      </>
    )
  }
  return <CalendrierClient>{children}</CalendrierClient>
}
