import { Suspense } from "react";
import { SectionMesServices } from "@/components/mesServices/SectionMesServices";

// Mes services (lot U4 bis, B4, Q2 et Q7) : la liste vit ici, le service est la page de
// l'adresse (`/mes-services/[date]`). La section lit `?service=` : Suspense pour le rendu statique.
export default function MesServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SectionMesServices>{children}</SectionMesServices>
    </Suspense>
  );
}
