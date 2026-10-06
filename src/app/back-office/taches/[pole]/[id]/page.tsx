"use client";

// Fiche d'une tâche au Back-Office (agencement v18, B1) : `/back-office/taches/[pole]/[id]`, avec
// `?date=` pour une tâche répétée (laquelle de ses fois). La même fiche que dans l'App (`FicheTache`),
// en mode Back-Office par le layout.

import { useParams, useSearchParams } from "next/navigation";
import { FicheTache } from "@/components/taches/FicheTache";

export default function TachePage() {
  const { pole, id } = useParams<{ pole: string; id: string }>();
  return <FicheTache pole={pole} id={id} date={useSearchParams().get("date")} />;
}
