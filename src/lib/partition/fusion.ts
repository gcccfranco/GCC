// Ma partition, lecture (docs/spec-ma-partition.md, « Lecture : quelle partition, et la fusion ») : fusion à trois
// sources, ligne à ligne. `base` = la source sur laquelle j'ai retouché, `courante` = la couche du dessous (retouches
// du culte, sinon le .cho), `content` = ma source. Fonction pure.

export type Origine = "moi" | "culte" | "origine" | "conflit-moi" | "conflit-chant";

export type DetailLigne = {
  /** Ligne que j'ai retouchée : seuls les accords ont changé, ou les paroles. */
  retouche?: "accords" | "paroles";
  /** Numéro du conflit (dans l'ordre de la source) ; `debut` = première ligne de ce conflit. */
  conflit?: { index: number; debut: boolean };
};

/** Un morceau de la fusion : les lignes de chacune des trois sources. `c0` = rang de `c` dans la courante. */
type Morceau = { b: string[]; c: string[]; m: string[]; c0: number; conflit: boolean };

export type Fusion = {
  source: string;
  /** Une entrée par ligne de `source`. */
  origines: Origine[];
  details: DetailLigne[];
  conflits: number;
  /** Pour `resoudre`. */
  morceaux: Morceau[];
};

/** Correspondances de lignes entre `a` et `b` (plus longue sous-suite commune) : rang dans `a` → rang dans `b`. */
function lcs(a: string[], b: string[]): Map<number, number> {
  const d = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const pairs = new Map<number, number>();
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) pairs.set(i++, j++);
    else if (d[i + 1][j] >= d[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

const meme = (x: string[], y: string[]) => x.length === y.length && x.every((l, i) => l === y[i]);
const sansAccords = (l: string) => l.replace(/\[[^\]]*\]/g, "");

/** Ce que j'ai retouché dans la ligne `m` par rapport à `b` (ligne de même rang, absente = insertion). */
function retouche(b: string | undefined, m: string): DetailLigne["retouche"] {
  return b !== undefined && sansAccords(b) === sansAccords(m) ? "accords" : "paroles";
}

/**
 * Ligne que je n'ai pas touchée → suit la courante ; ligne que j'ai retouchée → gardée ; changée des deux côtés →
 * conflit : mes lignes puis celles du chant, marquées. `cho` (le .cho) sert à reconnaître, dans la courante, les lignes
 * que le culte a retouchées (origine « culte » au lieu de « origine ») ; absent : la courante est le .cho.
 * `content` null : pas de retouche de texte, on lit la courante.
 */
export function fusionner(base: string | null, courante: string, content: string | null, cho?: string): Fusion {
  const c = courante.split("\n");
  const dansLeCho = cho === undefined ? null : new Set(lcs(cho.split("\n"), c).values());
  const origineCourante = (rang: number): Origine => (dansLeCho && !dansLeCho.has(rang) ? "culte" : "origine");

  const morceaux: Morceau[] = [];
  if (content === null) {
    morceaux.push({ b: c, c, m: c, c0: 0, conflit: false });
  } else {
    const b = (base ?? courante).split("\n");
    const m = content.split("\n");
    const bc = lcs(b, c);
    const bm = lcs(b, m);
    let [ib, ic, im] = [0, 0, 0];
    const morceau = (i: number, jc: number, jm: number) => {
      const mo = { b: b.slice(ib, i), c: c.slice(ic, jc), m: m.slice(im, jm), c0: ic, conflit: false };
      // Mêmes nombres de lignes des trois côtés : on les règle une à une (lignes voisines changées chacune d'un côté).
      if (mo.b.length > 1 && mo.c.length === mo.b.length && mo.m.length === mo.b.length)
        mo.b.forEach((l, k) => morceaux.push({ b: [l], c: [mo.c[k]], m: [mo.m[k]], c0: ic + k, conflit: false }));
      else if (mo.b.length || mo.c.length || mo.m.length) morceaux.push(mo);
    };
    for (let i = 0; i < b.length; i++) {
      const [jc, jm] = [bc.get(i), bm.get(i)];
      if (jc === undefined || jm === undefined) continue;
      morceau(i, jc, jm);
      [ib, ic, im] = [i + 1, jc + 1, jm + 1];
      morceaux.push({ b: [b[i]], c: [b[i]], m: [b[i]], c0: jc, conflit: false });
    }
    morceau(b.length, c.length, m.length);
  }

  const lignes: string[] = [];
  const origines: Origine[] = [];
  const details: DetailLigne[] = [];
  let conflits = 0;
  for (const mo of morceaux) {
    const { b, c: cc, m } = mo;
    const prendreC = () => cc.forEach((l, k) => { lignes.push(l); origines.push(origineCourante(mo.c0 + k)); details.push({}); });
    if (meme(m, b)) prendreC(); // je n'y ai pas touché : la couche du dessous
    else if (meme(cc, b) || meme(cc, m)) {
      m.forEach((l, k) => { lignes.push(l); origines.push("moi"); details.push({ retouche: retouche(b[k], l) }); });
    } else {
      mo.conflit = true;
      const index = conflits++;
      m.forEach((l, k) => { lignes.push(l); origines.push("conflit-moi"); details.push({ conflit: { index, debut: k === 0 } }); });
      cc.forEach((l) => { lignes.push(l); origines.push("conflit-chant"); details.push({ conflit: { index, debut: m.length === 0 && !details.some((d) => d.conflit?.index === index) } }); });
    }
  }
  return { source: lignes.join("\n"), origines, details, conflits, morceaux };
}

/**
 * Règle le conflit `index` : `choix` = « mienne » ou « chant ». Rend la nouvelle partition (`base` = la courante, `content`
 * ajusté). Les autres conflits restent entiers : leur partie de la base reste l'ancienne, donc ils se re-détectent.
 */
export function resoudre(f: Fusion, index: number, choix: "mienne" | "chant"): { base: string; content: string } {
  const base: string[] = [];
  const content: string[] = [];
  let k = 0;
  for (const mo of f.morceaux) {
    if (!mo.conflit) {
      // Hors conflit : la fusion rend `m` quand je l'ai retouchée, sinon `c` ; la base devient la courante.
      const rendu = meme(mo.m, mo.b) ? mo.c : mo.m;
      content.push(...rendu);
      base.push(...mo.c);
    } else if (k++ === index) {
      content.push(...(choix === "mienne" ? mo.m : mo.c));
      base.push(...mo.c);
    } else {
      content.push(...mo.m);
      base.push(...mo.b);
    }
  }
  return { base: base.join("\n"), content: content.join("\n") };
}
