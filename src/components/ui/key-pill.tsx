// Pastille de tonalité (5C1, docs/spec-look.md § 20/09/2026) : un rectangle à
// coins arrondis, teinté par la langue du chant — bleu pour un chant français,
// rouge pour un 中文. La forme rectangulaire est réservée à la tonalité (la
// structure est en pastilles rondes) : une forme, une information.

import { cn } from "@/lib/utils";

export function KeyPill({
  tonalite,
  langue,
  origine,
  className,
}: {
  tonalite: string;
  langue: "fr" | "zh";
  /** Tonalité d'origine, quand celle qu'on joue en diffère : « orig. A » dessous. */
  origine?: string;
  className?: string;
}) {
  const couleur = langue === "zh" ? "var(--zh-accent)" : "var(--fr-accent)";
  return (
    <span className={cn("flex shrink-0 flex-col items-end gap-0.5", className)}>
      <span
        data-testid="tonalite"
        className="inline-flex h-[26px] min-w-9 items-center justify-center rounded-[7px] px-2 text-sm font-bold leading-none tabular-nums"
        style={{
          color: couleur,
          background: `color-mix(in srgb, ${couleur} 11%, transparent)`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${couleur} 24%, transparent)`,
        }}
      >
        {tonalite}
      </span>
      {origine && origine !== tonalite && (
        <span data-testid="tonalite-origine" className="whitespace-nowrap text-xs text-muted-foreground">
          orig. {origine}
        </span>
      )}
    </span>
  );
}
