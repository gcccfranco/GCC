import { useEffect } from "react";

/** Mémorise le chant dans les « récemment consultés » (affichés sur /songs). */
export function useRecents(slug: string) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recentSongs");
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [slug, ...list.filter((s) => s !== slug)].slice(0, 8);
      localStorage.setItem("recentSongs", JSON.stringify(next));
      // La liste des deux volets, restée montée, relit ses récents.
      window.dispatchEvent(new Event("recentSongs"));
    } catch { /* stockage indisponible */ }
  }, [slug]);
}
