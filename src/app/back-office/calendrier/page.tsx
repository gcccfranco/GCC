import { Suspense } from "react";
import { CalendrierClient } from "./CalendrierClient";

// Lot U8 (docs/spec-calendrier.md) : `/back-office/calendrier`, sous le gabarit de U6
// (404 interrupteur coupé, « Réservé aux responsables »). `?jour=` (C8) se lit dans le
// client, d'où la frontière Suspense.
export default function CalendrierPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <CalendrierClient />
    </Suspense>
  );
}
