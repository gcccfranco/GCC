"use client";

// Le Mois à points (lot U8, C4 ; question 3 de la spec : la grille à points du widget L,
// planche bo-tableau-de-bord) : lundi → dimanche sur six semaines, un point coloré par
// entrée (quatre au plus), aujourd'hui en rouge, jour choisi en encre ; une légende des
// sources du mois. Sur téléphone ; le widget L (C8) la reprendra.

import { useTranslation } from "react-i18next";
import { SOURCES, type EntreeCalendrier } from "@/lib/calendrier/entrees";
import { joursDeLaSemaine, titreJour } from "@/lib/calendrier/grille";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";

const POINTS_PAR_CASE = 4;

export function GrillePoints({
  mois,
  jours,
  parJour,
  aujourdhui,
  choisi,
  lang,
  onChoisir,
}: {
  mois: string;
  jours: string[];
  parJour: Map<string, EntreeCalendrier[]>;
  aujourdhui: string;
  choisi: string | null;
  lang: NotifLang;
  onChoisir: (date: string) => void;
}) {
  const { t } = useTranslation();
  // Légende : les sources présentes ce mois-ci, dans l'ordre d'un jour, avec la couleur de leur point.
  const couleurs = new Map<string, string>();
  for (const [date, entrees] of parJour) {
    if (!date.startsWith(mois)) continue;
    for (const e of entrees) if (!couleurs.has(e.source)) couleurs.set(e.source, e.couleur);
  }
  const legende = SOURCES.filter((s) => couleurs.has(s));

  return (
    <div>
      <div data-testid="grille-points" className="grid grid-cols-7 gap-1">
        {joursDeLaSemaine(lang).map((j) => (
          <div key={j} aria-hidden className="pb-0.5 text-center text-[11px] text-muted-foreground">
            {j}
          </div>
        ))}
        {jours.map((date) => {
          const entrees = parJour.get(date) ?? [];
          const horsMois = !date.startsWith(mois);
          const estChoisi = date === choisi;
          return (
            <button
              key={date}
              type="button"
              data-jour={date}
              data-hors-mois={horsMois ? "true" : undefined}
              aria-current={date === aujourdhui ? "date" : undefined}
              aria-pressed={estChoisi}
              aria-label={t("calendrier.jourAria", { jour: titreJour(date, lang), count: entrees.length })}
              onClick={() => onChoisir(date)}
              className={cn(
                "flex min-h-[46px] min-w-0 flex-col rounded-[10px] px-1.5 py-1 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                estChoisi ? "bg-foreground text-background" : horsMois ? "" : "bg-muted/60 hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "text-xs font-bold tabular-nums",
                  horsMois && !estChoisi && "text-muted-foreground/50",
                  date === aujourdhui && !estChoisi && "text-brand",
                )}
              >
                {Number(date.slice(8))}
              </span>
              <span className="mt-1 flex flex-wrap gap-[3px]">
                {entrees.slice(0, POINTS_PAR_CASE).map((e) => (
                  <span
                    key={e.cle}
                    data-source={e.source}
                    aria-hidden
                    className={cn("h-1.5 w-1.5 rounded-full", estChoisi && "ring-1 ring-background")}
                    style={{ background: e.couleur }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {legende.length > 0 && (
        <div data-testid="legende" className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {legende.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: couleurs.get(s) }} />
              {t(`calendrier.legende.${s}`)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
