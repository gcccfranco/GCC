import { redirect } from "next/navigation";

// Lot U6, B3 (Q4) : la page d'une équipe est rangée dans Back-Office › Tâches ; l'ancienne
// adresse (liens de notifications déjà envoyés, lien du Calendrier) y mène. Interrupteur coupé, le
// gabarit `taches/layout.tsx` répond 404 avant.
export default async function AncienneEquipe({ params }: { params: Promise<{ equipe: string }> }) {
  const { equipe } = await params;
  redirect(`/back-office/taches/${encodeURIComponent(equipe)}`);
}
