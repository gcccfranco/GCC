import { libelleQui } from "../../src/lib/fetes/qui";

// Chantier AR, lot 5, T5a (docs/spec-salles.md, AR20) : un créneau de fête est une réservation de la Scène,
// `reservations/{id}` avec `salle: "scene"`, `fete` (l'id du programme), `date` (l'ancien `dimanche`), `qui`, `note`,
// `libre`, et `pour` = le libellé des `qui`. Ces deux fonctions réécrivent les fixtures des specs d'avant le lot 5.

/** Le document `reservations/{id}` d'un créneau de l'édition `fete`. */
export function creneauEnReservation(fete: string, c: Record<string, unknown>): Record<string, unknown> {
  const { id: _id, dimanche, ...reste } = c;
  void _id;
  const qui = (c.qui as string[] | undefined) ?? [];
  return { salle: "scene", fete, date: dimanche, pour: qui.map((q) => libelleQui(q)).join(", ").slice(0, 60), ...reste };
}

/** Les fixtures données, chaque `programmes/{p}/creneaux/{c}` devenu `reservations/{c}`. */
export function creneauxEnReservations(docs: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  return Object.fromEntries(Object.entries(docs).map(([chemin, data]) => {
    const m = chemin.match(/^programmes\/([^/]+)\/creneaux\/([^/]+)$/);
    return m ? [`reservations/${m[2]}`, creneauEnReservation(m[1], data)] : [chemin, data];
  }));
}
