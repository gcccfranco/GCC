// Signal « une coupure de vers vient de changer » (lot CV-3). Les lignes (ChordLine, ZhLine) le publient quand
// leur coupure change, en disant si elles sont dans une copie de mesure du mode louange (`mesure`) ou à l'écran.
// Le mode louange refait sa pagination sur un signal de mesure (les hauteurs de blocs en dépendent), et revoit la
// position de la pastille « Ensuite » sur un signal de l'écran. Module sans état de rendu : une liste d'écouteurs.

const ecouteurs = new Set<(mesure: boolean) => void>();

let version = 0;

/** Compteur incrémenté à chaque signal d'une copie de mesure : la pagination attend qu'il ne bouge plus avant de lire les hauteurs. */
export function versionCoupure() {
  return version;
}

export function signalerCoupure(mesure: boolean) {
  if (mesure) version++;
  ecouteurs.forEach((f) => f(mesure));
}

/** Renvoie la fonction qui retire l'écouteur. */
export function ecouterCoupure(f: (mesure: boolean) => void) {
  ecouteurs.add(f);
  return () => {
    ecouteurs.delete(f);
  };
}
