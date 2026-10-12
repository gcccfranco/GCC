"use client";

// Fiche d'une tâche au Back-Office (agencement v18, B1) : `/back-office/taches/[equipe]/[id]`, avec
// `?date=` pour une tâche répétée (laquelle de ses fois). La même fiche que dans l'App (`FicheTache`),
// en mode Back-Office par le layout.

import { useParams, useSearchParams } from "next/navigation";
import { FicheTache } from "@/components/taches/FicheTache";

export default function TachePage() {
  const { equipe, id } = useParams<{ equipe: string; id: string }>();
  return <FicheTache equipe={equipe} id={id} date={useSearchParams().get("date")} />;
}
