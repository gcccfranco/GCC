"use client";

import type { ComponentType, ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Drum, Guitar, ListMusic, Mic, MicVocal, Pencil, Piano, Play, SlidersHorizontal, Square, Wrench, X } from "lucide-react";
import type { JianpuSheetBlock, SectionBlock } from "@/lib/performance/blocks";
import { TEMPO_DEPART } from "@/lib/performance/tempo";
import type { MenuId } from "./MenuLouange";

export const ICONES_ROLE: Record<string, ComponentType<{ className?: string }>> = {
  pianiste: Piano,
  guitariste: Guitar,
  presidence: Mic,
  choriste: MicVocal,
  batteur: Drum,
};

/** Barre de titre du mode louange (forScore, piste A « Pupitre », FS-A ; RU-5) : à gauche Setlist et Repères,
 *  au centre le titre, l'armure (`armure`, la tonalité) et le compositeur, à droite ♩ tempo, Crayon, Outils, Affichage,
 *  ✕. Au téléphone : Setlist, Repères | titre, armure | Outils, Affichage, ✕ (Crayon et ♩ passent en tête d'Outils).
 *  Setlist, Repères, ♩ et Outils ouvrent chacun leur menu (FS-B, `MenuLouange`), Affichage la marge : `menuOuvert` dit
 *  lequel, `onMenu` le bascule.
 *  `avecReperes` : le chant courant a des sections (un scan seul n'en a pas).
 *  `barreRef` est la ref de mesure lue par PerformanceMode (hauteur des barres).
 *  `onCrayon` absent = bouton « Crayon » masqué. Les icônes prennent `--couleur-icones`. */
export function BarreHaut({
  barreRef,
  showChrome,
  currentSong,
  setlistTitle,
  compositeur,
  armure,
  annotateMode,
  menuOuvert,
  avecReperes,
  onAnnoter,
  annoterIndispo = false,
  onMenu,
  onQuitter,
  bande,
  marche,
  onMarche,
  tempoRegle,
}: {
  barreRef: RefObject<HTMLDivElement | null>;
  showChrome: boolean;
  currentSong: SectionBlock | JianpuSheetBlock | undefined;
  setlistTitle: string;
  compositeur: string | undefined;
  /** L'armure (RU-5) : la tonalité, à côté du titre ; absente = pas de tonalité (fusion, aucun chant). */
  armure?: ReactNode;
  annotateMode: boolean;
  menuOuvert: MenuId | null;
  avecReperes: boolean;
  onAnnoter: (() => void) | undefined;
  /** Ma partition n'a pas pu être lue : Crayon visible mais désactivé (son toucher dit pourquoi). */
  annoterIndispo?: boolean;
  onMenu: (id: MenuId) => void;
  onQuitter: () => void;
  /** La bande des temps est allumée (métronome actif) : ♩ s'affiche même sans tempo, avec ▶ / ■ (grand écran). */
  bande: boolean;
  marche: boolean;
  onMarche: () => void;
  /** Tempo joué (réglage de l'appareil, sinon le fichier) : le même que la bande. */
  tempoRegle?: number;
}) {
  const { t } = useTranslation();
  const tempo = tempoRegle ?? currentSong?.tempo ?? (bande ? TEMPO_DEPART : undefined);
  return (
    <div
      ref={barreRef}
      data-barre-haut
      className={`absolute top-0 left-0 right-0 ${showChrome ? "pointer-events-auto" : "pointer-events-none"} material-chrome material-steady shadow-[0_1px_0_hsl(var(--border))] py-3 [--marge-barre:0.5rem] md:[--marge-barre:1rem] flex items-center gap-1`}
      style={{
        paddingTop: "calc(0.75rem + var(--sat, 0px))",
        paddingLeft: "calc(var(--marge-barre) + var(--sal, 0px))",
        paddingRight: "calc(var(--marge-barre) + var(--sar, 0px))",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="flex flex-1 basis-0 items-center justify-start gap-0.5">
        <BtnBarre label={t("performance.songList")} menu="setlist" menuOuvert={menuOuvert} onClick={() => onMenu("setlist")} texte>
          <ListMusic className="h-5 w-5" />
        </BtnBarre>
        {avecReperes && (
          <BtnBarre label={t("performance.reperes")} menu="reperes" menuOuvert={menuOuvert} onClick={() => onMenu("reperes")} texte>
            <Bookmark className="h-5 w-5" />
          </BtnBarre>
        )}
      </div>

      {/* Les deux groupes latéraux (flex-1, base 0, largeur minimale = leurs boutons) prennent la même largeur tant que
          la place suffit : le titre est alors centré sur l'écran. Si l'un des deux est plus large que sa moitié, le titre se
          décentre un peu plutôt que de se tronquer ; il ne se tronque que si la largeur totale manque vraiment. */}
      <div data-bloc-titre className="flex min-w-0 shrink items-center justify-center gap-1.5 px-1">
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold leading-tight text-foreground md:text-base">
            {currentSong?.songTitle ?? setlistTitle}
          </p>
          {compositeur && (
            <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground md:text-[13px]">{compositeur}</p>
          )}
        </div>
        {armure && <span className="shrink-0">{armure}</span>}
      </div>

      <div className="flex flex-1 basis-0 items-center justify-end gap-0.5">
        {tempo ? (
          <BtnBarre label={t("performance.tempo")} menu="metronome" menuOuvert={menuOuvert} onClick={() => onMenu("metronome")} cacheTel>
            <span data-tempo-barre className="flex items-center gap-0.5 text-sm font-semibold tabular-nums">
              <span aria-hidden="true" className="-mr-2 text-xl leading-none">♩</span>
              {tempo}
            </span>
          </BtnBarre>
        ) : null}
        {bande && (
          <BtnBarre label={t(marche ? "performance.metronomeArreter" : "performance.metronomeLancer")} active={marche} onClick={onMarche} cacheTel bascule={marche}>
            {marche ? <Square className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          </BtnBarre>
        )}
        {onAnnoter && (
          <BtnBarre label={t("performance.crayon")} active={annotateMode} onClick={onAnnoter} cacheTel indispo={annoterIndispo}>
            <Pencil className="h-5 w-5" />
          </BtnBarre>
        )}
        <BtnBarre label={t("performance.toolsMenu")} menu="outils" menuOuvert={menuOuvert} onClick={() => onMenu("outils")}>
          <Wrench className="h-5 w-5" />
        </BtnBarre>
        <BtnBarre label={t("margeAffichage.titre")} menu="affichage" menuOuvert={menuOuvert} onClick={() => onMenu("affichage")}>
          <SlidersHorizontal className="h-5 w-5" />
        </BtnBarre>
        <BtnBarre label={t("performance.exit")} onClick={onQuitter}>
          <X className="h-5 w-5" />
        </BtnBarre>
      </div>
    </div>
  );
}

/** Bouton sans bordure façon forScore : icône dans `--couleur-icones`, fond teinté quand il est actif.
 *  `texte` : le libellé s'écrit à côté de l'icône à partir de md ; `cacheTel` : absent de la barre au téléphone. */
function BtnBarre({
  label,
  active = false,
  menu,
  menuOuvert,
  texte = false,
  cacheTel = false,
  bascule,
  indispo = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  /** Le bouton ouvre ce menu : `aria-haspopup`, `aria-expanded`, fond teinté tant qu'il est ouvert. */
  menu?: MenuId;
  menuOuvert?: MenuId | null;
  texte?: boolean;
  cacheTel?: boolean;
  /** Bouton ▶ / ■ du métronome : `aria-pressed` = cette valeur, repéré par `data-metronome-marche`. */
  bascule?: boolean;
  /** Désactivé mais touchable (aria-disabled) : le toucher explique pourquoi. */
  indispo?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const ouvert = menu !== undefined && menuOuvert === menu;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      data-menu-declencheur={menu}
      data-metronome-marche={bascule === undefined ? undefined : ""}
      aria-pressed={bascule}
      aria-disabled={indispo || undefined}
      aria-haspopup={menu ? "dialog" : undefined}
      aria-expanded={menu ? ouvert : undefined}
      className={`${cacheTel ? "hidden md:flex" : "flex"} h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[color:var(--couleur-icones)] transition-colors ${indispo ? "opacity-40" : ""} active:bg-muted ${
        active || ouvert ? "bg-[color-mix(in_srgb,var(--couleur-icones)_16%,transparent)] dark:bg-[color-mix(in_srgb,var(--couleur-icones)_28%,transparent)]" : "hover:bg-muted/60"
      }`}
    >
      {children}
      {texte && <span className="hidden text-xs font-semibold md:inline" aria-hidden="true">{label}</span>}
    </button>
  );
}
