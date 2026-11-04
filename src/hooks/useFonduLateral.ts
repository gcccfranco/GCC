import { useEffect, useRef } from "react";

/** Largeur du fondu à chaque bout, en pixels (V7, docs/spec-look.md). */
const FONDU = 24;

/**
 * Une rangée qui glisse s'estompe du côté où il reste quelque chose à voir, au lieu
 * d'être tranchée net au bord de la colonne (« la pastille du chant est coupée »,
 * retour de Timothée du 21/09/2026). Pose `--fondu-gauche` et `--fondu-droite` sur
 * l'élément, que `.fondu-lateral` (globals.css) transforme en masque.
 *
 * `cle` : ce dont dépend la largeur du contenu (le nombre d'éléments, par exemple) —
 * un contenu qui arrive après le montage ne change pas la taille de la rangée, donc
 * rien ne préviendrait l'observateur de taille.
 *
 * `options.gauche: false` : pas de fondu à gauche (plannings-1, la colonne Date collante de la grille
 * d'un planning ne doit pas être blanchie) ; `--fondu-gauche` reste à 0.
 */
export function useFonduLateral<T extends HTMLElement>(cle: unknown, options?: { gauche?: boolean }) {
  const ref = useRef<T>(null);
  const gauche = options?.gauche ?? true;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const majFondu = () => {
      const reste = el.scrollWidth - el.clientWidth - el.scrollLeft;
      el.style.setProperty("--fondu-gauche", `${gauche && el.scrollLeft > 1 ? FONDU : 0}px`);
      el.style.setProperty("--fondu-droite", `${reste > 1 ? FONDU : 0}px`);
    };
    majFondu();
    el.addEventListener("scroll", majFondu, { passive: true });
    const observateur = new ResizeObserver(majFondu);
    observateur.observe(el);
    return () => {
      el.removeEventListener("scroll", majFondu);
      observateur.disconnect();
    };
  }, [cle, gauche]);

  return ref;
}
