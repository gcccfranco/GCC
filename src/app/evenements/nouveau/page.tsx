import { redirect } from "next/navigation"

// Lot U6, B3 (Q4) : créer et dupliquer passent au Back-Office ; l'ancienne adresse y mène,
// `?from=` compris. Interrupteur coupé, le gabarit `evenements/layout.tsx` répond 404 avant.
export default async function AncienNouveau({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { from } = await searchParams
  redirect(typeof from === "string" ? `/back-office/evenements/nouveau?from=${encodeURIComponent(from)}` : "/back-office/evenements/nouveau")
}
