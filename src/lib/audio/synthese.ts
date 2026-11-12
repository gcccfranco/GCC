// Écoute des accords (lot H3, docs/spec-harmonie-accords.md) : plan pur (testable côté Node), puis lecture Web Audio.
import { analyserAccord } from "@/lib/accords/analyse";
import { voicingPiano } from "@/lib/accords/notes";

export interface PasDeLecture { debut: number; duree: number; frequences: number[] }

const SILENCE_AVANT_APRES = 0.8;
const DUREE_ACCORD = 1.2;

export function frequencesDeLAccord(etiquette: string): number[] | null {
  const a = analyserAccord(etiquette);
  if (!a) return null;
  const { gauche, droite } = voicingPiano(a);
  return [...gauche, ...droite].map((d) => 440 * 2 ** ((48 + d - 69) / 12));
}

export function planDeLecture(accords: string[], debut = 0): PasDeLecture[] {
  return accords.map((e, i) => ({ debut: debut + i * DUREE_ACCORD, duree: DUREE_ACCORD, frequences: frequencesDeLAccord(e) ?? [] }));
}

export function dureeDuPlan(plan: PasDeLecture[]): number {
  return plan.reduce((m, p) => Math.max(m, p.debut + p.duree), 0);
}

export function planAvantApres(avant: string[], apres: string[]): PasDeLecture[] {
  const a = planDeLecture(avant);
  return [...a, ...planDeLecture(apres, dureeDuPlan(a) + SILENCE_AVANT_APRES)];
}

// --- Navigateur ---
type Contexte = AudioContext;
let ctx: Contexte | null = null;
let arret: (() => void) | null = null;

export function ecouteDisponible(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
  return !!(w.AudioContext || w.webkitAudioContext);
}

/**
 * À appeler dans le geste de l'utilisateur (iOS). Renvoie l'arrêt. `surFin` est appelé une fois : fin du plan, arrêt
 * demandé, ou autre lecture lancée (le bouton qui jouait revient alors à « Écouter »).
 */
export function jouer(plan: PasDeLecture[], surFin?: () => void): () => void {
  arreterEcoute();
  if (!ecouteDisponible()) return () => {};
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = (w.AudioContext ?? w.webkitAudioContext)!;
  ctx ??= new Ctor();
  void ctx.resume();
  const c = ctx;
  const t0 = c.currentTime + 0.05;
  const sources: { osc: OscillatorNode; gain: GainNode }[] = [];
  for (const pas of plan) {
    const niveau = 0.25 / Math.max(pas.frequences.length, 1);
    const fin = t0 + pas.debut + pas.duree;
    for (const f of pas.frequences) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      const d = t0 + pas.debut;
      gain.gain.setValueAtTime(0.0001, d);
      gain.gain.linearRampToValueAtTime(niveau, d + 0.02);
      gain.gain.setValueAtTime(niveau, Math.max(d + 0.02, fin - 0.3));
      gain.gain.exponentialRampToValueAtTime(0.0001, fin);
      osc.connect(gain).connect(c.destination);
      osc.start(d);
      osc.stop(fin + 0.05);
      sources.push({ osc, gain });
    }
  }
  let fini = false;
  const finir = () => { if (!fini) { fini = true; surFin?.(); } };
  const minuteur = setTimeout(() => { arret = null; finir(); }, dureeDuPlan(plan) * 1000);
  const stop = () => {
    clearTimeout(minuteur);
    const now = c.currentTime;
    for (const { osc, gain } of sources) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        osc.stop(now + 0.06);
      } catch { /* oscillateur déjà arrêté */ }
    }
    if (arret === stop) arret = null;
    finir();
  };
  arret = stop;
  return stop;
}

export function arreterEcoute(): void {
  arret?.();
}
