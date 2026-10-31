import { notFound } from "next/navigation";
import { PageEquipe } from "./PageEquipe";
import { EQUIPES } from "@/lib/equipes/table";
import { COMITES } from "@/lib/groupes/table";

// Page d'une équipe pour un simple membre (BO4) : `/equipes/<id>`, sans les actions de responsable ;
// un id qui n'est pas une équipe répond 404.
// Les ids sont ceux de la table : un autre répond 404 dès le routage (un `notFound()` dans la page
// arrive après l'envoi de l'en-tête, sous les frontières Suspense des gabarits, et sortirait en 200).
export const dynamicParams = false;
export function generateStaticParams() {
  return [...EQUIPES.map((e) => e.id), ...COMITES].map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!EQUIPES.some((e) => e.id === id) && !COMITES.includes(id)) notFound();
  return <PageEquipe id={id} backOffice={false} />;
}
