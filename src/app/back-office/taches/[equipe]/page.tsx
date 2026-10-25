import { redirect } from "next/navigation";

// La liste d'une équipe est devenue sa page (piste A, BO7).
export default async function TachesEquipePage({ params }: { params: Promise<{ equipe: string }> }) {
  const { equipe } = await params;
  redirect(`/back-office/equipes/${encodeURIComponent(equipe)}`);
}
