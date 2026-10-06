"use client";

// Fiche d'une tâche (lot U4 bis, B4, Q8) : `/taches/[pole]/[id]`, avec `?date=` pour une tâche
// répétée (laquelle de ses fois). Interrupteur coupé, le gabarit `taches/layout.tsx` répond 404.

import { useParams, useSearchParams } from "next/navigation";
import { FicheTache } from "@/components/taches/FicheTache";

export default function TachePage() {
  const { pole, id } = useParams<{ pole: string; id: string }>();
  return <FicheTache pole={pole} id={id} date={useSearchParams().get("date")} />;
}
