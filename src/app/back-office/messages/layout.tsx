"use client";

// Back-Office › Messages (lot U6, B2, table Q3) : Réception et Questionnaire pour les
// admins, Notifier pour qui a le droit `notify`. Le menu règle l'affichage seulement :
// chaque bloc garde sa règle (reports, songProposals, surveys : admins ; notify-audience).
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { EnTeteEntree, type SousPartie } from "@/components/backOffice/EnTeteEntree";
import { useDisposition } from "@/hooks/useDisposition";

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

  const entete = <EnTeteEntree titre={t("backOffice.entrees.messages")} sousParties={parties} />;
  // Réception (U4 bis, B7, Q15) : en grand, l'en-tête sur toute la largeur au-dessus des deux
  // volets, qui descendent jusqu'en bas ; tablette portrait, les deux cartes sur la largeur.
  // Notifier et Questionnaire gardent leur colonne.
  const disposition = useDisposition();
  const chemin = (usePathname() || "").replace(/\/$/, "");
  const reception = admin && chemin === "/back-office/messages";
  if (reception && disposition === "grand")
    return (
      <div className="flex min-h-[calc(100dvh-var(--nav-h))] flex-col">
        <div className="border-b border-border px-6 pt-5 xl:px-7">{entete}</div>
        {children}
      </div>
    );

  return (
    <div className={reception && disposition === "tablette" ? "px-6 pt-6 pb-10" : "max-w-2xl mx-auto px-4 pt-6 pb-10"}>
      {entete}
      {children}
    </div>
  );
}
