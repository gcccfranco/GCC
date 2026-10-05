"use client";

// Widget 8 « Scène » (lot U6, B4) : les prochains créneaux du programme affiché (ou choisi).
import { useTranslation } from "react-i18next";
import { Drama } from "lucide-react";
import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { currentProgramme, todayIso } from "@/lib/scene/dimanches";
import { creneauxAVenir } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rangee, jourCourt } from "./Cadre";

export function WidgetScene({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const today = todayIso();
  const choisi = widget.reglages.programme;
  const { valeur, erreur } = useLecture(async () => {
    const programmes = await listProgrammes();
    const programme = programmes.find((p) => p.id === choisi) ?? currentProgramme(programmes, today);
    return { programme, creneaux: programme ? creneauxAVenir(await listCreneaux(programme.id), today, 3) : [] };
  }, `${today}|${choisi ?? ""}`);
  const nom = t("tableauDeBord.widgets.scene");

  return (
    <CadreWidget
      id="scene" taille={widget.taille} Icone={Drama} nom={nom}
      titre={valeur?.programme ? t("tableauDeBord.scene.titre", { nom: valeur.programme.nom }) : nom}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : !valeur.programme ? <Message>{t("tableauDeBord.scene.aucunProgramme")}</Message>
        : valeur.creneaux.length === 0 ? <Message>{t("tableauDeBord.scene.rien")}</Message>
        : (
          <div>
            {valeur.creneaux.map((c) => (
              <Rangee key={c.id} testId="ligne-creneau" detail={[c.quoi, ...(c.qui.length ? [c.qui.join(", ")] : [])].join(" · ")}>
                <b className="font-semibold">{jourCourt(c.dimanche, i18n.language)} {c.debut}</b>
              </Rangee>
            ))}
          </div>
        )}
    </CadreWidget>
  );
}
