"use client";

// Une leçon du cours d'Harmonie : la page de l'adresse. La liste du cours, l'accès et les
// coches viennent du layout (lot U4 bis, B3) ; la leçon elle-même : `ChapitreHarmonie`.

import { useParams } from "next/navigation";
import { ChapitreHarmonie } from "@/components/harmonie/cours/ChapitreHarmonie";

export function ChapitreClient() {
  const params = useParams<{ id: string }>();
  return <ChapitreHarmonie id={decodeURIComponent(params.id)} />;
}
