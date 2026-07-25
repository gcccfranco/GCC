"use client";

import { useEffect, useState } from "react";

export type JianpuPage = { file: string; w: number; h: number };
export type JianpuEntry = { pages: JianpuPage[]; source: string };
export type JianpuManifest = Record<string, JianpuEntry>;

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
