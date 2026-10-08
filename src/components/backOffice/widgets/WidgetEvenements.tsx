"use client";

// Widget 3 « Prochains évènements » (lot U6, B4) : 3, 5 ou 10 évènements à venir, avec leurs
// inscriptions ; « Tout voir » mène aux Évènements du Back-Office (à Réunions pour qui n'a que cette
// entrée, agencement v18, B15). Lot U8, C8 : les entrées du
// Sheet des évènements (toute l'église, jusqu'au 31/12/2026) s'y mêlent ; elles ouvrent
// l'onglet de leur mois, dans un nouvel onglet.
import { useTranslation } from "react-i18next";
import { entreesBackOffice } from "@/lib/access";
import { Ticket } from "lucide-react";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { lienOngletSheet, lireSheetEvenements } from "@/lib/evenements/sheet";
import { listEvenements } from "@/lib/firebase/evenements";
import { useProfile } from "@/lib/firebase/users";
import { baseBackOffice } from "@/lib/navigation";
import { todayIso } from "@/lib/scene/dimanches";
import { addDays } from "@/lib/taches/echeances";
import { avecLeSheet, etatInscriptions, evenementsAVenir, type EtatInscriptions } from "@/lib/tableauDeBord/donnees";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, LienTete, Message, Rangee, jourSemaine } from "./Cadre";

/** Le Sheet se lit sur un an : seuls les mois qui ont un onglet sont demandés. */
const HORIZON_SHEET = 365;

export function WidgetEvenements({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const today = todayIso();
  const { valeur: evenements, erreur } = useLecture(() => listEvenements(false), today);
  // Le Sheet à part : lent ou injoignable, il ne retient pas les évènements de l'app (relecture U8).
  const { valeur: sheet } = useLecture(() => lireSheetEvenements(today, addDays(today, HORIZON_SHEET)), today);
  // Dix au plus de chaque côté suffisent à en garder 3, 5 ou 10 une fois mêlés.
  const lignes = evenements && avecLeSheet(
    evenementsAVenir(evenements, user, profile, today, { ...widget.reglages, nombre: 10 }), sheet?.entrees ?? [], today, widget.reglages,
  );
  const maintenant = nowIsoParis();
  // Le widget est permis avec Évènements ou Réunions (B15) : « Tout voir » mène à l'entrée qu'on a.
  const toutVoir = entreesBackOffice(user, profile).includes("evenements") ? "/back-office/evenements" : "/back-office/reunions";
  const etat = (e: EtatInscriptions) =>
    e.cas === "places" ? t("tableauDeBord.evenements.places", { inscrits: e.inscrits, max: e.max })
      : e.cas === "sansLimite" ? t("tableauDeBord.evenements.sansLimite")
      : t(`tableauDeBord.evenements.${e.cas}`);

  return (
    <CadreWidget
      id="evenements" taille={widget.taille} Icone={Ticket} nom={t("tableauDeBord.widgets.evenements")}
      complement={<LienTete href={toutVoir}>{t("tableauDeBord.toutVoir")}</LienTete>}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !lignes ? <Message>{t("common.loading")}</Message>
        : lignes.length === 0 ? <Message>{t("tableauDeBord.evenements.rien")}</Message>
        : (
          <div>
            {lignes.map((l) => l.du === "app" ? (
              <Rangee
                key={l.evenement.id} testId="ligne-evenement" href={`${baseBackOffice(l.evenement)}/${l.evenement.id}`}
                detail={`${jourSemaine(l.date, i18n.language)} · ${etat(etatInscriptions(l.evenement, maintenant))}`}
              >
                <b className="font-semibold">{l.evenement.titre}</b>
              </Rangee>
            ) : (
              <Rangee
                key={`sheet:${l.date}:${l.entree.titre}`} testId="ligne-evenement" href={lienOngletSheet(l.date)} externe
                detail={[jourSemaine(l.date, i18n.language), l.heure, t("tableauDeBord.evenements.duSheet")].filter(Boolean).join(" · ")}
              >
                <b className="font-semibold">{l.entree.titre}</b>
              </Rangee>
            ))}
          </div>
        )}
    </CadreWidget>
  );
}
