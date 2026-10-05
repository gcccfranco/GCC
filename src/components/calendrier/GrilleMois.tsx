"use client";

// Grille du mois (lot U8, C3, planche bo-calendrier) : lundi → dimanche sur six
// semaines, hors du mois en gris, aujourd'hui en pastille rouge, jour choisi grisé.
// Une case = un bouton qui ouvre le jour ; trois entrées, puis « +N ».

import { useTranslation } from "react-i18next";
import type { EntreeCalendrier } from "@/lib/calendrier/entrees";
import { joursDeLaSemaine, libelleCourt, titreJour } from "@/lib/calendrier/grille";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import { ICONES, styleCase } from "./apparence";

const PAR_CASE = 3;

export function GrilleMois({
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
  return (
    <div data-testid="grille-mois" className="grid grid-cols-7 border-l border-t border-border">
      {joursDeLaSemaine(lang).map((j) => (
        <div
          key={j}
          aria-hidden
          className="border-b border-r border-border bg-muted/40 px-1.5 py-2 text-xs font-semibold text-muted-foreground sm:px-2.5"
        >
          {j}
        </div>
      ))}
      {jours.map((date) => {
        const entrees = parJour.get(date) ?? [];
        const horsMois = !date.startsWith(mois);
        const estAujourdhui = date === aujourdhui;
        return (
          <button
            key={date}
            type="button"
            data-jour={date}
            data-hors-mois={horsMois ? "true" : undefined}
            aria-current={estAujourdhui ? "date" : undefined}
            aria-pressed={date === choisi}
            aria-label={t("calendrier.jourAria", { jour: titreJour(date, lang), count: entrees.length })}
            onClick={() => onChoisir(date)}
            className={cn(
              "flex min-h-[88px] min-w-0 flex-col items-stretch gap-[3px] border-b border-r border-border p-1 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground lg:min-h-[118px] lg:px-1.5",
              date === choisi && "bg-muted/70",
            )}
          >
            <span
              className={cn(
                "self-start rounded-full px-1 py-0.5 text-xs font-bold tabular-nums",
                horsMois ? "text-muted-foreground/50" : "text-foreground/85",
                estAujourdhui && "min-w-[22px] bg-brand text-center text-white",
              )}
            >
              {Number(date.slice(8))}
            </span>
            {entrees.slice(0, PAR_CASE).map((e) => {
              const Icone = ICONES[e.source];
              return (
                <span
                  key={e.cle}
                  data-source={e.source}
                  style={styleCase(e)}
                  className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-[11.5px] font-semibold leading-[15px] lg:px-1.5"
                >
                  <Icone aria-hidden className="hidden h-3 w-3 shrink-0 sm:block" />
                  <span className="truncate">{libelleCourt(e, lang)}</span>
                </span>
              );
            })}
            {entrees.length > PAR_CASE && (
              <span data-testid="plus-n" className="px-1 text-[11.5px] font-semibold text-muted-foreground">
                +{entrees.length - PAR_CASE}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
