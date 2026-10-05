"use client";

// Widget 5 « Setlists à préparer » (lot U6, B4) : les séances de ses services sans setlist
// publiée, sur 2 ou 4 semaines ; chacune ouvre l'éditeur prérempli (« Préparer », U5 bis).
import { useTranslation } from "react-i18next";
import { ListMusic } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { getAnnee } from "@/lib/planning/utils";
import { todayIso } from "@/lib/scene/dimanches";
import { categoryColor, categoryLabel } from "@/lib/serviceColors";
import { lienPreparer, prochainsServicesSansSetlist } from "@/lib/setlist/prochainsServices";
import { addDays } from "@/lib/taches/echeances";
import { GRILLES_DU_SERVICE, seancesDesServices, servicesSetlists } from "@/lib/tableauDeBord/donnees";
import { lireGrilles, lireSetlists, useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rangee, jourCourt } from "./Cadre";

export function WidgetSetlists({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const services = servicesSetlists(widget.reglages, user, profile);
  const jours = 7 * (widget.reglages.horizon ?? 4);
  const today = todayIso();
  const { valeur, erreur } = useLecture(async () => {
    const [rows, setlists] = await Promise.all([
      lireGrilles(services.flatMap((s) => GRILLES_DU_SERVICE[s].map((g) => g.key))), lireSetlists(today),
    ]);
    const annees = [getAnnee(today), getAnnee(addDays(today, jours - 1))];
    return prochainsServicesSansSetlist(seancesDesServices(rows, services, annees), setlists, services, today, jours);
  }, `${today}|${jours}|${services.join()}`);

  return (
    <CadreWidget id="setlists" taille={widget.taille} Icone={ListMusic} nom={t("tableauDeBord.widgets.setlists")}>
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : valeur.length === 0 ? <Message>{t("tableauDeBord.setlists.rien")}</Message>
        : (
          <div>
            {valeur.map((s) => (
              <Rangee
                key={`${s.category}-${s.date}-${s.moment ?? ""}`} testId="ligne-setlist" href={lienPreparer(s)}
                detail={t("tableauDeBord.setlists.aucune")} ton="warn"
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryColor(s.category) }} />
                  <span className="min-w-0">
                    {[categoryLabel(s.category), s.moment && t(`planning.campus.${s.moment === "soir" ? "evening" : "morning"}`), jourCourt(s.date, i18n.language)]
                      .filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Rangee>
            ))}
          </div>
        )}
    </CadreWidget>
  );
}
