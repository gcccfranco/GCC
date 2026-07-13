"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Tirer-vers-le-bas pour actualiser (téléphone/tablette, utile surtout en PWA
 * installée où il n'y a pas de bouton recharger). Écoute passive : on n'altère
 * jamais le défilement — on arme le geste quand la page est déjà tout en haut
 * et que l'utilisateur tire d'au moins 70 px, puis on recharge au relâchement.
 * À monter uniquement sur les pages de données (planning, setlists).
 */
export function PullToRefresh() {
  const { t } = useTranslation();
  const [state, setState] = useState<"idle" | "armed" | "refreshing">("idle");
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const THRESHOLD = 70;

    const onStart = (e: TouchEvent) => {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (window.scrollY > 0) { startY.current = null; setState("idle"); return; }
      const dy = e.touches[0].clientY - startY.current;
      setState(dy > THRESHOLD ? "armed" : "idle");
    };
    const onEnd = () => {
      if (startY.current !== null && window.scrollY <= 0) {
        setState((s) => {
          if (s === "armed") {
            window.location.reload();
            return "refreshing";
          }
          return "idle";
        });
      }
      startY.current = null;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div className="fixed top-[calc(var(--nav-h)+10px)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-semibold shadow-lg print:hidden">
      <RefreshCw className={`h-3.5 w-3.5 ${state === "refreshing" ? "animate-spin" : ""}`} />
      {state === "refreshing" ? t("common.pull.refreshing") : t("common.pull.release")}
    </div>
  );
}
