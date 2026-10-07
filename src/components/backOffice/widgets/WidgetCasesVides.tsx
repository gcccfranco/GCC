"use client";

// Widget 4 « Cases vides du planning » (lot U6, B4) : sur 2, 4 ou 8 dimanches, les colonnes
// à remplir des plannings choisis (`casesVides`, repris par U8).
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { casesVides } from "@/lib/planning/casesVides";
import { grilleDe } from "@/lib/planning/grilles";
import { todayIso } from "@/lib/scene/dimanches";
import { planningsCasesVides, prochainsDimanches } from "@/lib/tableauDeBord/donnees";
import { lireGrilles, useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rangee, jourCourt } from "./Cadre";

export function WidgetCasesVides({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const plannings = planningsCasesVides(widget.reglages, user, profile);
  const dates = prochainsDimanches(todayIso(), widget.reglages.horizon ?? 4);
  const { valeur, erreur } = useLecture(async () => {
    const rows = await lireGrilles(plannings);
    return plannings.flatMap((k) => casesVides(grilleDe(k)!, rows[k] ?? [], dates).map((c) => ({ ...c, planning: grilleDe(k)!.label })));
  }, `${dates.join()}|${plannings.join()}`);

  return (
    <CadreWidget
      id="planning" taille={widget.taille} Icone={CalendarDays}
      nom={t("tableauDeBord.widgets.planning")} titre={t("tableauDeBord.planning.titre")}
    >
      {plannings.length === 0 ? <Message>{t("tableauDeBord.planning.aucun")}</Message>
        : erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : valeur.length === 0 ? <Message>{t("tableauDeBord.planning.rien")}</Message>
        : (
          <div>
            {valeur.map((c) => (
              <Rangee key={`${c.planning}-${c.date}`} testId="ligne-case-vide" detailLong detail={c.colonnes.map((col) => t(col.i18n)).join(", ")}>
                <b className="font-semibold">
                  {plannings.length > 1 ? `${c.planning} · ` : ""}{jourCourt(c.date, i18n.language)}
                </b>
              </Rangee>
            ))}
          </div>
        )}
    </CadreWidget>
  );
}
