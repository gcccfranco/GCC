import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // L'app s'appelle « GCC » depuis le lot 4 (docs/spec-look.md) ; le
    // manifeste est la seule source, public/manifest.webmanifest a été retiré
    // le 19/09/2026 (il démarrait sur l'accueil, en orange d'avant le look).
    name: "GCC",
    short_name: "GCC",
    description: "L'app de l'église GCC : chants, setlists, planning, évènements",
    start_url: "/planning/",
    // Portée : tout le site. Sans elle, la portée par défaut est le dossier de start_url (/planning/) et iPadOS
    // affiche sa barre de navigateur dès qu'on en sort (setlists, chants, back-office) : Timothée, 13/11/2026.
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    // Pas d'orientation imposée (lot U5, docs/spec-deux-volets.md, question 7) :
    // « portrait » figeait l'app Android installée, sans deux volets ni deux
    // colonnes sur une tablette couchée.
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}