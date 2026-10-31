import { inflateSync } from "node:zlib";

// Lecture d'un PDF produit par @react-pdf/renderer (pdfkit), pour les tests :
// pages (taille et texte), polices embarquées, images. Pas de bibliothèque :
// pdfkit écrit des objets simples (pas de flux d'objets), un flux de contenu
// par page, et chaque police porte sa table ToUnicode — de quoi relire le
// texte tel qu'il s'affiche, ligne par ligne (un TJ = une ligne d'un <Text>).

type Objet = { dict: string; flux?: Buffer };

function objets(pdf: Buffer): Map<number, Objet> {
  const s = pdf.toString("latin1");
  const out = new Map<number, Objet>();
  const re = /(\d+) 0 obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const debut = m.index + m[0].length;
    const finDict = s.indexOf("endobj", debut);
    const posFlux = s.indexOf("stream", debut);
    if (posFlux < 0 || posFlux > finDict) {
      out.set(Number(m[1]), { dict: s.slice(debut, finDict) });
      re.lastIndex = finDict;
      continue;
    }
    const dict = s.slice(debut, posFlux);
    const longueur = Number(/\/Length (\d+)/.exec(dict)?.[1] ?? "0");
    let d = posFlux + "stream".length;
    if (s[d] === "\r") d++;
    if (s[d] === "\n") d++;
    const brut = pdf.subarray(d, d + longueur);
    let flux = brut;
    if (dict.includes("/FlateDecode")) {
      try { flux = inflateSync(brut); } catch { flux = Buffer.alloc(0); }
    }
    out.set(Number(m[1]), { dict, flux });
    re.lastIndex = s.indexOf("endobj", d + longueur);
  }
  return out;
}

const ref = (dict: string, cle: string) => {
  const m = new RegExp(`/${cle} (\\d+) 0 R`).exec(dict);
  return m ? Number(m[1]) : undefined;
};

const utf16 = (brut: string) => {
  // Une ligature (« ff ») porte plusieurs unités, séparées par des espaces : <0066 0066>.
  const hex = brut.replace(/\s+/g, "");
  const unites: number[] = [];
  for (let i = 0; i < hex.length; i += 4) unites.push(parseInt(hex.slice(i, i + 4), 16));
  return String.fromCharCode(...unites);
};

function tableUnicode(texte: string): Map<number, string> {
  const table = new Map<number, string>();
  for (const bloc of texte.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, a, b] of bloc[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F\s]+)>/g)) table.set(parseInt(a, 16), utf16(b));
  }
  for (const bloc of texte.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const [, a, b, cible] of bloc[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F]+>)/g)) {
      const bas = parseInt(a, 16);
      const haut = parseInt(b, 16);
      if (cible.startsWith("[")) {
        [...cible.matchAll(/<([0-9a-fA-F]+)>/g)].forEach((x, k) => table.set(bas + k, utf16(x[1])));
      } else {
        const base = parseInt(cible.slice(1, -1), 16);
        for (let c = bas; c <= haut; c++) table.set(c, String.fromCharCode(base + c - bas));
      }
    }
  }
  return table;
}

export type PagePdf = { largeur: number; hauteur: number; lignes: string[]; texte: string };
export type LecturePdf = { pages: PagePdf[]; polices: string[]; images: { largeur: number; hauteur: number }[] };

export function lirePdf(pdf: Buffer): LecturePdf {
  const objs = objets(pdf);
  const racine = [...objs.values()].find((o) => /\/Type \/Pages\b/.test(o.dict));
  const kids = [...(/\/Kids \[([^\]]*)\]/.exec(racine?.dict ?? "")?.[1] ?? "").matchAll(/(\d+) 0 R/g)].map((x) => Number(x[1]));
  const tables = new Map<number, Map<number, string>>();
  const tableDe = (police: number) => {
    if (!tables.has(police)) {
      const tu = ref(objs.get(police)?.dict ?? "", "ToUnicode");
      tables.set(police, tableUnicode(tu ? objs.get(tu)?.flux?.toString("latin1") ?? "" : ""));
    }
    return tables.get(police)!;
  };

  const pages = kids.map((k) => {
    const page = objs.get(k)!;
    const [, , largeur, hauteur] = (/\/MediaBox \[([^\]]*)\]/.exec(page.dict)?.[1] ?? "0 0 0 0").trim().split(/\s+/).map(Number);
    const resIdx = ref(page.dict, "Resources");
    const res = resIdx ? objs.get(resIdx)?.dict ?? "" : page.dict;
    const blocPolices = /\/Font <<([\s\S]*?)>>/.exec(res)?.[1] ?? "";
    const polices = new Map([...blocPolices.matchAll(/\/(\S+) (\d+) 0 R/g)].map((x) => [x[1], Number(x[2])]));
    const contenu = objs.get(ref(page.dict, "Contents") ?? -1)?.flux?.toString("latin1") ?? "";
    const lignes: string[] = [];
    let table = new Map<number, string>();
    for (const m of contenu.matchAll(/\/(\S+) [\d.]+ Tf|\[([^\]]*)\]\s*TJ|<([0-9a-fA-F]*)>\s*Tj/g)) {
      if (m[1]) { table = tableDe(polices.get(m[1]) ?? -1); continue; }
      const hex = m[2] !== undefined ? [...m[2].matchAll(/<([0-9a-fA-F]*)>/g)].map((x) => x[1]).join("") : m[3];
      let ligne = "";
      for (let i = 0; i < hex.length; i += 4) ligne += table.get(parseInt(hex.slice(i, i + 4), 16)) ?? "";
      lignes.push(ligne);
    }
    return { largeur, hauteur, lignes, texte: lignes.join("\n") };
  });

  const polices = [...new Set([...pdf.toString("latin1").matchAll(/\/BaseFont \/(?:[A-Z]{6}\+)?([^\s/]+)/g)].map((x) => x[1]))];
  const images = [...objs.values()]
    .filter((o) => /\/Subtype \/Image\b/.test(o.dict))
    .map((o) => ({ largeur: Number(/\/Width (\d+)/.exec(o.dict)?.[1]), hauteur: Number(/\/Height (\d+)/.exec(o.dict)?.[1]) }));
  return { pages, polices, images };
}
