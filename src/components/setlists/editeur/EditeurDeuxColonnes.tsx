"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DragEndEvent } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import {
  fusionner,
  isFormFusion,
  isFormTransition,
  type FormItem,
  type FormListItem,
  type FusionMixedSectionForm,
} from "@/lib/setlist/formItems";
import { categoryColor } from "@/lib/serviceColors";
import type { SongIndexEntry } from "@/types/song";
import { EnTeteEditeur, type ChampsEnTete } from "@/components/setlists/editeur/EnTeteEditeur";
import { ListeCourte, numerosDesElements } from "@/components/setlists/editeur/ListeCourte";
import { Bibliotheque } from "@/components/setlists/editeur/Bibliotheque";
import { ChoixFusion, VoletChant, VoletFusion, VoletTransition } from "@/components/setlists/editeur/Volets";

// Éditeur de setlist « piste 2 » en deux colonnes (lot U5 bis, T3, docs/spec-editeur-setlist.md) :
// ordinateur et tablette en paysage. À gauche, la setlist (en-tête compact, liste courte,
// « Ajouter des chants », « + Transition », repère et « Publier » / « Terminé ») ; à droite,
// le volet : réglages de l'élément choisi, choix des chants à fusionner, ou bibliothèque.
// L'état et les écritures restent ceux de SetlistForm : seule la mise en page change.

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

type Vue = { nom: "reglages" } | { nom: "bibliotheque" } | { nom: "fusionner"; depart: string };

export function EditeurDeuxColonnes({
  isEdit,
  items,
  setItems,
  songs,
  champs,
  actions,
  statut,
  saving,
  onPublier,
  onTerminer,
}: {
  isEdit: boolean;
  items: FormListItem[];
  setItems: (items: FormListItem[]) => void;
  songs: SongIndexEntry[];
  champs: ChampsEnTete;
  actions: ActionsEditeur;
  statut: ReactNode;
  saving: boolean;
  onPublier: () => void;
  onTerminer: () => void;
}) {
  const { t } = useTranslation();
  // « Modifier » : le premier élément choisi à l'ouverture (Q7) ; une setlist vide ouvre
  // la bibliothèque (Q8). Lu au montage.
  const [choisi, setChoisi] = useState<string | null>(() => items[0]?.uid ?? null);
  const [vue, setVue] = useState<Vue>(() => (items.length === 0 ? { nom: "bibliotheque" } : { nom: "reglages" }));
  const [ajoutes, setAjoutes] = useState<Set<string>>(new Set());
  const boutonAjouter = useRef<HTMLButtonElement>(null);
  const voletRef = useRef<HTMLElement>(null);

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

  // Le volet repart du haut quand il change de contenu.
  const cleVolet = vue.nom === "reglages" ? `r-${choisi}` : vue.nom === "fusionner" ? `f-${vue.depart}` : "b";
  useEffect(() => {
    voletRef.current?.scrollTo?.({ top: 0 });
  }, [cleVolet]);

  function ouvrirBibliotheque() {
    setAjoutes(new Set());
    setVue({ nom: "bibliotheque" });
  }

  function fermerBibliotheque() {
    setVue({ nom: "reglages" });
    boutonAjouter.current?.focus();
  }

  function choisir(uid: string) {
    setChoisi(uid);
    setVue({ nom: "reglages" });
  }

  /** Retire un élément ; le suivant est choisi (sinon le précédent, sinon la bibliothèque). */
  function retirer(uid: string) {
    const i = items.findIndex((x) => x.uid === uid);
    const reste = items.filter((x) => x.uid !== uid);
    setItems(reste);
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

  let contenu: ReactNode;
  if (vue.nom === "bibliotheque") {
    contenu = (
      <Bibliotheque
        songs={songs}
        pris={pris}
        ajoutes={ajoutes}
        onAjouter={(song) => {
          actions.addSong(song);
          setAjoutes((prev) => new Set(prev).add(song.slug));
        }}
        onTermine={fermerBibliotheque}
      />
    );
  } else if (vue.nom === "fusionner") {
    const depart = chantsSeuls.find((c) => c.uid === vue.depart);
    contenu = depart ? (
      <ChoixFusion
        depart={depart}
        autres={chantsSeuls.filter((c) => c.uid !== depart.uid)}
        numeros={numeros}
        onAnnuler={() => setVue({ nom: "reglages" })}
        onFusionner={confirmerFusion}
      />
    ) : null;
  } else if (!element) {
    contenu = <p className="pt-16 text-center text-sm text-muted-foreground">{t("setlists.editeur.choisirElement")}</p>;
  } else if (isFormTransition(element)) {
    contenu = (
      <VoletTransition
        item={element}
        onTexte={(texte) => actions.patchTransition(element.uid, texte)}
        onRetirer={() => retirer(element.uid)}
      />
    );
  } else if (isFormFusion(element)) {
    contenu = (
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
  } else {
    contenu = (
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

  const couleurPublier = champs.category ? categoryColor(champs.category) : undefined;

  return (
    <div
      data-editeur-deux-colonnes
      className="grid h-[calc(100svh-var(--nav-h))] bg-background"
      // Setlist : la largeur moins 672 px, entre 400 et 520 (Q2) ; le volet, le reste.
      style={{ gridTemplateColumns: "clamp(400px, calc(100% - 672px), 520px) minmax(0, 1fr)" }}
    >
      <section data-colonne-setlist aria-label={t("common.header.setlists")} className="flex min-h-0 flex-col border-r border-border">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-6">
          <div className="px-1">
            <EnTeteEditeur champs={champs} />
          </div>
          <div className="mt-4 border-t border-border pt-3">
            <ListeCourte
              items={items}
              choisi={vue.nom === "bibliotheque" ? null : choisi}
              onChoisir={choisir}
              onDragEnd={actions.onDragEnd}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              ref={boutonAjouter}
              type="button"
              onClick={ouvrirBibliotheque}
              aria-pressed={vue.nom === "bibliotheque"}
              className="flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("setlists.editeur.ajouterDesChants")}
            </button>
            <button
              type="button"
              onClick={() => choisir(actions.addTransition())}
              className="flex h-11 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("setlists.form.addTransition")}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-6 py-4">
          <p role="status" className="min-w-0 flex-1 text-[13px] font-medium text-muted-foreground">{statut}</p>
          {isEdit ? (
            <button
              type="button"
              onClick={onTerminer}
              className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("setlists.form.done")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPublier}
              disabled={saving}
              // « Publier » à la couleur du culte dès que la catégorie est connue (question 9).
              style={couleurPublier ? { backgroundColor: couleurPublier, color: "#fff" } : undefined}
              className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110 disabled:opacity-50"
            >
              {t(saving ? "setlists.form.publishing" : "setlists.form.publish")}
            </button>
          )}
        </div>
      </section>

      <section
        ref={voletRef}
        data-volet
        aria-label={t("setlists.editeur.volet")}
        onKeyDown={(e) => {
          if (e.key === "Escape" && vue.nom === "bibliotheque") {
            e.preventDefault();
            fermerBibliotheque();
          }
        }}
        className="min-h-0 overflow-y-auto overscroll-contain"
      >
        <div key={cleVolet} className="mx-auto min-h-full max-w-[760px] px-9 pb-10 pt-6">
          {contenu}
        </div>
      </section>
    </div>
  );
}
