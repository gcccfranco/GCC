"use client";

// Une ligne de « À faire » (BO-B) : l'icône de sa sorte, le titre, une ligne de contexte et, à droite, le bouton
// au verbe précis qui mène à l'endroit exact.
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronRight, Drama, FileText, ListChecks, MessageSquare, Ticket, UserPlus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LigneAFaire, SorteAFaire } from "@/lib/tableauDeBord/aFaire";
import { texteLigne } from "./texte";

const ICONES: Record<SorteAFaire, LucideIcon> = {
  cases: CalendarDays, tache: ListChecks, inscriptions: Ticket, scene: Drama, compteRendu: FileText, messages: MessageSquare, comptes: UserPlus,
};

export function RangeeAFaire({ ligne, today }: { ligne: LigneAFaire; today: string }) {
  const { t, i18n } = useTranslation();
  const Icone = ICONES[ligne.sorte];
  const { titre, contexte, retard, verbe } = texteLigne(ligne, t, i18n.language, today);
  const enRetard = ligne.sorte === "tache" && (ligne.date ?? today) < today;
  return (
    <li
      data-testid="ligne-a-faire" data-sorte={ligne.sorte} data-verbe={ligne.verbe} data-a-moi={String(ligne.aMoi)}
      className="flex items-center gap-3 px-4 py-3"
    >
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-muted-foreground">
        <Icone className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        {/* BO-G, 14 : le titre se coupe (deux lignes, puis « … ») avant que le verbe ne quitte la ligne. */}
        <b className="line-clamp-2 break-words text-[15px] font-semibold text-foreground" title={titre}>{titre}</b>
        <span className="block break-words text-[13px] text-muted-foreground">
          {contexte}
          {retard && <span className={enRetard ? "font-semibold text-red-700 dark:text-red-400" : undefined}>{retard}</span>}
        </span>
      </span>
      <Button asChild variant="outline" className="h-10 shrink-0 gap-0.5 whitespace-nowrap pl-3 pr-2 text-sm sm:pl-4 sm:pr-3">
        <Link href={ligne.href} aria-label={t("backOffice.aFaire.verbeAria", { verbe, titre })}>
          <span>{verbe}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </Button>
    </li>
  );
}
