"use client";

// La page d'un son du RD-2000 (ou d'une recette) : la page de l'adresse. La liste, l'accès et
// le catalogue viennent du layout (lot U4 bis, B3) ; le son lui-même : `SonRd2000`.

import { useParams } from "next/navigation";
import { SonRd2000 } from "@/components/harmonie/rd2000/SonRd2000";

export function SonClient() {
  const params = useParams<{ n: string }>();
  return <SonRd2000 n={decodeURIComponent(params.n)} />;
}
