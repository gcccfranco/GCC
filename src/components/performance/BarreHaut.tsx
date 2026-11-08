"use client";

import type { ComponentType, ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, Drum, Guitar, ListMusic, Mic, MicVocal, Music, PenLine, Piano, Type, Wrench, X } from "lucide-react";
import type { JianpuSheetBlock, SectionBlock } from "@/lib/performance/blocks";
import type { MenuId } from "./MenuLouange";

const ICONES_ROLE: Record<string, ComponentType<{ className?: string }>> = {
  pianiste: Piano,
  guitariste: Guitar,
  presidence: Mic,
  choriste: MicVocal,
  batteur: Drum,
};

/** Barre de titre du mode louange (forScore, piste A « Pupitre », FS-A) : à gauche Setlist et Je joue,
 *  au centre le titre et « compositeur · tonalité », à droite ♩ tempo, Annoter, Outils, Options
 *  d'affichage, ✕. Au téléphone : Setlist, Repères, Je joue | titre | Options, ✕ (Annoter, ♩ et Outils passent en tête de la feuille Options). Setlist, Repères, ♩, Outils et
 *  Options ouvrent chacun leur menu (FS-B, `MenuLouange`) : `menuOuvert` dit lequel, `onMenu` le bascule.
 *  `avecReperes` : le chant courant a des sections (un scan seul n'en a pas).
 *  `barreRef` est la ref de mesure lue par PerformanceMode (hauteur des barres).
 *  `onAnnoter` absent = bouton « Annoter » masqué. Les icônes prennent `--couleur-icones`. */
export function BarreHaut({
  barreRef,
  showChrome,
  currentSong,
  setlistTitle,
  compositeur,
  personalKey,
  rolePreset,
  annotateMode,
  menuOuvert,
  avecReperes,
  onAnnoter,
  onMenu,
  onJeJoue,
  onQuitter,
}: {
  barreRef: RefObject<HTMLDivElement | null>;
  showChrome: boolean;
  currentSong: SectionBlock | JianpuSheetBlock | undefined;
  setlistTitle: string;
  compositeur: string | undefined;
  personalKey: string | undefined;
  rolePreset: string | null;
  annotateMode: boolean;
  menuOuvert: MenuId | null;
  avecReperes: boolean;
  onAnnoter: (() => void) | undefined;
  onMenu: (id: MenuId) => void;
  onJeJoue: () => void;
  onQuitter: () => void;
}) {
  const { t } = useTranslation();
  const IconeRole = (rolePreset && ICONES_ROLE[rolePreset]) || Music;
  const tempo = currentSong?.tempo;
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
      <div className="flex min-w-[8.25rem] flex-1 basis-0 items-center justify-start gap-0.5 md:min-w-0">
        <BtnBarre label={t("performance.songList")} menu="setlist" menuOuvert={menuOuvert} onClick={() => onMenu("setlist")} texte>
          <ListMusic className="h-5 w-5" />
        </BtnBarre>
        {avecReperes && (
          <BtnBarre label={t("performance.reperes")} menu="reperes" menuOuvert={menuOuvert} onClick={() => onMenu("reperes")} texte>
            <Bookmark className="h-5 w-5" />
          </BtnBarre>
        )}
        <BtnBarre label={t("performance.iPlay")} onClick={onJeJoue} texte>
          <IconeRole className="h-5 w-5" />
        </BtnBarre>
      </div>

      {/* Les deux groupes latéraux prennent la même largeur (flex-1, base 0) tant que la place suffit : le titre est
          alors centré sur l'écran. Quand elle manque, seul le titre rétrécit (il se tronque), jamais un débordement. */}
      <div className="min-w-0 shrink px-1 text-center">
        <p className="truncate text-sm font-semibold leading-tight text-foreground md:text-base">
          {currentSong?.songTitle ?? setlistTitle}
        </p>
        {(compositeur || currentSong?.songKey) && (
          <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground md:text-[13px]">
            {compositeur}
            {compositeur && currentSong?.songKey ? " · " : null}
            {currentSong?.songKey && <span className="font-mono">{currentSong.songKey}</span>}
            {currentSong?.songKey && personalKey && (
              <>
                {" · "}
                <span>{t("performance.personalKey", { key: personalKey })}</span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="flex min-w-[8.25rem] flex-1 basis-0 items-center justify-end gap-0.5 md:min-w-0">
        {tempo ? (
          <BtnBarre label={t("performance.tempo")} menu="tempo" menuOuvert={menuOuvert} onClick={() => onMenu("tempo")} cacheTel>
            <span data-tempo-barre className="flex items-center gap-1 text-sm font-semibold tabular-nums">
              <span aria-hidden="true" className="text-xl leading-none">♩</span>
              {tempo}
            </span>
          </BtnBarre>
        ) : null}
        {onAnnoter && (
          <BtnBarre label={t("performance.annotate")} active={annotateMode} onClick={onAnnoter} cacheTel>
            <PenLine className="h-5 w-5" />
          </BtnBarre>
        )}
        <BtnBarre label={t("performance.toolsMenu")} menu="outils" menuOuvert={menuOuvert} onClick={() => onMenu("outils")} cacheTel>
          <Wrench className="h-5 w-5" />
        </BtnBarre>
        <BtnBarre label={t("performance.displayOptions")} menu="options" menuOuvert={menuOuvert} onClick={() => onMenu("options")}>
          <Type className="h-5 w-5" />
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
      aria-haspopup={menu ? "dialog" : undefined}
      aria-expanded={menu ? ouvert : undefined}
      className={`${cacheTel ? "hidden md:flex" : "flex"} h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[color:var(--couleur-icones)] transition-colors active:bg-muted ${
        active || ouvert ? "bg-[color-mix(in_srgb,var(--couleur-icones)_16%,transparent)] dark:bg-[color-mix(in_srgb,var(--couleur-icones)_28%,transparent)]" : "hover:bg-muted/60"
      }`}
    >
      {children}
      {texte && <span className="hidden text-xs font-semibold md:inline" aria-hidden="true">{label}</span>}
    </button>
  );
}
