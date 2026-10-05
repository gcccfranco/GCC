// Apparence d'une entrée du calendrier (lot U8, planche bo-calendrier) : l'icône de
// sa source, sa case (pleine pour un service, la scène, une setlist ; teintée pour le
// reste) et la couleur du nom de sa source sur une carte. Lu par la grille, le
// panneau du jour, puis l'agenda (C4) et le widget (C8).

import type { CSSProperties } from "react";
import { CalendarDays, Coffee, Drama, ListChecks, ListMusic, Ticket, Users, type LucideIcon } from "lucide-react";
import { COULEURS_CALENDRIER, type EntreeCalendrier, type SourceCalendrier } from "@/lib/calendrier/entrees";

export const ICONES: Record<SourceCalendrier, LucideIcon> = {
  services: CalendarDays,
  evenements: Ticket,
  reunions: Users,
  scene: Drama,
  taches: ListChecks,
  petitDej: Coffee,
  setlists: ListMusic,
};

/** Teintes de la planche pour le petit déj, dérivées de `serviceColor("Petit déj")` (#c87941). */
const PETIT_DEJ = { fond: "#f8ece2", texte: "#9a5a2c" } as const;
const ENCRE = "#1c1c1e";

/** Fond et texte d'une entrée dans sa case. */
export function styleCase(e: EntreeCalendrier): CSSProperties {
  switch (e.source) {
    case "evenements":
      return { background: COULEURS_CALENDRIER.evenements.fond, color: ENCRE };
    case "taches":
      return { background: COULEURS_CALENDRIER.taches.fond, color: ENCRE };
    case "reunions":
      return { background: COULEURS_CALENDRIER.reunions.fond, color: COULEURS_CALENDRIER.reunions.point };
    case "petitDej":
      return { background: PETIT_DEJ.fond, color: PETIT_DEJ.texte };
    default:
      return { background: e.couleur, color: "#fff" };
  }
}

/** Couleur du nom de la source sur une carte ; le jaune et le gris de la planche,
 *  trop pâles pour du texte, laissent la place à l'encre (leur point reste). */
export function couleurSource(e: EntreeCalendrier): string | undefined {
  if (e.source === "evenements" || e.source === "taches") return undefined;
  if (e.source === "petitDej") return PETIT_DEJ.texte;
  return e.couleur;
}
