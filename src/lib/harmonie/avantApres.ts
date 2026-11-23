// Harmonie (H6-2) : les deux suites d'accords de la carte « Avant → après » d'une fiche, à écouter.
// Pur : pas de React.

const ACCORD = /^[A-G][#b♯♭]?[^\s,;:]*$/;

/** `` `G → A` devient `Em7 → A` · degrés … `` → { avant: [G, A], apres: [Em7, A] } ; flèches, « – » et « … » séparent (accords successifs),
 *  groupes entre parenthèses ôtés ; texte illisible (pas deux suites d'accords) → null. */
export function avantApres(texte: string): { avant: string[]; apres: string[] } | null {
  const [accords] = texte.split(/·\s*degrés/);
  const suites = [...accords.matchAll(/`([^`]+)`/g)].slice(0, 2).map((m) =>
    m[1].replace(/\([^)]*\)/g, "").split(/→|–|…|\.\.\./).map((c) => c.trim()).filter(Boolean),
  );
  if (suites.length < 2 || suites.some((s) => !s.length || !s.every((c) => ACCORD.test(c)))) return null;
  return { avant: suites[0], apres: suites[1] };
}
