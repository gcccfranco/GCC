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
