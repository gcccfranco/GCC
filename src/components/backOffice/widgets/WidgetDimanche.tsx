"use client";

// Widget 1 « Ce dimanche » (lot U6, B4 ; réécrit au lot TB2-b, docs/spec-tableau-de-bord-v2.md T3) : un coup d'œil.
// Une rangée par service ou planning du prochain dimanche : « prêt » (✓) ou ce qui manque (le nombre, puis les
// manques en court : cases vides, setlist, présentation, petit déj), et « Voir » vers le planning. Plus de noms.
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { CalendarDays, Check } from "lucide-react";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { lirePetitDej } from "@/lib/petitdej/lignes";
import { GRILLES } from "@/lib/planning/grilles";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { GRILLES_DU_SERVICE, etatsDuDimanche, planningsCasesVides, prochainDimanche, servicesDuDimanche } from "@/lib/tableauDeBord/donnees";
import { lireGrilles, lireSetlists, useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Rond, jourLong } from "./Cadre";

export function WidgetDimanche({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const today = todayIso();
  const dimanche = prochainDimanche(nowIsoParis());
  const services = servicesDuDimanche(widget.reglages, user, profile);
  // Le petit déj ne se lit que pour qui remplit la Table (ou l'administre).
  const avecTable = planningsCasesVides({ plannings: GRILLES.map((g) => g.key) }, user, profile).includes("table");
  const { valeur, erreur } = useLecture(async () => {
    const cles = [...services.flatMap((s) => GRILLES_DU_SERVICE[s].map((g) => g.key)), ...(avecTable ? ["table"] : [])];
    const [rows, setlists, petitDej] = await Promise.all([lireGrilles(cles), lireSetlists(today), avecTable ? lirePetitDej() : null]);
    return etatsDuDimanche(rows, setlists, services, dimanche, petitDej);
  }, `${dimanche}|${services.join()}|${avecTable}`);

  return (
    <CadreWidget
      id="dimanche" taille={widget.taille} Icone={CalendarDays} complement={t("tableauDeBord.dimanche.coupDOeil")}
      nom={t("tableauDeBord.widgets.dimanche")}
      titre={t("tableauDeBord.dimanche.titre", { date: jourLong(dimanche, i18n.language) })}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : valeur.length === 0 ? <Message>{t("tableauDeBord.dimanche.rien")}</Message>
        : (
          <div>
            {valeur.map((e) => (
              <div
                key={e.planning} data-testid="ligne-dimanche"
                className="flex min-w-0 items-center gap-2.5 border-t border-border/60 py-[7px] text-sm text-foreground first:border-t-0"
              >
                <Rond ton={e.manques.length === 0 ? "ok" : "warn"}>
                  {e.manques.length === 0 ? <Check className="h-3 w-3" strokeWidth={3} /> : e.manques.length}
                </Rond>
                <span className="min-w-0 flex-1">
                  <b className="block break-words font-semibold">{e.libelle}</b>
                  <span className="block text-xs text-muted-foreground">
                    {e.manques.length === 0 ? t("tableauDeBord.dimanche.pret") : e.manques.map((m) => t(m.i18n)).join(" · ")}
                  </span>
                </span>
                <Link href={`/back-office/planning/${e.planning}`} className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  {t("tableauDeBord.voir")}
                </Link>
              </div>
            ))}
          </div>
        )}
    </CadreWidget>
  );
}
