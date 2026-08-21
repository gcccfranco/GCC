"use client";

import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import { CHART_TYPE_COLOR, NuanceBadge } from "@/components/song/SongView";
import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";

/** Structure jouée d'un chant affiché sur sa partition 简谱, en une ligne.
 *
 *  Le scan porte déjà le titre, l'auteur et la tonalité : les répéter au-dessus
 *  coûtait ~200 px de hauteur, et comme la page est contrainte par sa hauteur,
 *  cette hauteur perdue se retrouvait en marges blanches sur les côtés. Ce que
 *  le scan ne peut pas porter, en revanche, c'est ce que la présidence a décidé
 *  pour ce dimanche : l'ordre des sections, les reprises, les nuances. C'est
 *  donc cela — et seulement cela — qui remplace la bande titre. */
export function JianpuStructureStrip({
  position,
  steps,
  capo,
  className = "",
  children,
}: {
  position: number;
  steps: SectionOccurrence[];
  capo?: number;
  className?: string;
  /** Badges d'état propres au contexte (partition 简谱 active, version
   *  modifiée…) — ils restent sur la même ligne que la structure. */
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();

  // Occurrences consécutives d'une même section repliées en « ×2 ». Seulement
  // quand rien ne les distingue : deux refrains dont l'un a une nuance ne sont
  // pas la même chose jouée deux fois.
  const groups: { step: SectionOccurrence; label: string; repeat: number }[] = [];
  for (const step of steps) {
    const label = formatSectionName(step.section, t);
    const last = groups[groups.length - 1];
    const bare = !step.note && !step.nuance && !step.targetKey;
    if (last && last.label === label && bare && !last.step.note && !last.step.nuance && !last.step.targetKey) {
      last.repeat++;
      continue;
    }
    groups.push({ step, label, repeat: 1 });
  }

  // Espacements en marges explicites plutôt qu'en `gap` : la ligne mélange des
  // écarts de deux natures (entre étapes, et à l'intérieur d'une étape entre le
  // libellé et ses annotations), qu'un `gap` unique rendrait indistincts.
  return (
    <div className={`flex flex-wrap items-center gap-y-1.5 pb-2 border-b border-border ${className}`}>
      <span className="w-5 h-5 mr-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
        {position}
      </span>
      {capo ? (
        <span className="mr-3 text-[10px] font-bold font-mono border border-border rounded-full px-1.5 py-0.5 text-muted-foreground">
          {t("performance.capoBadge", { n: capo })}
        </span>
      ) : null}
      {groups.map(({ step, label, repeat }, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="mx-3 text-muted-foreground/40">·</span>}
          <span
            className="text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ color: CHART_TYPE_COLOR[step.section.type] ?? "var(--sec-other)" }}
          >
            {label}
            {repeat > 1 && <span className="ml-1 font-mono normal-case">×{repeat}</span>}
          </span>
          {step.targetKey && (
            <span className="ml-1.5 text-[10px] font-mono text-muted-foreground">→ {step.targetKey}</span>
          )}
          {step.note && (
            <span className="ml-1.5 text-[11px] text-muted-foreground">— {step.note}</span>
          )}
          {step.nuance && (
            <span className="ml-1.5 inline-flex">
              <NuanceBadge nuance={step.nuance} />
            </span>
          )}
        </span>
      ))}
      {children && <span className="ml-3 inline-flex items-center gap-2">{children}</span>}
    </div>
  );
}
