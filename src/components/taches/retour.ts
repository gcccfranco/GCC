import type { TFunction } from "i18next";
import { cleNomEquipe } from "@/lib/equipes/table";
import type { RetourFait } from "@/lib/taches/prevenir";
import type { Tache } from "@/types/tache";

/** Ce que voit la personne qui coche : qui a été prévenu, ou que personne ne
 *  l'a été faute de compte (comme la notification au président, lot 2). */
export function texteRetour(t: TFunction, retour: RetourFait | null, tache: Tache): string {
  if (!retour || !tache.prevenir) return "";
  if (retour.cible === "equipe" && "equipe" in tache.prevenir && retour.notified > 0) {
    return t("taches.equipePrevenue", { equipe: t(cleNomEquipe(tache.prevenir.equipe)) });
  }
  if (retour.cible === "regie") {
    if (retour.notified > 0) return t("taches.regiePrevenue");
    if (!retour.linked) return t("taches.personnePrevenue");
  }
  return "";
}
