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

// Piano enregistré (Salamander Grand Piano V3, CC-BY 3.0 : public/audio/piano/LICENCE.md) : une note par tierce
// mineure, de C3 à A5 (MIDI 48 à 81, la tessiture de voicingPiano), transposée par playbackRate. Chargé au premier
// « Écouter » ; une note qui n'a pas pu se charger (hors ligne avant tout chargement) joue l'onde triangle.
const NOTES_PIANO = [48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81];
let piano: Promise<Map<number, AudioBuffer>> | null = null;

function decoder(c: Contexte, donnees: ArrayBuffer): Promise<AudioBuffer> {
  // Forme à rappels : le webkitAudioContext des anciens iOS ne rend pas de promesse.
  return new Promise((ok, ko) => {
    const p = c.decodeAudioData(donnees, ok, ko) as Promise<AudioBuffer> | undefined;
    p?.catch(() => {});
  });
}

function chargerPiano(c: Contexte): Promise<Map<number, AudioBuffer>> {
  piano ??= Promise.all(NOTES_PIANO.map(async (m) => {
    try {
      const r = await fetch(`/audio/piano/${m}.mp3`);
      if (!r.ok) return null;
      return [m, await decoder(c, await r.arrayBuffer())] as const;
    } catch {
      return null;
    }
  })).then((notes) => {
    const charges = new Map(notes.filter((n) => n !== null));
    if (charges.size < NOTES_PIANO.length) piano = null; // réessayé au prochain « Écouter »
    return charges;
  });
  return piano;
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
  const sources: { src: AudioScheduledSourceNode; gain: GainNode }[] = [];
  let annule = false;
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  let fini = false;
  const finir = () => { if (!fini) { fini = true; surFin?.(); } };
  const stop = () => {
    annule = true;
    clearTimeout(minuteur);
    const now = c.currentTime;
    for (const { src, gain } of sources) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        src.stop(now + 0.06);
      } catch { /* source déjà arrêtée */ }
    }
    if (arret === stop) arret = null;
    finir();
  };
  arret = stop;
  void chargerPiano(c).then((notes) => {
    if (annule) return;
    const t0 = c.currentTime + 0.05;
    for (const pas of plan) {
      const fin = t0 + pas.debut + pas.duree;
      for (const f of pas.frequences) {
        const midi = 69 + 12 * Math.log2(f / 440);
        const proche = NOTES_PIANO.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
        const buffer = notes.get(proche);
        let src: AudioScheduledSourceNode;
        if (buffer) {
          const b = c.createBufferSource();
          b.buffer = buffer;
          b.playbackRate.value = 2 ** ((midi - proche) / 12);
          src = b;
        } else {
          const osc = c.createOscillator();
          osc.type = "triangle";
          osc.frequency.value = f;
          src = osc;
        }
        const niveau = (buffer ? 1.5 : 0.25) / Math.max(pas.frequences.length, 1);
        const attaque = buffer ? 0.005 : 0.02;
        const gain = c.createGain();
        const d = t0 + pas.debut;
        gain.gain.setValueAtTime(0.0001, d);
        gain.gain.linearRampToValueAtTime(niveau, d + attaque);
        gain.gain.setValueAtTime(niveau, Math.max(d + attaque, fin - 0.3));
        gain.gain.exponentialRampToValueAtTime(0.0001, fin);
        src.connect(gain).connect(c.destination);
        src.start(d);
        src.stop(fin + 0.05);
        sources.push({ src, gain });
      }
    }
    minuteur = setTimeout(() => { if (arret === stop) arret = null; finir(); }, dureeDuPlan(plan) * 1000);
  });
  return stop;
}

export function arreterEcoute(): void {
  arret?.();
}
