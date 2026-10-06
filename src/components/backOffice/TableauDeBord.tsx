"use client";

// Tableau de bord du Back-Office (lot U6, docs/spec-back-office.md § Widgets) : la
// disposition de `backOffice/{uid}` (sinon le défaut du rôle, Q11), en grille de 4, 2 ou 1
// colonne selon l'appareil (Q10) — B4. B5 : « Personnaliser » (planche `bo-tableau-de-bord`)
// — catalogue, retirer, Monter / Descendre, glisser (souris, toucher, clavier), S / M / L,
// réglages, « Disposition par défaut » ; chaque geste est écrit aussitôt (Q12).
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmer } from "@/components/layout/Confirmer";
import { DndContext, closestCenter, type Announcements, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, RotateCw, SlidersHorizontal } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { useSensorsAvecClavier } from "@/lib/dnd/sensors";
import { ecrireTableauDeBord, lirePreferencesBackOffice } from "@/lib/firebase/backOffice";
import { useProfile } from "@/lib/firebase/users";
import {
  ajouterWidget, catalogue, changerReglages, changerTaille, deplacerWidget, dispositionAffichee, dispositionParDefaut, retirerWidget,
} from "@/lib/tableauDeBord/disposition";
import { useLecture } from "@/lib/tableauDeBord/lecture";
import type { Widget, WidgetId } from "@/types/backOffice";
import { OutilsWidget, Poignee } from "./OutilsWidget";
import { EditionWidgetContext, GRILLE_WIDGETS, Message } from "./widgets/Cadre";
import { WidgetAFaire } from "./widgets/WidgetAFaire";
import { WidgetChants } from "./widgets/WidgetChants";
import { WidgetCalendrier } from "./widgets/WidgetCalendrier";
import { WidgetCasesVides } from "./widgets/WidgetCasesVides";
import { WidgetComptes } from "./widgets/WidgetComptes";
import { WidgetDimanche } from "./widgets/WidgetDimanche";
import { WidgetEvenements } from "./widgets/WidgetEvenements";
import { WidgetPetitDej } from "./widgets/WidgetPetitDej";
import { WidgetRaccourcis } from "./widgets/WidgetRaccourcis";
import { WidgetScene } from "./widgets/WidgetScene";
import { WidgetSetlists } from "./widgets/WidgetSetlists";

/** Calendrier (U8, C8) et Chants les plus joués (U7, S5) sont venus avec leur lot (Q17). */
const COMPOSANTS: Record<WidgetId, ((p: { widget: Widget }) => React.ReactNode) | null> = {
  dimanche: WidgetDimanche,
  calendrier: WidgetCalendrier,
  afaire: WidgetAFaire,
  setlists: WidgetSetlists,
  planning: WidgetCasesVides,
  evenements: WidgetEvenements,
  chants: WidgetChants,
  petitdej: WidgetPetitDej,
  scene: WidgetScene,
  comptes: WidgetComptes,
  raccourcis: WidgetRaccourcis,
};

export function TableauDeBord({ titre, sousTitre }: { titre: string; sousTitre: string }) {
  const { t } = useTranslation();
  const confirmer = useConfirmer();
  const { user, profile } = useProfile();
  const sensors = useSensorsAvecClavier();
  const uid = user?.uid ?? "";
  // Enveloppé : `null` = lecture en cours ; `{ prefs: null }` = pas de document.
  const { valeur } = useLecture(async () => ({ prefs: uid ? await lirePreferencesBackOffice(uid) : null }), uid);
  /** La disposition touchée pendant la visite ; avant le premier geste, celle du document. */
  const [touchee, setTouchee] = useState<Widget[] | null>(null);
  const [edition, setEdition] = useState(false);
  const [reglagesDe, setReglagesDe] = useState<WidgetId | null>(null);
  const [erreur, setErreur] = useState(false);
  // Les écritures partent l'une après l'autre : la dernière posée est la dernière enregistrée.
  const file = useRef<Promise<void>>(Promise.resolve());

  const widgets = touchee ?? (valeur ? dispositionAffichee(valeur.prefs, user, profile) : null);
  const nomDe = (id: UniqueIdentifier) => t(`tableauDeBord.widgets.${id}`);

  function enregistrer(d: Widget[] | null) {
    file.current = file.current
      .then(() => ecrireTableauDeBord(uid, d))
      .then(() => setErreur(false), () => setErreur(true));
  }
  function changer(d: Widget[]) {
    setTouchee(d);
    enregistrer(d);
  }
  async function parDefaut() {
    if (!(await confirmer({ titre: t("tableauDeBord.perso.confirmParDefaut"), texte: t("tableauDeBord.perso.confirmParDefautTexte"),
      action: t("tableauDeBord.perso.remettre"), destructif: true }))) return;
    setTouchee(dispositionParDefaut(user, profile));
    setReglagesDe(null);
    enregistrer(null);
  }
  function poser({ active, over }: DragEndEvent) {
    if (!widgets || !over || active.id === over.id) return;
    const ids = widgets.map((w) => w.id as string);
    changer(deplacerWidget(widgets, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  // Annonces du glisser au clavier, pour les lecteurs d'écran (sinon en anglais).
  const rang = (id: UniqueIdentifier) => (widgets ?? []).findIndex((w) => w.id === id) + 1;
  const total = widgets?.length ?? 0;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("tableauDeBord.perso.annonceSaisi", { nom: nomDe(active.id), position: rang(active.id), total }),
    onDragOver: ({ active, over }) => over ? t("tableauDeBord.perso.annonceDeplace", { nom: nomDe(active.id), position: rang(over.id), total }) : undefined,
    onDragEnd: ({ active, over }) => over ? t("tableauDeBord.perso.annoncePose", { nom: nomDe(active.id), position: rang(over.id), total }) : undefined,
    onDragCancel: ({ active }) => t("tableauDeBord.perso.annonceAnnule", { nom: nomDe(active.id) }),
  };

  const boutonParDefaut = (
    <Button type="button" variant="ghost" size="sm" onClick={parDefaut}>
      <RotateCw aria-hidden />{t("tableauDeBord.perso.parDefaut")}
    </Button>
  );
  const enTete = widgets && (
    <div className="flex items-center gap-2">
      {/* Sur téléphone, « Disposition par défaut » passe sur sa ligne : le titre garde sa place. */}
      {edition && <span className="hidden sm:inline-flex">{boutonParDefaut}</span>}
      <Button
        type="button" size="sm" variant={edition ? "default" : "secondary"}
        onClick={() => { setEdition(!edition); setReglagesDe(null); }}
      >
        <SlidersHorizontal aria-hidden />{t(edition ? "tableauDeBord.perso.termine" : "tableauDeBord.perso.personnaliser")}
      </Button>
    </div>
  );
  const ajoutables = widgets ? catalogue(widgets, user, profile) : [];

  return (
    <>
      <PageTitle title={titre} subtitle={sousTitre} action={enTete} />
      {erreur && <p role="alert" className="text-sm text-destructive">{t("tableauDeBord.perso.erreurEcriture")}</p>}
      {/* Sur téléphone, « Disposition par défaut » passe sous le titre, hors du catalogue. */}
      {edition && widgets && <div className="flex justify-end sm:hidden">{boutonParDefaut}</div>}
      {edition && widgets && (
        <section aria-label={t("tableauDeBord.perso.ajouter")} className="raised flex flex-wrap items-center gap-2.5 rounded-[18px] px-4 py-3.5">
          <b className="text-sm font-semibold text-foreground">{t("tableauDeBord.perso.ajouter")}</b>
          {ajoutables.map((id) => (
            <Button key={id} type="button" variant="secondary" size="sm" className="h-8" onClick={() => changer(ajouterWidget(widgets, id))}>
              <Plus aria-hidden />{nomDe(id)}
            </Button>
          ))}
          {ajoutables.length === 0 && <span className="text-[13px] text-muted-foreground">{t("tableauDeBord.perso.tousAffiches")}</span>}
        </section>
      )}
      {!widgets ? <Message>{t("common.loading")}</Message>
        : widgets.length === 0 ? <Message>{t("tableauDeBord.aucunWidget")}</Message>
        : (
          <DndContext
            sensors={sensors} collisionDetection={closestCenter} onDragEnd={poser}
            accessibility={{ announcements, screenReaderInstructions: { draggable: t("tableauDeBord.perso.instructions") } }}
          >
            <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
              <div data-testid="grille-widgets" className={GRILLE_WIDGETS}>
                {widgets.map((w, i) => (
                  <WidgetTriable
                    key={w.id} widget={w} nom={nomDe(w.id)} edition={edition} premier={i === 0} dernier={i === widgets.length - 1}
                    reglagesOuverts={reglagesDe === w.id}
                    onMonter={() => changer(deplacerWidget(widgets, i, i - 1))}
                    onDescendre={() => changer(deplacerWidget(widgets, i, i + 1))}
                    onTaille={(taille) => changer(changerTaille(widgets, w.id, taille))}
                    onReglages={() => setReglagesDe(reglagesDe === w.id ? null : w.id)}
                    onRetirer={() => { changer(retirerWidget(widgets, w.id)); setReglagesDe(null); }}
                    onChangerReglages={(r) => changer(changerReglages(widgets, w.id, r))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
    </>
  );
}

type PropsTriable = Omit<React.ComponentProps<typeof OutilsWidget>, "poignee"> & { edition: boolean };

/** Un widget qu'on glisse en personnalisation : sa carte (`CadreWidget`) lit la poignée et les outils dans le contexte. */
function WidgetTriable({ edition, ...outils }: PropsTriable) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: outils.widget.id, disabled: !edition });
  const Composant = COMPOSANTS[outils.widget.id];
  if (!Composant) return null;
  return (
    <EditionWidgetContext.Provider value={{
      setNodeRef,
      // Translate et pas Transform : des cartes de tailles différentes ne se déforment pas.
      style: { transform: CSS.Translate.toString(transform), transition },
      enMouvement: isDragging,
      outils: edition ? (
        <OutilsWidget {...outils} poignee={<Poignee nom={outils.nom} ref={setActivatorNodeRef} {...attributes} {...listeners} />} />
      ) : null,
    }}>
      <Composant widget={outils.widget} />
    </EditionWidgetContext.Provider>
  );
}
