import { useCallback, useEffect, useRef, useState } from "react";
import { enregistrerChoix, lireChoix, lireMesPartitions, lirePartition, lirePartitionsPartageesAvecMoi, type PartitionDeChant } from "@/lib/firebase/partitions";
import { enregistrerOuMettreEnFile, etatEnregistrement, rejouerFile } from "@/lib/partition/fileEnAttente";
import type { ChoixPartitions } from "@/types/partition";

/** Mes partitions des chants `slugs`, celles qu'on m'a partagées, et mon choix « Je lis » (docs/spec-ma-partition.md).
 *  Une lecture qui échoue (hors ligne) laisse le chant d'origine : rien ne se perd, rien ne s'affiche de plus. */
export function useMesPartitions(uid: string | undefined, slugs: string[]) {
  const cle = slugs.join("\n");
  const [mes, setMes] = useState<Record<string, PartitionDeChant>>({});
  const [partagees, setPartagees] = useState<PartitionDeChant[]>([]);
  const [choix, setChoix] = useState<ChoixPartitions>({ choices: {}, partageTout: [] });
  const [enAttente, setEnAttente] = useState(false);
  // Chants dont la lecture de ma partition a abouti (absente = lue, 404). Une lecture en échec n'y est pas : « pas lue » ≠ « pas de partition ».
  const [charges, setCharges] = useState<Record<string, boolean>>({});
  // Chants dont la lecture a échoué (≠ en cours) : relus seuls, après 5, 15 puis 45 s et à chaque retour du réseau.
  const [echecs, setEchecs] = useState<string[]>([]);
  const essais = useRef(0);
  // Miroir de `mes` tenu à jour à chaque écriture, sans attendre le rendu (cases cochées vite, « toutes mes partitions »).
  const mesRef = useRef<Record<string, PartitionDeChant>>({});

  // Retour du réseau : auth.ts rejoue la file ; ici « En attente » se relit à la fin d'un rejeu (la file passe en série, celui-ci suit).
  useEffect(() => {
    if (!uid) return;
    const relire = () => { void rejouerFile(uid).then(() => setEnAttente(etatEnregistrement(uid).enAttente > 0)); };
    window.addEventListener("online", relire);
    return () => window.removeEventListener("online", relire);
  }, [uid]);

  useEffect(() => {
    setCharges({});
    setEchecs([]);
    essais.current = 0;
    if (!uid) {
      mesRef.current = {};
      setMes({});
      setPartagees([]);
      setChoix({ choices: {}, partageTout: [] });
      return;
    }
    let vivant = true;
    // Autre compte sur le même appareil : rien du précédent ne reste affiché pendant les lectures.
    mesRef.current = {};
    setMes({});
    setPartagees([]);
    setChoix({ choices: {}, partageTout: [] });
    Promise.all([
      Promise.all(slugs.map((s) => lirePartition(uid, s).then((p) => ({ ok: true, p }), () => ({ ok: false, p: null as PartitionDeChant | null })))),
      lirePartitionsPartageesAvecMoi(uid).catch(() => [] as PartitionDeChant[]),
      lireChoix(uid).catch(() => null),
    ]).then(([lues, autres, c]) => {
      if (!vivant) return;
      mesRef.current = Object.fromEntries(lues.map((l) => l.p).filter((p): p is PartitionDeChant => !!p).map((p) => [p.slug, p]));
      setCharges(Object.fromEntries(slugs.map((s, i) => [s, lues[i].ok])));
      setEchecs(slugs.filter((_, i) => !lues[i].ok));
      setMes(mesRef.current);
      setPartagees(autres.filter((p) => slugs.includes(p.slug)));
      if (c) setChoix(c);
      setEnAttente(etatEnregistrement(uid).enAttente > 0);
    });
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, cle]);

  // Relecture des échecs, bornée (trois minuteries, puis seulement au retour du réseau) : jamais de boucle serrée.
  useEffect(() => {
    if (!uid || !echecs.length) return;
    let vivant = true;
    const relire = () => {
      void Promise.all(echecs.map((s) => lirePartition(uid, s).then((p) => ({ s, ok: true, p }), () => ({ s, ok: false, p: null as PartitionDeChant | null }))))
        .then((lues) => {
          if (!vivant) return;
          const reussies = lues.filter((l) => l.ok);
          if (reussies.length) {
            // Une partition écrite entre-temps (plus récente) n'est pas remplacée par la lecture.
            for (const l of reussies) if (l.p && !mesRef.current[l.s]) mesRef.current = { ...mesRef.current, [l.s]: l.p };
            setMes(mesRef.current);
            setCharges((c) => ({ ...c, ...Object.fromEntries(reussies.map((l) => [l.s, true])) }));
          }
          setEchecs(lues.filter((l) => !l.ok).map((l) => l.s));
        });
    };
    const delai = [5_000, 15_000, 45_000][essais.current];
    const minuterie = delai === undefined ? undefined : setTimeout(() => { essais.current += 1; relire(); }, delai);
    window.addEventListener("online", relire);
    return () => { vivant = false; clearTimeout(minuterie); window.removeEventListener("online", relire); };
  }, [uid, echecs]);

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

  /** Réécrit ma partition de ce chant (file locale si le réseau manque). Une partition neuve reçoit `partageTout`. */
  const enregistrer = useCallback(async (p: PartitionDeChant) => {
    const neuve = !mesRef.current[p.slug];
    const ecrite = neuve ? { ...p, sharedWith: [...new Set([...p.sharedWith, ...choix.partageTout])] } : p;
    // Tenu à jour tout de suite : deux cases cochées vite repartent chacune de la partition déjà écrite.
    mesRef.current = { ...mesRef.current, [p.slug]: { ...ecrite, updatedAt: new Date() } };
    const etat = await enregistrerOuMettreEnFile(ecrite);
    setMes((m) => ({ ...m, [p.slug]: { ...ecrite, updatedAt: new Date() } }));
    setEnAttente(etatEnregistrement(p.ownerUid).enAttente > 0);
    return etat;
  }, [choix.partageTout]);

  /** Partage (ou retire) ma partition de ce chant avec `autre`. */
  const partagerAvec = useCallback(async (slug: string, autre: string, oui: boolean) => {
    const p = mesRef.current[slug];
    if (!p) return;
    await enregistrer({ ...p, sharedWith: oui ? [...new Set([...p.sharedWith, autre])] : p.sharedWith.filter((u) => u !== autre) });
  }, [enregistrer]);

  const partagerTraits = useCallback(async (slug: string, oui: boolean) => {
    const p = mesRef.current[slug];
    if (p) await enregistrer({ ...p, sharedTraits: oui });
  }, [enregistrer]);

  /** « Toutes mes partitions » : `partageTout` (relu avant d'écrire, comme `choisir`) et `sharedWith` de chacune. */
  const partagerTout = useCallback(async (autre: string, oui: boolean) => {
    if (!uid) return;
    // Les partitions d'abord, `partageTout` ensuite : un échec en route laisse la case décochée, à retenter.
    for (const lue of await lireMesPartitions(uid)) {
      // La version de cette page prime : une retouche encore dans la file ne doit pas être écrasée par le serveur.
      const p = mesRef.current[lue.slug] ?? lue;
      // Écrit en direct : `enregistrer` ajouterait `partageTout` d'avant à une partition absente de `mes`.
      const ecrite = { ...p, sharedWith: oui ? [...new Set([...p.sharedWith, autre])] : p.sharedWith.filter((u) => u !== autre) };
      await enregistrerOuMettreEnFile(ecrite);
      if (mesRef.current[p.slug]) mesRef.current = { ...mesRef.current, [p.slug]: { ...ecrite, updatedAt: new Date() } };
      setMes((m) => (m[p.slug] ? { ...m, [p.slug]: { ...ecrite, updatedAt: new Date() } } : m));
    }
    const lu = (await lireChoix(uid)) ?? { choices: {}, partageTout: [] };
    const partageTout = oui ? [...new Set([...lu.partageTout, autre])] : lu.partageTout.filter((u) => u !== autre);
    await enregistrerChoix(uid, { ...lu, partageTout });
    setChoix((c) => ({ ...c, partageTout }));
    setEnAttente(etatEnregistrement(uid).enAttente > 0);
  }, [uid]);

  /** « Garder une copie » : la partition partagée devient la mienne (les traits seulement s'ils étaient partagés). */
  const garderUneCopie = useCallback(async (partagee: PartitionDeChant, nom: string) => {
    if (!uid) return;
    await enregistrer({
      slug: partagee.slug,
      ownerUid: uid,
      ownerName: nom,
      base: partagee.base,
      content: partagee.content,
      structure: partagee.structure,
      sectionOrigins: partagee.sectionOrigins,
      jianpuChords: partagee.jianpuChords,
      key: partagee.key,
      traits: partagee.sharedTraits ? partagee.traits : [],
      sharedWith: choix.partageTout,
      sharedTraits: false,
    });
    choisir(partagee.slug, "mienne");
  }, [uid, enregistrer, choix.partageTout, choisir]);

  /** Ma partition de ce chant telle qu'elle est maintenant (écritures en cours comprises), sans attendre le rendu. */
  const lireLocale = useCallback((slug: string) => mesRef.current[slug], []);

  return { mes, charges, echecs, lireLocale, partagees, choix: choix.choices, partageTout: choix.partageTout, choisir, enregistrer, enAttente, partagerAvec, partagerTraits, partagerTout, garderUneCopie };
}
