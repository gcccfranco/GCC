// Halo d'en-tête (5C1, tranches V6 et V7 de docs/spec-look.md) : le décor des planches,
// une couleur par écran, fixe en haut de l'écran. Se pose avant un contenu `relative`,
// hors de tout ancêtre transformé ; voir `.halo` dans globals.css.

// Noms écrits en toutes lettres : Tailwind ne garde une classe de `@layer utilities`
// que s'il la lit telle quelle dans le code.
const CLASSES = { page: "halo", fiche: "halo halo-fiche", chant: "halo halo-chant", moi: "halo halo-moi" };

export function Halo({ color, variant = "page" }: { color: string; variant?: keyof typeof CLASSES }) {
  return <div aria-hidden="true" data-testid="halo" className={CLASSES[variant]} style={{ "--halo": color } as React.CSSProperties} />;
}
