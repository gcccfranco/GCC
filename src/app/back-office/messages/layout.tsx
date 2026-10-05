"use client";

// Back-Office › Messages (lot U6, B2, table Q3) : Réception et Questionnaire pour les
// admins, Notifier pour qui a le droit `notify`. Le menu règle l'affichage seulement :
// chaque bloc garde sa règle (reports, songProposals, surveys : admins ; notify-audience).
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { EnTeteEntree, type SousPartie } from "@/components/backOffice/EnTeteEntree";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const admin = isAdminUser(user);
  const notifier = admin || (profile?.notify?.length ?? 0) > 0;
  const parties: SousPartie[] = [
    ...(admin ? [{ href: "/back-office/messages", label: t("backOffice.parties.reception") }] : []),
    ...(notifier ? [{ href: "/back-office/messages/notifier", label: t("backOffice.parties.notifier") }] : []),
    ...(admin ? [{ href: "/back-office/messages/questionnaire", label: t("backOffice.parties.questionnaire") }] : []),
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10">
      <EnTeteEntree titre={t("backOffice.entrees.messages")} sousParties={parties} />
      {children}
    </div>
  );
}
