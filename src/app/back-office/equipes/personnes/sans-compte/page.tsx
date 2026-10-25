"use client";

// Équipes › Personnes › Noms du planning sans compte (piste A, BO7) : l'ancienne page Planning › Sans
// compte, ouverte par un lien de l'en-tête de Personnes. Page à part : en grand, Personnes tient dans
// la fenêtre (deux volets, R3), une section dessous la ferait défiler. Admins seuls.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { SansCompte } from "@/components/admin/SansCompte";
import { ReserveAuxAdmins } from "@/components/admin/commun";
import { RailEquipes } from "../../RailEquipes";

export default function Page() {
  const { t } = useTranslation();
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/personnes/sans-compte" />;
  return (
    <>
      <EnTetePage
        retour={{ href: "/back-office/equipes/personnes", label: t("backOffice.parties.personnes") }}
        titre={t("backOffice.entrees.equipes")}
        onglets={<RailEquipes />}
      />
      <section aria-labelledby="personnes-sans-compte" className="px-[var(--marge-page)] pb-16">
        <h2 id="personnes-sans-compte" className="mb-3 text-[17px] font-semibold text-foreground">{t("backOffice.equipe.sansCompte")}</h2>
        <div className="max-w-[760px]">
          <SansCompte />
        </div>
      </section>
    </>
  );
}
