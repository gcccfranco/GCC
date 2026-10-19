"use client";

// Widget 9 « Comptes » (lot U6, B4, admins) : les noms du planning sans compte (comme
// l'administration), ou les comptes créés cette semaine.
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { listProfiles } from "@/lib/firebase/users";
import { collectPlanningNames, loadPlanningData } from "@/lib/planning/names";
import { todayIso } from "@/lib/scene/dimanches";
import { nomsSansCompte, nouveauxComptes } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, LienTete, Message, Rangee } from "./Cadre";

const MONTRES = 4;

export function WidgetComptes({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const liste = widget.reglages.liste ?? "sansCompte";
  const today = todayIso();
  const { valeur, erreur } = useLecture(async () => {
    if (liste === "nouveaux") {
      return nouveauxComptes(await listProfiles(), today).map((p) => `${p.firstName} ${p.lastName}`.trim() || p.email);
    }
    const [data, profiles] = await Promise.all([loadPlanningData(), listProfiles()]);
    return nomsSansCompte(collectPlanningNames(data), profiles);
  }, `${liste}|${today}`);
  const sansCompte = liste === "sansCompte";

  return (
    <CadreWidget
      id="comptes" taille={widget.taille} Icone={Users} nom={t("tableauDeBord.widgets.comptes")}
      complement={(
        <LienTete href={sansCompte ? "/back-office/planning/sans-compte" : "/back-office/equipes/personnes"}>
          {t("tableauDeBord.comptes.voirListe")}
        </LienTete>
      )}
    >
      <p className="text-sm font-semibold text-foreground">
        {t(sansCompte ? "tableauDeBord.comptes.sansCompte" : "tableauDeBord.comptes.nouveaux")}
        {valeur && <span className="ml-1.5 font-normal text-muted-foreground">· {valeur.length}</span>}
      </p>
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : valeur.length === 0
          ? <Message>{t(sansCompte ? "tableauDeBord.comptes.aucunSansCompte" : "tableauDeBord.comptes.aucunNouveau")}</Message>
        : (
          <div>
            {valeur.slice(0, MONTRES).map((nom) => <Rangee key={nom} testId="ligne-compte">{nom}</Rangee>)}
            {valeur.length > MONTRES && (
              <p className="pt-1 text-xs text-muted-foreground">{t("tableauDeBord.comptes.autres", { count: valeur.length - MONTRES })}</p>
            )}
          </div>
        )}
    </CadreWidget>
  );
}
