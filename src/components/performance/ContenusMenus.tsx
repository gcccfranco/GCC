"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Lightbulb, Maximize, Pencil, PenLine, Timer, Undo2, Waves } from "lucide-react";
import { pinyin_font } from "@/components/song/pinyinFont";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { formatSectionName } from "@/lib/chordpro/parser";
import { isDp, paletteKeyOf } from "@/lib/setlist/dp";
import { formatDate } from "@/lib/utils/formatDate";
import type { SectionBlock, SongHeaderBlock } from "@/lib/performance/blocks";
import type { FSSetlist } from "@/types/setList";
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

/** Les setlists à venir du menu : celles de mes services, les autres ; `horsLigne` = seulement les copies gardées. */
export type ListeSetlistsMenu = { miens: FSSetlist[]; autres: FSSetlist[]; horsLigne: boolean };

/** « Mes autres setlists » : toujours dépliée, sous la setlist en cours ; la liste est lue une fois, au montage du menu (le menu fermé démonte son contenu). */
function ToutesMesSetlists({
  charger,
  onOuvrir,
  onFermer,
}: {
  charger: () => Promise<ListeSetlistsMenu>;
  onOuvrir: (id: string) => void;
  onFermer: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [liste, setListe] = useState<ListeSetlistsMenu | null>(null);
  useEffect(() => {
    let annule = false;
    charger().then((l) => { if (!annule) setListe(l); }, () => { if (!annule) setListe({ miens: [], autres: [], horsLigne: true }); });
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une lecture, à l'ouverture du menu
  }, []);
  const ligne = (s: FSSetlist) => {
    const n = s.items?.filter((i) => i.songSlug).length;
    return (
      <li key={s.id}>
        <button
          type="button"
          data-autre-setlist={s.id}
          onClick={() => {
            onFermer();
            onOuvrir(s.id);
          }}
          className="flex min-h-12 w-full items-center rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-normal text-foreground">{s.title}</span>
            <span className="block truncate text-[13px] text-muted-foreground">
              {formatDate(s.date, i18n.language)}
              {n ? ` · ${t("performance.songCount", { count: n })}` : null}
            </span>
          </span>
        </button>
      </li>
    );
  };
  return (
    <div className="mt-3 border-t border-border pb-3 pt-3">
      <p data-toutes-setlists className="px-1 pb-1 text-[15px] font-semibold text-foreground">{t("performance.myOtherSetlists")}</p>
      {!liste ? (
        <p className="px-1 text-[13px] text-muted-foreground">{t("performance.loadingSetlists")}</p>
      ) : (
        <>
          {liste.miens.length > 0 && <ul className="-mx-1">{liste.miens.map(ligne)}</ul>}
          {liste.miens.length > 0 && liste.autres.length > 0 && <div className="my-2 border-t border-border" />}
          {liste.autres.length > 0 && <ul className="-mx-1">{liste.autres.map(ligne)}</ul>}
          {liste.autres.length === 0 && liste.miens.length === 0 && (
            <p className="px-1 text-[13px] text-muted-foreground">{t(liste.horsLigne ? "performance.noOtherSetlistOffline" : "performance.noOtherSetlist")}</p>
          )}
        </>
      )}
    </div>
  );
}

export function ContenuSetlist({
  setlistTitle,
  setlistDate,
  songEntries,
  pages,
  currentSongEntryIdx,
  goToPage,
  onFermer,
  chargerToutesSetlists,
  onOuvrirSetlist,
  onglets,
  tousLesChants,
  onRetirer,
  retour,
}: {
  setlistTitle: string;
  setlistDate?: string;
  songEntries: { block: SongHeaderBlock; index: number }[];
  pages: number[][];
  currentSongEntryIdx: number;
  goToPage: (p: number, pgCount: number) => void;
  onFermer: () => void;
  chargerToutesSetlists?: () => Promise<ListeSetlistsMenu>;
  onOuvrirSetlist?: (id: string) => void;
  /** Onglets « Mes setlists | Tous les chants », en tête du menu. */
  onglets?: ReactNode;
  /** Si fourni, remplace l'en-tête et la liste de la setlist. */
  tousLesChants?: ReactNode;
  /** Retire un chant ajouté (bouton « Retirer » sur sa ligne). */
  onRetirer?: (slug: string) => void;
  /** « Revenir à {chant}, page {n} » : visible quand le chant en cours est un ajout. */
  retour?: { titre: string; page: number; onAller: () => void };
}) {
  const { t, i18n } = useTranslation();
  return (
    <div>
      {onglets}
      {/* Panneau relié aux onglets (aria-controls). */}
      <div role={onglets ? "tabpanel" : undefined} id={onglets ? "panneau-setlist" : undefined} aria-labelledby={onglets ? (tousLesChants ? "onglet-chants" : "onglet-setlist") : undefined}>
      {tousLesChants ?? <>
      {retour && (
        <button
          type="button"
          data-revenir
          onClick={() => { retour.onAller(); onFermer(); }}
          className="-mx-1 mb-1 flex min-h-12 w-[calc(100%+0.5rem)] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-base font-medium text-foreground transition-colors hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Undo2 aria-hidden="true" className={`h-5 w-5 shrink-0 ${COULEUR}`} />
          <span className="min-w-0 flex-1 truncate">{t("performance.revenirA", { titre: retour.titre, n: retour.page })}</span>
        </button>
      )}
      <div className="px-1 pb-2">
        <p className="truncate text-base font-semibold text-foreground">{setlistTitle}</p>
        <p className="truncate text-[13px] text-muted-foreground">
          {setlistDate ? `${formatDate(setlistDate, i18n.language)} · ` : null}
          {t("performance.songCount", { count: songEntries.length })}
        </p>
      </div>
      <ol className="-mx-1">
        {songEntries.map(({ block, index }, i) => {
          const avecAjout = !!onRetirer && songEntries.some((e) => !Number.isInteger(e.block.position) && !!e.block.songSlug);
          const page = pages.findIndex((p) => p.includes(index));
          const courant = i === currentSongEntryIdx;
          const sous = block.titlePinyin || block.artist;
          const retirable = !!onRetirer && !Number.isInteger(block.position) && !!block.songSlug;
          return (
            <li key={block.uid} className={retirable ? `flex items-center rounded-lg ${courant ? LIGNE_COURANTE : ""}` : undefined}>
              <button
                type="button"
                aria-current={courant ? "true" : undefined}
                onClick={() => {
                  if (page >= 0) goToPage(page, pages.length);
                  onFermer();
                }}
                className={`flex min-h-12 w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${courant ? (retirable ? "" : LIGNE_COURANTE) : "hover:bg-muted/60 active:bg-muted"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {courant ? <Check aria-hidden="true" className={`h-4 w-4 ${COULEUR}`} /> : Number.isInteger(block.position) ? block.position : "+"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-base ${courant ? "font-semibold" : "font-medium"} text-foreground`}>{block.title}</span>
                  {sous && (
                    <span className={`block truncate text-[13px] text-muted-foreground ${block.titlePinyin ? pinyin_font.className : ""}`}>{sous}</span>
                  )}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{block.songKey}</span>
              </button>
              {retirable ? (
                <button
                  type="button"
                  data-retirer
                  onClick={(e) => {
                    // Le focus passe au bouton de la ligne précédente (toujours là) avant que celle-ci disparaisse.
                    e.currentTarget.closest("li")?.previousElementSibling?.querySelector("button")?.focus();
                    onRetirer(block.songSlug!);
                  }}
                  className="ml-1 min-h-11 w-20 shrink-0 rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("performance.retirer")}
                </button>
              ) : avecAjout ? <span aria-hidden="true" className="w-20 shrink-0" /> : null}
            </li>
          );
        })}
      </ol>
      {chargerToutesSetlists && onOuvrirSetlist && (
        <ToutesMesSetlists charger={chargerToutesSetlists} onOuvrir={onOuvrirSetlist} onFermer={onFermer} />
      )}
      </>}
      </div>
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
  showTransitions,
  setShowTransitions,
  metronome,
  annotations,
  idees,
  onAnnoter,
  annoterIndispo = false,
  onMetronome,
  raccourcis,
}: {
  showTransitions: boolean;
  setShowTransitions: (v: boolean) => void;
  /** Bande des temps (réglage de l'appareil) : l'interrupteur « Métronome ». */
  metronome: { allume: boolean; set: (v: boolean) => void };
  /** Annotations des autres sur la page (réglage de l'appareil) ; absent hors connexion. */
  annotations: { allume: boolean; set: (v: boolean) => void } | undefined;
  /** Idées d'harmonie (réglage du compte) ; absent sans l'accès. */
  idees: { allume: boolean; set: (v: boolean) => void } | undefined;
  /** Crayon : la barre ne l'a plus au téléphone. Absent = pas de ligne. */
  onAnnoter: (() => void) | undefined;
  /** Ma partition n'a pas pu être lue : la ligne reste, désactivée (son toucher dit pourquoi). */
  annoterIndispo?: boolean;
  /** Téléphone seulement : ouvre le panneau Métronome. Absent = pas de ligne. */
  onMetronome: (() => void) | undefined;
  raccourcis: boolean;
}) {
  const { t } = useTranslation();
  const pleinEcran = usePleinEcran();
  return (
    <div className="space-y-1">
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
      <LigneMenu label={t("performance.metronome")}>
        <BoutonRond label={t("performance.metronome")} allume={metronome.allume} onClick={() => metronome.set(!metronome.allume)} data-metronome="">
          <Waves className="h-5 w-5" />
        </BoutonRond>
      </LigneMenu>
      {annotations && (
        <LigneMenu label={t("performance.annotations")}>
          <BoutonRond label={t("performance.annotations")} allume={annotations.allume} onClick={() => annotations.set(!annotations.allume)}>
            <PenLine className="h-5 w-5" />
          </BoutonRond>
        </LigneMenu>
      )}
      {idees && (
        <LigneMenu label={t("performance.ideesHarmonie")}>
          <BoutonRond label={t("performance.ideesHarmonie")} allume={idees.allume} onClick={() => idees.set(!idees.allume)}>
            <Lightbulb className="h-5 w-5" />
          </BoutonRond>
        </LigneMenu>
      )}
      {onAnnoter && (
        // Le Crayon est une action, pas un interrupteur : une ligne entière cliquable, icône et libellé dans la couleur des actions.
        <button
          type="button"
          data-annoter
          aria-disabled={annoterIndispo || undefined}
          onClick={onAnnoter}
          className={`${annoterIndispo ? "opacity-40 " : ""}flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-sm font-semibold ${COULEUR} hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          <Pencil aria-hidden="true" className="h-5 w-5 shrink-0" />
          {t("performance.crayon")}
        </button>
      )}
      {onMetronome && (
        <button
          type="button"
          data-metronome-ouvrir
          onClick={onMetronome}
          className={`flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-sm font-semibold ${COULEUR} hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        >
          <Waves aria-hidden="true" className="h-5 w-5 shrink-0" />
          {t("panneauMetronome.metronomeLigne")}
        </button>
      )}
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
