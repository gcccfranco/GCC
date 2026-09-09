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

/** Manifeste des partitions 简谱 disponibles en image (généré par
 *  scripts/jianpu/build-images.py). Chargé une seule fois par session. */
let manifestPromise: Promise<JianpuManifest> | null = null;

export function loadJianpuManifest(): Promise<JianpuManifest> {
  manifestPromise ??= fetch("/jianpu/index.json")
    .then((r) => (r.ok ? (r.json() as Promise<JianpuManifest>) : {}))
    .catch(() => ({}));
  return manifestPromise;
}

export function jianpuImageUrl(file: string): string {
  return `/jianpu/${encodeURIComponent(file)}`;
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
 *  ré-encode la page en PNG via un canvas avant de la lui passer. */
export async function jianpuPngDataUrl(file: string): Promise<string | null> {
  try {
    const res = await fetch(jianpuImageUrl(file));
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Le scan d'origine est sur fond blanc opaque ; le canvas, lui, part
    // transparent — un aplat blanc évite un fond noir dans le PDF.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
