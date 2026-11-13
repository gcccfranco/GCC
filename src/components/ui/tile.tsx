// Vignette teintée (décision D1 du 15/09/2026) : fond à ~13 % de la couleur,
// texte dans la couleur. Date d'une setlist ou d'un service. En sombre le texte
// est éclairci (`.svc-ink`, globals.css) : serviceColors.ts n'a pas de variante
// sombre et ses couleurs ne se lisent pas sur du noir.

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
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <span
      data-testid="tuile"
      className={cn(
        "svc-ink flex shrink-0 flex-col items-center justify-center rounded-lg font-bold leading-none tabular-nums",
        size === "xl" ? "h-14 w-14 rounded-xl" : size === "lg" ? "h-11 w-11" : "h-10 w-10",
        className,
      )}
      style={{ background: `color-mix(in srgb, ${color} var(--svc-tint), transparent)`, "--svc": color } as React.CSSProperties}
    >
      <span className={size === "xl" ? "text-xl leading-none" : "text-base leading-none"}>{big}</span>
      {small && <span className={cn("font-semibold leading-none", size === "xl" ? "mt-1 text-xs" : "mt-0.5 text-xs")}>{small}</span>}
    </span>
  );
}
