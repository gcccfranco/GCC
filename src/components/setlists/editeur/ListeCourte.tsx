"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, MessageSquare } from "lucide-react";
import { useJianpuScore } from "@/lib/jianpu/images";
import { isFormFusion, isFormTransition, itemSections, type FormItem, type FormListItem } from "@/lib/setlist/formItems";
import { KeyPill } from "@/components/ui/key-pill";
import { PastilleSection, dessinSection } from "@/components/setlists/editeur/Reglages";

// La setlist en liste courte (lot U5 bis, T3, planche `creer-piste2-ordinateur`) :
// une ligne par élément — poignée, numéro, titre, artiste, pastilles de structure,
// note du chant, tonalité. Toucher une ligne ouvre ses réglages dans le volet ; la
// ligne choisie est en encre (`aria-current`). La poignée change l'ordre, au doigt,
// à la souris et au clavier (espace, flèches, espace — Q13).

/** Titre d'un élément tel que la liste le nomme (et son bouton) : le chant, « A / B », « Transition ». */
export function titreElement(item: FormListItem, transition: string): string {
  if (isFormTransition(item)) return transition;
  if (isFormFusion(item)) return item.songs.map((s) => s.song.title).join(" / ");
  return item.song.title;
}

function Poignee({ titre, attributes, listeners, choisi }: { titre: string; attributes: object; listeners: object | undefined; choisi: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={t("setlists.editeur.reordonner", { titre })}
      style={{ touchAction: "none" }}
      className={`relative z-10 -ml-1 mt-0.5 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing ${
        choisi ? "text-background/60" : "text-muted-foreground/60"
      }`}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}

function Pastilles({ chant, choisi }: { chant: FormItem; choisi: boolean }) {
  const sections = itemSections(chant.song, chant.contentOverride);
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {chant.sectionItems.map((si) => {
        const { abbr, cle } = dessinSection(sections, si.sectionId, si.name);
        return <PastilleSection key={si.uid} abbr={abbr} cle={cle} className={choisi ? "ring-1 ring-background/30" : ""} />;
      })}
    </div>
  );
}

function LigneElement({
  item,
  numero,
  choisi,
  onChoisir,
}: {
  item: FormListItem;
  numero: number | null;
  choisi: boolean;
  onChoisir: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const titre = titreElement(item, t("setlists.form.transitionLabel"));
  const style = { transform: CSS.Transform.toString(transform), transition };
  const chant = !isFormTransition(item) && !isFormFusion(item) ? item : null;
  const scan = useJianpuScore(chant?.song.slug);

  // Le bouton couvre toute la ligne (`before:`), sauf la poignée, au-dessus de lui.
  const bouton = (contenu: ReactNode, className = "") => (
    <button
      type="button"
      aria-label={titre}
      aria-current={choisi ? "true" : undefined}
      onClick={onChoisir}
      className={`block w-full text-left before:absolute before:inset-0 before:rounded-xl focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring ${className}`}
    >
      {contenu}
    </button>
  );

  if (isFormTransition(item)) {
    return (
      <li ref={setNodeRef} style={style} data-element className={`relative ${isDragging ? "z-20" : ""}`}>
        <div
          className={`relative flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 ${
            choisi
              ? "border-amber-500 bg-amber-100 dark:bg-amber-900/40"
              : "border-amber-300 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/20"
          }`}
        >
          <Poignee titre={titre} attributes={attributes} listeners={listeners} choisi={false} />
          <MessageSquare className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="min-w-0 flex-1">
            {bouton(
              <span className="flex items-baseline gap-2.5">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{titre}</span>
                {item.text && <span className="truncate text-sm text-foreground/80">{item.text}</span>}
              </span>,
            )}
          </div>
        </div>
      </li>
    );
  }

  const fusion = isFormFusion(item) ? item : null;
  return (
    <li ref={setNodeRef} style={style} data-element className={`relative ${isDragging ? "z-20" : ""}`}>
      <div
        className={`relative flex items-start gap-3 rounded-xl px-3 py-3 ${
          choisi ? "bg-foreground text-background shadow-soft" : "hover:bg-muted/50"
        } ${isDragging ? "shadow-md" : ""}`}
      >
        <Poignee titre={titre} attributes={attributes} listeners={listeners} choisi={choisi} />
        <span
          className={`mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            choisi ? "bg-background text-foreground" : "bg-secondary text-foreground"
          }`}
        >
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          {bouton(
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[15px] font-semibold leading-snug">{titre}</span>
              {chant?.song.titlePinyin && (
                <span className={`text-[13px] ${choisi ? "text-background/70" : "text-muted-foreground"}`}>{chant.song.titlePinyin}</span>
              )}
              {scan && chant?.jianpuSheet && (
                <span className={`rounded px-1 text-[11px] font-semibold ${choisi ? "bg-background/15" : "bg-secondary text-foreground"}`}>
                  {t("setlists.form.jianpuSheet")}
                </span>
              )}
            </span>,
          )}
          <p className={`text-[13px] ${choisi ? "text-background/70" : "text-muted-foreground"}`}>
            {fusion ? t("setlists.editeur.fusion") : chant?.song.artist}
          </p>
          {chant && chant.sectionItems.length > 0 && <Pastilles chant={chant} choisi={choisi} />}
          {chant?.notes.trim() && (
            <p className={`mt-1.5 text-[13px] italic ${choisi ? "text-background/80" : "text-muted-foreground"}`}>{chant.notes}</p>
          )}
        </div>
        {chant && (
          <KeyPill
            tonalite={chant.keyOverride ?? chant.song.originalKey}
            langue={chant.song.language === "zh" ? "zh" : "fr"}
            origine={chant.keyOverride ? chant.song.originalKey : undefined}
            // Sur la ligne en encre, la pastille garde le fond de la page (comme le sommaire de U5).
            className={choisi ? "[&>[data-testid=tonalite]]:!bg-background [&>[data-testid=tonalite-origine]]:!text-background/70" : undefined}
          />
        )}
        <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${choisi ? "text-background/70" : "text-muted-foreground"}`} aria-hidden />
      </div>
    </li>
  );
}

export function ListeCourte({
  items,
  choisi,
  onChoisir,
  onDragEnd,
}: {
  items: FormListItem[];
  choisi: string | null;
  onChoisir: (uid: string) => void;
  onDragEnd: (e: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const numeros = numerosDesElements(items);
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
        <ol data-liste-courte className="space-y-1.5">
          {items.map((item) => (
            <LigneElement
              key={item.uid}
              item={item}
              numero={numeros.get(item.uid) ?? null}
              choisi={choisi === item.uid}
              onChoisir={() => onChoisir(item.uid)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

/** Numéros des chants et des fusions, dans l'ordre (les transitions n'en ont pas, comme la planche). */
export function numerosDesElements(items: FormListItem[]): Map<string, number> {
  const numeros = new Map<string, number>();
  let n = 0;
  for (const item of items) if (!isFormTransition(item)) numeros.set(item.uid, ++n);
  return numeros;
}
