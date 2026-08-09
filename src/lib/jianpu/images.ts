"use client";

import { useEffect, useState } from "react";

export type JianpuPage = { file: string; w: number; h: number };
export type JianpuEntry = { pages: JianpuPage[]; source: string };
export type JianpuManifest = Record<string, JianpuEntry>;

/** Une étiquette d'accord repérée sur le scan : position en pixels image
 *  et accord d'origine. Le calque masque puis réécrit transposé. */
export type JianpuChordLabel = { x: number; y: number; w: number; h: number; c: string };
export type JianpuChords = {
  /** Tonalité imprimée sur le PDF — pas forcément celle du .cho. */
  printedKey: string;
  w: number;
  h: number;
  /** Hauteur de texte commune à tout le chant : la bande détectée varie
   *  selon les glyphes de la rangée, la prendre par rangée donnait des
   *  accords de tailles différentes sur la même page. */
  labelH: number;
  /** Cadre du libellé « 1=X », à réécrire dans la tonalité jouée. */
  keyLabel?: { x: number; y: number; w: number; h: number };
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
