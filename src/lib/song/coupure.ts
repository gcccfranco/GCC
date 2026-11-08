/** Coupure des vers (lot CV, docs/spec-mode-louange-forscore-2.md, règles R1 à R5).
 *
 *  Module pur : ni React ni DOM. Le composant mesure des unités insécables (les mots), ce module choisit où
 *  passer à la rangée suivante. Logique reprise de `cut` dans docs/planches/planche-dispositions-partition.html,
 *  avec un écart voulu : si deux rangées ne suffisent pas, on essaie trois puis quatre (le corps du texte ne baisse
 *  pas tout seul sur le site, et la page ne doit jamais déborder). */

/** R1 : la rangée la plus courte pèse au moins 40 % de la plus longue. */
export const EQUILIBRE = 0.4;
/** R4 : la ligne peut déborder de 8 px dans la marge droite avant qu'on coupe. */
export const DEBORD = 8;
/** R4 : puis jusqu'à 5 % de trop (de la largeur) en resserrant l'interlettrage… */
export const RESSERRE_MAX_PART = 0.05;
/** … sans dépasser 0,03 em par caractère. */
export const RESSERRE_MAX_EM = 0.03;

/** Au-delà, pas de recherche exhaustive : repli glouton. */
const MAX_UNITES = 60;
const MAX_RANGEES = 4;
const TOLERANCE = 0.5;

export type Unite = {
  /** Largeur de l'unité, espace final compris, mesurée sans interlettrage. */
  largeur: number;
  /** Largeur de l'espace final, à retirer quand l'unité finit une rangée. */
  espaceFin: number;
  texte: string;
  /** Accords sans paroles en fin de ligne (R3) : suit toujours la dernière unité de texte. */
  queue?: boolean;
};

export type OptionsCoupure = {
  /** Largeur disponible d'une rangée. */
  largeur: number;
  /** Corps du texte en px (1 em). */
  em: number;
  /** Débordement permis du texte dans la marge droite. */
  debord: number;
  /** Débordement permis de la queue d'accords (R3). */
  debordQueue: number;
  /** Permet l'interlettrage resserré (R4). */
  resserrer: boolean;
};

export type EtatCoupure = "une" | "marge" | "queue" | "resserre" | "rangees" | "deborde";

export type ResultatCoupure = {
  /** Indices d'unité APRÈS lesquels on passe à la rangée suivante ; [] = une seule rangée. */
  coupures: number[];
  /** Pixels à retirer par caractère (R4), 0 sinon. */
  interlettrage: number;
  etat: EtatCoupure;
  /** Règles tolérées pour y arriver : « déséquilibre », « mot court », « mot seul », « plus de deux rangées ». */
  relache: string[];
};

/** Pas de coupure juste après un mot d'une ou deux lettres (un, le, la, de, à…) ni après « les »,
 *  sauf s'il finit par une ponctuation. */
export function court(texte: string): boolean {
  let t = texte.replace(/\s+$/, "");
  if (/[,;:!?»….)]$/.test(t)) return false;
  t = t.replace(/^[«"“(‘']+/, "");
  return (t.match(/\p{L}/gu) ?? []).length <= 2 || /^les$/i.test(t);
}

/** Coupure après une ponctuation française. */
export function ponctue(texte: string): boolean {
  return /[,;:!?»…]\s*$/.test(texte);
}

type Candidate = { coupures: number[]; equilibre: number; ponctue: boolean };

/** Toutes les façons de poser `k - 1` coupures parmi les `n - 1` fins d'unité possibles. */
function combinaisons(n: number, k: number, visiter: (coupures: number[]) => void) {
  const acc: number[] = [];
  const rec = (depuis: number) => {
    if (acc.length === k - 1) {
      visiter(acc);
      return;
    }
    for (let i = depuis; i <= n - 2; i++) {
      acc.push(i);
      rec(i + 1);
      acc.pop();
    }
  };
  rec(0);
}

export function choisirCoupure(unites: Unite[], opts: OptionsCoupure): ResultatCoupure {
  const { largeur: A, em, debord, debordQueue, resserrer } = opts;
  const vide = (etat: EtatCoupure): ResultatCoupure => ({ coupures: [], interlettrage: 0, etat, relache: [] });

  // Les unités « queue » (accords de fin sans paroles) ne sont jamais des points de coupure : elles collent à la
  // dernière unité de texte (R3). Une ligne sans aucun texte n'a rien à couper.
  let nu = unites.length;
  while (nu > 0 && unites[nu - 1].queue) nu--;
  if (nu === 0) return vide("une");
  const queueW = unites.slice(nu).reduce((s, u) => s + u.largeur, 0);
  const aQueue = nu < unites.length;

  const somme = [0];
  unites.slice(0, nu).forEach((u, i) => somme.push(somme[i] + u.largeur));
  const texteL = (a: number, b: number) => somme[b + 1] - somme[a] - unites[b].espaceFin;
  const totalL = (a: number, b: number) => (b === nu - 1 && aQueue ? somme[b + 1] - somme[a] + queueW : texteL(a, b));

  // Une seule rangée : la marge d'abord, la queue ensuite.
  const texteTout = texteL(0, nu - 1);
  const totalTout = totalL(0, nu - 1);
  const besoin = Math.max(texteTout - A - debord, totalTout - A - (aQueue ? debordQueue : debord));
  if (besoin <= TOLERANCE) return vide(texteTout > A + TOLERANCE ? "marge" : totalTout > A + TOLERANCE ? "queue" : "une");

  // R4 : jusqu'à 5 % de trop, on resserre l'interlettrage (espaces exclus du compte, marge de sécurité de 10 %).
  if (resserrer) {
    const caracteres = unites.slice(0, nu).reduce((s, u) => s + (u.texte.match(/\S/gu)?.length ?? 0), 0);
    if (caracteres > 0 && besoin <= RESSERRE_MAX_PART * A && besoin / caracteres <= RESSERRE_MAX_EM * em) {
      return { coupures: [], interlettrage: (besoin / caracteres) * 1.1, etat: "resserre", relache: [] };
    }
  }

  // R1 : la dernière rangée peut porter la queue ; les rangées de suite disposent d'un em de moins (R5).
  const tient = (a: number, b: number, dispo: number) => {
    if (b === nu - 1 && aQueue) return texteL(a, b) <= dispo + debord + TOLERANCE && totalL(a, b) <= dispo + debordQueue + TOLERANCE;
    return totalL(a, b) <= dispo + debord + TOLERANCE;
  };
  const rangeesDe = (coupures: number[]) => {
    const rangees: [number, number][] = [];
    let a = 0;
    for (const b of [...coupures, nu - 1]) {
      rangees.push([a, b]);
      a = b + 1;
    }
    return rangees;
  };
  const evaluer = (coupures: number[], seul: boolean, courtOk: boolean): Candidate | null => {
    const rangees = rangeesDe(coupures);
    if (!seul && rangees.some(([a, b]) => b === a)) return null;
    if (!courtOk && coupures.some((b) => court(unites[b].texte))) return null;
    if (!rangees.every(([a, b], r) => tient(a, b, r ? A - em : A))) return null;
    const ws = rangees.map(([a, b]) => totalL(a, b));
    return {
      coupures: coupures.slice(),
      equilibre: Math.min(...ws) / Math.max(...ws),
      ponctue: coupures.every((b) => ponctue(unites[b].texte)),
    };
  };
  const fini = (c: Candidate, relache: string[]): ResultatCoupure => ({ coupures: c.coupures, interlettrage: 0, etat: "rangees", relache });

  if (nu > MAX_UNITES) {
    // Repli glouton : chaque rangée prend le plus de mots possible.
    const coupures: number[] = [];
    let a = 0;
    for (let b = 0; b < nu - 1; b++) {
      if (tient(a, b + 1, coupures.length ? A - em : A)) continue;
      if (b < a || !tient(a, b, coupures.length ? A - em : A)) return vide("deborde");
      coupures.push(b);
      a = b + 1;
    }
    if (!tient(a, nu - 1, coupures.length ? A - em : A)) return vide("deborde");
    return coupures.length ? fini({ coupures, equilibre: 0, ponctue: false }, ["repli glouton"]) : vide("une");
  }

  // Passes : 0 tout respecté ; 1 coupure tolérée après un mot court ; 2 rangée d'un seul mot tolérée ; 3 les deux.
  const PASSES: [boolean, boolean][] = [[false, false], [false, true], [true, false], [true, true]];
  for (let k = 2; k <= Math.min(MAX_RANGEES, nu); k++) {
    for (const [seul, courtOk] of PASSES) {
      const ok: Candidate[] = [];
      combinaisons(nu, k, (coupures) => {
        const c = evaluer(coupures, seul, courtOk);
        if (c) ok.push(c);
      });
      if (!ok.length) continue;
      const relache: string[] = [];
      let pool = ok;
      if (k === 2) {
        // Deux rangées : équilibrées (40 %) d'abord.
        const equilibrees = ok.filter((c) => c.equilibre >= EQUILIBRE);
        if (equilibrees.length) pool = equilibrees;
        else relache.push("déséquilibre");
      } else {
        relache.push("plus de deux rangées");
      }
      // Puis celles qui coupent partout après une ponctuation, puis le meilleur équilibre.
      const ponctuees = pool.filter((c) => c.ponctue);
      if (ponctuees.length) pool = ponctuees;
      pool = [...pool].sort((x, y) => y.equilibre - x.equilibre);
      if (courtOk) relache.push("mot court");
      if (seul) relache.push("mot seul");
      return fini(pool[0], relache);
    }
  }
  // Rien ne tient avec la queue collée au texte (texte très agrandi, longue suite d'accords) : la queue devient
  // des unités ordinaires, qui peuvent passer à la rangée suivante plutôt que déborder de la page.
  if (aQueue) {
    const r = choisirCoupure(unites.map((u) => ({ ...u, queue: false })), opts);
    if (r.etat === "rangees") return { ...r, relache: [...r.relache, "queue coupée"] };
  }
  return vide("deborde");
}
