// Bouton plein à la couleur d'un culte (5C1, docs/spec-look.md § 20/09/2026) :
// les boutons pleins sont en encre, sauf quand l'écran appartient à un culte ou
// à une section — le bouton en prend alors la couleur, libellé blanc.
//
// serviceColors.ts est gelé et n'est pas touché : ici on ne dérive que le FOND
// d'un bouton, là où un libellé blanc ne passerait pas le contraste AA (4,5).

/** Couleur gelée → fond de bouton. Intergroupe : l'ocre #a87b0f ne donne que 3,8
 *  avec un libellé blanc ; la même teinte à 89 % (#966d0d) donne 4,7. Table (petit
 *  déj, lot U3, Q15) : #c87941 ne donne que 3,35 ; à 83 % (#a66436), 4,67. */
const FONDS_FONCES: Record<string, string> = {
  "#a87b0f": "#966d0d",
  "#c87941": "#a66436",
};

export function serviceButtonFill(couleur: string): string {
  return FONDS_FONCES[couleur.toLowerCase()] ?? couleur;
}
