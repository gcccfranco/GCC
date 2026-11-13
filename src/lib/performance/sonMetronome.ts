// Sons du métronome (MT-3), synthétisés avec Web Audio : aucun fichier, rien dans le cache du service worker.
import type { SonMetro } from "@/lib/performance/tempo";

export type NiveauSon = "fort" | "moyen" | "faible" | "doux";

// Trois hauteurs et trois gains distincts (fort, moyen, faible) ; « doux » = subdivision : gain faible, hauteur du faible.
const GAIN: Record<NiveauSon, number> = { fort: 1, moyen: 0.65, faible: 0.45, doux: 0.2 };
const HAUTEUR: Record<SonMetro, Record<NiveauSon, number>> = {
  clic: { fort: 3000, moyen: 2200, faible: 1600, doux: 1600 },
  bois: { fort: 900, moyen: 700, faible: 550, doux: 550 },
  cloche: { fort: 1320, moyen: 990, faible: 740, doux: 740 },
};
const DUREE: Record<SonMetro, number> = { clic: 0.015, bois: 0.04, cloche: 0.6 };
const RAPPORT_PARTIEL = 2.76;

export function creerSon(c: AudioContext, volume: number) {
  const maitre = c.createGain();
  maitre.gain.value = volume / 100;
  maitre.connect(c.destination);
  let bruit: AudioBuffer | null = null;
  let actives: { src: AudioScheduledSourceNode; fin: number }[] = [];

  const enveloppe = (t: number, niveau: NiveauSon, duree: number, part = 1) => {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(GAIN[niveau] * part, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    g.connect(maitre);
    return g;
  };
  const lancer = (src: AudioScheduledSourceNode, t: number, duree: number) => {
    src.start(t);
    src.stop(t + duree + 0.02);
    actives = actives.filter((a) => a.fin > c.currentTime);
    actives.push({ src, fin: t + duree + 0.02 });
  };

  return {
    /** Programme un clic à l'instant `t` (secondes Web Audio). */
    jouer(type: SonMetro, niveau: NiveauSon, t: number) {
      const f = HAUTEUR[type][niveau];
      const d = DUREE[type];
      if (type === "clic") {
        bruit ??= (() => {
          const b = c.createBuffer(1, Math.ceil(c.sampleRate * 0.05), c.sampleRate);
          const v = b.getChannelData(0);
          for (let i = 0; i < v.length; i++) v[i] = Math.random() * 2 - 1;
          return b;
        })();
        const src = c.createBufferSource();
        src.buffer = bruit;
        const filtre = c.createBiquadFilter();
        filtre.type = "bandpass";
        filtre.frequency.value = f;
        filtre.Q.value = 4;
        src.connect(filtre).connect(enveloppe(t, niveau, d, 3));
        lancer(src, t, d);
        return;
      }
      for (const [freq, part] of type === "bois" ? [[f, 1]] : [[f, 1], [f * RAPPORT_PARTIEL, 0.4]]) {
        const osc = c.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(enveloppe(t, niveau, d, part));
        lancer(osc, t, d);
      }
    },
    volume(v: number) { maitre.gain.value = v / 100; },
    /** Coupe tout de suite : sources programmées arrêtées, sortie débranchée. */
    couper() {
      maitre.gain.value = 0;
      for (const { src } of actives) { try { src.stop(0); } catch { /* déjà arrêtée */ } }
      actives = [];
      try { maitre.disconnect(); } catch { /* déjà débranché */ }
    },
  };
}
