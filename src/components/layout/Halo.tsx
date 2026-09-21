"use client";

// Halo d'en-tête (5C1, tranches V6 et V7 de docs/spec-look.md) : le décor des planches,
// une couleur par écran, fixe en haut de l'écran. Se pose avant un contenu `relative`,
// hors de tout ancêtre transformé ; voir `.halo` dans globals.css.

import { useEffect } from "react";
import { majThemeColor } from "@/components/layout/ThemeColor";

// Noms écrits en toutes lettres : Tailwind ne garde une classe de `@layer utilities`
// que s'il la lit telle quelle dans le code.
const CLASSES = { page: "halo", fiche: "halo halo-fiche", chant: "halo halo-chant", moi: "halo halo-moi" };

export function Halo({ color, variant = "page" }: { color: string; variant?: keyof typeof CLASSES }) {
  // Android peint sa barre d'état avec `theme-color` : elle prend la teinte du halo.
  // La couleur d'une fiche arrive après son chargement (la catégorie d'une setlist),
  // sans changement d'adresse : d'où cette mise à jour, en plus de celle de la mise en page.
  useEffect(() => { majThemeColor(); }, [color, variant]);

  return <div aria-hidden="true" data-testid="halo" className={CLASSES[variant]} style={{ "--halo": color } as React.CSSProperties} />;
}
