import type { FSSetlist } from "@/types/setList";
import { findMyServices, serviceCategory, normalizeName, type PlanningData, type ServiceEntry } from "@/lib/planning/names";

// Format des clés de service, écrit une seule fois. Campus : matin et soir partagent date + catégorie → clés par
// moment (setlists récentes) ET par président (anciennes setlists sans moment).
const cleMoment = (date: string, moment: string) => `${date}|Campus|m:${moment}`;
const clePresident = (date: string, leader: string | undefined) => `${date}|Campus|l:${normalizeName(leader ?? "")}`;

/** Clés des services réels d'un compte (filtre « Mes services »), lues dans le planning. */
export function clesDeMesServices(planning: PlanningData | null, planningName: string | undefined): Set<string> {
  if (!planning || !planningName) return new Set();
  return clesDesEntrees(findMyServices(planning, planningName));
}

/** Les mêmes clés, depuis les entrées déjà trouvées (`findMyServices`). */
export function clesDesEntrees(entrees: ServiceEntry[]): Set<string> {
  const set = new Set<string>();
  for (const e of entrees) {
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

/** Date du jour en heure locale (pas UTC : décalée autour de minuit), comme l'accueil. */
export function aujourdhuiLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

/** Menu « Toutes mes setlists » du mode louange : les setlists à venir hors la courante et les brouillons, par date ;
 *  `miens` = celles de mes services (`cles`), `autres` = le reste. */
export function setlistsAVenir(list: FSSetlist[], cles: Set<string>, aujourdhui: string, idCourant: string): { miens: FSSetlist[]; autres: FSSetlist[] } {
  const restes = trierSetlists(list.filter((s) => s.id !== idCourant && !s.isDraft), true, aujourdhui, () => 0);
  return { miens: restes.filter((s) => estDeMesServices(s, cles)), autres: restes.filter((s) => !estDeMesServices(s, cles)) };
}
