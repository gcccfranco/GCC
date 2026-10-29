import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * État vide : cadre pointillé, une phrase, un titre et une action facultatifs.
 * `role="status"` seulement s'il remplace un contenu chargé dynamiquement.
 */
export function EtatVide({
  titre,
  children,
  action,
  compact,
  role,
  className,
}: {
  titre?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  role?: "status";
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn("rounded-xl border border-dashed border-border px-4 text-center", compact ? "py-6" : "py-12", className)}
    >
      {titre && <p className="text-[15px] font-semibold text-foreground">{titre}</p>}
      {children && <p className={cn("text-sm text-muted-foreground", titre && "mt-1")}>{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
