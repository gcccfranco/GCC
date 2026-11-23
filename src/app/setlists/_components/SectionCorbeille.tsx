import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FSSetlist } from "@/types/setList";
import { titreAffiche } from "@/lib/fetes/droits";
import { formatDate, langueCourte } from "@/lib/utils/formatDate";

/** La corbeille en bas de la page Setlists, sur tous les onglets ; vide, elle le dit (décision du 17/11/2026). */
export function SectionCorbeille({
  setlists,
  ouverte,
  onBasculer,
  onRestaurer,
  onSupprimer,
}: {
  setlists: FSSetlist[];
  ouverte: boolean;
  onBasculer: () => void;
  onRestaurer: (s: FSSetlist) => void;
  onSupprimer: (s: FSSetlist) => void;
}) {
  const { t, i18n } = useTranslation();
  const dateCourte = (iso: string) => {
    const d = new Date(iso);
    return i18n.language === "zh-CN"
      ? `${d.getMonth() + 1}月${d.getDate()}日`
      : new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(d);
  };
  return (
    <section id="corbeille" className="mt-8 scroll-mt-24" data-testid="corbeille" data-vide={setlists.length === 0 ? "" : undefined}>
      {setlists.length === 0 ? (
        <div className="py-1">
          <h2 className="block text-base font-semibold text-foreground">{t("setlists.corbeille.titreVide")}</h2>
          <p className="block text-sm text-muted-foreground">{t("setlists.corbeille.aide")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("setlists.corbeille.vide")}</p>
        </div>
      ) : (
      <button
        type="button"
        aria-expanded={ouverte}
        onClick={onBasculer}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold text-foreground">
            {t("setlists.corbeille.titre", { count: setlists.length })}
          </span>
          <span className="block text-sm text-muted-foreground">{t("setlists.corbeille.aide")}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${ouverte ? "rotate-180" : ""}`} aria-hidden />
      </button>
      )}
      {ouverte && (
        <ul className="mt-1">
          {setlists.map((s) => (
            <li key={s.id} className="border-t border-border/70 py-3">
              <p className="text-base font-semibold text-foreground">{titreAffiche(s, langueCourte(i18n.language))}</p>
              <p className="text-sm text-muted-foreground">
                <span className="inline-block first-letter:uppercase">{formatDate(s.date, i18n.language)}</span>
                {" · "}
                {t("setlists.corbeille.supprimeeLe", { date: dateCourte(s.supprimeeLe!) })}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onRestaurer(s)}
                  className="h-11 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[.97]"
                >
                  {t("setlists.corbeille.restaurer")}
                </button>
                <button
                  type="button"
                  onClick={() => onSupprimer(s)}
                  className="h-11 rounded-full px-4 text-sm font-semibold text-destructive transition-[background-color,transform] duration-150 hover:bg-destructive/10 active:scale-[.97]"
                >
                  {t("setlists.corbeille.supprimerDefinitivement")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
