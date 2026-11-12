import { useEffect, useLayoutEffect, useState } from "react";
import { DISPOSITION_AVANT_LECTURE, getDispositionPref, setDispositionPref, type Disposition } from "@/lib/dispositionPref";
import { getPartitionLayoutPref, setPartitionLayoutPref, type PartitionLayout } from "@/lib/partitionLayoutPref";
import { getPinyinPref, setPinyinPref } from "@/lib/pinyinPref";
import { getJianpuPref, setJianpuPref, type JianpuPref } from "@/lib/jianpu/preference";

const useEffetAvantPeinture = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Réglages d'affichage de la setlist, relus du stockage de l'appareil au montage. */
export function usePreferencesAffichage(uid: string | null, authLoading: boolean) {
  const [showChords, setShowChords] = useState(true);
  // Accords changés sur cette page juste avant le mode louange : ils
  // l'emportent alors sur le rôle mémorisé (reprise des réglages).
  const [chordsTouched, setChordsTouched] = useState(false);
  // Affichage du pinyin en vue partitions — préférence persistée (par appareil).
  const [showPinyin, setShowPinyin] = useState(true);
  // Disposition de la partition — préférence par appareil partagée (fiche chant, mode louange).
  const [disposition, setDisposition] = useState<Disposition>(DISPOSITION_AVANT_LECTURE);
  // Coup d'œil : ordre joué / sections uniques / structure seule — par appareil.
  const [layout, setLayout] = useState<PartitionLayout>("played");
  // Partition 简谱 : affichée par défaut ; l'interrupteur règle l'appareil et
  // prime alors sur le « Paroles » du responsable. Un seul état, partagé avec
  // le mode louange.
  const [jianpuPref, setJianpuPrefState] = useState<JianpuPref>("auto");

  // Restaure la préférence d'affichage du pinyin (masqué si "0").
  // La disposition est lue avant la peinture : pas de premier rendu à la mauvaise disposition.
  useEffetAvantPeinture(() => setDisposition(getDispositionPref()), []);
  useEffect(() => {
    setShowPinyin(getPinyinPref());
    setJianpuPrefState(getJianpuPref());
  }, []);
  // La disposition par défaut dépend du rôle du compte : relue une fois le compte connu, et à chaque changement d'uid.
  useEffect(() => {
    if (!authLoading) setLayout(getPartitionLayoutPref(uid));
  }, [uid, authLoading]);
  const changeDisposition = (d: Disposition) => {
    setDisposition(d);
    setDispositionPref(d);
  };
  const changeLayout = (v: PartitionLayout) => {
    setLayout(v);
    setPartitionLayoutPref(uid, v);
  };
  const changeJianpuPref = (v: JianpuPref) => {
    setJianpuPrefState(v);
    setJianpuPref(v);
  };
  function togglePinyin() {
    setShowPinyin((v) => {
      setPinyinPref(!v);
      return !v;
    });
  }

  return {
    showChords, setShowChords, chordsTouched, setChordsTouched,
    showPinyin, disposition, layout, jianpuPref,
    changeDisposition, changeLayout, changeJianpuPref, togglePinyin,
  };
}
