import { fusionner, resoudre, type Fusion } from "@/lib/partition/fusion";
import type { PartitionDeChant } from "@/lib/firebase/partitions";

// Ma partition, lecture (docs/spec-ma-partition.md, « Lecture ») : quelle partition se lit pour un chant, et ce que
// la page en montre. Fonction pure ; l'écran (menu « Je lis », signes) et les pages de setlist et de chant s'en servent.

export type TypeLecture = "mienne" | "culte" | "partagee" | "origine" | "ancienne";

/** `valeur` : « mienne », « culte », « origine », l'uid de l'auteur d'une partition partagée, ou « v:… » pour une
 *  ancienne « Ma version » de la setlist (`versions/{uid}`, lisibles jusqu'à MP-6). */
export type OptionLecture = { valeur: string; type: TypeLecture; nom?: string };

/** Marque d'une ligne de la source rendue (clé : `srcLine`). */
export type MarqueLigne = {
  marque: "moi" | "culte" | "conflit";
  retouche?: "accords" | "paroles";
  /** Conflit : lequel, de quel côté, et si c'est la première ligne (la mention s'y pose). */
  conflit?: { index: number; cote: "moi" | "chant"; debut: boolean };
};
export type Marques = Record<number, MarqueLigne>;

export type Lecture = {
  valeur: string;
  options: OptionLecture[];
  /** Le texte à lire à la place de celui de l'item : `null` = le .cho (l'item perd son `contentOverride`) ;
   *  `undefined` = ne rien changer (anciennes versions de la setlist, déjà substituées par la page). */
  source: string | null | undefined;
  marques: Marques;
  /** Les retouches du culte seules : la lecture « Copier les paroles » reste permise. */
  suitLaPresidence: boolean;
  /** Je lis ma partition : de quoi la réécrire (résolution d'un conflit) et la dater. */
  mienne?: PartitionDeChant;
  fusion?: Fusion;
  /** Conflits résolubles ici (ma partition seulement). */
  modifiable: boolean;
};

function marquesDe(f: Fusion | null, mien: boolean): Marques {
  const marques: Marques = {};
  if (!f) return marques;
  // La source rendue se relit par `parseChordPro` : une ligne = un `srcLine`.
  f.origines.forEach((o, i) => {
    const d = f.details[i];
    if (o === "moi" && mien) marques[i] = { marque: "moi", retouche: d.retouche };
    else if (o === "culte") marques[i] = { marque: "culte" };
    else if (o === "conflit-moi" || o === "conflit-chant") {
      marques[i] = { marque: "conflit", conflit: { index: d.conflit!.index, cote: o === "conflit-moi" ? "moi" : "chant", debut: d.conflit!.debut } };
    }
  });
  return marques;
}

export function lire(a: {
  /** Le .cho du chant. */
  origine: string;
  /** Les retouches du culte pour ce chant dans la setlist (`contentOverride`) ; `null` = aucune. */
  culte: string | null;
  mienne: PartitionDeChant | null;
  partagees: PartitionDeChant[];
  /** Mon choix enregistré (`choices[slug]`). */
  choix?: string;
  /** Anciennes versions de la setlist : celles que je peux choisir (hors présidence), et celle qui est affichée
   *  (`"presidence"` ou l'uid de l'auteur). */
  anciennes?: { valeur: string; nom?: string }[];
  ancienneValeur?: string;
}): Lecture {
  const courante = a.culte ?? a.origine;
  const anciennes = a.anciennes ?? [];
  const options: OptionLecture[] = [];
  if (a.mienne) options.push({ valeur: "mienne", type: "mienne" });
  if (a.culte) options.push({ valeur: "culte", type: "culte" });
  for (const p of a.partagees) options.push({ valeur: p.ownerUid, type: "partagee", nom: p.ownerName });
  options.push({ valeur: "origine", type: "origine" });
  for (const v of anciennes) options.push({ valeur: `v:${v.valeur}`, type: "ancienne", nom: v.nom });

  const valide = options.some((o) => o.valeur === a.choix);
  // Sans choix (ou choix retiré) : la mienne ; sinon les anciennes versions comme avant ; sinon le culte, sinon l'origine.
  const ancienne = a.ancienneValeur && a.ancienneValeur !== "presidence" ? `v:${a.ancienneValeur}` : null;
  const valeur = valide
    ? a.choix!
    : a.mienne ? "mienne" : ancienne && options.some((o) => o.valeur === ancienne) ? ancienne : a.culte ? "culte" : "origine";
  // Les anciennes versions de la setlist n'ont pas de signe : la page les a déjà substituées.
  const dessous = (): Pick<Lecture, "marques" | "fusion"> => {
    const fusion = fusionner(null, courante, null, a.origine);
    return { fusion, marques: marquesDe(fusion, false) };
  };
  const base = { valeur, options, modifiable: false };

  // Aucun choix posé et pas de partition à moi : les anciennes versions de la setlist décident, comme avant.
  if (valeur.startsWith("v:") || (!valide && !a.mienne)) {
    return { ...base, source: undefined, suitLaPresidence: false, ...(valeur === "culte" ? dessous() : { marques: {} }) };
  }
  if (valeur === "origine") return { ...base, source: null, suitLaPresidence: !a.culte, marques: {} };
  if (valeur === "culte") return { ...base, source: a.culte, suitLaPresidence: true, ...dessous() };

  const p = valeur === "mienne" ? a.mienne! : a.partagees.find((x) => x.ownerUid === valeur)!;
  const fusion = fusionner(p.base ?? a.origine, courante, p.content, a.origine);
  const source = fusion.source === a.origine ? null : fusion.source;
  return {
    ...base,
    source,
    suitLaPresidence: false,
    marques: marquesDe(fusion, valeur === "mienne"),
    mienne: valeur === "mienne" ? p : undefined,
    fusion,
    modifiable: valeur === "mienne",
  };
}

/** Ma partition réécrite une fois le conflit `index` réglé (« Garder la mienne » / « Prendre celle du chant »). */
export function resoudreConflit(l: Lecture, index: number, choix: "mienne" | "chant"): PartitionDeChant {
  return { ...l.mienne!, ...resoudre(l.fusion!, index, choix) };
}
