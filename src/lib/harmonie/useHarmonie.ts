"use client";

// Harmonie (lot 9, H1) — charger le catalogue et savoir qui y a droit.
//
// Deux choses, volontairement séparées :
// - `useCatalogue` lit `public/harmonie-index.json`, construit au build ;
// - `useAccesHarmonie` dit si la personne est pianiste ou guitariste. Son
//   instrument n'est pas dans son profil : il est écrit dans les colonnes
//   Piano / Guitare des plannings, qu'il faut donc charger (Google Sheets,
//   déjà mis en cache mémoire 5 minutes par `fetchSheet`).

import { useEffect, useMemo, useState } from "react";
import { canUseHarmonie } from "@/lib/access";
import { useProfile } from "@/lib/firebase/users";
import { findMyServices, loadPlanningData } from "@/lib/planning/names";
import type { Fiche, HarmonieIndex, Instrument } from "@/types/harmonie";

export function useCatalogue(): { fiches: Fiche[]; parcours: HarmonieIndex["parcours"]; chargement: boolean } {
  const [index, setIndex] = useState<HarmonieIndex | null>(null);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    let vivant = true;
    fetch("/harmonie-index.json")
      .then((r) => r.json())
      .then((d: HarmonieIndex) => { if (vivant) setIndex(d); })
      .catch(() => { /* catalogue absent : la page le dit */ })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, []);
  return { fiches: index?.fiches ?? [], parcours: index?.parcours ?? [], chargement };
}

export interface AccesHarmonie {
  piano: boolean;
  guitare: boolean;
  /** Ni pianiste, ni guitariste, ni admin : ni onglet, ni bouton. */
  peut: boolean;
  /** Tant que les plannings ne sont pas lus, on ne montre rien. */
  chargement: boolean;
}

export function useAccesHarmonie(): AccesHarmonie {
  const { user, profile, loading } = useProfile();
  const nom = profile?.planningName?.trim() ?? "";
  const [services, setServices] = useState<{ role: string }[] | null>(null);

  useEffect(() => {
    // Sans nom de planning, il n'y a rien à lire : l'accès se joue alors sur
    // le seul statut d'admin.
    if (loading || !nom) return;
    let vivant = true;
    loadPlanningData()
      .then((data) => { if (vivant) setServices(findMyServices(data, nom)); })
      .catch(() => { if (vivant) setServices([]); });
    return () => { vivant = false; };
  }, [loading, nom]);

  return useMemo(() => {
    const acces = canUseHarmonie(user, (nom ? services : []) ?? []);
    return {
      ...acces,
      peut: acces.piano || acces.guitare,
      chargement: loading || (Boolean(nom) && services === null),
    };
  }, [user, nom, services, loading]);
}

/** Instrument regardé en dernier sur cet appareil (`harmonie-instrument`). */
export function useInstrument(acces: AccesHarmonie): [Instrument, (i: Instrument) => void] {
  const [instrument, setInstrument] = useState<Instrument>("piano");
  useEffect(() => {
    let retenu: Instrument | null = null;
    try {
      const v = localStorage.getItem("harmonie-instrument");
      if (v === "piano" || v === "guitare") retenu = v;
    } catch { /* stockage refusé : on reste sur le défaut */ }
    // À défaut de choix retenu, on montre l'instrument de la personne.
    setInstrument(retenu ?? (acces.guitare && !acces.piano ? "guitare" : "piano"));
  }, [acces.guitare, acces.piano]);

  return [
    instrument,
    (i: Instrument) => {
      setInstrument(i);
      try { localStorage.setItem("harmonie-instrument", i); } catch { /* ignore */ }
    },
  ];
}
