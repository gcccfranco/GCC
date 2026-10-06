"use client";

import { useEffect, useState } from "react";
import { CLE_LISTE_SETLISTS } from "@/lib/navigation";

export type Tab = "upcoming" | "archived" | "mine";

const ONLY_MINE_KEY = "setlists-only-mine";
const CLE_SCROLL_VOLET = "setlistsScrollPosVolet";
const VOLET_LISTE = '[data-volet="liste"]';

/**
 * État de navigation de la liste des setlists, persistant :
 * - onglet, recherche et catégorie vivent dans l'URL (`?tab=&q=&cat=`) →
 *   le retour navigateur (ou le bouton retour d'une setlist, qui rejoue
 *   `lastListPath`) ramène exactement où on s'était arrêté ;
 * - le filtre « Mes services » est mémorisé sur l'appareil : coché par
 *   défaut, mais un décochage reste acquis d'une visite à l'autre ;
 * - la position de scroll est restaurée via sessionStorage : celle de la fenêtre, et en
 *   grand celle du volet de la liste, qui défile seul (lot U4 bis, relecture) ;
 * - en grand, l'aperçu de la setlist choisie aussi (`?apercu=<id>`, lot U4 bis, B2, Q4) :
 *   l'adresse est remplacée, sans entrée d'historique.
 */
export function useSetlistsNavState() {
  const [categoryFilter, setCategoryFilter] = useState("Toutes");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMineState] = useState(true);
  const [apercu, setApercu] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation depuis l'URL (+ localStorage pour « Mes services ») et
  // restauration du scroll
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategoryFilter(params.get("cat") || "Toutes");
    const t = params.get("tab");
    if (t === "archived" || t === "mine") setTab(t);
    setQuery(params.get("q") || "");
    setApercu(params.get("apercu"));
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
    // Le volet de la liste (deux volets) : la liste arrive après la lecture des setlists, on
    // attend qu'elle soit assez longue (une seconde au plus), puis on y remet la position.
    const savedVolet = parseInt(sessionStorage.getItem(CLE_SCROLL_VOLET) ?? "", 10);
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    if (savedVolet > 0) {
      const restaurer = (essais: number) => {
        const volet = document.querySelector<HTMLElement>(VOLET_LISTE);
        if (volet && (volet.scrollHeight - volet.clientHeight >= savedVolet || essais === 0)) {
          volet.scrollTop = savedVolet;
          return;
        }
        if (essais > 0) minuterie = setTimeout(() => restaurer(essais - 1), 50);
      };
      minuterie = setTimeout(() => restaurer(20), 80);
    }
    return () => clearTimeout(minuterie);
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
    if (apercu) params.set("apercu", apercu);

    const queryString = params.toString();
    const newUrl = window.location.pathname + (queryString ? `?${queryString}` : "");
    window.history.replaceState(null, "", newUrl);
    sessionStorage.setItem("lastListPath", newUrl);
    // `lastListPath` est repris par la page d'une setlist (retour d'un chant) : la
    // liste se retient aussi à part, pour l'entrée « Setlists » de la barre latérale.
    sessionStorage.setItem(CLE_LISTE_SETLISTS, newUrl);
  }, [categoryFilter, tab, query, apercu, isInitialized]);

  // Sauvegarde du scroll au défilement : la fenêtre, et le volet de la liste en grand (son
  // défilement ne remonte pas : écouté en capture).
  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (e.target instanceof Element) {
        if (e.target.matches(VOLET_LISTE)) sessionStorage.setItem(CLE_SCROLL_VOLET, String(e.target.scrollTop));
        return;
      }
      sessionStorage.setItem("setlistsScrollPos", window.scrollY.toString());
    };
    document.addEventListener("scroll", handleScroll, true);
    return () => document.removeEventListener("scroll", handleScroll, true);
  }, []);

  return { categoryFilter, setCategoryFilter, tab, setTab, query, setQuery, onlyMine, setOnlyMine, apercu, setApercu };
}
