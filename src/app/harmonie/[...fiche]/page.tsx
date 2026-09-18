import { Suspense } from "react";
import { FicheClient } from "./FicheClient";

export default function FichePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <FicheClient />
    </Suspense>
  );
}
