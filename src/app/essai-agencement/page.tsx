import { notFound } from "next/navigation";
import { EssaiAgencement } from "./EssaiAgencement";

// Page d'essai des composants communs de l'agencement v18 (tranche F1, docs/spec-agencement-v18.md) :
// lue par tests/agencement-v18-fondations.spec.ts. Servie en développement seulement (`next dev`,
// les serveurs de test) : 404 en production, elle n'est jamais en ligne.
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <EssaiAgencement />;
}
