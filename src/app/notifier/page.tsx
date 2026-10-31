import { redirect } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";
import { Notifier } from "@/components/messages/Notifier";
import { TitreNotifier } from "./TitreNotifier";

// Lot U6, B2 (Q4) : Notifier est rangé dans Messages › Notifier ; l'ancienne adresse y
// mène. Interrupteur coupé (en ligne), elle reste la page d'avant, avec « Publier ».
export default function NotifierPage() {
  if (BACK_OFFICE) redirect("/back-office/messages/notifier");
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-10">
        <Notifier
          titre={<TitreNotifier />}
        />
      </div>
    </div>
  );
}
