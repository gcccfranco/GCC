import { Suspense } from "react";
import { EditSetlistClient } from "./EditSetlistClient";

export default function EditSetlistPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EditSetlistClient />
    </Suspense>
  );
}
