import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * État vide : bloc d'information (aplat sans bordure, rayon 16), une phrase, un titre et une action facultatifs.
 * `surGris` : posé directement sur le fond gris, il devient un groupe blanc ; sinon (dans un groupe, sur une page
 * blanche) il reste en aplat `--secondary`. `sansFond` : dans un groupe blanc qui n'a que lui, ni aplat ni carte
 * (une carte dans une carte).
 * `role="status"` seulement s'il remplace un contenu chargé dynamiquement.
 */
export function EtatVide({
  titre,
  children,
  action,
  compact,
  role,
  surGris,
  sansFond,
  className,
}: {
  titre?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  role?: "status";
  surGris?: boolean;
  sansFond?: boolean;
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn("rounded-2xl px-4 text-center", sansFond ? undefined : surGris ? "carte-groupe" : "bloc-info", compact ? "py-6" : "py-12", className)}
    >
      {titre && <p className="text-[15px] font-semibold text-foreground">{titre}</p>}
      {children && <p className={cn("text-sm text-muted-foreground", titre && "mt-1")}>{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
