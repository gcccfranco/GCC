"use client";

import { useLayoutEffect, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { NuanceBadge, getChartSectionStyle, getSectionStyle, zh_lyric_font } from "@/components/song/SongView";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { formatSectionName } from "@/lib/chordpro/parser";
import { isDp, paletteKeyOf } from "@/lib/setlist/dp";
import type { SectionBlock } from "@/lib/performance/blocks";
import { ECHELLE_MAX, ETIREMENT_MAX, poidsSection } from "@/lib/performance/pagination";
import type { Disposition } from "@/lib/dispositionPref";

// Lot FS-D (docs/spec-mode-louange-forscore-2.md) : la feuille de route du batteur. En vue structure, une ligne par
// section jouée : grand repère, nom, ×N, tonalité, note, transition, nuance en grosse pastille. Pas de cadre ni de
// carte : des lignes séparées par un filet. Les tailles en px sont celles de la planche (notation lue de loin) et
// restent hors de l'échelle de texte B. Quand la page a de la place, le contenu des lignes grossit d'abord (variable
// CSS `--fdr-echelle`, posée par `useEchelleFeuille` ; la mesure de pagination ne la porte pas : échelle 1), puis les
// espaces s'étirent, chaque ligne en proportion de ses lignes de paroles. Sur une ligne étroite (moins de 560 px de
// large, requête de conteneur), la nuance passe sous le nom, dans la largeur du contenu : jamais au-delà des filets.

/** Taille en px de la planche, multipliée par l'échelle de la page (1 quand elle n'est pas posée : copie de mesure). */
const px = (n: number) => `calc(${n}px * var(--fdr-echelle, 1))`;

/** Pose `--fdr-echelle` sur la colonne des lignes d'une page `etire`, d'après la hauteur réelle : r = place libre /
 *  hauteur naturelle des lignes ; échelle = min(r, ECHELLE_MAX), réduite tant que les lignes agrandies ne tiennent
 *  pas (débordement vertical, ou un nom qui passe à la ligne). Au-delà de ETIREMENT_MAX × la hauteur naturelle, la
 *  colonne ne s'étire plus (lignes en haut de page). */
export function useEchelleFeuille(ref: RefObject<HTMLElement | null>, actif: boolean, naturel: number | undefined, cle: unknown) {
  useLayoutEffect(() => {
    const col = ref.current;
    if (!actif || !col || !naturel) return;
    const rangs = (el: HTMLElement) => Math.round(el.offsetHeight / (parseFloat(getComputedStyle(el).fontSize) * 1.25));
    const poser = () => {
      col.style.maxHeight = "";
      col.style.setProperty("--fdr-echelle", "1");
      const r = col.clientHeight / naturel;
      col.style.maxHeight = r > ETIREMENT_MAX ? `${ETIREMENT_MAX * naturel}px` : "";
      const noms = [...col.querySelectorAll<HTMLElement>("[data-feuille-route-nom]")];
      const base = noms.map(rangs);
      let e = Math.max(1, Math.min(ECHELLE_MAX, r));
      for (let k = 0; k < 8 && e > 1; k++) {
        col.style.setProperty("--fdr-echelle", String(e));
        const debord = col.scrollHeight > col.clientHeight + 1;
        // Une ligne plus large que la page (pastilles de nuance) ou un nom qui passe à la ligne : trop grand aussi.
        const coupe = noms.some((n, i) => rangs(n) > base[i]) || [...col.children].some((l) => l.scrollWidth > l.clientWidth + 1);
        if (!debord && !coupe) return;
        e = Math.max(1, debord ? e * (col.clientHeight / col.scrollHeight) * 0.99 : e * 0.94);
      }
      col.style.setProperty("--fdr-echelle", String(e));
    };
    poser();
    const ro = new ResizeObserver(poser);
    ro.observe(col);
    void document.fonts?.ready.then(poser);
    return () => ro.disconnect();
  }, [ref, actif, naturel, cle]);
}

/** Une section en vue structure. `couleurDe` : sorte de section dont un Dp emprunte la couleur (son origine). */
export function LigneFeuilleDeRoute({ block, repeat, couleurDe, disposition = "classique", transition }: { block: SectionBlock; repeat?: number; couleurDe?: string; disposition?: Disposition; transition?: string }) {
  const { t, i18n } = useTranslation();
  const { section, nuance, note, keyChange } = block;
  // Même règle que SectionView : couleur par type en « Couleurs par section », accent de la langue sinon.
  const couleurRepere = (
    disposition === "sections" ? getChartSectionStyle(couleurDe ?? section.type) : getSectionStyle(couleurDe ?? section.type, block.language === "zh")
  )["--sec-c" as keyof React.CSSProperties] as string;
  const n = repeat ?? block.repeat ?? 1;
  const police = i18n.language === "zh-CN" ? zh_lyric_font.className : "";
  const avecNuance = !!nuance && (nuance.tags.length > 0 || !!nuance.note);
  return (
    <div
      data-section
      data-section-uids={block.occurrenceUids?.join(" ")}
      data-feuille-route-ligne
      className="mx-auto flex w-full max-w-[880px] items-center border-border [container-type:inline-size] [&:not(:first-child)]:border-t"
      style={{ /* lot CA : la couleur des accords choisie ne change pas la feuille de route du batteur (« initial » rend l'accent de langue) */ "--accord-fr": "initial", "--accord-zh": "initial", "--sec-c": couleurRepere, flex: `${poidsSection(block)} 1 auto`, paddingBlock: px(12) } as React.CSSProperties}
    >
      {/* Le conteneur de requête est la ligne ; la mise en page (flex, ou grille sous 560 px) est sur ce cadre intérieur. */}
      <div className="flex w-full items-center [@container(max-width:560px)]:grid [@container(max-width:560px)]:grid-cols-[auto_minmax(0,1fr)]" style={{ gap: px(16) }}>
        <span
          aria-hidden="true"
          data-feuille-route-repere
          className="inline-flex shrink-0 items-center justify-center rounded-[7px] border-[2.5px] px-1 font-bold leading-none text-foreground"
          style={{ borderColor: `var(--sec-${paletteKeyOf(section)})`, height: px(64), minWidth: px(64), fontSize: px(28) }}
        >
          {isDp(section) ? "Dp" : abbreviateSection(section)}
        </span>
        <div className={`min-w-0 ${avecNuance ? "flex-[0_1_22rem]" : "flex-1"}`}>
          <p data-feuille-route-nom className={`font-bold leading-tight text-foreground ${police}`} style={{ fontSize: px(28) }}>
            {formatSectionName(section, t)}
            {n > 1 && <span className="ml-2">×{n}</span>}
            {keyChange && (
              <span className="ml-3 whitespace-nowrap" style={{ color: "var(--sec-c)", fontSize: px(22) }}>
                {t("setlists.detail.sectionKeyChange", { defaultValue: "升调 ({{key}})", key: keyChange })}
              </span>
            )}
          </p>
          {note && <p data-feuille-route-note className={`mt-0.5 leading-snug text-muted-foreground ${police}`} style={{ fontSize: px(18) }}>{note}</p>}
          {transition && (
            <p data-feuille-route-transition className={`mt-1 whitespace-pre-wrap leading-snug text-muted-foreground ${police}`} style={{ fontSize: px(18) }}>
              → {transition}
            </p>
          )}
        </div>
        {avecNuance && (
          <div
            data-feuille-route-nuance
            className="min-w-0 shrink [@container(max-width:560px)]:col-start-2 [@container(max-width:560px)]:justify-self-start [&_[data-nuance]]:justify-center [&_[data-nuance]]:rounded-xl [&_[data-nuance]]:px-4 [&_[data-nuance]]:min-h-[calc(44px*var(--fdr-echelle,1))] [&_[data-nuance]]:min-w-[calc(76px*var(--fdr-echelle,1))] [&_[data-nuance]]:text-[length:calc(22px*var(--fdr-echelle,1))] [&>span>span:not([data-nuance])]:text-[length:calc(18px*var(--fdr-echelle,1))]"
          >
            <NuanceBadge nuance={nuance} size="lg" />
          </div>
        )}
      </div>
    </div>
  );
}
