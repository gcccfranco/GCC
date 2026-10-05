import { ONGLETS_PLANNING, type OngletPlanning } from "@/lib/access";
import { PlanningDuBackOffice } from "./PlanningDuBackOffice";

// Un planning au Back-Office : `/back-office/planning/<onglet>` (Q4). Toute autre adresse
// répond 404 avant le rendu (même raison que `[entree]/page.tsx`).
export const dynamicParams = false;
export function generateStaticParams() {
  return ONGLETS_PLANNING.map((cle) => ({ cle }));
}

export default async function Page({ params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  return <PlanningDuBackOffice cle={cle as OngletPlanning} />;
}
