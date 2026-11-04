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
 * Une carte plus haute que `hauteurMax` occupe seule sa colonne. Le rangement glouton donne le
 * nombre de colonnes `k` ; la même suite est ensuite recoupée en `k` tranches contiguës de hauteurs
 * voisines (la plus haute colonne la plus basse possible), pour qu'il ne reste ni escalier ni trou
 * sous la dernière colonne (bo-equipes-4). Les cartes `larges` ont chacune leur colonne, après
 * toutes les autres, dans leur ordre.
 */
export function rangerEnColonnes(
  hauteurs: readonly number[],
  hauteurMax: number,
  options: { larges?: readonly number[]; ecart?: number } = {},
): Colonne[] {
  const larges = new Set(options.larges ?? []);
  const ecart = options.ecart ?? 0;
  const simples: number[] = [];
  hauteurs.forEach((_, i) => { if (!larges.has(i)) simples.push(i); });

  // Rangement glouton : il donne le nombre de colonnes, atteignable (une carte ne se coupe pas).
  let k = 0;
  let hauteur = 0;
  simples.forEach((i, n) => {
    if (n > 0 && hauteur + ecart + hauteurs[i] <= hauteurMax) hauteur += ecart + hauteurs[i];
    else { k++; hauteur = hauteurs[i]; }
  });

  const colonnes: Colonne[] = equilibrer(simples.map((i) => hauteurs[i]), k, hauteurMax, ecart)
    .map((tranche) => ({ cartes: tranche.map((n) => simples[n]), large: false }));
  hauteurs.forEach((_, i) => {
    if (larges.has(i)) colonnes.push({ cartes: [i], large: true });
  });
  return colonnes;
}

/** Recoupe `h` en `k` tranches contiguës non vides : la plus haute tranche la plus basse possible (puis les
 *  hauteurs les plus voisines), aucune tranche de plusieurs cartes au-dessus de `max`. Renvoie des indices de `h`. */
function equilibrer(h: readonly number[], k: number, max: number, ecart: number): number[][] {
  const n = h.length;
  if (n === 0) return [];
  const somme = [0];
  h.forEach((x, i) => somme.push(somme[i] + x));
  /** Hauteur de la tranche [a, b[ ; `Infinity` si elle a plusieurs cartes et dépasse `max`. */
  const tranche = (a: number, b: number) => {
    const t = somme[b] - somme[a] + ecart * (b - a - 1);
    return b - a > 1 && t > max ? Infinity : t;
  };
  type Etat = { haut: number; carres: number; coupe: number } | null;
  // meilleur[j][i] : les i premières cartes en j tranches.
  const meilleur: Etat[][] = Array.from({ length: k + 1 }, () => Array<Etat>(n + 1).fill(null));
  meilleur[0][0] = { haut: 0, carres: 0, coupe: 0 };
  for (let j = 1; j <= k; j++) {
    for (let i = j; i <= n; i++) {
      for (let s = i - 1; s >= j - 1; s--) {
        const avant = meilleur[j - 1][s];
        const t = tranche(s, i);
        if (!avant || t === Infinity) continue;
        const haut = Math.max(avant.haut, t);
        const carres = avant.carres + t * t;
        const actuel = meilleur[j][i];
        if (!actuel || haut < actuel.haut || (haut === actuel.haut && carres < actuel.carres)) meilleur[j][i] = { haut, carres, coupe: s };
      }
    }
  }
  const sortie: number[][] = [];
  let i = n;
  for (let j = k; j >= 1; j--) {
    const s = meilleur[j][i]!.coupe;
    sortie.unshift(Array.from({ length: i - s }, (_, d) => s + d));
    i = s;
  }
  return sortie;
}
