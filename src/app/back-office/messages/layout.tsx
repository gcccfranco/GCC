"use client";

// Back-Office › Messages (lot U6, B2, table Q3) : Réception et Questionnaire pour les
// admins, Notifier pour qui a le droit `notify`. Le menu règle l'affichage seulement :
// chaque bloc garde sa règle (reports, songProposals, surveys : admins ; notify-audience).
// Agencement v18 (B10 à B12 de docs/spec-agencement-v18.md) : un seul en-tête pour les trois
// onglets (`EnTetePage`, le titre ne bouge plus), puis la page sur toute la zone.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail, type OngletRail } from "@/components/layout/Onglets";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const admin = isAdminUser(user);
  const notifier = admin || (profile?.notify?.length ?? 0) > 0;
  const onglets: OngletRail[] = [
    ...(admin ? [{ id: "reception", href: "/back-office/messages", label: t("backOffice.parties.reception") }] : []),
    ...(notifier ? [{ id: "notifier", href: "/back-office/messages/notifier", label: t("backOffice.parties.notifier") }] : []),
    ...(admin ? [{ id: "questionnaire", href: "/back-office/messages/questionnaire", label: t("backOffice.parties.questionnaire") }] : []),
  ];

  return (
    <>
      <EnTetePage
        titre={t("backOffice.entrees.messages")}
        sousTitre={t("backOffice.reception.sousTitreSection")}
        onglets={onglets.length > 1 ? <OngletsRail etiquette={t("backOffice.entrees.messages")} onglets={onglets} /> : undefined}
      />
      {children}
    </>
  );
}
