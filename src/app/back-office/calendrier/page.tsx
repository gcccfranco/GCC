import { CalendrierClient } from "./CalendrierClient";

// Lot U8 (docs/spec-calendrier.md) : `/back-office/calendrier`, sous le gabarit de U6
// (404 interrupteur coupé, « Réservé aux responsables »). Cette adresse fixe l'emporte
// sur la page d'attente `[entree]`.
export default function CalendrierPage() {
  return <CalendrierClient />;
}
