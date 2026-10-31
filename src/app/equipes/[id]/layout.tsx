import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";
import { RequireAuth } from "@/components/auth/RequireAuth";

// Page d'une équipe dans l'app (piste A, BO4) : back-office coupé (lot 18), la route répond 404, comme
// /equipes ; ce gabarit serveur le décide, la page est un composant client.
export default function EquipeLayout({ children }: { children: React.ReactNode }) {
  if (!BACK_OFFICE) notFound();
  return (
    <RequireAuth>
      <Suspense fallback={null}>{children}</Suspense>
    </RequireAuth>
  );
}
