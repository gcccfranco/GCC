"use client";

// Feuille « Ta barre du bas » (lot U6, B6 ; planche bo-telephone-barre-perso) : les entrées
// permises à cocher (4 au plus), leur ordre aux poignées (doigt, souris, clavier), l'aperçu
// de la barre, « Remettre la barre par défaut » et « Terminé ». Rien ne s'écrit avant de la
// refermer (« Terminé », le voile ou le geste vers le bas) : alors la barre est enregistrée
// si elle a changé, ou retirée du document si l'on a remis le défaut (Q5 : absente = défaut).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, type Announcements, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { useSensorsAvecClavier } from "@/lib/dnd/sensors";
import { cleOnglet, entreeBackOffice, ongletsBackOffice } from "@/lib/navigation";
import {
  ONGLETS_MAX, barreAffichee, barreDeLaFeuille, barreParDefaut, basculer, listeDeLaFeuille,
} from "@/lib/tableauDeBord/barre";
import type { Entree } from "@/types/backOffice";

type Props = {
  open: boolean;
  onClose: () => void;
  /** La barre affichée maintenant (`barreAffichee`). */
  barre: Entree[];
  permises: Entree[];
  /** Telle qu'enregistrée (`null` = absente, donc le défaut). */
  enregistree: unknown[] | null;
  /** Coordination : Évènements comprend la scène (indice « + scène »). */
  coordination: boolean;
  onEnregistrer: (barre: Entree[] | null) => void;
};

type Brouillon = { liste: Entree[]; cochees: Entree[]; defaut: boolean };

export function FeuilleBarreDuBas({ open, onClose, barre, permises, enregistree, coordination, onEnregistrer }: Props) {
  useStandaloneScrollLock(open);
  const [brouillon, setBrouillon] = useState<Brouillon>({ liste: [], cochees: [], defaut: false });
  // À chaque ouverture, le brouillon repart de la barre affichée.
  const [ouverte, setOuverte] = useState(false);
  if (open !== ouverte) {
    setOuverte(open);
    if (open) setBrouillon({ liste: listeDeLaFeuille(barre, permises), cochees: barre, defaut: false });
  }
  const choisie = barreDeLaFeuille(brouillon.liste, brouillon.cochees);

  // La feuille se valide en se refermant, quelle que soit la façon (Terminé, voile, geste).
  function fermer() {
    if (brouillon.defaut) {
      if (enregistree !== null) onEnregistrer(null);
    } else if (choisie.join() !== barre.join()) {
      onEnregistrer(choisie);
    }
    onClose();
  }
  return (
    <Drawer open={open} onOpenChange={(o) => !o && fermer()}>
      <DrawerContent className="max-h-[92dvh] md:max-w-[560px] md:mx-auto">
        {open && (
          <Contenu
            brouillon={brouillon} setBrouillon={setBrouillon} choisie={choisie} permises={permises}
            coordination={coordination} onTermine={fermer}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Contenu({ brouillon, setBrouillon, choisie, permises, coordination, onTermine }: {
  brouillon: Brouillon; setBrouillon: (f: (b: Brouillon) => Brouillon) => void; choisie: Entree[]; permises: Entree[];
  coordination: boolean; onTermine: () => void;
}) {
  const { t } = useTranslation();
  const sensors = useSensorsAvecClavier();
  const { liste, cochees } = brouillon;
  const apercu = barreAffichee(choisie, permises);

  const nom = (e: UniqueIdentifier) => t(cleOnglet(e as Entree));
  const rang = (e: UniqueIdentifier) => liste.indexOf(e as Entree) + 1;
  const total = liste.length;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("tableauDeBord.perso.annonceSaisi", { nom: nom(active.id), position: rang(active.id), total }),
    onDragOver: ({ active, over }) => over ? t("tableauDeBord.perso.annonceDeplace", { nom: nom(active.id), position: rang(over.id), total }) : undefined,
    onDragEnd: ({ active, over }) => over ? t("tableauDeBord.perso.annoncePose", { nom: nom(active.id), position: rang(over.id), total }) : undefined,
    onDragCancel: ({ active }) => t("tableauDeBord.perso.annonceAnnule", { nom: nom(active.id) }),
  };

  function poser({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setBrouillon((b) => ({
      ...b, defaut: false,
      liste: arrayMove(b.liste, b.liste.indexOf(active.id as Entree), b.liste.indexOf(over.id as Entree)),
    }));
  }
  function cocher(e: Entree) {
    setBrouillon((b) => ({ ...b, defaut: false, cochees: basculer(b.cochees, e) }));
  }
  function remettre() {
    const d = barreParDefaut(permises);
    setBrouillon(() => ({ liste: listeDeLaFeuille(d, permises), cochees: d, defaut: true }));
  }

  const indice = (e: Entree) =>
    e === "tableau" ? t("backOffice.barre.indice.tableau")
      : e === "evenements" && coordination ? t("backOffice.barre.indice.scene")
      : e === "statistiques" ? t("backOffice.barre.indice.admins")
      : "";

  return (
    <div className="overflow-y-auto px-[18px] pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
      <div className="flex items-center gap-3">
        <DrawerTitle className="text-lg font-bold">{t("backOffice.barre.titre")}</DrawerTitle>
        <Button type="button" size="sm" className="ml-auto" onClick={onTermine}>{t("backOffice.barre.termine")}</Button>
      </div>
      <DrawerDescription className="mt-1 mb-2 text-[13px] text-muted-foreground">{t("backOffice.barre.aide")}</DrawerDescription>

      <DndContext
        sensors={sensors} collisionDetection={closestCenter} onDragEnd={poser}
        accessibility={{ announcements, screenReaderInstructions: { draggable: t("backOffice.barre.instructions") } }}
      >
        <SortableContext items={liste} strategy={verticalListSortingStrategy}>
          <ul data-vaul-no-drag className="divide-y divide-border">
            {liste.map((e) => (
              <Ligne
                key={e} entree={e} nom={nom(e)} indice={indice(e)} cochee={cochees.includes(e)}
                pleine={cochees.length >= ONGLETS_MAX} onCocher={() => cocher(e)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <h3 className="mt-4 mb-2 text-sm font-semibold text-muted-foreground" id="apercu-barre">{t("backOffice.barre.apercu")}</h3>
      <ul aria-labelledby="apercu-barre" className="flex h-[58px] gap-0.5 rounded-[29px] bg-card p-[5px] shadow-[0_8px_24px_rgba(28,28,30,.16)]">
        {ongletsBackOffice(apercu).map(({ href, cle, Icone }, i) => (
          <li
            key={href}
            className={`flex flex-1 flex-col items-center justify-center gap-px whitespace-nowrap rounded-3xl text-[10.5px] font-semibold ${
              i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icone className="h-4 w-4" aria-hidden />
            {t(cle)}
          </li>
        ))}
      </ul>

      <button type="button" onClick={remettre} className="mx-auto mt-3 block rounded-full px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        {t("backOffice.barre.parDefaut")}
      </button>
    </div>
  );
}

function Ligne({ entree, nom, indice, cochee, pleine, onCocher }: {
  entree: Entree; nom: string; indice: string; cochee: boolean; pleine: boolean; onCocher: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entree });
  const { Icone } = entreeBackOffice(entree);
  return (
    <li
      ref={setNodeRef}
      data-testid="ligne-barre"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-h-[44px] items-center gap-3 bg-background py-1.5 ${isDragging ? "relative z-10 shadow-md" : ""}`}
    >
      <button
        type="button" role="checkbox" aria-checked={cochee} aria-label={nom} disabled={!cochee && pleine} onClick={onCocher}
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full disabled:opacity-40 ${
          cochee ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/40"
        }`}
      >
        {cochee && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
      </button>
      <Icone className="h-[18px] w-[18px] shrink-0 text-foreground/80" aria-hidden />
      <span className="font-semibold text-foreground">{nom}</span>
      {indice && <span className="truncate text-[13px] text-muted-foreground">{indice}</span>}
      <button
        type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={t("backOffice.barre.deplacer", { nom })}
        className="ml-auto flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-[18px] w-[18px]" aria-hidden />
      </button>
    </li>
  );
}
