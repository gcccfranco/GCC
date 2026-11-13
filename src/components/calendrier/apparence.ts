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

/** Teinte du texte du petit déj, dérivée de `serviceColor("Petit déj")` (#c87941). */
const PETIT_DEJ = { texte: "#9a5a2c" } as const;

/** Fond et texte d'une entrée dans sa case ; hors service, des jetons de `globals.css` qui s'éclaircissent en sombre (bo-evenements-7). */
export function styleCase(e: EntreeCalendrier): CSSProperties {
  switch (e.source) {
    case "evenements":
      return { background: "var(--cal-evenement-fond)", color: "var(--cal-evenement-texte)" };
    case "taches":
      return { background: "var(--cal-tache-fond)", color: "var(--cal-tache-texte)" };
    case "reunions":
      return { background: "var(--cal-reunion-fond)", color: "var(--cal-reunion-texte)" };
    case "petitDej":
      return { background: "var(--cal-petitdej-fond)", color: "var(--cal-petitdej-texte)" };
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

/** Couleur du trait d'une ligne de l'agenda et de son étiquette (planche v18-bo-calendrier-agenda-a) :
 *  le point de la source (évènements, tâches, réunions), le brun du petit déj, sinon la couleur de
 *  l'entrée (service, scène, setlist). */
export function couleurTrait(e: EntreeCalendrier): string {
  switch (e.source) {
    case "evenements":
    case "taches":
    case "reunions":
      return COULEURS_CALENDRIER[e.source].point;
    case "petitDej":
      return PETIT_DEJ.texte;
    default:
      return e.couleur;
  }
}
