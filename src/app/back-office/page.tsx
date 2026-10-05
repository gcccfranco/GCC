"use client";

// Tableau de bord du Back-Office (lot U6). B1 : le titre et, sur téléphone et tablette en
// portrait, la liste des entrées permises — en attendant les widgets (B4) et la barre du
// bas du Back-Office (B6), qui la remplaceront. Sur grand écran, la barre latérale suffit.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { entreesBackOffice } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { entreesBarre } from "@/lib/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";

export default function TableauDeBordPage() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const jour = new Date().toLocaleDateString(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const jourAffiche = jour.charAt(0).toUpperCase() + jour.slice(1);
  const prenom = profile?.firstName?.trim();
  const entrees = entreesBarre("back-office", {
    connecte: !!user, backOffice: BACK_OFFICE, permises: entreesBackOffice(user, profile),
  }).filter((e) => e.href !== "/back-office");

  return (
    // Pleine largeur, comme la planche bo-tableau-de-bord (la grille de widgets de B4 s'y posera).
    <div className="px-4 pt-6 pb-10 space-y-6 sm:px-6 lg:px-8">
      <PageTitle
        title={t("backOffice.entrees.tableau")}
        subtitle={prenom ? t("backOffice.bonjour", { jour: jourAffiche, prenom }) : jourAffiche}
      />
      {entrees.length > 0 && (
        <div data-testid="menu-back-office" className="hide-on-desktop">
          <Group title={t("backOffice.menu")}>
            {entrees.map(({ href, cle, Icone }) => (
              <GroupRow key={href} href={href} leading={<Icone aria-hidden />} chevron>
                {t(cle)}
              </GroupRow>
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}
