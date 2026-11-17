import { notFound } from "next/navigation"
import { SALLES, type SalleId } from "@/lib/salles/salles"
import { JourneeSalle } from "../JourneeSalle"

// La journée d'une salle (SA4) : `/evenements/salles/grande`… ; une autre salle n'existe pas.
export default async function SallePage({ params }: { params: Promise<{ salle: string }> }) {
  const { salle } = await params
  if (!SALLES.some((s) => s.id === salle)) notFound()
  return <JourneeSalle salle={salle as SalleId} />
}
