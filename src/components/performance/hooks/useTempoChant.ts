import { useState } from "react";
import {
  clampTempo, getAccentsChant, getDecompte, getMesureChant, getSubdivisionChant, getTempoChant, setAccentsChant, setDecompte,
  setMesureChant, setSubdivisionChant, setTempoChant, TEMPO_DEPART, type Decompte, type Subdivision,
} from "@/lib/performance/tempo";
import { accentsParDefaut, parseMesure, type Accent } from "@/lib/performance/metronome";
import { compter } from "@/lib/usage";

const ORDRE: Accent[] = ["fort", "moyen", "faible", "muet"];

/**
 * Métronome visuel : réglages du chant sur cet appareil (tempo, mesure, accents, subdivision), sinon ceux du fichier ;
 * décompte par appareil. Relus du stockage à chaque rendu (`tempoTick` relance le rendu après une écriture).
 */
export function useTempoChant(tempoChantId: string | undefined, tempoDuFichier: number | null | undefined, timeDuFichier?: string | null) {
  const [, setTempoTick] = useState(0);
  const relire = () => setTempoTick((n) => n + 1);
  const tempoAppareil = tempoChantId ? getTempoChant(tempoChantId) : null;
  const tempoFichier = tempoDuFichier != null ? clampTempo(tempoDuFichier) : undefined;
  const tempoLiseret = tempoAppareil ?? tempoFichier;
  const fixerTempo = (n: number) => {
    if (!tempoChantId) return;
    compter("cmd.louange.tempo");
    setTempoChant(tempoChantId, clampTempo(n));
    relire();
  };
  const changerTempo = (delta: number) => fixerTempo((tempoLiseret ?? TEMPO_DEPART) + delta);
  const effacerTempo = () => {
    if (!tempoChantId) return;
    compter("cmd.louange.tempo");
    setTempoChant(tempoChantId, null);
    relire();
  };

  const mesureTexte = (tempoChantId ? getMesureChant(tempoChantId) : null) ?? (() => { const m = parseMesure(timeDuFichier); return `${m.temps}/${m.unite}`; })();
  const mesure = parseMesure(mesureTexte);
  const accents = (tempoChantId ? getAccentsChant(tempoChantId, mesure.temps) : null) ?? accentsParDefaut(mesure);
  const subdivision: Subdivision = (tempoChantId ? getSubdivisionChant(tempoChantId) : null) ?? (mesure.compose ? "triolets" : "aucune");
  const decompte = getDecompte();

  /** Changer la mesure remet les accents du chant aux défauts de la nouvelle mesure. */
  const changerMesure = (texte: string) => {
    if (!tempoChantId || texte === mesureTexte) return;
    setMesureChant(tempoChantId, texte);
    setAccentsChant(tempoChantId, null);
    relire();
  };
  const tournerAccent = (i: number) => {
    if (!tempoChantId) return;
    const suivant = [...accents];
    suivant[i] = ORDRE[(ORDRE.indexOf(accents[i]) + 1) % ORDRE.length];
    setAccentsChant(tempoChantId, suivant);
    relire();
  };
  const changerSubdivision = (s: Subdivision) => {
    if (!tempoChantId) return;
    setSubdivisionChant(tempoChantId, s);
    relire();
  };
  const changerDecompte = (n: Decompte) => { setDecompte(n); relire(); };

  return {
    tempoAppareil, tempoFichier, tempoLiseret, changerTempo, fixerTempo, effacerTempo,
    mesure, mesureTexte, changerMesure, accents, tournerAccent, subdivision, changerSubdivision, decompte, changerDecompte,
  };
}
