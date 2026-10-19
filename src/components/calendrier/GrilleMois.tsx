"use client";

// Grille du mois (lot U8, C3, planche bo-calendrier) : lundi → dimanche sur six
// semaines, hors du mois en gris, aujourd'hui en pastille rouge, jour choisi grisé.
// Une case = un bouton qui ouvre le jour ; trois entrées, puis « +N ».
// C6 : une entrée déplaçable se glisse vers un autre jour, à la souris comme au doigt
// (useDefaultSensors) : elle se soulève, la case visée dit « Déposer pour déplacer »,
// l'original reste en pointillé (planche) ; le dépôt ouvre la confirmation
// (`onDeposer`). Le clavier passe par « Déplacer… » du panneau du jour (Q5).

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DndContext, DragOverlay, pointerWithin, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import type { EntreeCalendrier } from "@/lib/calendrier/entrees";
import { joursDeLaSemaine, libelleCourt, titreJour } from "@/lib/calendrier/grille";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import { ICONES, styleCase } from "./apparence";

const PAR_CASE = 3;
const PASTILLE = "flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-[11.5px] font-semibold leading-[15px] lg:px-1.5";
/** Les annonces de dnd-kit sont en anglais et ne servent qu'au glisser à la souris ou au
 *  doigt : la confirmation dit tout. Le clavier a « Déplacer… ». */
const SILENCE = { onDragStart: () => undefined, onDragOver: () => undefined, onDragEnd: () => undefined, onDragCancel: () => undefined };

function Contenu({ e, lang }: { e: EntreeCalendrier; lang: NotifLang }) {
  const Icone = ICONES[e.source];
  return (
    <>
      <Icone aria-hidden className="hidden h-3 w-3 shrink-0 sm:block" />
      <span className="truncate">{libelleCourt(e, lang)}</span>
    </>
  );
}

function Pastille({ e, lang }: { e: EntreeCalendrier; lang: NotifLang }) {
  return (
    <span data-source={e.source} style={styleCase(e)} className={PASTILLE}>
      <Contenu e={e} lang={lang} />
    </span>
  );
}

/** Une entrée qui se soulève ; pendant le glisser, l'original reste en pointillé. */
function PastilleDeplacable({ e, lang }: { e: EntreeCalendrier; lang: NotifLang }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: e.cle, data: { entree: e } });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      data-source={e.source}
      data-deplacable="true"
      style={isDragging ? undefined : styleCase(e)}
      className={cn(
        PASTILLE,
        "cursor-grab touch-manipulation",
        isDragging && "border-[1.5px] border-dashed border-border bg-background text-muted-foreground",
      )}
    >
      <Contenu e={e} lang={lang} />
    </span>
  );
}

function Case({
  date,
  entrees,
  mois,
  aujourdhui,
  choisi,
  lang,
  glissee,
  deplacable,
  onChoisir,
}: {
  date: string;
  entrees: EntreeCalendrier[];
  mois: string;
  aujourdhui: string;
  choisi: boolean;
  lang: NotifLang;
  glissee: EntreeCalendrier | null;
  deplacable: boolean;
  onChoisir: (date: string) => void;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const horsMois = !date.startsWith(mois);
  const estAujourdhui = date === aujourdhui;
  const visee = isOver && !!glissee && glissee.date !== date;
  return (
    <button
      ref={setNodeRef}
      type="button"
      data-jour={date}
      data-hors-mois={horsMois ? "true" : undefined}
      aria-current={estAujourdhui ? "date" : undefined}
      aria-pressed={choisi}
      aria-label={t("calendrier.jourAria", { jour: titreJour(date, lang), count: entrees.length })}
      onClick={() => onChoisir(date)}
      className={cn(
        "flex min-h-[88px] min-w-0 flex-col items-stretch gap-[3px] border-b border-r border-border p-1 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground lg:min-h-[118px] lg:px-1.5",
        choisi && "bg-muted/70",
        visee && "bg-muted/70",
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
      {entrees.slice(0, PAR_CASE).map((e) =>
        deplacable && e.deplacable ? <PastilleDeplacable key={e.cle} e={e} lang={lang} /> : <Pastille key={e.cle} e={e} lang={lang} />,
      )}
      {entrees.length > PAR_CASE && (
        <span data-testid="plus-n" className="px-1 text-[11.5px] font-semibold text-muted-foreground">
          +{entrees.length - PAR_CASE}
        </span>
      )}
      {visee && <span className="px-1 text-[11px] leading-tight text-muted-foreground">{t("calendrier.deplacer.deposer")}</span>}
    </button>
  );
}

export function GrilleMois({
  mois,
  jours,
  parJour,
  aujourdhui,
  choisi,
  lang,
  onChoisir,
  onDeposer,
}: {
  mois: string;
  jours: string[];
  parJour: Map<string, EntreeCalendrier[]>;
  aujourdhui: string;
  choisi: string | null;
  lang: NotifLang;
  onChoisir: (date: string) => void;
  /** C6 : une entrée déposée sur un autre jour. Sans elle, rien ne se soulève. */
  onDeposer?: (entree: EntreeCalendrier, vers: string) => void;
}) {
  const sensors = useDefaultSensors();
  const [glissee, setGlissee] = useState<EntreeCalendrier | null>(null);
  const debut = (ev: DragStartEvent) => setGlissee((ev.active.data.current?.entree as EntreeCalendrier) ?? null);
  const fin = (ev: DragEndEvent) => {
    const e = ev.active.data.current?.entree as EntreeCalendrier | undefined;
    setGlissee(null);
    if (e && ev.over && String(ev.over.id) !== e.date) onDeposer?.(e, String(ev.over.id));
  };
  return (
    <DndContext
      id="calendrier-grille"
      sensors={sensors}
      // La case visée est celle sous le doigt ou le pointeur, pas celle que l'entrée couvre le plus.
      collisionDetection={pointerWithin}
      // La page ne défile que tout au bord : la dernière semaine reste une cible.
      autoScroll={{ threshold: { x: 0, y: 0.05 } }}
      accessibility={{ announcements: SILENCE }}
      onDragStart={debut}
      onDragEnd={fin}
      onDragCancel={() => setGlissee(null)}
    >
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
        {jours.map((date) => (
          <Case
            key={date}
            date={date}
            entrees={parJour.get(date) ?? []}
            mois={mois}
            aujourdhui={aujourdhui}
            choisi={date === choisi}
            lang={lang}
            glissee={glissee}
            deplacable={!!onDeposer}
            onChoisir={onChoisir}
          />
        ))}
      </div>
      {/* Planche : l'entrée soulevée, cernée d'encre et penchée. */}
      <DragOverlay dropAnimation={null}>
        {glissee && (
          <span
            className={cn(PASTILLE, "w-max max-w-[180px] -rotate-2 cursor-grabbing bg-background text-foreground shadow-lg outline outline-[1.5px] outline-foreground")}
          >
            <Contenu e={glissee} lang={lang} />
          </span>
        )}
      </DragOverlay>
    </DndContext>
  );
}
