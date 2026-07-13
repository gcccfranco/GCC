"use client";

import { useEffect, useState } from "react";

type Tab = "upcoming" | "archived" | "mine";

const ONLY_MINE_KEY = "setlists-only-mine";

/**
 * État de navigation de la liste des setlists, persistant :
 * - onglet, recherche et catégorie vivent dans l'URL (`?tab=&q=&cat=`) →
 *   le retour navigateur (ou le bouton retour d'une setlist, qui rejoue
 *   `lastListPath`) ramène exactement où on s'était arrêté ;
 * - le filtre « Mes services » est mémorisé sur l'appareil : coché par
 *   défaut, mais un décochage reste acquis d'une visite à l'autre ;
 * - la position de scroll est restaurée via sessionStorage.
 */
export function useSetlistsNavState() {
  const [categoryFilter, setCategoryFilter] = useState("Toutes");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMineState] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation depuis l'URL (+ localStorage pour « Mes services ») et
  // restauration du scroll
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategoryFilter(params.get("cat") || "Toutes");
    const t = params.get("tab");
    if (t === "archived" || t === "mine") setTab(t);
    setQuery(params.get("q") || "");
    try {
      setOnlyMineState(localStorage.getItem(ONLY_MINE_KEY) !== "0");
    } catch { /* stockage indisponible */ }
    setIsInitialized(true);

    const savedScroll = sessionStorage.getItem("setlistsScrollPos");
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: "instant" as ScrollBehavior });
      }, 80);
    }
  }, []);

  const setOnlyMine = (updater: (v: boolean) => boolean) => {
    setOnlyMineState((v) => {
      const next = updater(v);
      try { localStorage.setItem(ONLY_MINE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  // Sync URL + sessionStorage quand l'état change
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    if (categoryFilter !== "Toutes") params.set("cat", categoryFilter);
    if (tab !== "upcoming") params.set("tab", tab);
    if (query.trim()) params.set("q", query.trim());

    const queryString = params.toString();
    const newUrl = window.location.pathname + (queryString ? `?${queryString}` : "");
    window.history.replaceState(null, "", newUrl);
    sessionStorage.setItem("lastListPath", newUrl);
  }, [categoryFilter, tab, query, isInitialized]);

  // Sauvegarde du scroll au défilement
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem("setlistsScrollPos", window.scrollY.toString());
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { categoryFilter, setCategoryFilter, tab, setTab, query, setQuery, onlyMine, setOnlyMine };
}
