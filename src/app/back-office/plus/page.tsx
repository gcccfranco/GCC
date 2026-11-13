import { redirect } from "next/navigation";

// Piste A, BO2 : la page « Plus » n'existe plus (la barre du bas a cinq onglets fixes) ; son adresse
// ramène au Back-Office. Interrupteur coupé : le gabarit de l'espace répond 404 avant.
export default function PlusPage() {
  redirect("/back-office");
}
