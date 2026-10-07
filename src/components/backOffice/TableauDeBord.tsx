"use client";

// Tableau de bord du Back-Office (lot U6, docs/spec-back-office.md § Widgets) : la
// disposition de `backOffice/{uid}` (sinon le défaut du rôle, Q11), en grille de 4, 2 ou 1
// colonne selon l'appareil (Q10) — B4. B5 : « Personnaliser » (planche `bo-tableau-de-bord`)
// — catalogue, retirer, Monter / Descendre, glisser (souris, toucher, clavier), S / M / L,
// réglages, « Disposition par défaut » ; chaque geste est écrit aussitôt (Q12).
// Agencement v18 (B14) : l'en-tête commun (`EnTetePage`, « Personnaliser » en contour) et, en grand
// hors personnalisation, les widgets en colonnes (`repartirWidgets`, lib/tableauDeBord/colonnes.ts).
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmer } from "@/components/layout/Confirmer";
import { DndContext, closestCenter, type Announcements, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, RotateCw, SlidersHorizontal } from "lucide-react";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { Button } from "@/components/ui/button";
import { useSensorsAvecClavier } from "@/lib/dnd/sensors";
import { ecrireTableauDeBord, lirePreferencesBackOffice } from "@/lib/firebase/backOffice";
import { useProfile } from "@/lib/firebase/users";
import {
  ajouterWidget, catalogue, changerReglages, changerTaille, deplacerWidget, dispositionAffichee, dispositionParDefaut, retirerWidget,
} from "@/lib/tableauDeBord/disposition";
import { fractionsPour, hauteurMax, repartirWidgets, repartitionSuivante, type Repartition } from "@/lib/tableauDeBord/colonnes";
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
  const zone = useRef<HTMLDivElement>(null);
  const grilleRef = useRef<HTMLDivElement>(null);

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
        type="button" size="sm" variant={edition ? "default" : "outline"}
        onClick={() => { setEdition(!edition); setReglagesDe(null); }}
      >
        <SlidersHorizontal aria-hidden />{t(edition ? "tableauDeBord.perso.termine" : "tableauDeBord.perso.personnaliser")}
      </Button>
    </div>
  );
  const ajoutables = widgets ? catalogue(widgets, user, profile) : [];
  const fractions = useFractions(zone);
  const placement = usePlacement(grilleRef, !edition && fractions ? fractions : null, widgets ?? []);

  return (
    <>
      <EnTetePage titre={titre} sousTitre={sousTitre} outils={enTete} />
      <div className="space-y-6 px-[var(--marge-page)] pb-10">
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
        {/* La zone des widgets, mesurée pour choisir deux ou trois colonnes (R15 : sa largeur, pas `data-barre`). */}
        <div ref={zone}>
          {!widgets ? <Message>{t("common.loading")}</Message>
            : widgets.length === 0 ? <Message>{t("tableauDeBord.aucunWidget")}</Message>
            : (
              <DndContext
                sensors={sensors} collisionDetection={closestCenter} onDragEnd={poser}
                accessibility={{ announcements, screenReaderInstructions: { draggable: t("tableauDeBord.perso.instructions") } }}
              >
                <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
                  <div
                    ref={grilleRef} data-testid="grille-widgets" data-disposition={placement ? "colonnes" : "grille"}
                    className={placement ? "grid items-start gap-x-4 [grid-auto-rows:4px]" : GRILLE_WIDGETS}
                    style={placement ? { gridTemplateColumns: placement.fractions.map((f) => `minmax(0,${f}fr)`).join(" ") } : undefined}
                  >
                    {widgets.map((w, i) => (
                      <WidgetTriable
                        key={w.id} widget={w} nom={nomDe(w.id)} edition={edition} premier={i === 0} dernier={i === widgets.length - 1}
                        place={placement?.places[w.id]}
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
        </div>
      </div>
    </>
  );
}

// ─── Colonnes (v18, B14) ─────────────────────────────────────────────────────

/** Écart entre deux widgets (celui de la grille, `gap-4`) ; unité des rangées de la grille en colonnes. */
const ECART = 16;
const UNITE = 4;
/** Hauteur supposée d'un widget pas encore mesuré, dans une colonne de 1 fr. */
const HAUTEUR_SUPPOSEE = 240;

/** Les colonnes de la zone : `null` (la grille) sans barre latérale (téléphone, tablette en portrait),
 *  deux ou trois selon la largeur de la zone (barre dépliée ou réduite, R15). */
function useFractions(zone: React.RefObject<HTMLDivElement | null>): number[] | null {
  const [fractions, setFractions] = useState<number[] | null>(null);
  useLayoutEffect(() => {
    const el = zone.current;
    if (!el) return;
    const lire = () => {
      const barre = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barre-laterale")) || 0;
      const f = barre > 0 ? fractionsPour(el.clientWidth) : null;
      setFractions((avant) => (avant === f || (avant && f && avant.length === f.length) ? avant : f));
    };
    lire();
    const ro = new ResizeObserver(lire);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zone]);
  return fractions;
}

type Placement = { fractions: number[]; places: Record<string, { colonne: number; style: React.CSSProperties }> };

/**
 * Place chaque widget dans sa colonne sans changer l'ordre du DOM (un widget déplacé n'est pas
 * remonté, donc ne relit pas ses données) : une grille aux rangées de 4 px, où chaque carte prend
 * sa colonne et autant de rangées que sa hauteur mesurée. La répartition (`repartirWidgets`) suit
 * les hauteurs mesurées, ramenées à une colonne de 1 fr ; elle ne change que pour un vrai gain, et ne
 * revient jamais à une répartition quittée (`repartitionSuivante`).
 */
function usePlacement(grille: React.RefObject<HTMLDivElement | null>, fractions: number[] | null, widgets: Widget[]): Placement | null {
  /** Hauteur réelle (px) et hauteur ramenée à une colonne de 1 fr, par widget. */
  const [mesures, setMesures] = useState<Record<string, { h: number; norm: number }>>({});
  const [repartition, setRepartition] = useState<Repartition | null>(null);
  const cle = fractions ? `${fractions.join("/")}|${widgets.map((w) => `${w.id}:${w.taille}`).join(",")}` : "";
  const norm = Object.fromEntries(widgets.map((w) => [w.id, mesures[w.id]?.norm ?? HAUTEUR_SUPPOSEE]));

  useLayoutEffect(() => {
    const el = grille.current;
    if (!fractions || !el) return;
    const mesurer = () => {
      const unFr = (el.clientWidth - ECART * (fractions.length - 1)) / fractions.reduce((a, b) => a + b, 0);
      const lues: Record<string, { h: number; norm: number }> = {};
      el.querySelectorAll<HTMLElement>("[data-widget]").forEach((w) => {
        lues[w.dataset.widget!] = { h: w.offsetHeight, norm: Math.round((w.offsetHeight * w.offsetWidth) / unFr) };
      });
      setMesures((avant) => (Object.keys(lues).every((id) => avant[id]?.h === lues[id].h && avant[id]?.norm === lues[id].norm) ? avant : lues));
      // La répartition suit les mesures ; l'ancienne reste tant qu'une autre ne raccourcit pas assez la page.
      const lu = Object.fromEntries(widgets.map((w) => [w.id, lues[w.id]?.norm ?? HAUTEUR_SUPPOSEE]));
      const candidat = repartirWidgets(widgets, lu, fractions).map((col) => col.map((w) => w.id));
      const long = (cols: string[][]) => hauteurMax(cols.map((col) => col.map((id) => ({ id }))), lu, fractions);
      setRepartition((avant) => repartitionSuivante(avant, cle, candidat, long));
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    el.querySelectorAll("[data-widget]").forEach((w) => ro.observe(w));
    return () => ro.disconnect();
    // `widgets` se lit dans `cle`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grille, fractions, cle]);

  if (!fractions || widgets.length === 0) return null;
  const colonnes = repartition?.cle === cle
    ? repartition.colonnes
    : repartirWidgets(widgets, norm, fractions).map((col) => col.map((w) => w.id));
  const places: Placement["places"] = {};
  colonnes.forEach((col, c) => {
    let debut = 1;
    for (const id of col) {
      const rangees = Math.ceil(((mesures[id]?.h ?? HAUTEUR_SUPPOSEE) + ECART) / UNITE);
      places[id] = { colonne: c, style: { gridColumn: c + 1, gridRow: `${debut} / span ${rangees}` } };
      debut += rangees;
    }
  });
  return { fractions, places };
}

type PropsTriable = Omit<React.ComponentProps<typeof OutilsWidget>, "poignee"> & {
  edition: boolean;
  /** En colonnes : sa colonne et sa place dans la grille. */
  place?: { colonne: number; style: React.CSSProperties };
};

/** Un widget qu'on glisse en personnalisation : sa carte (`CadreWidget`) lit la poignée et les outils dans le contexte. */
function WidgetTriable({ edition, place, ...outils }: PropsTriable) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: outils.widget.id, disabled: !edition });
  const Composant = COMPOSANTS[outils.widget.id];
  if (!Composant) return null;
  return (
    <EditionWidgetContext.Provider value={{
      setNodeRef,
      // Translate et pas Transform : des cartes de tailles différentes ne se déforment pas.
      style: { transform: CSS.Translate.toString(transform), transition, ...place?.style },
      colonne: place?.colonne,
      enMouvement: isDragging,
      outils: edition ? (
        <OutilsWidget {...outils} poignee={<Poignee nom={outils.nom} ref={setActivatorNodeRef} {...attributes} {...listeners} />} />
      ) : null,
    }}>
      <Composant widget={outils.widget} />
    </EditionWidgetContext.Provider>
  );
}
