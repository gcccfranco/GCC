import type { FSSetlist } from "@/types/setList";
import { findMyServices, serviceCategory, normalizeName, type PlanningData } from "@/lib/planning/names";

// Format des clés de service, écrit une seule fois. Campus : matin et soir partagent date + catégorie → clés par
// moment (setlists récentes) ET par président (anciennes setlists sans moment).
const cleMoment = (date: string, moment: string) => `${date}|Campus|m:${moment}`;
const clePresident = (date: string, leader: string | undefined) => `${date}|Campus|l:${normalizeName(leader ?? "")}`;

/** Clés des services réels d'un compte (filtre « Mes services »), lues dans le planning. */
export function clesDeMesServices(planning: PlanningData | null, planningName: string | undefined): Set<string> {
  const set = new Set<string>();
  if (!planning || !planningName) return set;
  for (const e of findMyServices(planning, planningName)) {
    const cat = serviceCategory(e.service);
    if (!cat) continue;
    const date = e.setlistDate ?? e.date;
    if (cat === "Campus") {
      if (e.moment) set.add(cleMoment(date, e.moment));
      set.add(clePresident(date, e.leader));
    } else {
      set.add(`${date}|${cat}`);
    }
  }
  return set;
}

/** La setlist tombe-t-elle sur un des services de `cles` ? Campus : le moment, sinon le président. */
export function estDeMesServices(s: Pick<FSSetlist, "date" | "category" | "moment" | "leader">, cles: Set<string>): boolean {
  return s.category === "Campus"
    ? (!!s.moment && cles.has(cleMoment(s.date, s.moment))) || cles.has(clePresident(s.date, s.leader))
    : cles.has(`${s.date}|${s.category}`);
}

/** À venir (date croissante) ou Archives (date décroissante) ; un même jour, les setlists d'une fête suivent l'ordre
 *  de passage (`rangPassage`). */
export function trierSetlists(
  list: FSSetlist[],
  aVenir: boolean,
  aujourdhui: string,
  rangPassage: (s: FSSetlist) => number
): FSSetlist[] {
  const memeJour = (a: FSSetlist, b: FSSetlist) =>
    (a.fete ? 1 : 0) - (b.fete ? 1 : 0) || (a.fete?.programme ?? "").localeCompare(b.fete?.programme ?? "") || rangPassage(a) - rangPassage(b);
  return aVenir
    ? list.filter((s) => s.date >= aujourdhui).sort((a, b) => a.date.localeCompare(b.date) || memeJour(a, b))
    : list.filter((s) => s.date < aujourdhui).sort((a, b) => b.date.localeCompare(a.date) || memeJour(a, b));
}
