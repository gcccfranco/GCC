// Les setlists d'une édition de fête suivent son programme (parcours à l'œil du 14/11/2026, R3) : une setlist
// gardait la date du jour J de sa création (« prévu le 24/12 » pour un Noël passé au 25) et celle d'un passage
// retiré restait publiée. Après chaque écriture du jour J ou de l'ordre de passage, la gestion de la fête recale
// les dates et met à la corbeille les setlists des passages qui n'existent plus (récupérables, SC2).

import type { FSSetlist } from "@/types/setList";

type Edition = { jourJ: string; passages: { id?: string }[] };

/** Ce qu'il faut écrire pour que les setlists (hors corbeille) d'une édition suivent son programme. */
export function ecartsSetlistsFete(
  edition: Edition,
  setlists: Pick<FSSetlist, "id" | "date" | "fete">[],
): { recaler: string[]; corbeille: string[] } {
  const passages = new Set(edition.passages.flatMap((p) => (p.id ? [p.id] : [])));
  const recaler: string[] = [];
  const corbeille: string[] = [];
  for (const s of setlists) {
    if (!s.fete) continue;
    if (!passages.has(s.fete.passage)) corbeille.push(s.id);
    else if (edition.jourJ && s.date !== edition.jourJ) recaler.push(s.id);
  }
  return { recaler, corbeille };
}
