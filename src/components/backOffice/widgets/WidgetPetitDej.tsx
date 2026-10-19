"use client";

// Widget 6 « Petit déj » (lot U6, B4) : sur 4 ou 8 dimanches, les équipes inscrites (U3) ou
// « Libre ». Une lecture en échec n'est jamais « Libre » (U3, Q10).
import { useTranslation } from "react-i18next";
import { Coffee } from "lucide-react";
import { lirePetitDej } from "@/lib/petitdej/lignes";
import { todayIso } from "@/lib/scene/dimanches";
import { petitDejAVenir, prochainsDimanches } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rangee, jourCourt } from "./Cadre";

export function WidgetPetitDej({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const dimanches = prochainsDimanches(todayIso(), widget.reglages.horizon ?? 4);
  const { valeur, erreur } = useLecture(async () => petitDejAVenir(await lirePetitDej(), dimanches), dimanches.join());

  return (
    <CadreWidget id="petitdej" taille={widget.taille} Icone={Coffee} nom={t("tableauDeBord.widgets.petitdej")}>
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : (
          <div>
            {valeur.map((d) => (
              <Rangee
                key={d.date} testId="ligne-petitdej"
                detail={d.noms || t("tableauDeBord.petitdej.libre")} ton={d.noms ? undefined : "warn"}
              >
                <b className="font-semibold">{jourCourt(d.date, i18n.language)}</b>
              </Rangee>
            ))}
          </div>
        )}
    </CadreWidget>
  );
}
