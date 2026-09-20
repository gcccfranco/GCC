import { notFound } from "next/navigation";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { BACK_OFFICE } from "@/lib/backOffice";
import { EquipesClient } from "./EquipesClient";

// Organigramme (lot 16, docs/spec-organigramme.md) : les 13 équipes et la vue
// d'ensemble des musiciens, pour tout membre connecté.

export default function EquipesPage() {
  // Back-office coupé (lot 18) : la page répond 404.
  if (!BACK_OFFICE) notFound();
  return (
    <RequireAuth>
      <EquipesClient />
    </RequireAuth>
  );
}
