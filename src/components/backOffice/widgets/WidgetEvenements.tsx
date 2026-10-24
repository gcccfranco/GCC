"use client";

// Widget 3 « Évènements » (lot U6, B4 ; réécrit au lot TB2-b, docs/spec-tableau-de-bord-v2.md T5) : d'abord ceux
// qu'on organise ou que porte une de ses équipes (inscriptions en puce, « ferme bientôt », créneaux de scène
// vides), puis les autres. « Tout voir » mène aux Évènements du Back-Office. Depuis TB2-corrections, chaque ligne
// de l'app porte l'état des inscriptions en pastille (neutre ; orange si « ferme bientôt »). Lot U8, C8 : les
// entrées du Sheet des évènements (toute l'église, jusqu'au 31/12/2026) s'y mêlent ; elles ouvrent l'onglet de
// leur mois, dans un nouvel onglet.
import { useTranslation } from "react-i18next";
import { Ticket } from "lucide-react";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { lienOngletSheet, lireSheetEvenements } from "@/lib/evenements/sheet";
import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { useProfile } from "@/lib/firebase/users";
import { baseBackOffice } from "@/lib/navigation";
import { todayIso } from "@/lib/scene/dimanches";
import { editionsAffichees } from "@/lib/scene/fetes";
import { addDays } from "@/lib/taches/echeances";
import { creneauxVides, etatInscriptions, evenementsDuTableau, fermeBientot, type EtatInscriptions } from "@/lib/tableauDeBord/donnees";
import { lireEvenements, useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, LienTete, Message, Puce, Rangee, jourSemaine } from "./Cadre";

/** Le Sheet se lit sur un an : seuls les mois qui ont un onglet sont demandés. */
const HORIZON_SHEET = 365;

export function WidgetEvenements({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const today = todayIso();
  const { valeur: evenements, erreur } = useLecture(() => lireEvenements(today), today);
  // Le Sheet à part : lent ou injoignable, il ne retient pas les évènements de l'app (relecture U8).
  const { valeur: sheet } = useLecture(() => lireSheetEvenements(today, addDays(today, HORIZON_SHEET)), today);
  const lignes = evenements && evenementsDuTableau(evenements, sheet?.entrees ?? [], user, profile, today, widget.reglages);
  // Les créneaux de scène ne se lisent que s'il y a des évènements « à soi » : ceux des éditions affichées.
  const sansCle = (lignes?.siens ?? []).map((e) => e.id).join();
  const { valeur: creneaux } = useLecture(async () => {
    if (!sansCle) return [];
    const editions = editionsAffichees(await listProgrammes(), today).flatMap((e) => (e.programme ? [e.programme] : []));
    return (await Promise.all(editions.map((p) => listCreneaux(p.id)))).flat();
  }, `${today}|${sansCle}`);
  const maintenant = nowIsoParis();
  const pastille = (e: EtatInscriptions, bientot: boolean) => (
    <Puce testId="pastille-inscriptions" ton={bientot ? "warn" : "neutre"}>
      {e.cas === "places" ? (
        <span role="img" aria-label={t("tableauDeBord.evenements.placesLabel", { count: e.inscrits, max: e.max })}>{`${e.inscrits} / ${e.max}`}</span>
      )
        : e.cas === "sansLimite" ? t("tableauDeBord.evenements.inscrits", { count: e.inscrits })
        : e.cas === "fermees" ? t("tableauDeBord.evenements.fermees")
        : t("tableauDeBord.evenements.externe")}
    </Puce>
  );

  return (
    <CadreWidget
      id="evenements" taille={widget.taille} Icone={Ticket} nom={t("tableauDeBord.widgets.evenements")}
      complement={<LienTete href="/back-office/evenements">{t("tableauDeBord.toutVoir")}</LienTete>}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !lignes ? <Message>{t("common.loading")}</Message>
        : lignes.siens.length + lignes.autres.length === 0 ? <Message>{t("tableauDeBord.evenements.rien")}</Message>
        : (
          <div>
            {lignes.siens.map((e) => {
              const bientot = fermeBientot(e, maintenant);
              const etatE = etatInscriptions(e, maintenant);
              const vides = creneaux ? creneauxVides(e, creneaux).length : 0;
              return (
                <Rangee
                  key={e.id} testId="ligne-evenement" data={{ "data-sien": "true" }} href={`${baseBackOffice(e)}/${e.id}`}
                  detail={(
                    <span className="flex items-center gap-1.5">
                      {pastille(etatE, bientot)}
                      {vides > 0 && <Puce ton="bad">{t("tableauDeBord.evenements.scene")}</Puce>}
                    </span>
                  )}
                >
                  <b className="block break-words font-semibold">{e.titre} · {jourSemaine(e.date, i18n.language)}</b>
                  {(bientot || vides > 0) && (
                    <span className="block text-xs text-muted-foreground">
                      {bientot ? t("tableauDeBord.evenements.fermeBientot") : t("tableauDeBord.evenements.creneauxVides", { count: vides })}
                    </span>
                  )}
                </Rangee>
              );
            })}
            {lignes.autres.map((l) => l.du === "app" ? (
              <Rangee
                key={l.evenement.id} testId="ligne-evenement" href={`${baseBackOffice(l.evenement)}/${l.evenement.id}`}
                detail={(
                  <span className="flex items-center gap-1.5">
                    {jourSemaine(l.date, i18n.language)}
                    {pastille(etatInscriptions(l.evenement, maintenant), fermeBientot(l.evenement, maintenant))}
                  </span>
                )}
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
