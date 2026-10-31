"use client";

// Une fiche du catalogue « Harmonie » (lot 9, H1) : la page de l'adresse. Le catalogue, l'accès
// et l'instrument viennent du layout (lot U4 bis, B3) ; la fiche elle-même : `FicheHarmonie`.

import { useParams } from "next/navigation";
import { FicheHarmonie } from "@/components/harmonie/FicheHarmonie";

export function FicheClient() {
  const params = useParams<{ fiche: string[] }>();
  const id = (Array.isArray(params.fiche) ? params.fiche : [params.fiche]).filter(Boolean).map(decodeURIComponent).join("/");
  return <FicheHarmonie id={id} />;
}
