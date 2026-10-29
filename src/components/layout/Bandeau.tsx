"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const TONS = {
  info: "border-border bg-secondary text-foreground",
  alerte:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200",
} as const;

/**
 * Bandeau d'information (`info`) ou d'alerte (`alerte`). `role="status"` par défaut ;
 * `alert` seulement si l'appelant le demande. `onFermer` ajoute un × de 44 px de zone de toucher.
 */
export function Bandeau({
  ton,
  icone,
  children,
  onFermer,
  role = "status",
  className,
  testId,
}: {
  ton: "info" | "alerte";
  icone?: ReactNode;
  children: ReactNode;
  onFermer?: () => void;
  role?: "status" | "alert";
  className?: string;
  testId?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      role={role}
      data-testid={testId}
      className={cn("flex items-start gap-3 rounded-lg border px-3 py-2 text-sm", TONS[ton], className)}
    >
      {icone && <span className="mt-0.5 flex shrink-0 items-center">{icone}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {onFermer && (
        <button
          type="button"
          onClick={onFermer}
          aria-label={t("common.buttons.close")}
          className="-my-2 -mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-current opacity-80 hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
