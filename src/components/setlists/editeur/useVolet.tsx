"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  fusionner,
  isFormFusion,
  isFormTransition,
  type FormItem,
  type FormListItem,
  type FusionMixedSectionForm,
} from "@/lib/setlist/formItems";
import type { SongIndexEntry } from "@/types/song";
import { numerosDesElements } from "@/components/setlists/editeur/ListeCourte";
import { Bibliotheque } from "@/components/setlists/editeur/Bibliotheque";
import { ChoixFusion, VoletChant, VoletFusion, VoletTransition } from "@/components/setlists/editeur/Volets";

// Ce que montre le volet de l'éditeur (lot U5 bis) : les réglages de l'élément
// choisi, le choix des chants à fusionner, ou la bibliothèque. Partagé par les deux
// dispositions — la colonne de droite (T3) et la feuille des petits écrans (T4) —
// qui ne décident que de l'endroit où le contenu se pose.

export interface ActionsEditeur {
  addSong: (song: SongIndexEntry) => void;
  /** Ajoute une transition à la fin ; rend son uid. */
  addTransition: () => string;
  patch: (uid: string, update: Partial<FormItem>) => void;
  patchTransition: (uid: string, text: string) => void;
  patchFusionSong: (fusionUid: string, songUid: string, update: Partial<FormItem>) => void;
  patchFusionMixed: (fusionUid: string, mixed: FusionMixedSectionForm[] | null) => void;
  unfuse: (fusionUid: string) => void;
  onDragEnd: (e: DragEndEvent) => void;
}

export type Vue = { nom: "reglages" } | { nom: "bibliotheque" } | { nom: "fusionner"; depart: string };

export function useVolet({
  items,
  setItems,
  songs,
  actions,
  feuille,
}: {
  items: FormListItem[];
  setItems: (items: FormListItem[]) => void;
  songs: SongIndexEntry[];
  actions: ActionsEditeur;
  /** Petits écrans : le volet est une feuille ; « Retirer » et « Terminé » la ferment. */
  feuille: { fermer: () => void } | null;
}) {
  const { t } = useTranslation();
  // Grand écran : le premier élément choisi à l'ouverture de « Modifier » (Q7), la
  // bibliothèque ouverte d'office sur une setlist vide (Q8). Feuilles : rien d'ouvert.
  const [choisi, setChoisi] = useState<string | null>(() => (feuille ? null : items[0]?.uid ?? null));
  const [vue, setVue] = useState<Vue>(() => (!feuille && items.length === 0 ? { nom: "bibliotheque" } : { nom: "reglages" }));
  const [ajoutes, setAjoutes] = useState<Set<string>>(new Set());

  const numeros = useMemo(() => numerosDesElements(items), [items]);
  const pris = useMemo(() => {
    const slugs = new Set<string>();
    for (const item of items) {
      if (isFormTransition(item)) continue;
      if (isFormFusion(item)) item.songs.forEach((s) => slugs.add(s.song.slug));
      else slugs.add(item.song.slug);
    }
    return slugs;
  }, [items]);
  const chantsSeuls = items.filter((i): i is FormItem => !isFormFusion(i) && !isFormTransition(i));
  const element = items.find((i) => i.uid === choisi) ?? null;

  /** Clé du contenu : le volet repart du haut quand elle change. */
  const cle = vue.nom === "reglages" ? `r-${choisi}` : vue.nom === "fusionner" ? `f-${vue.depart}` : "b";

  function ouvrirBibliotheque() {
    setAjoutes(new Set());
    setVue({ nom: "bibliotheque" });
  }

  function choisir(uid: string) {
    setChoisi(uid);
    setVue({ nom: "reglages" });
  }

  /** Retire un élément. Grand écran : le suivant est choisi (sinon le précédent, sinon
   *  la bibliothèque). Feuille : elle se ferme. */
  function retirer(uid: string) {
    const i = items.findIndex((x) => x.uid === uid);
    const reste = items.filter((x) => x.uid !== uid);
    setItems(reste);
    if (feuille) {
      setChoisi(null);
      feuille.fermer();
      return;
    }
    const suivant = reste[i] ?? reste[i - 1] ?? null;
    setChoisi(suivant?.uid ?? null);
    if (!suivant) setVue({ nom: "bibliotheque" });
  }

  function confirmerFusion(uids: string[]) {
    const fusionne = fusionner(items, uids);
    const fusion = fusionne.find((x) => !items.includes(x));
    setItems(fusionne);
    if (fusion) setChoisi(fusion.uid);
    setVue({ nom: "reglages" });
  }

  function contenu(onTermineBibliotheque: () => void): ReactNode {
    if (vue.nom === "bibliotheque") {
      return (
        <Bibliotheque
          songs={songs}
          pris={pris}
          ajoutes={ajoutes}
          onAjouter={(song) => {
            actions.addSong(song);
            setAjoutes((prev) => new Set(prev).add(song.slug));
          }}
          onTermine={onTermineBibliotheque}
        />
      );
    }
    if (vue.nom === "fusionner") {
      const depart = chantsSeuls.find((c) => c.uid === vue.depart);
      return depart ? (
        <ChoixFusion
          depart={depart}
          autres={chantsSeuls.filter((c) => c.uid !== depart.uid)}
          numeros={numeros}
          onAnnuler={() => setVue({ nom: "reglages" })}
          onFusionner={confirmerFusion}
        />
      ) : null;
    }
    if (!element) {
      return <p className="pt-16 text-center text-sm text-muted-foreground">{t("setlists.editeur.choisirElement")}</p>;
    }
    if (isFormTransition(element)) {
      return (
        <VoletTransition
          item={element}
          onTexte={(texte) => actions.patchTransition(element.uid, texte)}
          onRetirer={() => retirer(element.uid)}
        />
      );
    }
    if (isFormFusion(element)) {
      return (
        <VoletFusion
          numero={numeros.get(element.uid) ?? 0}
          item={element}
          onPatchSong={(songUid, update) => actions.patchFusionSong(element.uid, songUid, update)}
          onChangeMixed={(mixed) => actions.patchFusionMixed(element.uid, mixed)}
          onDefusionner={() => {
            actions.unfuse(element.uid);
            setChoisi(element.songs[0]?.uid ?? null);
          }}
          onRetirer={() => retirer(element.uid)}
        />
      );
    }
    return (
      <VoletChant
        numero={numeros.get(element.uid) ?? 0}
        item={element}
        peutFusionner={chantsSeuls.length >= 2}
        onPatch={(update) => actions.patch(element.uid, update)}
        onFusionner={() => setVue({ nom: "fusionner", depart: element.uid })}
        onRetirer={() => retirer(element.uid)}
      />
    );
  }

  return { choisi, vue, setVue, cle, choisir, ouvrirBibliotheque, contenu };
}
