import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { categoryColor } from "@/lib/serviceColors";
import { styleTexteService } from "@/lib/couleurSombre";
import { formatDate, langueCourte } from "@/lib/utils/formatDate";
import { titreAffiche } from "@/lib/fetes/droits";
import type { FSSetlist } from "@/types/setList";
import { RepereFete, SousTitreFete } from "./FeteDeLaSetlist";

/** Titre de l'en-tête des deux volets : service et date (ou repère de la fête), titre, chef et notes. */
export function TitreEnTete({
  setlist,
  passage,
}: {
  setlist: FSSetlist;
  passage: ComponentProps<typeof RepereFete>["passage"];
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-w-0 flex-[1_1_18rem]">
      {setlist.fete ? <RepereFete setlist={setlist} passage={passage} /> : (
      <p className="flex items-center gap-1.5 text-[13px] font-semibold texte-service" style={styleTexteService(categoryColor(setlist.category))}>
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(setlist.category) }} />
        {t("categories." + setlist.category, { defaultValue: setlist.category })} · {formatDate(setlist.date, i18n.language)}
      </p>)}
      <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground">{titreAffiche(setlist, langueCourte(i18n.language))}</h1>
      {setlist.fete && <SousTitreFete setlist={setlist} passage={passage} />}
      {!setlist.fete && setlist.leader && (
        <p className="mt-0.5 text-[13px] text-muted-foreground">{t("setlists.detail.leaderLabel")} {setlist.leader}</p>
      )}
      {/* La note garde ses retours à la ligne (dimanche-4). */}
      {setlist.notes && <p className="mt-0.5 whitespace-pre-line text-[13px] text-muted-foreground">{setlist.notes}</p>}
    </div>
  );
}
