// Cible de toucher de 44 px (règle commune, docs/spec-corrections-design.md § 3) : une seule définition, par un
// pseudo-élément `::after` (jamais `::before`), au toucher seulement (variante arbitraire `[@media(pointer:coarse)]:` : un écran `coarse` brut ferait
// disparaître toutes les variantes `max-*` de Tailwind 3.4). Elle agrandit la zone sans changer le dessin ; l'élément ne doit pas porter d'`::after` propre.
const BASE = "[@media(pointer:coarse)]:relative [@media(pointer:coarse)]:after:absolute [@media(pointer:coarse)]:after:content-['']";

/** Zone centrée de 44 px au moins autour d'un bouton plus petit (G6, audit 24/10/2026). */
export const TOUCHER_44 =
  `${BASE} [@media(pointer:coarse)]:after:left-1/2 [@media(pointer:coarse)]:after:top-1/2 [@media(pointer:coarse)]:after:h-11 [@media(pointer:coarse)]:after:min-h-full ` +
  "[@media(pointer:coarse)]:after:w-full [@media(pointer:coarse)]:after:min-w-11 [@media(pointer:coarse)]:after:-translate-x-1/2 [@media(pointer:coarse)]:after:-translate-y-1/2";

/** Variante à insets précis : le retour « ‹ Section » (20 px de haut + 12 + 12 = 44 ; largeur du texte + 16 px). */
export const TOUCHER_RETOUR = `${BASE} [@media(pointer:coarse)]:after:-inset-x-2 [@media(pointer:coarse)]:after:-inset-y-3`;

/** Variante à insets précis : un segment du sélecteur d'espace, à la largeur du segment (pas de recouvrement des
 *  voisins) ; 46 px pour 30 de dessin, 44 px pour les 36 de l'icône au téléphone. */
export const TOUCHER_SEGMENT = `${BASE} [@media(pointer:coarse)]:after:inset-x-0 [@media(pointer:coarse)]:after:-inset-y-2 max-sm:[@media(pointer:coarse)]:after:-inset-y-1`;

/** Variante à insets précis : un onglet du rail (`OngletsRail`) ou une pilule (`Pilules`) de 28 à 40 px de haut, portés à 44 px ;
 *  la zone verticale est centrée, la zone horizontale suit l'élément. Le parent qui défile doit laisser la place (il en porte le
 *  rembourrage), sinon son `overflow` rogne la zone. */
export const TOUCHER_RANGEE = `${BASE} [@media(pointer:coarse)]:after:inset-x-0 [@media(pointer:coarse)]:after:top-1/2 [@media(pointer:coarse)]:after:h-11 [@media(pointer:coarse)]:after:-translate-y-1/2`;

/** Idem pour les pilules, 3 px de plus de chaque côté : la zone s'arrête à mi-écart (6 px entre deux pilules), sans recouvrir
 *  la voisine. Mesuré le 04/11/2026 : dans une zone commune, le toucher va à la pilule la plus tardive du DOM, pas à la plus proche. */
export const TOUCHER_PILULE = `${BASE} [@media(pointer:coarse)]:after:-inset-x-[3px] [@media(pointer:coarse)]:after:top-1/2 [@media(pointer:coarse)]:after:h-11 [@media(pointer:coarse)]:after:-translate-y-1/2`;

/** Lien étendu à toute sa ligne (compte-10, « Relier ») : au pointeur comme au doigt, la ligne entière est la cible
 *  (bien plus de 44 px). Le parent porte `relative` ; le lien ne doit pas porter d'`::after` propre. */
export const LIGNE_ENTIERE = "after:absolute after:inset-0 after:content-[''] after:rounded-[inherit]";
