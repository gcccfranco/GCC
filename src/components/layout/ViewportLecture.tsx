"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const BASE = "width=device-width, initial-scale=1, viewport-fit=cover";
const FIGE = `${BASE}, maximum-scale=1, user-scalable=no`;

/** Pages de lecture : /songs/<slug>/ et /setlists/<id>/ (pas la liste, « new » ni « edit »). */
function estPageDeLecture(chemin: string): boolean {
  const seg = chemin.split("/").filter(Boolean);
  if (seg[0] === "songs") return seg.length === 2;
  if (seg[0] === "setlists") return seg.length === 2 && seg[1] !== "new";
  return false;
}

/**
 * Zoom pincé interdit sur les seules pages de lecture : sur iOS, un zoom y décroche la barre
 * fixe (C5). Partout ailleurs il est permis (WCAG 1.4.4). Réécrit le `content` du meta viewport
 * selon la route, car l'export `viewport` de layout.tsx vaut pour tout le site.
 */
export function ViewportLecture() {
  const chemin = usePathname() || "";
  const fige = estPageDeLecture(chemin);
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.setAttribute("content", fige ? FIGE : BASE);
  }, [fige, chemin]);
  return null;
}
