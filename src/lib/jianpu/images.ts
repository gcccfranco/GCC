"use client";

import { useEffect, useState } from "react";

export type JianpuPage = { file: string; w: number; h: number };
export type JianpuEntry = { pages: JianpuPage[]; source: string };
export type JianpuManifest = Record<string, JianpuEntry>;

/** Une étiquette d'accord repérée sur le scan : position en pixels image
 *  et accord d'origine. Le calque masque puis réécrit transposé.
 *
 *  `fh` est la hauteur de texte de **cette étiquette-là**, quand elle n'est
 *  pas celle de la page : une ligne d'intro (`【前奏 | G D/F# | … | D】`) est
 *  gravée nettement plus petite que les accords des couplets, et réécrite au
 *  corps de la page elle déborde sur les crédits. Absente, `labelH` sert. */
/** `sp` : largeur que l'étiquette peut occuper, depuis le bord gauche de son
 *  fond, avant de heurter l'encre gravée à sa droite. Un nom transposé est
 *  souvent plus long que le gravé (`F/A` → `Gb/Bb`) et le fond opaque, ancré
 *  à gauche, effaçait alors ce qui est imprimé à côté — les barres d'une
 *  ligne d'intro, un 【尾句】, l'accord suivant. Mesuré sur les pixels du
 *  scan par `build-chords.py`. */
/** `alt` : demi-tons entre la tonalité de **cette étiquette** et celle de la
 *  page. Certaines gravures portent deux jeux d'accords — des positions de
 *  capo empilées au-dessus des accords réels (在这里 : ré au-dessus de fa),
 *  ou une section qui module sans réimprimer de « 1=X » (有你同行 : ré → mi).
 *  Le décalage appliqué reste celui de la page — les deux jeux montent
 *  ensemble ; `alt` ne change que **l'orthographe**, pour que la rangée de
 *  capo reste une rangée de capo dans toutes les tonalités.
 *
 *  `opt` : cette étiquette est une **lecture alternative** de la même
 *  musique, pas une suite. Elle est masquée par défaut — une page qui
 *  afficherait les deux jeux sans le dire est une page à deux tonalités,
 *  ce que la boucle tient pour pire que pas de calque — et le sélecteur de
 *  tonalité la révèle. Une étiquette dont le `c` est vide reste un simple
 *  masque : la rangée est repérée mais pas encore lue. */
export type JianpuChordLabel = {
  x: number; y: number; w: number; h: number; c: string;
  fh?: number; sp?: number; alt?: number; opt?: boolean;
};
export type JianpuChords = {
  /** Tonalité imprimée sur le PDF — pas forcément celle du .cho. */
  printedKey: string;
  w: number;
  h: number;
  /** Hauteur de texte commune à tout le chant : la bande détectée varie
   *  selon les glyphes de la rangée, la prendre par rangée donnait des
   *  accords de tailles différentes sur la même page. */
  labelH: number;
  /** Cadre du libellé de tonalité de l'en-tête, à réécrire dans la tonalité
   *  jouée. `c` porte le **texte gravé** quand il ne s'écrit pas « 1=X » :
   *  « D 4/4 » (la lettre seule), « F=1 » (l'ordre inverse, hymnaire), ou un
   *  « 1=F » dont la lettre n'est pas celle des accords — 十架的爱 grave
   *  « 1=F » au-dessus d'accords en D, qui sont des positions de capo 3.
   *  Présent, il est transposé comme une étiquette : le décalage des accords
   *  s'applique à la lettre gravée, et le reste de la ligne est laissé
   *  verbatim. Absent, le client écrit « 1=<tonalité jouée> ». */
  keyLabel?: { x: number; y: number; w: number; h: number; c?: string; sp?: number };
  /** Cadre de la tonalité répétée dans le titre — « （D调） ». Elle décrit
   *  *cette page*, donc elle suit la transposition comme « 1=X ». À ne pas
   *  confondre avec « 原调Eb », qui décrit la tonalité de la *source* et
   *  reste tel quel : les deux cohabitent sur 永活盼望. */
  titleKey?: { x: number; y: number; w: number; h: number };
  labels: JianpuChordLabel[];
  /** Absent = calque complet, vérifié à l'œil sur la page transposée.
   *  `false` = certains accords de la partition n'ont pas été relevés et
   *  resteront donc dans la tonalité d'origine. Le client doit alors le dire
   *  et montrer lesquels il a réécrits. */
  complete?: boolean;
};
export type JianpuChordsManifest = Record<string, JianpuChords>;

/** Tonalité dans laquelle se joue un scan. Les pages ne passent `demandee` que
 *  si elle diffère de la tonalité du .cho ; sans elle on joue le .cho, qui
 *  n'est pas toujours celle de la gravure (11 scans depuis le 02/10/2026, dont
 *  有一位神 : .cho en D, scan en C). null = rien à transposer, la gravure reste intacte. */
export function cleJouee(
  demandee: string | null | undefined,
  originalKey: string | null | undefined,
  printedKey: string | undefined,
): string | null {
  return demandee ?? (printedKey && originalKey && originalKey !== printedKey ? originalKey : null);
}

let chordsPromise: Promise<JianpuChordsManifest> | null = null;

export function loadJianpuChords(): Promise<JianpuChordsManifest> {
  chordsPromise ??= fetch("/jianpu/chords.json")
    .then((r) => (r.ok ? (r.json() as Promise<JianpuChordsManifest>) : {}))
    .catch(() => ({}));
  return chordsPromise;
}

export function useJianpuChords(slug: string | null | undefined) {
  const [manifest, setManifest] = useState<JianpuChordsManifest | null>(null);

  useEffect(() => {
    let alive = true;
    loadJianpuChords().then((m) => {
      if (alive) setManifest(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!manifest) return undefined;
  return slug ? (manifest[slug] ?? null) : null;
}

/** Recadrage des scans (piste A, chantier 简谱) : pour chaque page, les pixels
 *  du haut à couper (titre, album, versets gravés) pour que la page commence à
 *  la ligne « 1=X 4/4 ». Donnée certifiée à l'œil (`scripts/jianpu/cadrage.py`) ;
 *  un chant ou une page absents ne sont pas recadrés. */
export type JianpuCadrage = Record<string, number[]>;

let cadragePromise: Promise<JianpuCadrage> | null = null;
/** Le fichier une fois arrivé : un scan monté ensuite (page suivante du mode
 *  louange) part directement recadré, sans une image entière avant la coupe. */
let cadrageCharge: JianpuCadrage | null = null;

export function loadJianpuCadrage(): Promise<JianpuCadrage> {
  cadragePromise ??= fetch("/jianpu/cadrage.json")
    .then((r) => (r.ok ? (r.json() as Promise<JianpuCadrage>) : {}))
    .catch(() => ({}))
    .then((c) => (cadrageCharge = c));
  return cadragePromise;
}

/** Les `top` des pages d'un chant (`[]` s'il n'est pas recadré), ou
 *  `undefined` tant que le fichier n'est pas chargé. */
export function useJianpuCadrage(slug: string | null | undefined): number[] | undefined {
  const [cadrage, setCadrage] = useState<JianpuCadrage | null>(cadrageCharge);

  useEffect(() => {
    let alive = true;
    loadJianpuCadrage().then((c) => {
      if (alive) setCadrage(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!cadrage) return undefined;
  return (slug && cadrage[slug]) || [];
}

/** Marges blanches des scans (V6, validation du 07/11/2026) : pour chaque page,
 *  `[gauche, droite]` en pixels image, mesurées par `scripts/jianpu/marges.py`.
 *  Sert à centrer l'encre dans la colonne ; un chant ou une page absents ne
 *  sont pas décalés. */
export type JianpuMarges = Record<string, [number, number][]>;

let margesPromise: Promise<JianpuMarges> | null = null;
/** Le fichier une fois arrivé : un scan monté ensuite part directement centré. */
let margesChargees: JianpuMarges | null = null;

export function loadJianpuMarges(): Promise<JianpuMarges> {
  margesPromise ??= fetch("/jianpu/marges.json")
    .then((r) => (r.ok ? (r.json() as Promise<JianpuMarges>) : {}))
    .catch(() => ({}))
    .then((m) => (margesChargees = m));
  return margesPromise;
}

/** Les marges des pages d'un chant (`[]` s'il n'est pas mesuré), ou
 *  `undefined` tant que le fichier n'est pas chargé. */
export function useJianpuMarges(slug: string | null | undefined): [number, number][] | undefined {
  const [marges, setMarges] = useState<JianpuMarges | null>(margesChargees);

  useEffect(() => {
    let alive = true;
    loadJianpuMarges().then((m) => {
      if (alive) setMarges(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!marges) return undefined;
  return (slug && marges[slug]) || [];
}

/** Systèmes des scans (JP-A, `scripts/jianpu/systemes.py`) : pour chaque chant certifié à l'œil et chaque page, les
 *  lignes du scan (`y0`..`y1` inclus, px image), les x des barres de mesure et, pour une ligne imbriquée dans sa
 *  voisine, des `masques` `[x0, y0, x1, y1]` à couvrir dans sa tranche (décision 24). Le slug est la clé de
 *  `index.json`. Un chant absent (ou le fichier non chargé, en échec) n'est pas certifié : le scan garde l'affichage
 *  d'une page de scan par page d'écran. */
export type JianpuLigne = { y0: number; y1: number; barres: number[]; masques?: number[][] };
export type JianpuSystemesPage = { file: string; w: number; h: number; lignes: JianpuLigne[] };
export type JianpuSystemes = Record<string, { pages: JianpuSystemesPage[] }>;

let systemesPromise: Promise<JianpuSystemes> | null = null;
/** Le fichier une fois arrivé : un scan monté ensuite (page suivante du mode louange) part directement en tranches. */
let systemesCharges: JianpuSystemes | null = null;

export function loadJianpuSystemes(): Promise<JianpuSystemes> {
  systemesPromise ??= Promise.all([
    fetch("/jianpu/systemes.json")
      .then((r) => (r.ok ? (r.json() as Promise<{ version: number; chants?: JianpuSystemes }>) : { version: 0, chants: {} }))
      .catch(() => ({ version: 0, chants: {} })),
    loadJianpuManifest(),
  ]).then(([d, manifeste]) => {
    // index.json en échec (manifeste vide) : rien n'est certifié cette fois, mais rien n'est gardé non plus, pour
    // qu'un prochain montage réessaie au lieu de laisser tous les scans entiers pour la session.
    if (Object.keys(manifeste).length === 0) {
      systemesPromise = null;
      return {};
    }
    return (systemesCharges = systemesCoherents(d.chants ?? {}, manifeste));
  });
  return systemesPromise;
}

/** Garde les chants dont les pages ont les mêmes fichiers, `w` et `h` que `index.json` : des données d'une ancienne
 *  version (copie hors ligne) ne s'appliquent pas à des scans refaits, le chant retombe sur l'affichage d'une page de
 *  scan par page d'écran (non certifié). */
export function systemesCoherents(systemes: JianpuSystemes, manifeste: JianpuManifest): JianpuSystemes {
  const out: JianpuSystemes = {};
  for (const [slug, chant] of Object.entries(systemes)) {
    const pages = manifeste[slug]?.pages;
    if (!pages || pages.length !== chant.pages.length) continue;
    if (chant.pages.every((p, i) => p.file === pages[i].file && p.w === pages[i].w && p.h === pages[i].h)) out[slug] = chant;
  }
  return out;
}

/** Les systèmes de tous les chants, ou `undefined` tant que le fichier n'est pas chargé (échec : `{}`). */
export function useJianpuSystemes(): JianpuSystemes | undefined {
  const [systemes, setSystemes] = useState<JianpuSystemes | null>(systemesCharges);

  useEffect(() => {
    let alive = true;
    loadJianpuSystemes().then((s) => {
      if (alive) setSystemes(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return systemes ?? undefined;
}

/** Sections du scan (JP-B, `public/jianpu/sections.json`) : pour chaque chant, la page (1-based) et la ligne (1-based)
 *  où commence chaque section du `.cho` ; `anacrouse` : la section commence en fin de la ligne d'avant. Le `id` est
 *  celui de la section du parseur (`Section.id`). Absent (ou fichier en échec) : rien d'allumé, pas de saut. */
export type JianpuSectionScan = { id: string; label?: string; page: number; ligne: number; anacrouse?: boolean };
export type JianpuSections = Record<string, { sections: JianpuSectionScan[] }>;

let sectionsPromise: Promise<JianpuSections> | null = null;
let sectionsCharges: JianpuSections | null = null;

export function loadJianpuSections(): Promise<JianpuSections> {
  sectionsPromise ??= fetch("/jianpu/sections.json")
    .then((r) => (r.ok ? (r.json() as Promise<{ version: number; chants?: JianpuSections }>) : { version: 0, chants: {} }))
    .catch(() => ({ version: 0, chants: {} }))
    .then((d) => (sectionsCharges = d.chants ?? {}));
  return sectionsPromise;
}

/** Les sections de tous les chants, ou `undefined` tant que le fichier n'est pas chargé (échec : `{}`). */
export function useJianpuSections(): JianpuSections | undefined {
  const [sections, setSections] = useState<JianpuSections | null>(sectionsCharges);

  useEffect(() => {
    let alive = true;
    loadJianpuSections().then((s) => {
      if (alive) setSections(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return sections ?? undefined;
}

/** Les marges de tous les chants (`{}` en cas d'échec), ou `undefined` tant que le fichier n'est pas chargé :
 *  la pagination en tranches en a besoin pour tous les scans d'une setlist. */
export function useJianpuMargesToutes(): JianpuMarges | undefined {
  const [marges, setMarges] = useState<JianpuMarges | null>(margesChargees);

  useEffect(() => {
    let alive = true;
    loadJianpuMarges().then((m) => {
      if (alive) setMarges(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  return marges ?? undefined;
}

/** Manifeste des partitions 简谱 disponibles en image (généré par
 *  scripts/jianpu/build-images.py). Chargé une seule fois par session. */
let manifestPromise: Promise<JianpuManifest> | null = null;

export function loadJianpuManifest(): Promise<JianpuManifest> {
  // Un échec n'est pas gardé : le prochain appel réessaie.
  manifestPromise ??= fetch("/jianpu/index.json")
    .then((r) => {
      if (!r.ok) throw new Error(`jianpu/index.json : HTTP ${r.status}`);
      return r.json() as Promise<JianpuManifest>;
    })
    .catch(() => {
      manifestPromise = null;
      return {} as JianpuManifest;
    });
  return manifestPromise;
}

export function jianpuImageUrl(file: string): string {
  return `/jianpu/${encodeURIComponent(file)}`;
}

/** Adresses à garder hors ligne pour les chants donnés : les manifestes (`index`, `chords`, `cadrage`, `systemes`, `sections`, `marges`) et chaque page
 *  de scan de ceux qui en ont un. Le service worker les garde (message « precache », chemins `/jianpu/`). */
export function urlsJianpuAGarder(manifest: JianpuManifest, slugs: Iterable<string>): string[] {
  const urls = [
    "/jianpu/index.json", "/jianpu/chords.json", "/jianpu/cadrage.json",
    "/jianpu/systemes.json", "/jianpu/sections.json", "/jianpu/marges.json",
  ];
  for (const slug of slugs) for (const page of manifest[slug]?.pages ?? []) urls.push(jianpuImageUrl(page.file));
  return urls;
}

/** Parmi ces chants, ceux dont un scan n'est pas dans le cache du navigateur. Ne dit que ce qui se sait sans réseau :
 *  un scan absent du cache est « non chargé » seulement quand on est hors ligne (en ligne, il se charge à l'affichage).
 *  Sans Cache Storage, rien n'est annoncé. */
export async function scansAbsentsDuCache(manifest: JianpuManifest, slugs: Iterable<string>): Promise<string[]> {
  if (typeof caches === "undefined") return [];
  const absents: string[] = [];
  for (const slug of new Set(slugs)) {
    for (const page of manifest[slug]?.pages ?? []) {
      const trouve = await caches.match(jianpuImageUrl(page.file)).catch(() => undefined);
      if (!trouve) {
        absents.push(slug);
        break;
      }
    }
  }
  return absents;
}

/** Partition 简谱 d'un chant, ou null s'il n'en a pas. `undefined` tant que
 *  le manifeste n'est pas chargé (permet de ne pas faire clignoter le bouton). */
export function useJianpuManifest(): JianpuManifest | undefined {
  const [manifest, setManifest] = useState<JianpuManifest | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadJianpuManifest().then((m) => {
      if (alive) setManifest(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  return manifest;
}

export function useJianpuScore(slug: string | null | undefined) {
  const manifest = useJianpuManifest();
  if (!manifest) return undefined;
  return slug ? (manifest[slug] ?? null) : null;
}

/** Les scans sont servis en WebP, que @react-pdf/renderer ne sait pas lire
 *  (JPEG et PNG uniquement). Le PDF étant fabriqué dans le navigateur, on
 *  ré-encode la page en PNG via un canvas avant de la lui passer. `top` : les
 *  rangées de l'en-tête gravé, coupées (`cadrage.json`). */
export async function jianpuPngDataUrl(file: string, top = 0): Promise<string | null> {
  try {
    const res = await fetch(jianpuImageUrl(file));
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height - top;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Le scan d'origine est sur fond blanc opaque ; le canvas, lui, part
    // transparent — un aplat blanc évite un fond noir dans le PDF.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, -top);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
