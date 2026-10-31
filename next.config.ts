import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Dossier de build au choix : les tests lancent un second `next dev`
  // (interrupteur du back-office coupé), que Next 16 refuse dans le même dossier.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // ST3 : l'ancienne adresse mène à la page ouverte à tous, même interrupteur du back-office coupé
  // (le layout Back-Office y répondrait 404). Next garde la query string.
  async redirects() {
    return [
      { source: "/back-office/statistiques", destination: "/songs/statistiques/", permanent: false },
      { source: "/back-office/statistiques/", destination: "/songs/statistiques/", permanent: false },
    ];
  },
};

export default nextConfig;
