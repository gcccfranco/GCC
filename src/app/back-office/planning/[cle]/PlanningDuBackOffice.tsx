"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { planningsDuBackOffice, type OngletPlanning } from "@/lib/access";
import CultePage from "@/app/planning/culte/page";
import TablePage from "@/app/planning/table/page";
import GroupesPage from "@/app/planning/groupes/page";
import EddPage from "@/app/planning/edd/page";
import CampusPage from "@/app/planning/campus/page";
import IntergroupePage from "@/app/planning/intergroupe/page";
import InterfrancoPage from "@/app/planning/interfranco/page";

// Les pages de l'App, rendues en gestion par la mise en page (GestionPlanning).
const PAGES: Record<OngletPlanning, React.ComponentType> = {
  culte: CultePage, table: TablePage, groupes: GroupesPage, edd: EddPage,
  campus: CampusPage, intergroupe: IntergroupePage, interfranco: InterfrancoPage,
};

/** Les plannings de la personne en pilules (planche bo-planning-2027), puis celui choisi.
 *  Un planning qu'elle ne remplit ni ne publie n'est pas ici : il se lit dans l'App. */
export function PlanningDuBackOffice({ cle }: { cle: OngletPlanning }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const siens = planningsDuBackOffice(user, profile);
  if (!siens.includes(cle)) return <p className="text-sm text-muted-foreground">{t("backOffice.planningReserve")}</p>;
  const Page = PAGES[cle];

  return (
    <div className="space-y-5">
      <nav aria-label={t("backOffice.plannings")} className="flex flex-wrap gap-1.5">
        {siens.map((k) => (
          <Link
            key={k}
            href={`/back-office/planning/${k}`}
            aria-current={k === cle ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
              k === cle ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`planning.tabs.${k}`)}
          </Link>
        ))}
      </nav>
      <Page />
    </div>
  );
}
