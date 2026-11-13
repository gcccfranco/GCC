import { useState } from "react";
import { clampTempo, getTempoChant, setTempoChant, TEMPO_DEPART } from "@/lib/performance/tempo";
import { compter } from "@/lib/usage";

/**
 * Métronome visuel : tempo réglé sur l'appareil pour ce chant, sinon celui du fichier.
 * Relu du stockage à chaque rendu (`tempoTick` relance le rendu après une écriture).
 */
export function useTempoChant(tempoChantId: string | undefined, tempoDuFichier: number | null | undefined) {
  const [, setTempoTick] = useState(0);
  const tempoAppareil = tempoChantId ? getTempoChant(tempoChantId) : null;
  const tempoFichier = tempoDuFichier != null ? clampTempo(tempoDuFichier) : undefined;
  const tempoLiseret = tempoAppareil ?? tempoFichier;
  const changerTempo = (delta: number) => {
    if (!tempoChantId) return;
    compter("cmd.louange.tempo");
    setTempoChant(tempoChantId, clampTempo((tempoLiseret ?? TEMPO_DEPART) + delta));
    setTempoTick((n) => n + 1);
  };
  const effacerTempo = () => {
    if (!tempoChantId) return;
    compter("cmd.louange.tempo");
    setTempoChant(tempoChantId, null);
    setTempoTick((n) => n + 1);
  };
  return { tempoAppareil, tempoLiseret, changerTempo, effacerTempo };
}
