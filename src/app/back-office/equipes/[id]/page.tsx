import { notFound } from "next/navigation";
import { PageEquipe } from "@/app/equipes/[id]/PageEquipe";
import { EQUIPES } from "@/lib/equipes/table";
import { COMITES } from "@/lib/groupes/table";

// Back-Office › Équipes › une équipe (piste A, BO7) : Tâches, Réunions, Membres. `personnes/` est une route
// statique, elle gagne sur ce segment ; un id qui n'est pas une équipe répond 404.
// Les ids sont ceux de la table : un autre répond 404 dès le routage (un `notFound()` dans la page
// arrive après l'envoi de l'en-tête, sous les frontières Suspense des gabarits, et sortirait en 200).
export const dynamicParams = false;
export function generateStaticParams() {
  return [...EQUIPES.map((e) => e.id), ...COMITES].map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!EQUIPES.some((e) => e.id === id) && !COMITES.includes(id)) notFound();
  return <PageEquipe id={id} backOffice />;
}
