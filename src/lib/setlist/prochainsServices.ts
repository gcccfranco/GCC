import { normalizeName, type SetlistSeance } from "@/lib/planning/names";
import type { FSSetlist } from "@/lib/firebase/setlists";

/** Setlist telle que lue par `getSetlists()` ; brouillons et privées, s'il en
 *  passe, ne prennent pas le service. */
type SetlistDuService = Pick<FSSetlist, "category" | "date" | "leader"> &
  Partial<Pick<FSSetlist, "moment" | "isDraft" | "isPrivate">>;

/** Date ISO `jours` jours après `iso` (calcul en UTC : pas de saut d'heure). */
function plusJours(iso: string, jours: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/** La setlist prend-elle cette séance ? Même catégorie et même date ; au Campus,
 *  même moment, ou même présidence pour une ancienne setlist sans moment —
 *  l'appariement de « Mes services » (`src/app/mes-services/page.tsx`). */
function prend(setlist: SetlistDuService, seance: SetlistSeance): boolean {
  if (setlist.category !== seance.category || setlist.date !== seance.date) return false;
  if (seance.category !== "Campus") return true;
  if (setlist.moment) return setlist.moment === seance.moment;
  return Boolean(seance.leader) && normalizeName(setlist.leader) === normalizeName(seance.leader);
}

/** « Pour quel service ? » (docs/spec-editeur-setlist.md, Q3) : les séances du
 *  planning d'aujourd'hui à J+`jours`-1, dans les catégories données, sans
 *  setlist partagée publiée ; par date, puis dans l'ordre du planning. */
export function prochainsServicesSansSetlist(
  seances: SetlistSeance[],
  setlists: SetlistDuService[],
  categories: string[],
  aujourdhui: string,
  jours = 28,
): SetlistSeance[] {
  const fin = plusJours(aujourdhui, jours - 1);
  const publiees = setlists.filter((s) => !s.isDraft && !s.isPrivate);
  return seances
    .filter((s) => s.date >= aujourdhui && s.date <= fin && categories.includes(s.category))
    .filter((s) => !publiees.some((sl) => prend(sl, s)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Ce que « Préparer » met dans l'éditeur ; la présidence est relue au planning. */
export interface Preremplissage {
  category?: string;
  date?: string;
  moment?: "matin" | "soir";
}

/** AAAA-MM-JJ d'un jour qui existe (ni 31/02, ni mois 13). */
function dateExiste(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

/** Lien « Préparer » d'une séance : `/setlists/new?cat=…&date=…(&moment=…)`. */
export function lienPreparer(seance: Pick<SetlistSeance, "category" | "date" | "moment">): string {
  const q = new URLSearchParams({ cat: seance.category, date: seance.date });
  if (seance.moment) q.set("moment", seance.moment);
  return `/setlists/new?${q}`;
}

/** Préremplissage lu dans l'URL. Chaque paramètre invalide est ignoré, comme
 *  une catégorie où la personne ne peut pas créer ; le moment ne vaut qu'au Campus. */
export function lirePreremplissage(params: URLSearchParams, permises: readonly string[]): Preremplissage {
  const out: Preremplissage = {};
  const cat = params.get("cat");
  if (cat && permises.includes(cat)) out.category = cat;
  const date = params.get("date");
  if (date && dateExiste(date)) out.date = date;
  const moment = params.get("moment");
  if (out.category === "Campus" && (moment === "matin" || moment === "soir")) out.moment = moment;
  return out;
}
