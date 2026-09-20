// Halo d'en-tête (5C1, tranche V6 de docs/spec-look.md) : le décor des planches,
// une couleur par écran. Se pose en premier enfant du conteneur plein écran de la
// page (`relative`), avant un contenu `relative` ; voir `.halo` dans globals.css.

// Noms écrits en toutes lettres : Tailwind ne garde une classe de `@layer utilities`
// que s'il la lit telle quelle dans le code.
const CLASSES = { page: "halo", fiche: "halo halo-fiche", chant: "halo halo-chant" };

export function Halo({ color, variant = "page" }: { color: string; variant?: keyof typeof CLASSES }) {
  return <div aria-hidden="true" data-testid="halo" className={CLASSES[variant]} style={{ "--halo": color } as React.CSSProperties} />;
}
