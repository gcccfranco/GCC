import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

/** Thème scène (indépendant du thème du site, mémorisé). */
export function useThemeScene() {
  const [stageTheme, setStageTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("perf-theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* stockage indisponible */ }
    return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });
  const { resolvedTheme } = useTheme();
  // Thème courant du site (next-themes), relu à la sortie ; repli : la classe vue à l'ouverture.
  const siteTheme = useRef<string | undefined>(resolvedTheme);
  const siteWasDark = useRef<boolean | null>(null);
  const stageThemeRef = useRef(stageTheme);
  useEffect(() => { siteTheme.current = resolvedTheme; }, [resolvedTheme]);
  useEffect(() => { stageThemeRef.current = stageTheme; }, [stageTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (siteWasDark.current === null) siteWasDark.current = root.classList.contains("dark");
    root.classList.toggle("dark", stageTheme === "dark");
  }, [stageTheme]);

  // Pendant le mode, si next-themes réécrit la classe (bascule du thème système), la scène reprend la main.
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => {
      const voulu = stageThemeRef.current === "dark";
      if (root.classList.contains("dark") !== voulu) root.classList.toggle("dark", voulu);
    });
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Fermeture : le thème courant du site, pas celui d'avant l'ouverture
  useEffect(() => () => {
    const dark = siteTheme.current ? siteTheme.current === "dark" : siteWasDark.current;
    if (dark !== null) document.documentElement.classList.toggle("dark", dark);
  }, []);

  const setTheme = useCallback((t: "light" | "dark") => {
    setStageTheme(t);
    try { localStorage.setItem("perf-theme", t); } catch { /* ignore */ }
  }, []);

  return { stageTheme, setTheme };
}
