"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Couleur de la barre d'état d'Android (V7, T6). Android ne laisse pas la page monter
 * sous l'heure comme iOS : il peint cette bande avec `theme-color`. On lui donne donc la
 * couleur qu'aurait le haut de la page — le fond, teinté par le halo de l'écran — pour
 * que la couture ne se voie pas.
 *
 * Tout est lu sur la page au moment de poser la couleur, jamais recopié : le fond suit
 * déjà le thème clair ou sombre, et la teinte vient du halo affiché, quelle que soit la
 * façon dont sa couleur a été écrite (`var(--chord-color)` et compagnie).
 */
export function majThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const fond = enRgb(getComputedStyle(document.body).backgroundColor, [255, 255, 255]);
  const halo = document.querySelector('[data-testid="halo"]');
  const ellipse = halo && getComputedStyle(halo, "::before");
  const teinte = ellipse
    ? melanger(enRgb(ellipse.backgroundColor, fond), fond, Number(ellipse.opacity))
    : fond;
  meta.setAttribute("content", hex(teinte));
}

/** `rgb(r, g, b)` → [r, g, b] ; une couleur illisible retombe sur le repli. */
function enRgb(couleur: string, repli: [number, number, number]): [number, number, number] {
  const n = couleur.match(/\d+(\.\d+)?/g)?.map(Number);
  return n && n.length >= 3 ? [n[0], n[1], n[2]] : repli;
}

const melanger = (a: number[], b: number[], part: number): [number, number, number] =>
  [0, 1, 2].map((i) => Math.round(a[i] * part + b[i] * (1 - part))) as [number, number, number];

const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

/**
 * Monté une fois par la mise en page : il remet la couleur à jour quand on change
 * d'écran, et quand le thème bascule — au réglage de l'appareil comme au choix de la
 * personne, puisque les deux passent par la classe posée sur `<html>`.
 *
 * Les effets des enfants passent avant ceux du parent : le halo de l'écran est déjà en
 * place quand celui-ci lit la page.
 */
export function ThemeColorDuFond() {
  const pathname = usePathname();
  useEffect(() => {
    majThemeColor();
    const observateur = new MutationObserver(() => majThemeColor());
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observateur.disconnect();
  }, [pathname]);
  return null;
}
