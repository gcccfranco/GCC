// La phrase « Dans le répertoire » d'une fiche (`fiche.repertoire`) est écrite d'un bloc, chants séparés
// par « · » : *Titre* (couplet, en G : « paroles », Am7 – D) · 荣耀至高神 (主歌 : A – Bm) · …
// On la coupe à l'affichage en lignes « titre / exemple » (harmonie-10). Le texte des données ne change pas.

export type MorceauExemple = { texte: string; accord: boolean };
export type ExempleRepertoire = { titre: string; detail: MorceauExemple[] };

/** Découpe au « · » situé hors des parenthèses. */
function separer(phrase: string): string[] {
  const out: string[] = [];
  let profondeur = 0;
  let debut = 0;
  for (let i = 0; i < phrase.length; i++) {
    const c = phrase[i];
    if (c === "(") profondeur++;
    else if (c === ")") profondeur = Math.max(0, profondeur - 1);
    else if (c === "·" && profondeur === 0) {
      out.push(phrase.slice(debut, i));
      debut = i + 1;
    }
  }
  out.push(phrase.slice(debut));
  return out.map((s) => s.trim()).filter(Boolean);
}

const ACCORD = /^[A-G](?:#|b)?(?:maj|min|dim|aug|sus|add|m|M|\d|[#b+°ø-]|\/[A-G](?:#|b)?|\([^)]*\))*$/;

/** Le détail d'un exemple en morceaux : les accords à part (ils prennent la couleur des accords), le
 *  reste tel quel. Une tonalité après « en » (« en G ») n'est pas un accord. Mis bout à bout, les
 *  morceaux redonnent exactement le détail. */
function morceaux(detail: string): MorceauExemple[] {
  const jetons = detail.split(/(«[^»]*»|\s+)/).filter((j) => j !== "");
  const sortie: MorceauExemple[] = [];
  jetons.forEach((jeton, i) => {
    if (/^\s+$/.test(jeton) || jeton.startsWith("«")) return void sortie.push({ texte: jeton, accord: false });
    const avant = jetons.slice(0, i).filter((j) => !/^\s+$/.test(j)).pop();
    const nu = jeton.replace(/[,;]$/, "");
    const suite = jeton.slice(nu.length);
    if (avant !== "en" && ACCORD.test(nu)) {
      sortie.push({ texte: nu, accord: true });
      if (suite) sortie.push({ texte: suite, accord: false });
    } else sortie.push({ texte: jeton, accord: false });
  });
  // Le tiret entre deux accords est de la même couleur qu'eux.
  for (let i = 1; i < sortie.length - 1; i++) {
    if (sortie[i].texte === "–" && sortie[i - 2]?.accord && sortie[i + 2]?.accord) sortie[i].accord = true;
  }
  return sortie;
}

/** `null` quand la phrase n'a pas la forme attendue : l'appelant la rend alors telle quelle. */
export function decouperRepertoire(phrase: string): ExempleRepertoire[] | null {
  const plate = phrase.replace(/\s*\n\s*/g, " ").trim().replace(/\.$/, "");
  if (!plate) return null;
  const exemples: ExempleRepertoire[] = [];
  for (const item of separer(plate)) {
    const m = item.match(/^\*([^*]+)\*\s*(?:\(([\s\S]*)\))?$/) ?? item.match(/^([^*(]+?)\s*(?:\(([\s\S]*)\))?$/);
    if (!m || !m[1].trim()) return null;
    exemples.push({ titre: m[1].trim(), detail: m[2] ? morceaux(m[2].trim()) : [] });
  }
  return exemples;
}
