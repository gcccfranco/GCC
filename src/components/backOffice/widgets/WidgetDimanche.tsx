"use client";

// Widget 1 « Ce dimanche » (lot U6, B4) : par service choisi, les cases du planning, la
// setlist publiée, la présentation et les cases vides (planche `bo-telephone-accueil`).
import { useTranslation } from "react-i18next";
import { CalendarDays, Check, CircleAlert } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { todayIso } from "@/lib/scene/dimanches";
import { GRILLES_DU_SERVICE, ceDimanche, prochainsDimanches, servicesDuDimanche, type ServiceDuDimanche } from "@/lib/tableauDeBord/donnees";
import { lireGrilles, lireSetlists, useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget } from "@/types/backOffice";
import { CadreWidget, Message, Pastille, jourLong } from "./Cadre";

export function WidgetDimanche({ widget }: { widget: Widget }) {
  const { t, i18n } = useTranslation();
  const { user, profile } = useProfile();
  const today = todayIso();
  const dimanche = prochainsDimanches(today, 1)[0];
  const services = servicesDuDimanche(widget.reglages, user, profile);
  const { valeur, erreur } = useLecture(async () => {
    const cles = services.flatMap((s) => GRILLES_DU_SERVICE[s].map((g) => g.key));
    const [rows, setlists] = await Promise.all([lireGrilles(cles), lireSetlists(today)]);
    return ceDimanche(rows, setlists, services, dimanche);
  }, `${dimanche}|${services.join()}`);
  const seul = valeur?.length === 1 ? valeur[0] : null;

  return (
    <CadreWidget
      id="dimanche" taille={widget.taille} Icone={CalendarDays} complement={seul?.libelle}
      nom={t("tableauDeBord.widgets.dimanche")}
      titre={t("tableauDeBord.dimanche.titre", { date: jourLong(dimanche, i18n.language) })}
    >
      {erreur ? <Message erreur>{t("tableauDeBord.lectureImpossible")}</Message>
        : !valeur ? <Message>{t("common.loading")}</Message>
        : valeur.length === 0 ? <Message>{t("tableauDeBord.dimanche.rien")}</Message>
        : (
          <div className="space-y-4">
            {valeur.map((s) => <BlocService key={`${s.categorie}-${s.libelle}`} service={s} avecNom={!seul} />)}
          </div>
        )}
    </CadreWidget>
  );
}

function BlocService({ service, avecNom }: { service: ServiceDuDimanche; avecNom: boolean }) {
  const { t } = useTranslation();
  return (
    <div>
      {avecNom && <p className="mb-1 text-[13px] font-semibold text-muted-foreground">{service.libelle}</p>}
      <div className="mb-2 flex flex-wrap gap-2">
        {service.setlist
          ? <Pastille ton="ok" Icone={Check}>{t("tableauDeBord.dimanche.setlistPubliee")}</Pastille>
          : <Pastille ton="warn" Icone={CircleAlert}>{t("tableauDeBord.dimanche.pasDeSetlist")}</Pastille>}
        {service.presentation && <Pastille ton="ok" Icone={Check}>{t("tableauDeBord.dimanche.presentationPrete")}</Pastille>}
        {service.vides > 0 && (
          <Pastille ton="warn" Icone={CircleAlert}>{t("tableauDeBord.dimanche.casesVides", { count: service.vides })}</Pastille>
        )}
      </div>
      <div>
        {service.lignes.map((l) => (
          <div key={l.cle} data-testid="ligne-dimanche" className="flex items-baseline gap-2.5 border-t border-border/60 py-[7px] text-sm first:border-t-0">
            <span className="w-[84px] shrink-0 text-muted-foreground">{t(l.i18n)}</span>
            {l.valeur
              ? <b className="min-w-0 font-semibold text-foreground">{l.valeur}</b>
              : <span className="font-semibold text-amber-700 dark:text-amber-400">{t("tableauDeBord.dimanche.personne")}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
