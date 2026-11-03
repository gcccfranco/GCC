import { useEffect, type RefObject } from "react";

/** Hauteur du fondu en haut et en bas, en pixels (harmonie-2). */
const FONDU = 32;

/**
 * Sœur verticale de `useFonduLateral` : un volet qui défile s'estompe du côté où il reste quelque chose
 * à voir, au lieu d'être coupé net (en bas tant qu'il y a une suite, en haut dès qu'on a défilé). Pose
 * `--fondu-haut` (0 → 32 px sur les 32 premiers pixels de `scrollTop`) et `--fondu-bas` (32 px tant que
 * le contenu continue, jusqu'à 0 au bout) sur l'élément, que `.fondu-vertical` (globals.css) dessine.
 * Rien ne se voit quand le contenu tient sans défiler.
 */
export function useFonduVertical(ref: RefObject<HTMLElement | null>, actif = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !actif) return;
    const maj = () => {
      const reste = el.scrollHeight - el.clientHeight - el.scrollTop;
      el.style.setProperty("--fondu-haut", `${Math.min(FONDU, Math.max(0, el.scrollTop))}px`);
      el.style.setProperty("--fondu-bas", `${reste > 1 ? Math.min(FONDU, reste) : 0}px`);
    };
    maj();
    el.addEventListener("scroll", maj, { passive: true });
    // La carte change de taille avec la fenêtre ; son contenu, avec la recherche et les filtres.
    const taille = new ResizeObserver(maj);
    const suivre = () => {
      taille.disconnect();
      taille.observe(el);
      for (const enfant of Array.from(el.children)) taille.observe(enfant);
      maj();
    };
    suivre();
    const contenu = new MutationObserver(suivre);
    contenu.observe(el, { childList: true });
    return () => {
      el.removeEventListener("scroll", maj);
      taille.disconnect();
      contenu.disconnect();
      el.style.removeProperty("--fondu-haut");
      el.style.removeProperty("--fondu-bas");
    };
  }, [ref, actif]);
}
