import { useCallback, useEffect, useState } from "react";
import { enregistrerChoix, lireChoix, lirePartition, lirePartitionsPartageesAvecMoi, type PartitionDeChant } from "@/lib/firebase/partitions";
import { enregistrerOuMettreEnFile, etatEnregistrement } from "@/lib/partition/fileEnAttente";
import type { ChoixPartitions } from "@/types/partition";

/** Mes partitions des chants `slugs`, celles qu'on m'a partagées, et mon choix « Je lis » (docs/spec-ma-partition.md).
 *  Une lecture qui échoue (hors ligne) laisse le chant d'origine : rien ne se perd, rien ne s'affiche de plus. */
export function useMesPartitions(uid: string | undefined, slugs: string[]) {
  const cle = slugs.join("\n");
  const [mes, setMes] = useState<Record<string, PartitionDeChant>>({});
  const [partagees, setPartagees] = useState<PartitionDeChant[]>([]);
  const [choix, setChoix] = useState<ChoixPartitions>({ choices: {}, partageTout: [] });
  const [enAttente, setEnAttente] = useState(false);

  useEffect(() => {
    if (!uid) {
      setMes({});
      setPartagees([]);
      setChoix({ choices: {}, partageTout: [] });
      return;
    }
    let vivant = true;
    // Autre compte sur le même appareil : rien du précédent ne reste affiché pendant les lectures.
    setMes({});
    setPartagees([]);
    setChoix({ choices: {}, partageTout: [] });
    Promise.all([
      Promise.all(slugs.map((s) => lirePartition(uid, s).catch(() => null))),
      lirePartitionsPartageesAvecMoi(uid).catch(() => [] as PartitionDeChant[]),
      lireChoix(uid).catch(() => null),
    ]).then(([lues, autres, c]) => {
      if (!vivant) return;
      setMes(Object.fromEntries(lues.filter((p): p is PartitionDeChant => !!p).map((p) => [p.slug, p])));
      setPartagees(autres.filter((p) => slugs.includes(p.slug)));
      if (c) setChoix(c);
      setEnAttente(etatEnregistrement(uid).enAttente > 0);
    });
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, cle]);

  /** « Je lis » : retenu pour ce chant, sur mon compte. */
  const choisir = useCallback((slug: string, valeur: string) => {
    if (!uid) return;
    setChoix((c) => ({ ...c, choices: { ...c.choices, [slug]: valeur } }));
    // Relu juste avant d'écrire : le document entier est réécrit, et une lecture ratée au chargement (ou un autre
    // appareil) ne doit pas effacer les choix des autres chants ni `partageTout`. Lecture ratée : on n'écrit pas.
    lireChoix(uid)
      .then((lu) => {
        const base = lu ?? { choices: {}, partageTout: [] };
        return enregistrerChoix(uid, { ...base, choices: { ...base.choices, [slug]: valeur } });
      })
      .catch(() => { /* le choix reste affiché sur cette page ; il se reposera au prochain tap */ });
  }, [uid]);

  /** Réécrit ma partition de ce chant (file locale si le réseau manque). */
  const enregistrer = useCallback(async (p: PartitionDeChant) => {
    const etat = await enregistrerOuMettreEnFile(p);
    setMes((m) => ({ ...m, [p.slug]: { ...p, updatedAt: new Date() } }));
    setEnAttente(etatEnregistrement(p.ownerUid).enAttente > 0);
    return etat;
  }, []);

  return { mes, partagees, choix: choix.choices, choisir, enregistrer, enAttente };
}
