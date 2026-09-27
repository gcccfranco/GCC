// Fond d'une barre (5C1, tranche V8 de docs/spec-look.md, 27/09/2026) : opaque, pour que
// le texte ne passe plus derrière le logo et les boutons, mais il repeint ce qu'il cache,
// le fond de la page et son halo : la barre reste invisible tant que rien n'est dessous.
// Premier enfant d'une barre `.material-chrome` ; voir `.barre-fond` dans globals.css.
// `sousNavbar` : la barre est posée sous la navbar, c'est donc elle qui porte le fondu.

// Noms écrits en toutes lettres : Tailwind ne garde une classe de `@layer utilities`
// que s'il la lit telle quelle dans le code.
export function FondDeBarre({ sousNavbar = false }: { sousNavbar?: boolean }) {
  return (
    <div aria-hidden="true" className={sousNavbar ? "barre-fond sous-navbar" : "barre-fond"}>
      <div className="halo barre-halo" />
    </div>
  );
}
