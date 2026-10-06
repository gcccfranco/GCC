import { canSeeSetlist } from "@/lib/access";
import { ALL_CATEGORIES, type FSSetlist } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";

/** « Prochaines setlists » de Chants en deux volets (lot U5, docs/spec-deux-volets.md, Q17) :
 *  les `max` prochaines (date ≥ `today`, AAAA-MM-JJ) que `canSeeSetlist` laisse voir — la
 *  règle de l'onglet Setlists, sans son filtre « Mes services » (question 9) —, brouillons
 *  exclus, par date puis dans l'ordre des catégories. La date est refiltrée ici : la
 *  requête n'est pas crue sur parole. */
export function upcomingSetlists(
  all: FSSetlist[],
  user: { uid: string; email?: string | null },
  profile: UserProfile | null,
  today: string,
  max = 3,
): FSSetlist[] {
  const ordre = ALL_CATEGORIES as readonly string[];
  const rang = (c: string) => (ordre.includes(c) ? ordre.indexOf(c) : ordre.length);
  return all
    .filter((s) => s.date >= today && !s.isDraft && canSeeSetlist(user, profile, s))
    .sort((a, b) => a.date.localeCompare(b.date) || rang(a.category) - rang(b.category))
    .slice(0, max);
}
