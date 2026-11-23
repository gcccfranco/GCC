import { useRef, useState } from "react";
import { getEntrainement, setEntrainement, type Entrainement } from "@/lib/performance/tempo";

export type CasesEntrainement = { muettes: boolean; accel: boolean; minuteur: boolean };
/** Ce que le métronome applique : null = ligne éteinte. */
export type Entr = {
  muettes: { jouees: number; silence: number } | null;
  accel: { de: number; pas: number; tous: number; jusqua: number } | null;
  minutes: number | null;
};

/** S'entraîner (MT-4) : nombres retenus par appareil, cases toujours éteintes à l'ouverture du mode, bloc replié au départ. */
export function useEntrainement() {
  const [valeurs, setValeurs] = useState<Entrainement>(() => getEntrainement());
  const [cases, setCases] = useState<CasesEntrainement>({ muettes: false, accel: false, minuteur: false });
  const [ouvert, setOuvert] = useState(false);
  const ouvertRef = useRef(false);
  ouvertRef.current = ouvert;
  const changerValeurs = (v: Partial<Entrainement>) => {
    const suivantes = { ...valeurs, ...v };
    setEntrainement(suivantes);
    setValeurs(suivantes);
  };
  const entr: Entr = {
    muettes: cases.muettes ? { jouees: valeurs.jouees, silence: valeurs.silence } : null,
    accel: cases.accel ? { de: valeurs.de, pas: valeurs.pas, tous: valeurs.tous, jusqua: valeurs.jusqua } : null,
    minutes: cases.minuteur ? valeurs.minutes : null,
  };
  return { valeurs, changerValeurs, cases, changerCase: (c: keyof CasesEntrainement, v: boolean) => setCases((a) => ({ ...a, [c]: v })), ouvert, setOuvert, ouvertRef, entr };
}
