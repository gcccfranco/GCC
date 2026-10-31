"use client";

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

/** Le planning choisi. Les plannings de la personne sont en pilules dans la rangée de la grille
 *  (`BarreDeGrille`, agencement v18 B6). Un planning qu'elle ne remplit ni ne publie n'est pas
 *  ici : il se lit dans l'App. */
export function PlanningDuBackOffice({ cle }: { cle: OngletPlanning }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  if (!planningsDuBackOffice(user, profile).includes(cle)) return <p className="text-sm text-muted-foreground">{t("backOffice.planningReserve")}</p>;
  const Page = PAGES[cle];
  return <Page />;
}
