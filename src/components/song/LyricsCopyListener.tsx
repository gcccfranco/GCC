"use client";

import { useEffect } from "react";
import { handleLyricsCopy } from "@/components/song/copyLyrics";
import { compter } from "@/lib/usage";

/** Copie propre des paroles, où que la sélection commence (voir copyLyrics.ts). */
export function LyricsCopyListener() {
  useEffect(() => {
    // Compté seulement quand la copie des paroles a vraiment agi (le gestionnaire a repris la main).
    const copie = (e: ClipboardEvent) => {
      handleLyricsCopy(e);
      if (e.defaultPrevented) compter("cmd.chant.copierParoles");
    };
    document.addEventListener("copy", copie);
    return () => document.removeEventListener("copy", copie);
  }, []);
  return null;
}
