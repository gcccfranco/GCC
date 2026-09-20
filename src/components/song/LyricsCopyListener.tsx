"use client";

import { useEffect } from "react";
import { handleLyricsCopy } from "@/components/song/copyLyrics";

/** Copie propre des paroles, où que la sélection commence (voir copyLyrics.ts). */
export function LyricsCopyListener() {
  useEffect(() => {
    document.addEventListener("copy", handleLyricsCopy);
    return () => document.removeEventListener("copy", handleLyricsCopy);
  }, []);
  return null;
}
