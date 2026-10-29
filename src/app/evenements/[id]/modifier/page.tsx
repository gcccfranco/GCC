import { redirect } from "next/navigation"

// Lot U6, B3 (Q4) : modifier passe au Back-Office ; l'ancienne adresse y mène.
// Interrupteur coupé, le gabarit `evenements/layout.tsx` répond 404 avant.
export default async function AncienModifier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/back-office/evenements/${encodeURIComponent(id)}/modifier`)
}
