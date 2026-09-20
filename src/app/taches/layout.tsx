import { notFound } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";

// Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : les pages des tâches
// sont des composants client, c'est donc ce gabarit serveur qui répond 404.
export default function TachesLayout({ children }: { children: React.ReactNode }) {
  if (!BACK_OFFICE) notFound();
  return children;
}
