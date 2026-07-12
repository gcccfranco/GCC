"use client";

import { useEffect } from "react";

/**
 * Verrouille le défilement de la page derrière une sheet/drawer en PWA iOS
 * installée (display-mode: standalone) : vaul saute volontairement son propre
 * verrou `position: fixed` dans ce mode, laissant l'arrière-plan défiler sous
 * la feuille et dépasser le voile d'assombrissement (fixed inset-0). Hors
 * standalone, vaul gère déjà le verrou — le hook ne fait rien.
 */
export function useStandaloneScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    const body = document.body;
    const { scrollY } = window;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}
