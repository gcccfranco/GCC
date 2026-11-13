import { useEffect, useRef } from "react";
import { contexteAudio, contexteExistant } from "@/lib/audio/contexte";
import { creerHorloge, dureeTemps, type Accent, type Mesure } from "@/lib/performance/metronome";
import { creerSon, type NiveauSon } from "@/lib/performance/sonMetronome";
import type { SonMetro, Subdivision } from "@/lib/performance/tempo";

const REVEIL_MS = 25;
const HORIZON_MS = 100;
const PLUS_LONG_TEMPS_MS = 2000; // tempo 30 : les subdivisions d'un temps commencé avant la fenêtre tombent dedans
const FRACTIONS: Record<Subdivision, number[]> = {
  aucune: [], croches: [1 / 2], doubles: [1 / 4, 2 / 4, 3 / 4], pointee: [3 / 4], triolets: [1 / 3, 2 / 3],
};

export type PosMetro = { temps: number; n: number } | null;

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

type Reglages = { tempo: number; mesure: Mesure; accents: Accent[]; subdivision: Subdivision; type: SonMetro; volume: number };

/**
 * Horloge du métronome (MT-1/MT-3) : `performance.now()` son coupé, `AudioContext.currentTime` son allumé (bascule sans
 * saut), boucle d'images qui rend le temps en cours, et ordonnanceur en avance (réveil 25 ms, horizon 100 ms) qui
 * programme les clics. Rend le store du temps en cours (null à l'arrêt).
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
    if (!marche) { horloge.current.arreter(); pos.ecrire(null); return; }
    const h = horloge.current;
    depart.current = maintenant();
    h.demarrer(depart.current, dernier.current.duree, dernier.current.temps);
    let raf = 0;
    let n = -1;
    const boucle = () => {
      const p = h.position(maintenant());
      if (p) {
        const k = p.mesure * 100000 + p.temps;
        if (k !== n) { n = k; pos.ecrire({ temps: p.temps, n: k }); }
      }
      raf = requestAnimationFrame(boucle);
    };
    boucle();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marche]);

  useEffect(() => {
    if (dernier.current.duree !== duree) horloge.current.changerTempo(duree, maintenant());
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
      for (const b of horloge.current.debuts(jusque - PLUS_LONG_TEMPS_MS, fin)) {
        const niveau = g.accents[b.temps] ?? "faible";
        if (niveau === "muet") continue;
        if (b.instant >= jusque) en(b.instant, niveau);
        if (g.mesure.compose) continue;
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

  return pos;
}
