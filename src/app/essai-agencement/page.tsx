import { notFound } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";
import { EssaiAgencement } from "./EssaiAgencement";

// Page d'essai des composants communs de l'agencement v18 (tranche F1, docs/spec-agencement-v18.md) :
// lue par tests/agencement-v18-fondations.spec.ts ; la tranche Z la retire. Servie en développement
// ET interrupteur du back-office ouvert seulement : 404 en production (en ligne) et sur le second
// serveur de test, « comme en ligne » (interrupteur coupé, tests/back-office-coupe.spec.ts).
export default function Page() {
  if (process.env.NODE_ENV === "production" || !BACK_OFFICE) notFound();
  return <EssaiAgencement />;
}
