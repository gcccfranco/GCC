"use client";

import { useCallback, useEffect, useState } from "react";
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
      enCours = null; // hors ligne : on réessaiera
      throw e;
    });
  return enCours;
}

export type SongsIndex = {
  /** Les chants de l'index ; `null` tant qu'ils ne sont pas lus. */
  songs: SongIndexEntry[] | null;
  /** Vrai quand la lecture a échoué (hors ligne, sans copie du service worker). */
  erreur: boolean;
  /** Relit l'index ; aussi fait seul au retour du réseau. */
  reessayer: () => void;
};

/** L'index des chants. `lire` faux : rien n'est téléchargé (page d'un chant sans la
 *  liste à côté : 367 Ko dont rien ne se servirait). */
export function useSongsIndex(lire = true): SongsIndex {
  // `cache` vaut `null` au rendu du serveur et à l'hydratation : pas d'écart.
  const [songs, setSongs] = useState<SongIndexEntry[] | null>(cache);
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    if (songs || !lire) return;
    let vivant = true;
    charger()
      .then((s) => { if (vivant) setSongs(s); })
      .catch(() => { if (vivant) setErreur(true); });
    return () => { vivant = false; };
  }, [songs, lire, essai]);
  const reessayer = useCallback(() => {
    setErreur(false);
    setEssai((n) => n + 1);
  }, []);
  // Le réseau revient : on relit sans attendre un geste.
  useEffect(() => {
    if (!erreur) return;
    window.addEventListener("online", reessayer);
    return () => window.removeEventListener("online", reessayer);
  }, [erreur, reessayer]);
  return { songs, erreur, reessayer };
}
