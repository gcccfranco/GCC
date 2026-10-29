import { redirect } from "next/navigation";

// « Sans compte » est passé dans Équipes › Personnes (piste A, BO7).
export default function Page() {
  redirect("/back-office/equipes/personnes/sans-compte");
}
