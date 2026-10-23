"use client";

// Widget 2 « Tâches » (lot U6, B4 ; lot TB2-b, docs/spec-tableau-de-bord-v2.md T6) : les tâches de ses équipes
// jusqu'à J+7, en retard d'abord, puis les siennes (« à toi »), en retard en rouge (réglage « Équipes », EQ15).
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import { cleNomEquipe } from "@/lib/equipes/table";
import { listTaches } from "@/lib/firebase/taches";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { lignesDeTache } from "@/lib/taches/echeances";
import { equipesAFaire, tachesDuTableau } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rangee, jourMois } from "./Cadre";

export function WidgetAFaire({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const equipes = equipesAFaire(widget.reglages, user, profile);
  const today = todayIso();
  const { valeur, erreur } = useLecture(async () => {
    const items = (await Promise.all(equipes.map((e) => listTaches(e)))).flat();
    return tachesDuTableau(items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today)), user?.uid ?? "", today);
  }, `${today}|${equipes.join()}|${user?.uid ?? ""}`);

  return (
    <CadreWidget
      id="afaire" taille={widget.taille} Icone={ListChecks} nom={t("tableauDeBord.widgets.afaire")}
      complement={valeur?.enRetard ? t("tableauDeBord.afaire.enRetard", { count: valeur.enRetard }) : undefined}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : valeur.lignes.length === 0 ? <Message>{t("tableauDeBord.afaire.rien")}</Message>
        : (
          <div>
            {valeur.lignes.map((l) => {
              const retard = l.date < today;
              return (
                <Rangee
                  key={`${l.tache.equipe}-${l.tache.id}-${l.date}`} testId="ligne-tache" data={{ "data-a-moi": String(l.aMoi) }}
                  href={`/back-office/taches/${l.tache.equipe}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className={cn("h-[18px] w-[18px] shrink-0 rounded-[5px] border-2", retard ? "border-red-700 dark:border-red-400" : "border-muted-foreground/40")} />
                    <span className="min-w-0">
                      <b className="block break-words font-semibold">{l.tache.titre}</b>
                      <span className="block text-xs text-muted-foreground">
                        {l.aMoi ? t("tableauDeBord.afaire.aToi") : t(cleNomEquipe(l.tache.equipe, true))}
                        {" · "}
                        <span className={retard ? "font-semibold text-red-700 dark:text-red-400" : undefined}>
                          {t(retard ? "tableauDeBord.afaire.enRetardDepuis" : "tableauDeBord.afaire.pour", { date: jourMois(l.date) })}
                        </span>
                      </span>
                    </span>
                  </span>
                </Rangee>
              );
            })}
          </div>
        )}
    </CadreWidget>
  );
}
