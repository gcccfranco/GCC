"use client";

// Équipes › Personnes › Noms du planning sans compte (piste A, BO7) : l'ancienne page Planning › Sans
// compte, ouverte par un lien de l'en-tête de Personnes. Page à part : en grand, Personnes tient dans
// la fenêtre (deux volets, R3), une section dessous la ferait défiler. Admins seuls.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { EnTetePage, Retour } from "@/components/layout/EnTetePage";
import { SansCompte } from "@/components/admin/SansCompte";
import { ReserveAuxAdmins } from "@/components/admin/commun";
import { RailEquipes } from "../../RailEquipes";

export default function Page() {
  const { t } = useTranslation();
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/personnes/sans-compte" />;
  return (
    <>
      <EnTetePage titre={t("backOffice.entrees.equipes")} onglets={<RailEquipes />} />
      {/* BO-G, 7 : le retour sous le titre de la section (l'onglet Personnes est actif), puis un seul titre, avec le compte. */}
      <section aria-labelledby="personnes-sans-compte" className="px-[var(--marge-page)] pb-16">
        <Retour href="/back-office/equipes/personnes">{t("backOffice.parties.personnes")}</Retour>
        <div className="max-w-[760px]">
          <SansCompte titreDePage />
        </div>
      </section>
    </>
  );
}
