// Équipes en bandeau (lot U4 bis, docs/spec-pages-en-grand.md, Q12) : la page tient dans la
// hauteur de l'écran et les équipes se rangent en colonnes qui défilent de gauche à droite.
// Des colonnes CSS à hauteur fixe déborderaient sans élargir leur boîte (la suite du bandeau
// les recouvrirait) : le rangement se calcule ici, à partir des hauteurs mesurées des cartes.

export interface Colonne {
  /** Indices des cartes dans l'ordre donné, de haut en bas. */
  cartes: number[];
  /** Colonne d'une carte large (Louange, EDD) : une seule carte, en fin de bandeau. */
  large: boolean;
}

/**
 * Range les cartes en colonnes, dans leur ordre : une carte va sous la précédente tant que la
 * colonne (écarts compris) ne dépasse pas `hauteurMax`, sinon elle ouvre la colonne suivante.
 * Une carte plus haute que `hauteurMax` occupe seule sa colonne. Les cartes `larges` ont chacune
 * leur colonne, après toutes les autres, dans leur ordre.
 */
export function rangerEnColonnes(
  hauteurs: readonly number[],
  hauteurMax: number,
  options: { larges?: readonly number[]; ecart?: number } = {},
): Colonne[] {
  const larges = new Set(options.larges ?? []);
  const ecart = options.ecart ?? 0;
  const colonnes: Colonne[] = [];
  let courante: Colonne | null = null;
  let hauteur = 0;
  hauteurs.forEach((h, i) => {
    if (larges.has(i)) return;
    if (courante && hauteur + ecart + h <= hauteurMax) {
      courante.cartes.push(i);
      hauteur += ecart + h;
    } else {
      courante = { cartes: [i], large: false };
      colonnes.push(courante);
      hauteur = h;
    }
  });
  hauteurs.forEach((_, i) => {
    if (larges.has(i)) colonnes.push({ cartes: [i], large: true });
  });
  return colonnes;
}
