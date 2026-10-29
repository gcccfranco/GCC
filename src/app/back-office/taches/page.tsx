import { redirect } from "next/navigation";

// Les tâches vivent dans la page de chaque équipe (piste A, BO7).
export default function TachesPage() {
  redirect("/back-office/equipes");
}
