"use client";

import { useTranslation } from "react-i18next";
import { NuanceBadge, getChartSectionStyle, getSectionStyle, zh_lyric_font } from "@/components/song/SongView";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { formatSectionName } from "@/lib/chordpro/parser";
import { isDp } from "@/lib/setlist/dp";
import type { SectionBlock } from "@/lib/performance/blocks";
import type { Disposition } from "@/lib/dispositionPref";

// Lot FS-D (docs/spec-mode-louange-forscore-2.md) : la feuille de route du batteur. En vue structure, une ligne par
// section jouée : grand repère, nom, ×N, tonalité, note, nuance en grosse pastille. Pas de cadre ni de carte :
// des lignes séparées par un filet. Les tailles en px sont celles de la planche (notation lue de loin) et restent
// hors de l'échelle de texte B.

/** Une section en vue structure. `couleurDe` : sorte de section dont un Dp emprunte la couleur (son origine). */
export function LigneFeuilleDeRoute({ block, repeat, couleurDe, disposition = "classique" }: { block: SectionBlock; repeat?: number; couleurDe?: string; disposition?: Disposition }) {
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
      className="flex flex-[1_1_auto] items-center gap-4 border-border py-3 [&:not(:first-child)]:border-t"
      style={{ "--sec-c": couleurRepere } as React.CSSProperties}
    >
      <span
        aria-hidden="true"
        data-feuille-route-repere
        className="inline-flex h-14 min-w-14 shrink-0 items-center justify-center rounded-lg border-2 px-2 text-[22px] font-bold leading-none"
        style={{ borderColor: "var(--sec-c)", color: "var(--sec-c)", background: "color-mix(in srgb, var(--sec-c) 10%, transparent)" }}
      >
        {isDp(section) ? "Dp" : abbreviateSection(section)}
      </span>
      <div className="min-w-0 flex-1">
        <p data-feuille-route-nom className={`text-[28px] font-bold leading-tight text-foreground ${police}`}>
          {formatSectionName(section, t)}
          {n > 1 && <span className="ml-2">×{n}</span>}
          {keyChange && (
            <span className="ml-3 text-[22px]" style={{ color: "var(--sec-c)" }}>
              {t("setlists.detail.sectionKeyChange", { defaultValue: "升调 ({{key}})", key: keyChange })}
            </span>
          )}
        </p>
        {note && <p data-feuille-route-note className={`mt-0.5 text-[18px] leading-snug text-muted-foreground ${police}`}>{note}</p>}
      </div>
      {avecNuance && (
        <div
          data-feuille-route-nuance
          className="max-w-[55%] shrink-0 [&_[data-nuance]]:min-h-11 [&_[data-nuance]]:rounded-xl [&_[data-nuance]]:px-4 [&_[data-nuance]]:text-[18px]"
        >
          <NuanceBadge nuance={nuance} size="lg" />
        </div>
      )}
    </div>
  );
}

/** Transition entre deux sections, en vue structure : une ligne mince en retrait sous la ligne qui la précède. */
export function LigneTransitionFeuille({ text }: { text: string }) {
  const { i18n } = useTranslation();
  return (
    <p
      data-feuille-route-transition
      className={`pb-2 pl-[72px] text-[18px] leading-snug text-muted-foreground whitespace-pre-wrap ${i18n.language === "zh-CN" ? zh_lyric_font.className : ""}`}
    >
      {text}
    </p>
  );
}
