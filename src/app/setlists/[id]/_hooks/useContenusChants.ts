import { useCallback, useState } from "react";
import type { SetlistItem } from "@/types/setList";
import { fetchSongAST, type SongContent } from "@/lib/api/songs";

/** Contenu des chants de la setlist (partitions) et son chargement. */
export function useContenusChants() {
  const [contents, setContents] = useState<Record<string, SongContent>>({});
  const [loadingContent, setLoadingContent] = useState(false);

  // Load full song content when switching to Partitions view
  const loadContents = useCallback(async (items: SetlistItem[]) => {
    setLoadingContent(true);
    const slugsToLoad: string[] = [];
    for (const item of items) {
      if (item.type === "fusion" && item.fusionSongs) {
        for (const fs of item.fusionSongs) {
          if (!contents[fs.songSlug]) slugsToLoad.push(fs.songSlug);
        }
      } else if (item.songSlug && !contents[item.songSlug]) {
        slugsToLoad.push(item.songSlug);
      }
    }
    const manquants: string[] = [];
    await Promise.all(
      slugsToLoad.map(async (slug) => {
        const res = await fetchSongAST(slug);
        if (res) setContents((prev) => ({ ...prev, [slug]: res }));
        else manquants.push(slug);
      })
    );
    setLoadingContent(false);
    return manquants;
  }, [contents, setContents]);

  return { contents, setContents, loadingContent, loadContents };
}
