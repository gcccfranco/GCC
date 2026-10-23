"use client";

// Widget 9 « Comptes » (lot U6, B4, admins ; lot TB2-b, docs/spec-tableau-de-bord-v2.md T8) : deux nombres côte à
// côte, les noms du planning sans compte (comme l'administration) et les comptes créés cette semaine ; « Voir »
// mène à la liste des noms sans compte. Plus de liste de noms ni de réglage.
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { collectPlanningNames, loadPlanningData } from "@/lib/planning/names";
import { todayIso } from "@/lib/scene/dimanches";
import { nomsSansCompte, nouveauxComptes } from "@/lib/tableauDeBord/donnees";
import { lireProfils, useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, LienTete, Message } from "./Cadre";

export function WidgetComptes({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const today = todayIso();
  const { valeur, erreur } = useLecture(async () => {
    const [data, profiles] = await Promise.all([loadPlanningData(), lireProfils()]);
    return { sansCompte: nomsSansCompte(collectPlanningNames(data), profiles).length, nouveaux: nouveauxComptes(profiles, today).length };
  }, today);

  return (
    <CadreWidget
      id="comptes" taille={widget.taille} Icone={Users} nom={t("tableauDeBord.widgets.comptes")}
      complement={<LienTete href="/back-office/planning/sans-compte">{t("tableauDeBord.voir")}</LienTete>}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : (
          <div className="grid grid-cols-2 gap-3">
            <Nombre testId="compte-sans-compte" n={valeur.sansCompte} legende={t("tableauDeBord.comptes.sansCompte")} />
            <Nombre testId="compte-nouveaux" n={valeur.nouveaux} legende={t("tableauDeBord.comptes.nouveaux")} />
          </div>
        )}
    </CadreWidget>
  );
}

function Nombre({ testId, n, legende }: { testId: string; n: number; legende: string }) {
  return (
    <div data-testid={testId} className="min-w-0">
      <p className="text-[32px] font-semibold leading-none tabular-nums text-foreground">{n}</p>
      <p className="mt-1.5 break-words text-xs text-muted-foreground">{legende}</p>
    </div>
  );
}
