import { useEffect, useState } from "react";
import { EVENEMENT_REGLAGES, useReglagesAffichage } from "@/hooks/useReglagesAffichage";
import { getJianpuPref, setJianpuPref, type JianpuPref } from "@/lib/jianpu/preference";

/** Réglages d'affichage de la setlist (RU-4) : ceux de la marge « Affichage » (`useReglagesAffichage`, mêmes clés que la page chant
 *  et le mode louange). Seul 简谱 reste tri-état (le « Paroles » du responsable doit continuer à jouer) : relu à l'évènement de la marge. */
export function usePreferencesAffichage(uid: string | null, authLoading: boolean) {
  const r = useReglagesAffichage(authLoading ? undefined : uid);
  // Accords changés sur cette page juste avant le mode louange : ils
  // l'emportent alors sur le rôle mémorisé (reprise des réglages).
  const [chordsTouched, setChordsTouched] = useState(false);
  // Partition 简谱 : affichée par défaut ; l'interrupteur règle l'appareil et
  // prime alors sur le « Paroles » du responsable. Un seul état, partagé avec
  // le mode louange.
  const [jianpuPref, setJianpuPrefState] = useState<JianpuPref>("auto");
  useEffect(() => {
    const relire = () => setJianpuPrefState(getJianpuPref());
    // Lecture après montage (pas d'écart d'hydratation) : un setState dans l'effet est voulu.
    relire();
    window.addEventListener(EVENEMENT_REGLAGES, relire);
    return () => window.removeEventListener(EVENEMENT_REGLAGES, relire);
  }, []);
  const changeJianpuPref = (v: JianpuPref) => {
    setJianpuPrefState(v);
    setJianpuPref(v);
  };

  return {
    showChords: r.accords, setShowChords: r.setAccords, chordsTouched, setChordsTouched,
    showPinyin: r.pinyin, disposition: r.disposition, layout: r.ordre, taille: r.taille, jianpuPref,
    changeDisposition: r.setDisposition, changeLayout: r.setOrdre, changeJianpuPref,
  };
}
