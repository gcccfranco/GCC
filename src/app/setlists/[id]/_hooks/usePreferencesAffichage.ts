import { useEffect, useState } from "react";
import { getDispositionPref, setDispositionPref, type Disposition } from "@/lib/dispositionPref";
import { getPartitionLayoutPref, setPartitionLayoutPref, type PartitionLayout } from "@/lib/partitionLayoutPref";
import { getPinyinPref, setPinyinPref } from "@/lib/pinyinPref";
import { getJianpuPref, setJianpuPref, type JianpuPref } from "@/lib/jianpu/preference";

/** Réglages d'affichage de la setlist, relus du stockage de l'appareil au montage. */
export function usePreferencesAffichage() {
  const [showChords, setShowChords] = useState(true);
  // Accords changés sur cette page juste avant le mode louange : ils
  // l'emportent alors sur le rôle mémorisé (reprise des réglages).
  const [chordsTouched, setChordsTouched] = useState(false);
  // Affichage du pinyin en vue partitions — préférence persistée (par appareil).
  const [showPinyin, setShowPinyin] = useState(true);
  // Disposition de la partition — préférence par appareil partagée (fiche chant, mode louange).
  const [disposition, setDisposition] = useState<Disposition>("classique");
  // Coup d'œil : ordre joué / sections uniques / structure seule — par appareil.
  const [layout, setLayout] = useState<PartitionLayout>("played");
  // Partition 简谱 : affichée par défaut ; l'interrupteur règle l'appareil et
  // prime alors sur le « Paroles » du responsable. Un seul état, partagé avec
  // le mode louange.
  const [jianpuPref, setJianpuPrefState] = useState<JianpuPref>("auto");

  // Restaure la préférence d'affichage du pinyin (masqué si "0").
  useEffect(() => {
    setShowPinyin(getPinyinPref());
    setDisposition(getDispositionPref());
    setJianpuPrefState(getJianpuPref());
    setLayout(getPartitionLayoutPref());
  }, []);
  const changeDisposition = (d: Disposition) => {
    setDisposition(d);
    setDispositionPref(d);
  };
  const changeLayout = (v: PartitionLayout) => {
    setLayout(v);
    setPartitionLayoutPref(v);
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
