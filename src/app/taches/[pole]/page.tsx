import { redirect } from "next/navigation";

// Lot U6, B3 (Q4) : la page d'un pôle est rangée dans Back-Office › Tâches ; l'ancienne
// adresse (liens de notifications déjà envoyés) y mène. Interrupteur coupé, le gabarit
// `taches/layout.tsx` répond 404 avant.
export default async function AncienPole({ params }: { params: Promise<{ pole: string }> }) {
  const { pole } = await params;
  redirect(`/back-office/taches/${encodeURIComponent(pole)}`);
}
