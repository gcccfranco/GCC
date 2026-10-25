import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page sans issue : icône, une phrase, une aide facultative et un bouton de sortie. Centrée dans la zone de contenu (pleine fenêtre avec `pleinEcran`). */
export function Impasse({
  icone: Icone,
  titre,
  aide,
  sortie,
  pleinEcran,
}: {
  icone: LucideIcon;
  titre: string;
  aide?: string;
  sortie: { href: string; label: string };
  pleinEcran?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md flex-col items-center gap-4 px-4 text-center",
        pleinEcran ? "min-h-screen justify-center" : "min-h-[50dvh] justify-center py-10",
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Icone size={28} aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-foreground">{titre}</p>
        {aide && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{aide}</p>}
      </div>
      <Link
        href={sortie.href}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {sortie.label}
      </Link>
    </div>
  );
}
