import { useEffect, useRef } from "react";
import { contexteAudio, contexteExistant } from "@/lib/audio/contexte";
import { creerHorloge, dureeTemps, type Accent, type Mesure } from "@/lib/performance/metronome";
import { creerSon, type NiveauSon } from "@/lib/performance/sonMetronome";
import { clampTempo, type Decompte, type SonMetro, type Subdivision } from "@/lib/performance/tempo";
import type { Entr } from "@/components/performance/hooks/useEntrainement";

const REVEIL_MS = 25;
const HORIZON_MS = 100;
const PLUS_LONG_TEMPS_MS = 2000; // tempo 30 : les subdivisions d'un temps commencé avant la fenêtre tombent dedans
const FRACTIONS: Record<Subdivision, number[]> = {
  aucune: [], croches: [1 / 2], doubles: [1 / 4, 2 / 4, 3 / 4], pointee: [3 / 4], triolets: [1 / 3, 2 / 3],
};

export type PosMetro = { temps: number; n: number; decompte: boolean; muette: boolean } | null;

/** Le temps en cours, hors de l'état React : seule la bande (useSyncExternalStore) se rend à chaque temps, pas tout le mode louange. */
export function creerPosStore() {
  let val: PosMetro = null;
  const abonnes = new Set<() => void>();
  return {
    lire: () => val,
    ecrire(v: PosMetro) { val = v; abonnes.forEach((f) => f()); },
    abonner(f: () => void) { abonnes.add(f); return () => { abonnes.delete(f); }; },
  };
}
export type PosStore = ReturnType<typeof creerPosStore>;

type Reglages = {
  tempo: number; mesure: Mesure; accents: Accent[]; subdivision: Subdivision; type: SonMetro; volume: number;
  decompte: Decompte; entr: Entr;
  /** Tempo joué quand l'accélération le change (null : celui du chant). */
  onTempoJoue: (n: number | null) => void;
  /** Le minuteur est arrivé au bout. */
  onFin: () => void;
};

/** Tempo de la mesure `k` (numéro depuis l'appui sur Marche, décompte compris) avec l'accélération ; le décompte se joue à « de ». */
function tempoAccel(a: NonNullable<Entr["accel"]>, k: number, d: number): number {
  const plafond = Math.max(a.de, a.jusqua);
  return clampTempo(Math.min(plafond, a.de + a.pas * Math.floor(Math.max(0, k - d) / a.tous)));
}

/**
 * Horloge du métronome (MT-1/MT-3) : `performance.now()` son coupé, `AudioContext.currentTime` son allumé (bascule sans
 * saut), boucle d'images qui rend le temps en cours, et ordonnanceur en avance (réveil 25 ms, horizon 100 ms) qui
 * programme les clics. MT-4 : décompte (les premières mesures), mesures muettes, accélération (tempo passager, appliqué
 * exactement au premier temps de la mesure par l'horloge), minuteur. Rend le store du temps en cours (null à l'arrêt) et
 * l'instant d'appui sur Marche (`performance.now()`, pour le temps restant du panneau).
 */
export function useMetronome(marche: boolean, son: boolean, r: Reglages) {
  const store = useRef<PosStore | null>(null);
  store.current ??= creerPosStore();
  const pos = store.current;
  const horloge = useRef(creerHorloge());
  const decalage = useRef(0);
  const surAudio = useRef(false);
  const depart = useRef(0);
  const moteur = useRef<ReturnType<typeof creerSon> | null>(null);
  const reglages = useRef(r);
  reglages.current = r;
  const duree = dureeTemps(r.tempo, r.mesure);
  const dernier = useRef({ duree, temps: r.mesure.temps });
  const nbDecompte = useRef(0); // mesures de décompte, fixées à l'appui sur Marche : changer le réglage en marche ne rejoue rien
  const appui = useRef(0);
  const programme = useRef("");
  const accelVue = useRef(false); // l'accélération a joué : au décochage, retour au tempo du chant à la mesure suivante
  const muettes = useRef(new Map<number, boolean>()); // mesure → muette, décidé à la première vue (une case décochée prend effet à la mesure suivante)
  const joue = useRef<number | null>(null);
  const tickRef = useRef<() => void>(() => {});
  /** Mesure muette (mesures d'entraînement : X jouées puis Y en silence, après le décompte). */
  const estMuette = (mesure: number) => {
    const vu = muettes.current.get(mesure);
    if (vu !== undefined) return vu;
    const mu = reglages.current.entr.muettes;
    const m = mesure - nbDecompte.current;
    const v = !!mu && m >= 0 && m % (mu.jouees + mu.silence) >= mu.jouees;
    if (muettes.current.size > 64) for (const k of muettes.current.keys()) if (k < mesure - 8) muettes.current.delete(k);
    muettes.current.set(mesure, v);
    return v;
  };

  const base = () => (surAudio.current ? (contexteExistant() ?? contexteAudio()).currentTime * 1000 : performance.now());
  const maintenant = () => base() + decalage.current;

  // Bascule d'horloge : `maintenant()` reste continu.
  useEffect(() => {
    const avant = maintenant();
    surAudio.current = son;
    decalage.current = avant - base();
    depart.current = avant;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [son]);

  // Une image sur deux n'a rien à dire : setState seulement quand le temps change.
  useEffect(() => {
    if (!marche) {
      horloge.current.arreter();
      pos.ecrire(null);
      if (joue.current !== null) { joue.current = null; reglages.current.onTempoJoue(null); } // à l'arrêt, retour au tempo du chant
      return;
    }
    const h = horloge.current;
    const g = reglages.current;
    depart.current = maintenant();
    appui.current = performance.now();
    nbDecompte.current = g.decompte;
    programme.current = "";
    accelVue.current = false;
    joue.current = null;
    muettes.current.clear();
    // Accélération cochée : Marche part au tempo « de » (et le décompte aussi).
    h.demarrer(depart.current, g.entr.accel ? dureeTemps(clampTempo(g.entr.accel.de), g.mesure) : dernier.current.duree, dernier.current.temps);
    let raf = 0;
    let n = -1;
    const boucle = () => {
      const p = h.position(maintenant());
      if (p) {
        const k = p.mesure * 100000 + p.temps;
        if (k !== n) {
          n = k;
          pos.ecrire({ temps: p.temps, n: k, decompte: p.mesure < nbDecompte.current, muette: estMuette(p.mesure) });
          const m = reglages.current.mesure;
          const tempoJoue = Math.round(60000 / (p.duree * (m.compose ? 3 : 1)));
          const suivant = tempoJoue === reglages.current.tempo ? null : tempoJoue;
          if (suivant !== joue.current) { joue.current = suivant; reglages.current.onTempoJoue(suivant); }
        }
      }
      raf = requestAnimationFrame(boucle);
    };
    boucle();
    // Accélération : le changement de tempo est posé dans l'horloge pendant la mesure d'avant, pour tomber exactement
    // au premier temps de la mesure ; déjà posé quand l'ordonnanceur programme ses clics.
    const veille = () => {
      const g2 = reglages.current;
      const p = h.position(maintenant());
      if (!p) return;
      const k = p.mesure + 1;
      let cible: number | null = null;
      if (g2.entr.accel) { cible = tempoAccel(g2.entr.accel, k, nbDecompte.current); accelVue.current = true; }
      else if (accelVue.current) cible = g2.tempo;
      if (cible === null) return;
      const dur = dureeTemps(cible, g2.mesure);
      if (programme.current === `${k}:${dur}`) return;
      programme.current = `${k}:${dur}`;
      h.changerTempoAMesure(dur, k, maintenant());
      if (!g2.entr.accel) accelVue.current = false;
    };
    tickRef.current = veille;
    veille();
    const id = setInterval(veille, REVEIL_MS);
    return () => { cancelAnimationFrame(raf); clearInterval(id); tickRef.current = () => {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marche]);

  useEffect(() => {
    if (dernier.current.duree !== duree && !reglages.current.entr.accel && !accelVue.current) horloge.current.changerTempo(duree, maintenant());
    if (dernier.current.temps !== r.mesure.temps) horloge.current.changerMesure(r.mesure.temps, maintenant());
    dernier.current = { duree, temps: r.mesure.temps };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duree, r.mesure.temps]);

  // Ordonnanceur : seulement son allumé et en marche (la page cachée coupe le son : PerformanceMode).
  useEffect(() => {
    if (!marche || !son) return;
    const c = contexteAudio();
    const s = creerSon(c, reglages.current.volume);
    moteur.current = s;
    let jusque = depart.current;
    const programmer = () => {
      const g = reglages.current;
      const fin = maintenant() + HORIZON_MS;
      const en = (instant: number, niveau: NiveauSon) => s.jouer(g.type, niveau, (instant - decalage.current) / 1000);
      tickRef.current();
      for (const b of horloge.current.debuts(jusque - PLUS_LONG_TEMPS_MS, fin)) {
        const decompte = b.mesure < nbDecompte.current;
        if (!decompte && estMuette(b.mesure)) continue; // mesure muette : ni temps ni subdivision
        let niveau = g.accents[b.temps] ?? "faible";
        if (decompte && niveau === "muet") niveau = "faible"; // le décompte s'entend en entier
        if (niveau === "muet") continue;
        if (b.instant >= jusque) en(b.instant, niveau);
        if (decompte || g.mesure.compose) continue; // pas de subdivision pendant le décompte
        for (const f of FRACTIONS[g.subdivision]) {
          const t = b.instant + f * b.duree;
          if (t >= jusque && t < fin) en(t, "doux");
        }
      }
      jusque = fin;
    };
    programmer();
    const id = setInterval(programmer, REVEIL_MS);
    return () => { clearInterval(id); s.couper(); moteur.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marche, son]);

  useEffect(() => { moteur.current?.volume(r.volume); }, [r.volume]);

  // Minuteur : T minutes après l'appui sur Marche ; décocher en marche l'annule tout de suite.
  const minutes = r.entr.minutes;
  useEffect(() => {
    if (!marche || minutes === null) return;
    const id = setTimeout(() => reglages.current.onFin(), Math.max(0, appui.current + minutes * 60000 - performance.now()));
    return () => clearTimeout(id);
  }, [marche, minutes]);

  return { pos, appui };
}
