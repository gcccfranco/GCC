"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Highlighter, Maximize, Minus, Plus, Timer, Waves } from "lucide-react";
import { pinyin_font } from "@/components/song/pinyinFont";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { formatSectionName } from "@/lib/chordpro/parser";
import { isDp, paletteKeyOf } from "@/lib/setlist/dp";
import { formatDate } from "@/lib/utils/formatDate";
import { TEMPO_DEPART, TEMPO_MAX, TEMPO_MIN } from "@/lib/performance/tempo";
import type { SectionBlock, SongHeaderBlock } from "@/lib/performance/blocks";
import { compter } from "@/lib/usage";

// ─── Briques communes ─────────────────────────────────────────────────────────

const COULEUR = "text-[color:var(--couleur-icones)]";
/** Ligne en cours (Setlist, Repères) : la couleur des icônes à 12 %. */
const LIGNE_COURANTE = "bg-[color-mix(in_srgb,var(--couleur-icones)_12%,transparent)]";

/** Titre de rubrique, le même partout dans les menus : casse de phrase, 13 px, gris, demi-gras. */
export function TitreRubrique({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className="px-1 pb-1 text-[13px] font-semibold leading-tight text-muted-foreground">
      {children}
    </p>
  );
}

/** Valeur entre deux ronds (tonalité, tempo, capo, taille) : même largeur, même corps partout, colonnes − / + alignées. */
export const VALEUR = "w-16 text-center text-xl font-semibold leading-none tabular-nums text-foreground";

/** Bouton rond de 44 px (ou 48). Sans `allume`, une action : contour neutre, glyphe dans la couleur des icônes.
 *  Avec `allume` (aria-pressed) : allumé = fond dans la couleur des icônes, glyphe de la couleur du fond de la page. */
export function BoutonRond({
  label,
  onClick,
  allume,
  disabled,
  taille = 44,
  children,
  ...reste
}: {
  label: string;
  onClick: () => void;
  allume?: boolean;
  disabled?: boolean;
  taille?: 44 | 48;
  children: ReactNode;
} & Record<`data-${string}`, string | undefined>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={allume}
      disabled={disabled}
      onClick={onClick}
      {...reste}
      className={`inline-flex ${taille === 48 ? "h-12 w-12" : "h-11 w-11"} shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
        allume === undefined ? `border-border ${COULEUR} active:bg-muted` : allume ? "border-transparent bg-[color:var(--couleur-icones)] text-background" : "border-border text-muted-foreground active:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** Bouton rond « Sur la page » : le rond, son libellé dessous ; le nom accessible est le libellé. */
export function BoutonSurPage({
  label,
  allume,
  onClick,
  children,
}: {
  label: string;
  allume: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={allume}
      onClick={onClick}
      className="flex w-full min-w-0 flex-col items-center gap-1 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 items-center justify-center rounded-full border text-base font-bold transition-colors ${
          allume ? "border-transparent bg-[color:var(--couleur-icones)] text-background" : "border-border text-muted-foreground"
        }`}
      >
        {children}
      </span>
      <span className="text-center text-[11px] font-medium leading-tight text-foreground md:text-[13px]">{label}</span>
    </button>
  );
}

/** Ligne d'un menu : libellé (et sous-libellé) à gauche, commande à droite. */
export function LigneMenu({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

// ─── Setlist ──────────────────────────────────────────────────────────────────

export function ContenuSetlist({
  setlistTitle,
  setlistDate,
  songEntries,
  pages,
  currentSongEntryIdx,
  goToPage,
  onFermer,
}: {
  setlistTitle: string;
  setlistDate?: string;
  songEntries: { block: SongHeaderBlock; index: number }[];
  pages: number[][];
  currentSongEntryIdx: number;
  goToPage: (p: number, pgCount: number) => void;
  onFermer: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <div className="px-1 pb-2">
        <p className="truncate text-base font-semibold text-foreground">{setlistTitle}</p>
        <p className="truncate text-[13px] text-muted-foreground">
          {setlistDate ? `${formatDate(setlistDate, i18n.language)} · ` : null}
          {t("performance.songCount", { count: songEntries.length })}
        </p>
      </div>
      <ol className="-mx-1">
        {songEntries.map(({ block, index }, i) => {
          const page = pages.findIndex((p) => p.includes(index));
          const courant = i === currentSongEntryIdx;
          const sous = block.titlePinyin || block.artist;
          return (
            <li key={block.uid}>
              <button
                type="button"
                aria-current={courant ? "true" : undefined}
                onClick={() => {
                  if (page >= 0) goToPage(page, pages.length);
                  onFermer();
                }}
                className={`flex min-h-12 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${courant ? LIGNE_COURANTE : "hover:bg-muted/60 active:bg-muted"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {courant ? <Check aria-hidden="true" className={`h-4 w-4 ${COULEUR}`} /> : block.position}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-base ${courant ? "font-semibold" : "font-medium"} text-foreground`}>{block.title}</span>
                  {sous && (
                    <span className={`block truncate text-[13px] text-muted-foreground ${block.titlePinyin ? pinyin_font.className : ""}`}>{sous}</span>
                  )}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{block.songKey}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── Repères ──────────────────────────────────────────────────────────────────

export function ContenuReperes({
  reperes,
  currentPage,
  goToPage,
  pageCount,
  onFermer,
}: {
  reperes: { uid: string; section: SectionBlock["section"]; page: number }[];
  /** Page affichée : la section en cours est la première de celles qui commencent sur la plus récente page ≤ elle. */
  currentPage: number;
  goToPage: (p: number, pgCount: number) => void;
  pageCount: number;
  onFermer: () => void;
}) {
  const { t } = useTranslation();
  const pageCourante = reperes.reduce((m, r) => (r.page <= currentPage && r.page > m ? r.page : m), -1);
  const courante = pageCourante >= 0 ? reperes.find((r) => r.page === pageCourante)?.uid : undefined;
  return (
    <ol className="-mx-1">
      {reperes.map((r) => {
        const cle = paletteKeyOf(r.section);
        const enCours = r.uid === courante;
        return (
          <li key={r.uid}>
            <button
              type="button"
              aria-current={enCours ? "true" : undefined}
              onClick={() => {
                compter("cmd.louange.reperes");
                goToPage(r.page, pageCount);
                onFermer();
              }}
              className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${enCours ? LIGNE_COURANTE : "hover:bg-muted/60 active:bg-muted"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              <span
                aria-hidden="true"
                data-repere-sigle
                className="inline-flex h-8 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold leading-none"
                style={{ background: `var(--sec-${cle}-tint)`, color: `var(--sec-${cle})` }}
              >
                {isDp(r.section) ? "Dp" : abbreviateSection(r.section)}
              </span>
              <span className="flex min-w-0 flex-1 items-baseline gap-3">
                <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">{formatSectionName(r.section, t)}</span>
                <span className={`shrink-0 text-[13px] tabular-nums ${COULEUR}`}>{t("performance.pageShort", { n: r.page + 1 })}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Tempo ────────────────────────────────────────────────────────────────────

/** Les lignes du tempo : − / + autour de la valeur, « Tempo du fichier » quand l'appareil en a un autre.
 *  Même composant dans le menu Tempo (md et plus) et dans Outils (téléphone). */
export function LignesTempo({
  tempo,
  tempoAppareil,
  changerTempo,
  effacerTempo,
}: {
  tempo: number | undefined;
  tempoAppareil: number | null;
  changerTempo: (delta: number) => void;
  effacerTempo: () => void;
}) {
  const { t } = useTranslation();
  const valeur = tempo ?? TEMPO_DEPART;
  return (
    <>
      <LigneMenu label={t("performance.tempoSong")}>
        <BoutonRond label={t("performance.tempoDown")} onClick={() => changerTempo(-1)} disabled={valeur <= TEMPO_MIN} data-tempo-moins="">
          <Minus className="h-4 w-4" />
        </BoutonRond>
        <span data-tempo-valeur className={`${VALEUR} inline-flex items-baseline justify-center gap-1`}>
          <span aria-hidden="true">♩</span>
          {valeur}
        </span>
        <BoutonRond label={t("performance.tempoUp")} onClick={() => changerTempo(1)} disabled={valeur >= TEMPO_MAX} data-tempo-plus="">
          <Plus className="h-4 w-4" />
        </BoutonRond>
      </LigneMenu>
      {tempoAppareil !== null && (
        <button
          type="button"
          data-tempo-fichier
          onClick={effacerTempo}
          className={`min-h-11 rounded-lg px-1 text-sm font-semibold ${COULEUR} hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          {t("performance.tempoFile")}
        </button>
      )}
    </>
  );
}

export function ContenuTempo({
  tempo,
  tempoAppareil,
  changerTempo,
  effacerTempo,
  metronome,
  setMetronome,
}: {
  tempo: number | undefined;
  tempoAppareil: number | null;
  changerTempo: (delta: number) => void;
  effacerTempo: () => void;
  metronome: boolean;
  setMetronome: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <LignesTempo tempo={tempo} tempoAppareil={tempoAppareil} changerTempo={changerTempo} effacerTempo={effacerTempo} />
      <LigneMenu label={t("performance.metronome")}>
        <BoutonRond label={t("performance.metronome")} allume={metronome} onClick={() => setMetronome(!metronome)} taille={44} data-metronome="">
          <Waves className="h-5 w-5" />
        </BoutonRond>
      </LigneMenu>
    </div>
  );
}

// ─── Outils ───────────────────────────────────────────────────────────────────

/** Plein écran : l'état se lit sur `fullscreenchange` (la touche Échap du navigateur le quitte aussi). */
function usePleinEcran() {
  const [actif, setActif] = useState(false);
  useEffect(() => {
    const maj = () => setActif(!!document.fullscreenElement);
    maj();
    document.addEventListener("fullscreenchange", maj);
    return () => document.removeEventListener("fullscreenchange", maj);
  }, []);
  const disponible = typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";
  const basculer = () => {
    compter("cmd.louange.pleinEcran");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  return { actif, disponible, basculer };
}

export function ContenuOutils({
  cle,
  cleSetlist,
  decalerCle,
  revenirCle,
  capo,
  showTransitions,
  setShowTransitions,
  onAnnoter,
  tempoLignes,
  raccourcis,
}: {
  /** Tonalité affichée et celle de la setlist ; absentes = pas de ligne tonalité (fusion, aucun chant). */
  cle: string | undefined;
  cleSetlist: string | undefined;
  decalerCle: (demiTons: number) => void;
  revenirCle: () => void;
  capo: { frets: number; set: (frets: number) => void; titre: string } | undefined;
  showTransitions: boolean;
  setShowTransitions: (v: boolean) => void;
  /** Téléphone seulement : la barre n'a plus « Annoter ». Absent = pas de ligne. */
  onAnnoter: (() => void) | undefined;
  /** Téléphone seulement : les lignes du tempo, sous le métronome. Absent = pas de ligne. */
  tempoLignes: ReactNode;
  raccourcis: boolean;
}) {
  const { t } = useTranslation();
  const pleinEcran = usePleinEcran();
  return (
    <div className="space-y-1">
      {cle && (
        <>
          <LigneMenu label={t("performance.key")}>
            <BoutonRond label={t("performance.keyDown")} onClick={() => decalerCle(-1)} data-cle-moins="">
              <Minus className="h-4 w-4" />
            </BoutonRond>
            <span data-cle-valeur className={VALEUR}>{cle}</span>
            <BoutonRond label={t("performance.keyUp")} onClick={() => decalerCle(1)} data-cle-plus="">
              <Plus className="h-4 w-4" />
            </BoutonRond>
          </LigneMenu>
          {cleSetlist && cleSetlist !== cle && (
            <button
              type="button"
              onClick={revenirCle}
              className={`min-h-11 rounded-lg px-1 text-sm font-semibold ${COULEUR} hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              {t("performance.personalKeyReset", { key: cleSetlist })}
            </button>
          )}
        </>
      )}
      {capo && (
        <LigneMenu label={t("performance.capo")} hint={capo.titre}>
          <BoutonRond label={t("performance.capoLower")} onClick={() => capo.set(capo.frets - 1)} disabled={capo.frets <= 0}>
            <Minus className="h-4 w-4" />
          </BoutonRond>
          <span className={VALEUR}>{capo.frets}</span>
          <BoutonRond label={t("performance.capoRaise")} onClick={() => capo.set(capo.frets + 1)} disabled={capo.frets >= 11}>
            <Plus className="h-4 w-4" />
          </BoutonRond>
        </LigneMenu>
      )}
      <LigneMenu label={t("performance.transitions")}>
        <BoutonRond label={t("performance.transitions")} allume={showTransitions} onClick={() => { compter("cmd.chant.transitions"); setShowTransitions(!showTransitions); }}>
          <Timer className="h-5 w-5" />
        </BoutonRond>
      </LigneMenu>
      {pleinEcran.disponible && (
        <LigneMenu label={t("performance.fullscreen")}>
          <BoutonRond label={t("performance.fullscreen")} allume={pleinEcran.actif} data-plein-ecran="" onClick={pleinEcran.basculer}>
            <Maximize className="h-5 w-5" />
          </BoutonRond>
        </LigneMenu>
      )}
      {onAnnoter && (
        // Annoter est une action, pas un interrupteur : une ligne entière cliquable, icône et libellé dans la couleur des actions.
        <button
          type="button"
          data-annoter
          onClick={onAnnoter}
          className={`flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-sm font-semibold ${COULEUR} hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          <Highlighter aria-hidden="true" className="h-5 w-5 shrink-0" />
          {t("performance.annotate")}
        </button>
      )}
      {tempoLignes}
      {raccourcis && (
        <div data-raccourcis className="mt-2 border-t border-border pt-3">
          <TitreRubrique>{t("performance.shortcuts")}</TitreRubrique>
          <dl className="space-y-1.5 text-sm">
            {([
              [t("performance.prevPage"), ["←", "Page↑"]],
              [t("performance.nextPage"), ["→", "Page↓", t("performance.keySpace")]],
              [t("performance.shortcutEsc"), [t("performance.keyEsc")]],
            ] as [string, string[]][]).map(([nom, touches]) => (
              <div key={nom} className="flex items-center justify-between gap-3 px-1">
                <dt className="text-foreground">{nom}</dt>
                <dd className="flex shrink-0 items-center gap-1">
                  {touches.map((k) => (
                    <kbd key={k} className="rounded-[5px] bg-muted px-1.5 py-[3px] text-xs font-semibold leading-none text-foreground">{k}</kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
