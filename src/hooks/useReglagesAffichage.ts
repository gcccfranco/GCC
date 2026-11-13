"use client";

import { useCallback, useEffect, useState } from "react";
import { getDispositionPref, setDispositionPref, type Disposition } from "@/lib/dispositionPref";
import { setNotationAccords, useNotationAccords, type NotationAccords } from "@/lib/notationAccords";
import { getPartitionLayoutPref, setPartitionLayoutPref, type PartitionLayout } from "@/lib/partitionLayoutPref";
import { getJianpuPref, interrupteurAllume, prefDepuisInterrupteur, setJianpuPref } from "@/lib/jianpu/preference";
import { getPinyinPref, setPinyinPref } from "@/lib/pinyinPref";
import { MAX_FONT_SCALE, MIN_FONT_SCALE, getFontScalePref, setFontScalePref } from "@/lib/fontScalePref";
import { getRole, setRole as ecrireRole, type RolePreset } from "@/lib/performance/roleCompte";

// Les réglages de la marge « Affichage » (docs/spec-reglages-unifies.md, RU-2) : les clés EXISTANTES, lues et écrites par les
// fonctions déjà en place, aucune nouvelle clé. La notation et la couleur des accords ont leurs propres abonnés. Les autres
// lisent après le montage (pas d'écart d'hydratation) ; seuls leurs modules n'émettent rien : un évènement de fenêtre garde deux
// instances du crochet synchrones. « Accords affichés » n'a pas de clé : état en mémoire, partagé par le même évènement.
const EVENEMENT = "gcc:reglages-affichage";
let accordsAffiches = true;

export type ReglagesAffichage = {
  pret: boolean;
  disposition: Disposition;
  setDisposition: (d: Disposition) => void;
  notation: NotationAccords;
  setNotation: (n: NotationAccords) => void;
  ordre: PartitionLayout;
  setOrdre: (o: PartitionLayout) => void;
  /** 简谱 (true) ou Paroles (false). */
  jianpu: boolean;
  setJianpu: (v: boolean) => void;
  pinyin: boolean;
  setPinyin: (v: boolean) => void;
  taille: number;
  setTaille: (v: number) => void;
  role: RolePreset | null;
  setRole: (r: RolePreset) => void;
  accords: boolean;
  setAccords: (v: boolean) => void;
};

/** `uid` : undefined = authentification en cours (rien n'est lu), null = hors connexion. */
export function useReglagesAffichage(uid: string | null | undefined): ReglagesAffichage {
  const [lu, setLu] = useState(false);
  const [disposition, setDispo] = useState<Disposition>("sections");
  const [ordre, setOrd] = useState<PartitionLayout>("played");
  const [jianpu, setJp] = useState(true);
  const [pinyin, setPy] = useState(true);
  const [taille, setTl] = useState(1);
  const [role, setRl] = useState<RolePreset | null>(null);
  const [accords, setAcc] = useState(true);
  const notation = useNotationAccords(uid);

  const relire = useCallback(() => {
    if (uid === undefined) return;
    setDispo(getDispositionPref());
    setOrd(getPartitionLayoutPref(uid));
    setJp(interrupteurAllume(getJianpuPref()));
    setPy(getPinyinPref());
    setTl(getFontScalePref());
    setRl(getRole(uid));
    setAcc(accordsAffiches);
    setLu(true);
  }, [uid]);

  useEffect(() => {
    // Lecture après montage (pas d'écart d'hydratation) : un setState dans l'effet est voulu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    relire();
    window.addEventListener(EVENEMENT, relire);
    return () => window.removeEventListener(EVENEMENT, relire);
  }, [relire]);

  const ecrire = (f: () => void) => { f(); window.dispatchEvent(new Event(EVENEMENT)); };

  return {
    pret: lu && uid !== undefined,
    disposition,
    setDisposition: (d) => ecrire(() => setDispositionPref(d)),
    notation,
    setNotation: (n) => { if (uid !== undefined) setNotationAccords(uid, n); },
    ordre,
    setOrdre: (o) => ecrire(() => { if (uid !== undefined) setPartitionLayoutPref(uid, o); }),
    jianpu,
    setJianpu: (v) => ecrire(() => setJianpuPref(prefDepuisInterrupteur(v))),
    pinyin,
    setPinyin: (v) => ecrire(() => setPinyinPref(v)),
    taille,
    // Pas de 10 %, dans les bornes de fontScalePref.
    setTaille: (v) => ecrire(() => setFontScalePref(Math.round(Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, v)) * 10) / 10)),
    role,
    setRole: (r) => ecrire(() => { if (uid !== undefined) ecrireRole(uid, r); }),
    accords,
    setAccords: (v) => ecrire(() => { accordsAffiches = v; }),
  };
}
