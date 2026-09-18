import { RequireAuth } from "@/components/auth/RequireAuth";
import { EquipesClient } from "./EquipesClient";

// Organigramme (lot 16, docs/spec-organigramme.md) : les 13 équipes et la vue
// d'ensemble des musiciens, pour tout membre connecté.

export default function EquipesPage() {
  return (
    <RequireAuth>
      <EquipesClient />
    </RequireAuth>
  );
}
