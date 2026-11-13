"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { compter, envoyerUsage, normaliserRoute } from "@/lib/usage";
import { auth } from "@/lib/firebase/config";

/** Crochet de comptage d'usage (docs/spec-comptage-usage.md, T1) : un écran par changement de route, le site
 *  installé au lancement, l'envoi quotidien au montage, en arrière-plan et à la connexion. Ne rend rien. */
export function UsageCompteur() {
  const pathname = usePathname();

  useEffect(() => {
    compter(normaliserRoute(pathname));
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) compter("cmd.general.pwa");
    void envoyerUsage();
    const auCache = () => {
      if (document.visibilityState === "hidden") void envoyerUsage();
    };
    document.addEventListener("visibilitychange", auCache);
    const fin = auth.onAuthStateChanged((u) => {
      if (u) void envoyerUsage();
    });
    return () => {
      document.removeEventListener("visibilitychange", auCache);
      fin();
    };
  }, []);

  return null;
}
