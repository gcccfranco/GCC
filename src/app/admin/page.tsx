import { redirect } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";
import { AncienneAdmin } from "./AncienneAdmin";

// Lot U6, B2 (Q4) : l'administration est rangée dans le Back-Office, bloc par bloc ;
// l'ancienne adresse mène au tableau de bord. Interrupteur coupé (en ligne), elle reste
// la page d'avant.
export default function AdminPage() {
  if (BACK_OFFICE) redirect("/back-office");
  return <AncienneAdmin />;
}
