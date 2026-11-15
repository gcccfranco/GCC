"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { gelasio_font, REPERE_FOIS, REPERE_ROND, REPERE_TEXTE } from "@/components/song/SongView";
import { NoteNoire } from "@/components/song/NoteNoire";
import { formatSectionName } from "@/lib/chordpro/parser";
import { groupSteps, isDp, paletteKeyOf } from "@/lib/setlist/dp";
import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";

/** Fondu de 16 px au bord droit de la rangée de repères quand elle déborde. */
const MASQUE_FONDU = "linear-gradient(to right, #000 calc(100% - 16px), transparent)";

/** Tête de feuille (lot JP-B, tranche 2) : sur chaque écran d'un scan 简谱 certifié, à la place de la barre de titre
 *  quand elle est escamotée (la barre ouverte la recouvre, son contenu s'efface). Hauteur au moins celle de la barre
 *  mesurée, encoche comprise : l'encoche est en haut, le contenu se pose dessous.
 *  B4, CI-10 : mêmes ronds que la page chant (32 px, 44 dès 640 px) ; allumé (section présente sur l'écran, ids de
 *  `sections.json`) = plein, sinon teinté. La tête grandit si besoin (le scan dessous prend le reste). À gauche la
 *  feuille de route dans l'ordre joué (« ×2 » dans le rond) ; à droite le tempo, le capo et « 1 = E » (« gravé en E »
 *  dessous quand le scan est transposé). Notes et transitions de la setlist : une seconde ligne. Pas de titre : il est dans la barre. */
export function TeteFeuille({
  hauteur,
  encoche,
  steps,
  allumes,
  songKey,
  gravure,
  tempo,
  capo,
  largeur = null,
}: {
  /** Hauteur CSS exacte (celle de la barre de titre, ramenée à l'échelle du texte). */
  hauteur: string;
  /** Hauteur de l'encoche (`var(--sat)` ramenée à l'échelle du texte) : le contenu se pose dessous. */
  encoche: string;
  steps: SectionOccurrence[];
  allumes: ReadonlySet<string>;
  songKey: string;
  /** Tonalité gravée sur le scan, quand elle diffère de celle jouée. */
  gravure: string | null;
  tempo?: number;
  capo?: number;
  /** Largeur (px CSS) de la fenêtre de scan quand elle est plus étroite que l'écran (ordinateur, tablette en paysage) :
   *  la tête se pose sur la feuille, centrée, du bord gauche au bord droit de l'encre. Absent : toute la largeur. */
  largeur?: number | null;
}) {
  const { t } = useTranslation();
  const groups = groupSteps(steps, (section) => formatSectionName(section, t));
  const note = groups
    .flatMap((g) => (g.step.note || g.step.transition ? [`${g.abbr} : ${[g.step.note, g.step.transition && `→ ${g.step.transition}`].filter(Boolean).join(" ")}`] : []))
    .join("   ·   ");
  const reperesRef = useRef<HTMLOListElement>(null);
  const [deborde, setDeborde] = useState(false);
  useLayoutEffect(() => {
    const reperes = reperesRef.current;
    if (!reperes) return;
    const mesurer = () => setDeborde(reperes.scrollWidth > reperes.clientWidth + 1);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(reperes);
    return () => ro.disconnect();
  }, [note, gravure, steps, largeur]);
  // Sur la feuille (fenêtre de scan plus étroite que l'écran) : pas de retrait, le premier repère est au-dessus du bord
  // gauche de l'encre ; sinon le retrait habituel.
  const surFeuille = largeur !== null;
  return (
    <div
      data-tete-feuille
      className="shrink-0"
      style={{ minHeight: hauteur, paddingTop: encoche }}
    >
      <div
        className={`mx-auto flex flex-col gap-1 py-1.5 ${surFeuille ? "" : "px-5"} [[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150`}
        style={surFeuille ? { width: largeur, maxWidth: "100%" } : undefined}
      >
        <div className="flex min-h-6 items-center gap-4">
          <ol
            ref={reperesRef}
            aria-label={t("songs.view.structure")}
            data-reperes-tete-deborde={deborde || undefined}
            className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3 overflow-x-hidden whitespace-nowrap"
            style={deborde ? { WebkitMaskImage: MASQUE_FONDU, maskImage: MASQUE_FONDU } : undefined}
          >
            {groups.map((g, i) => {
              const cle = paletteKeyOf(g.step.section);
              const allume = allumes.has(g.step.section.id);
              const couleur = `var(--sec-${cle})`;
              return (
                <li key={i} className="shrink-0">
                  <span
                    data-repere-tete
                    data-allume={allume || undefined}
                    data-dp={isDp(g.step.section) || undefined}
                    role="img"
                    aria-label={g.full}
                    className={`${REPERE_ROND} ${REPERE_TEXTE}`}
                    style={allume ? { background: couleur, color: "hsl(var(--background))" } : { background: `var(--sec-${cle}-tint)`, color: couleur }}
                  >
                    {g.abbr}
                    {g.repeat > 1 && <span data-repeat className={REPERE_FOIS}>×{g.repeat}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="flex shrink-0 flex-col items-end">
            <span className="flex items-baseline gap-3">
              {tempo ? (
                <span data-tempo-tete className="text-[14px] leading-none text-foreground">
                  <span className="sr-only">♩ = {tempo}</span>
                  <span aria-hidden="true">
                    <NoteNoire className="!mr-[2px] !h-[15px] !w-[7.2px] !align-baseline" />
                    = {tempo}
                  </span>
                </span>
              ) : null}
              {capo ? <span className="font-mono text-[14px] font-bold leading-none text-foreground">{t("performance.capoBadge", { n: capo })}</span> : null}
              <span data-cle-tete className={`${gelasio_font.className} text-[20px] font-bold leading-[22px] text-foreground [font-variant-numeric:lining-nums_tabular-nums]`}>1 = {songKey}</span>
            </span>
            {gravure && (
              <span data-grave-en className="text-[13px] leading-4 text-[#6c6c72] dark:text-[color:var(--pinyin-color)]">
                {t("performance.gravedIn", { key: gravure })}
              </span>
            )}
          </div>
        </div>
        {note && (
          <p data-note-tete className="truncate text-[18px] italic leading-[22px] text-[#636872] dark:text-[#9ba0a9]">{note}</p>
        )}
      </div>
    </div>
  );
}
