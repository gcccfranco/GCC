"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { gelasio_font } from "@/components/song/SongView";
import { formatSectionName } from "@/lib/chordpro/parser";
import { groupSteps, isDp, paletteKeyOf } from "@/lib/setlist/dp";
import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";

/** Tête de feuille (lot JP-B, tranche 2) : sur chaque écran d'un scan 简谱 certifié, à la place de la barre de titre
 *  quand elle est escamotée (la barre ouverte la recouvre exactement, jamais la première ligne d'accords). Hauteur =
 *  celle de la barre mesurée, encoche comprise : l'encoche est en haut, le contenu se pose dessous.
 *  Une rangée (rien ne grandit) : à gauche la feuille de route de ce dimanche, repères encadrés dans l'ordre joué
 *  (filet de la couleur de section, lettre à l'encre, « ×2 » dans le cadre, Dp en tirets) ; à droite le tempo, le
 *  capo et « 1 = E » (« gravé en E » dessous quand le scan est transposé). Les repères des sections présentes sur
 *  l'écran (`allumes`, ids de `sections.json`) sont teintés. Notes et transitions de la setlist : une seconde ligne,
 *  seulement si elle tient dans la hauteur. Le titre du chant n'est pas répété : il est dans la barre. */
export function TeteFeuille({
  hauteur,
  encoche,
  steps,
  allumes,
  songKey,
  gravure,
  tempo,
  capo,
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
}) {
  const { t } = useTranslation();
  const groups = groupSteps(steps, (section) => formatSectionName(section, t));
  const note = groups
    .flatMap((g) => (g.step.note || g.step.transition ? [`${g.abbr} : ${[g.step.note, g.step.transition && `→ ${g.step.transition}`].filter(Boolean).join(" ")}`] : []))
    .join("   ·   ");
  const zoneRef = useRef<HTMLDivElement>(null);
  const rangeeRef = useRef<HTMLDivElement>(null);
  const [placeNote, setPlaceNote] = useState(false);
  // La seconde ligne ne s'affiche que si elle tient sous la rangée, dans la hauteur de la tête.
  useLayoutEffect(() => {
    const zone = zoneRef.current;
    const rangee = rangeeRef.current;
    if (!zone || !rangee) return;
    const mesurer = () => setPlaceNote(rangee.offsetHeight + 4 + 22 <= zone.clientHeight);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(zone);
    ro.observe(rangee);
    return () => ro.disconnect();
  }, [note, gravure]);
  return (
    <div
      data-tete-feuille
      className="shrink-0 overflow-hidden px-5"
      style={{ height: hauteur, paddingTop: encoche }}
    >
      <div ref={zoneRef} className="flex h-full min-h-0 flex-col justify-center gap-1 [[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150">
        <div ref={rangeeRef} className="flex min-h-6 items-center gap-4">
          <ol
            aria-label={t("songs.view.structure")}
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {groups.map((g, i) => {
              const cle = paletteKeyOf(g.step.section);
              const allume = allumes.has(g.step.section.id);
              return (
                <li key={i} className="shrink-0">
                  <span
                    data-repere-tete
                    data-allume={allume || undefined}
                    data-dp={isDp(g.step.section) || undefined}
                    title={g.full}
                    className={`inline-flex h-6 items-center justify-center rounded-[4px] border-[1.5px] px-1.5 text-[14px] font-semibold leading-none text-foreground ${isDp(g.step.section) ? "border-dashed" : "border-solid"}`}
                    style={{ borderColor: `var(--sec-${cle})`, background: allume ? `var(--sec-${cle}-tint)` : "transparent" }}
                  >
                    {g.abbr}
                    {g.repeat > 1 && <span data-repeat className="ml-1">×{g.repeat}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="flex shrink-0 items-center gap-3">
            {tempo ? <span data-tempo-tete className="text-[14px] leading-none text-muted-foreground">♩ = {tempo}</span> : null}
            {capo ? <span className="font-mono text-[14px] font-bold leading-none text-muted-foreground">{t("performance.capoBadge", { n: capo })}</span> : null}
            <span className="flex flex-col items-end">
              <span data-cle-tete className={`${gelasio_font.className} text-[16px] font-bold leading-[18px] text-foreground`}>1 = {songKey}</span>
              {gravure && (
                <span data-grave-en className="text-[12px] leading-[14px]" style={{ color: "var(--pinyin-color)" }}>
                  {t("performance.gravedIn", { key: gravure })}
                </span>
              )}
            </span>
          </div>
        </div>
        {note && placeNote && (
          <p data-note-tete className="truncate text-[18px] italic leading-[22px] text-[#636872] dark:text-[#9ba0a9]">{note}</p>
        )}
      </div>
    </div>
  );
}
