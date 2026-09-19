import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // L'app s'appelle « GCC » depuis le lot 4 (docs/spec-look.md) ; le
    // manifeste est la seule source, public/manifest.webmanifest a été retiré
    // le 19/09/2026 (il démarrait sur l'accueil, en orange d'avant le look).
    name: "GCC",
    short_name: "GCC",
    description: "L'app de l'église GCC : chants, setlists, planning, évènements",
    start_url: "/planning",
    display: "standalone",
    background_color: "#f2f2ef",
    theme_color: "#f2f2ef",
    orientation: "portrait",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}