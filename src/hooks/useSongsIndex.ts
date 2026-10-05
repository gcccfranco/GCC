"use client";

import { useEffect, useState } from "react";
import type { SongIndexEntry } from "@/types/song";

// Liste des chants lue dans `/songs-index.json` (lot U5, docs/spec-deux-volets.md, Q15) :
// elle vit dans le layout de Chants et n'alourdit plus les 378 pages statiques. Gardée en
// mémoire une fois lue : la liste remontée (retour sur le téléphone) s'affiche d'un coup,
// ce qui permet de rendre sa position avant la première image.

let cache: SongIndexEntry[] | null = null;
let enCours: Promise<SongIndexEntry[]> | null = null;

function charger(): Promise<SongIndexEntry[]> {
  enCours ??= fetch("/songs-index.json")
    .then((r) => {
      if (!r.ok) throw new Error(`songs-index.json : HTTP ${r.status}`);
      return r.json() as Promise<{ songs: SongIndexEntry[] }>;
    })
    .then((j) => (cache = j.songs))
    .catch((e) => {
      enCours = null; // hors ligne : on réessaiera au prochain montage
      throw e;
    });
  return enCours;
}

/** Les chants de l'index ; `null` tant qu'ils ne sont pas lus. */
export function useSongsIndex(): SongIndexEntry[] | null {
  // `cache` vaut `null` au rendu du serveur et à l'hydratation : pas d'écart.
  const [songs, setSongs] = useState<SongIndexEntry[] | null>(cache);
  useEffect(() => {
    if (songs) return;
    let vivant = true;
    charger()
      .then((s) => { if (vivant) setSongs(s); })
      .catch(() => { /* hors ligne : liste vide */ });
    return () => { vivant = false; };
  }, [songs]);
  return songs;
}
