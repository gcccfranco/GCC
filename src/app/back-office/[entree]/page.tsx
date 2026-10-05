import { notFound } from "next/navigation";
import type { Entree } from "@/types/backOffice";
import { EntreeEnAttente } from "./EntreeEnAttente";

// Lot U6, B1 : les entrées du menu dont l'écran n'est pas encore passé au Back-Office (B2, B3)
// mènent à l'écran d'aujourd'hui, sans page vide. Chaque tranche pose sa page à l'adresse
// fixe (`/back-office/taches/page.tsx`…), qui l'emporte sur celle-ci ; la dernière la retire.
// Le Calendrier (U8) a sa page ; Statistiques (U7) arrive avec son lot : d'ici là, 404.
const EN_ATTENTE: readonly Entree[] = ["planning", "taches", "evenements", "equipes", "messages"];

// Toute autre adresse répond 404 avant même le rendu (un `notFound()` dans la page arrive
// après l'envoi du gabarit : la page « introuvable » partirait avec un statut 200).
export const dynamicParams = false;
export function generateStaticParams() {
  return EN_ATTENTE.map((entree) => ({ entree }));
}

export default async function EntreePage({ params }: { params: Promise<{ entree: string }> }) {
  const { entree } = await params;
  if (!EN_ATTENTE.includes(entree as Entree)) notFound();
  return <EntreeEnAttente entree={entree as Entree} />;
}
