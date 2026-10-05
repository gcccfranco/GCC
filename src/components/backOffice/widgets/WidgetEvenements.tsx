"use client";

// Widget 3 « Prochains évènements » (lot U6, B4) : 3, 5 ou 10 évènements à venir, avec leurs
// inscriptions ; « Tout voir » mène aux Évènements du Back-Office.
import { useTranslation } from "react-i18next";
import { Ticket } from "lucide-react";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { listEvenements } from "@/lib/firebase/evenements";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { etatInscriptions, evenementsAVenir, type EtatInscriptions } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, LienTete, Message, Rangee, jourSemaine } from "./Cadre";

export function WidgetEvenements({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const today = todayIso();
  const { valeur, erreur } = useLecture(() => listEvenements(false), today);
  const evenements = valeur && evenementsAVenir(valeur, user, profile, today, widget.reglages);
  const maintenant = nowIsoParis();
  const etat = (e: EtatInscriptions) =>
    e.cas === "places" ? t("tableauDeBord.evenements.places", { inscrits: e.inscrits, max: e.max })
      : e.cas === "sansLimite" ? t("tableauDeBord.evenements.sansLimite")
      : t(`tableauDeBord.evenements.${e.cas}`);

  return (
    <CadreWidget
      id="evenements" taille={widget.taille} Icone={Ticket} nom={t("tableauDeBord.widgets.evenements")}
      complement={<LienTete href="/back-office/evenements">{t("tableauDeBord.toutVoir")}</LienTete>}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !evenements ? <Message>{t("common.loading")}</Message>
        : evenements.length === 0 ? <Message>{t("tableauDeBord.evenements.rien")}</Message>
        : (
          <div>
            {evenements.map((e) => (
              <Rangee
                key={e.id} testId="ligne-evenement" href={`/back-office/evenements/${e.id}`}
                detail={`${jourSemaine(e.date, i18n.language)} · ${etat(etatInscriptions(e, maintenant))}`}
              >
                <b className="font-semibold">{e.titre}</b>
              </Rangee>
            ))}
          </div>
        )}
    </CadreWidget>
  );
}
