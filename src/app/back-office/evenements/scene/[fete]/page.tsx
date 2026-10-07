import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FETES, type Fete } from "@/lib/scene/fetes";
import { FeteGestion } from "../FeteGestion";

// Back-Office › Évènements › Pâques ou Noël (docs/spec-scene-paques-noel.md, P7, Q9) :
// `/back-office/evenements/scene/paques` et `…/noel` ; une autre fête n'existe pas (404 avant tout
// rendu : sous le layout client de la section, un `notFound()` de la page répondrait 200).
export const dynamicParams = false;
export function generateStaticParams() {
  return FETES.map((fete) => ({ fete }));
}

export default async function FeteGestionPage({ params }: { params: Promise<{ fete: string }> }) {
  const { fete } = await params;
  if (!(FETES as readonly string[]).includes(fete)) notFound();
  return (
    <Suspense fallback={null}>
      <FeteGestion fete={fete as Fete} />
    </Suspense>
  );
}
