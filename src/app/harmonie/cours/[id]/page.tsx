import { Suspense } from "react";
import { ChapitreClient } from "./ChapitreClient";

export default function ChapitrePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ChapitreClient />
    </Suspense>
  );
}
