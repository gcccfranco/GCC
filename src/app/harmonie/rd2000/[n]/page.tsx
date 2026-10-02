import { Suspense } from "react";
import { SonClient } from "./SonClient";

export default function SonPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SonClient />
    </Suspense>
  );
}
