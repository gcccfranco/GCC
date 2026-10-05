import { notFound } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";
import { EspaceBackOffice } from "./EspaceBackOffice";

// Lot U6 (docs/spec-back-office.md, B1) : l'espace Back-Office. Interrupteur coupé (lot 18),
// aucune adresse `/back-office/…` ne répond ; sinon, réservé aux responsables.
export default function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  if (!BACK_OFFICE) notFound();
  return <EspaceBackOffice>{children}</EspaceBackOffice>;
}
