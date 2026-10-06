"use client";

// Widget 2 « À faire » (lot U6, B4) : les tâches de ses pôles jusqu'à J+7, en retard en rouge.
import { useTranslation } from "react-i18next";
import { ListChecks } from "lucide-react";
import { listTaches } from "@/lib/firebase/taches";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { lignesDeTache } from "@/lib/taches/echeances";
import { aFaireDuTableau, polesAFaire } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rangee, jourMois } from "./Cadre";

export function WidgetAFaire({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();
  const poles = polesAFaire(widget.reglages, user, profile);
  const today = todayIso();
  const { valeur, erreur } = useLecture(async () => {
    const items = (await Promise.all(poles.map((p) => listTaches(p)))).flat();
    return aFaireDuTableau(items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today)), today);
  }, `${today}|${poles.join()}`);

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
                  key={`${l.tache.pole}-${l.tache.id}-${l.date}`} testId="ligne-tache" href={`/back-office/taches/${l.tache.pole}`}
                  detail={`${t(`taches.pole.${l.tache.pole}`)} · ${jourMois(l.date)}`} ton={retard ? "bad" : undefined}
                >
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full border-2", retard ? "border-red-700 dark:border-red-400" : "border-muted-foreground/40")} />
                    <span className="min-w-0">{l.tache.titre}</span>
                  </span>
                </Rangee>
              );
            })}
          </div>
        )}
    </CadreWidget>
  );
}
