import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Dossier de build au choix : les tests lancent un second `next dev`
  // (interrupteur du back-office coupé), que Next 16 refuse dans le même dossier.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
