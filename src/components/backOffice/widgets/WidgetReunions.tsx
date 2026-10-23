"use client";

// Widget « Réunions » (lot TB2-c, docs/spec-tableau-de-bord-v2.md T7) : ses prochaines réunions (celles dont on est),
// le nombre de sujets encore ouverts de chacune, et un avertissement quand la réunion précédente du même rang est
// restée sans lien de compte rendu. « Tout voir » mène aux Réunions du Back-Office.
import { useTranslation } from "react-i18next";
import { Users2 } from "lucide-react";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { listSujets } from "@/lib/firebase/sujets";
import { useProfile } from "@/lib/firebase/users";
import { ficheEvenement } from "@/lib/navigation";
import { todayIso } from "@/lib/scene/dimanches";
import { reunionsDuTableau, sujetsOuverts } from "@/lib/tableauDeBord/donnees";
import { lireEvenements, useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, LienTete, Message, Rangee, jourSemaine } from "./Cadre";

export function WidgetReunions({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const today = todayIso();
  const { valeur: evenements, erreur } = useLecture(() => lireEvenements(today), today);
  const retenues = evenements && reunionsDuTableau(evenements, user, profile, nowIsoParis());
  // Les sujets ne se lisent que des réunions retenues. Une lecture en échec ne casse pas le widget : le nombre est omis pour cette réunion.
  const sansCle = (retenues ?? []).map((r) => r.reunion.id).join();
  const { valeur: ouverts } = useLecture(async () => Object.fromEntries(await Promise.all(
    (retenues ?? []).map(async (r) => [r.reunion.id, await listSujets(r.reunion.id).then(sujetsOuverts, () => null)] as const),
  )), sansCle);

  return (
    <CadreWidget
      id="reunions" taille={widget.taille} Icone={Users2} nom={t("tableauDeBord.widgets.reunions")}
      complement={<LienTete href="/back-office/reunions">{t("tableauDeBord.toutVoir")}</LienTete>}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !retenues ? <Message>{t("common.loading")}</Message>
        : retenues.length === 0 ? <Message>{t("tableauDeBord.reunions.rien")}</Message>
        : (
          <div>
            {retenues.map(({ reunion, precedenteSansCompteRendu }) => {
              const n = ouverts?.[reunion.id] ?? null;
              return (
                <Rangee key={reunion.id} testId="ligne-reunion" href={ficheEvenement(reunion)}>
                  <b className="block break-words font-semibold">{reunion.titre} · {jourSemaine(reunion.date, i18n.language)}</b>
                  <span className="block text-xs text-muted-foreground">
                    {n !== null && t("tableauDeBord.reunions.sujets", { count: n })}
                    {precedenteSansCompteRendu && (
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {n !== null && " · "}{t("tableauDeBord.reunions.sansCompteRendu")}
                      </span>
                    )}
                  </span>
                </Rangee>
              );
            })}
          </div>
        )}
    </CadreWidget>
  );
}
