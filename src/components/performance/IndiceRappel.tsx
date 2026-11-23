"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

/**
 * Indice du rappel (lot RS-D, décision D6) : une bulle quand un rappel s'affiche, deux fois au plus par
 * appareil (Timothée, 14/11 : « juste 1-2 fois et après ça ne revient plus »), une clé par mode. Posée
 * par-dessus la page (aucune place dans la pagination), en bas au centre, au-dessus du curseur de pages :
 * sous la rangée, elle cachait le titre de la 1re section (parcours du 14/11, F).
 * Elle part d'elle-même au bout de 6 s, à la page suivante ou d'un toucher sur elle, et ne retient aucun geste de page.
 * A13 : si elle recouvre la pastille « Ensuite » (téléphone), elle remonte au-dessus d'elle.
 */
const APPARITIONS = 2;
const DUREE_MS = 6000;
// Clés déjà comptées depuis le chargement de la page : plusieurs IndiceRappel peuvent se monter pour une même
// apparition, un seul la compte et la montre.
const comptees = new Set<string>();

export function IndiceRappel({ mode, page }: { mode: "played" | "unique"; page: number }) {
  const { t } = useTranslation();
  const [pageVue, setPageVue] = useState<number | null>(null);
  const cle = mode === "played" ? "perf-astuce-rappel-joue" : "perf-astuce-rappel-unique";

  useEffect(() => {
    try {
      // Clé = nombre d'apparitions (« 1 » des appareils qui l'ont déjà vue une fois compte pour une).
      if (comptees.has(cle)) return;
      const vues = Number(localStorage.getItem(cle)) || 0;
      if (vues >= APPARITIONS) return;
      localStorage.setItem(cle, String(vues + 1));
      comptees.add(cle);
    } catch {
      return;
    }
    setPageVue(page);
    // Une fois par ouverture du mode : la page de l'apparition suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  // Elle part d'elle-même : pas besoin qu'elle reste sur la page.
  useEffect(() => {
    if (pageVue === null) return;
    const minuteur = setTimeout(() => setPageVue(null), DUREE_MS);
    return () => clearTimeout(minuteur);
  }, [pageVue]);

  // Changement de page : la bulle part pour de bon (elle ne revient pas en revenant sur la page).
  if (pageVue !== null && pageVue !== page) setPageVue(null);
  // Jamais au premier rendu (pageVue est posée par l'effet) : `document` existe.
  const scene = pageVue === page ? document.querySelector("[data-performance-mode]") : null;
  const bulle = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const b = bulle.current;
    if (!b || !scene) return;
    b.style.bottom = "";
    const r = b.getBoundingClientRect();
    const s = scene.getBoundingClientRect();
    let haut = Infinity;
    scene.querySelectorAll("[data-suivant]").forEach((el) => {
      if (el.closest("[aria-hidden=true]") || getComputedStyle(el).visibility === "hidden") return;
      const p = el.getBoundingClientRect();
      if (p.width && p.left < r.right && p.right > r.left && p.top < r.bottom && p.bottom > r.top) haut = Math.min(haut, p.top);
    });
    if (haut < Infinity) b.style.bottom = `${s.bottom - haut + 8}px`;
  }, [scene, pageVue]);
  if (!scene) return null;
  return createPortal(
    <div
      ref={bulle}
      data-indice-rappel
      role="note"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => {
        e.stopPropagation();
        setPageVue(null);
      }}
      className="material-panel pointer-events-auto absolute bottom-[calc(0.75rem+var(--sab,0px))] left-1/2 z-20 w-max max-w-[min(calc(100%-2rem),36rem)] -translate-x-1/2 text-center [[data-barre-ouverte]_&]:bottom-[calc(3.75rem+var(--sab,0px))] rounded-xl border border-border/60 bg-background/85 px-3 py-1.5 text-[13px] leading-snug text-foreground backdrop-blur"
    >
      {t(mode === "played" ? "performance.indiceRappelJoue" : "performance.indiceRappelUnique")}
    </div>,
    scene,
  );
}
