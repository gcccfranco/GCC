"use client";

// Ancienne adresse de Back-Office › Évènements › Réunions : les réunions ont leur entrée
// depuis l'agencement v18 (B15).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AncienneListeReunions() {
  const router = useRouter();
  useEffect(() => { router.replace("/back-office/reunions"); }, [router]);
  return null;
}
