// Vignette teintée (décision D1 du 15/09/2026) : fond à ~13 % de la couleur,
// texte dans la couleur. Tonalité d'un chant, date d'une setlist ou d'un service.

import { cn } from "@/lib/utils";

export function Tile({
  color,
  big,
  small,
  size = "md",
  className,
}: {
  /** Couleur CSS (hex ou `var(--…)`). */
  color: string;
  big: React.ReactNode;
  small?: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      data-testid="tuile"
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-lg font-bold leading-none tabular-nums",
        size === "lg" ? "h-11 w-11" : "h-10 w-10",
        className,
      )}
      style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}
    >
      <span className="text-[15px]">{big}</span>
      {small && <span className="mt-0.5 text-xs font-semibold">{small}</span>}
    </span>
  );
}
