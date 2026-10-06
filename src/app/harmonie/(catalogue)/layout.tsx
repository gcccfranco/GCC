import { RequireAuth } from "@/components/auth/RequireAuth";
import { HarmonieCatalogue } from "@/components/harmonie/Catalogue";

// Harmonie (lot U4 bis, B3, docs/spec-pages-en-grand.md, Q2 et Q6) : le catalogue vit ici,
// monté d'une fiche à l'autre (filtres gardés) ; la fiche est la page de l'adresse. Le cours
// et les sons du RD-2000 ont leur propre layout : le groupe `(catalogue)` les en tient à part.
export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <HarmonieCatalogue>{children}</HarmonieCatalogue>
    </RequireAuth>
  );
}
