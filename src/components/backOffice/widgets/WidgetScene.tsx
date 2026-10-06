"use client";

// Widget 8 « Scène » (lot U6, B4) : les prochains créneaux de l'édition choisie parmi celles
// qui sont affichées (Pâques · Noël, Q10), sinon de celle dont le jour J est le plus proche.
import { useTranslation } from "react-i18next";
import { Drama } from "lucide-react";
import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { todayIso } from "@/lib/scene/dimanches";
import { editionProche, editionsAffichees, libelleEdition } from "@/lib/scene/fetes";
import { creneauxAVenir } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rangee, jourCourt } from "./Cadre";

export function WidgetScene({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const today = todayIso();
  const choisi = widget.reglages.programme;
  const { valeur, erreur } = useLecture(async () => {
    const editions = editionsAffichees(await listProgrammes(), today);
    const edition = editions.find((e) => e.programme!.id === choisi) ?? editionProche(editions, today);
    const programme = edition?.programme ?? null;
    return { edition, programme, creneaux: programme ? creneauxAVenir(await listCreneaux(programme.id), today, 3) : [] };
  }, `${today}|${choisi ?? ""}`);
  const nom = t("tableauDeBord.widgets.scene");
  const edition = valeur?.edition;

  return (
    <CadreWidget
      id="scene" taille={widget.taille} Icone={Drama} nom={nom}
      titre={edition
        ? t("tableauDeBord.scene.titre", { nom: libelleEdition(edition.fete, edition.annee, i18n.language.startsWith("zh") ? "zh" : "fr") })
        : nom}
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
