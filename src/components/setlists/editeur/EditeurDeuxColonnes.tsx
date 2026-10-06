"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import type { FormListItem } from "@/lib/setlist/formItems";
import { categoryColor } from "@/lib/serviceColors";
import type { SongIndexEntry } from "@/types/song";
import { EnTeteEditeur, type ChampsEnTete } from "@/components/setlists/editeur/EnTeteEditeur";
import { ListeCourte } from "@/components/setlists/editeur/ListeCourte";
import { useVolet, type ActionsEditeur } from "@/components/setlists/editeur/useVolet";

// Éditeur de setlist « piste 2 » en deux colonnes (lot U5 bis, T3, docs/spec-editeur-setlist.md) :
// ordinateur et tablette en paysage. À gauche, la setlist (en-tête compact, liste courte,
// « Ajouter des chants », « + Transition », repère et « Publier » / « Terminé ») ; à droite,
// le volet : réglages de l'élément choisi, choix des chants à fusionner, ou bibliothèque.
// L'état et les écritures restent ceux de SetlistForm : seule la mise en page change.

/** Ce que SetlistForm donne à l'éditeur, quelle que soit sa disposition. */
export interface ProprietesEditeur {
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
}

/** « Publier » à la couleur du culte dès que la catégorie est connue (question 9), ou « Terminé ». */
export function BoutonFinal({ isEdit, categorie, saving, onPublier, onTerminer }: {
  isEdit: boolean;
  categorie: string;
  saving: boolean;
  onPublier: () => void;
  onTerminer: () => void;
}) {
  const { t } = useTranslation();
  if (isEdit) {
    return (
      <button
        type="button"
        onClick={onTerminer}
        className="h-11 shrink-0 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("setlists.form.done")}
      </button>
    );
  }
  const couleur = categorie ? categoryColor(categorie) : undefined;
  return (
    <button
      type="button"
      onClick={onPublier}
      disabled={saving}
      style={couleur ? { backgroundColor: couleur, color: "#fff" } : undefined}
      className="h-11 shrink-0 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110 disabled:opacity-50"
    >
      {t(saving ? "setlists.form.publishing" : "setlists.form.publish")}
    </button>
  );
}

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
}: ProprietesEditeur) {
  const { t } = useTranslation();
  const v = useVolet({ items, setItems, songs, actions, feuille: null });
  const voletRef = useRef<HTMLElement>(null);

  // Le volet repart du haut quand il change de contenu.
  useEffect(() => {
    voletRef.current?.scrollTo?.({ top: 0 });
  }, [v.cle]);

  // Le focus revient à « Ajouter des chants » (lu dans le document : un ref ne se
  // lit pas pendant le rendu, où le volet reçoit cette fonction).
  function fermerBibliotheque() {
    v.setVue({ nom: "reglages" });
    document.querySelector<HTMLButtonElement>("[data-colonne-setlist] [data-ouvrir-bibliotheque]")?.focus();
  }

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
              choisi={v.vue.nom === "bibliotheque" ? null : v.choisi}
              onChoisir={v.choisir}
              onDragEnd={actions.onDragEnd}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              data-ouvrir-bibliotheque
              onClick={v.ouvrirBibliotheque}
              aria-pressed={v.vue.nom === "bibliotheque"}
              className="flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("setlists.editeur.ajouterDesChants")}
            </button>
            <button
              type="button"
              data-ajouter-transition
              onClick={() => v.choisir(actions.addTransition())}
              className="flex h-11 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t("setlists.form.addTransition")}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t border-border bg-background px-6 py-4">
          <p role="status" className="min-w-0 flex-1 text-[13px] font-medium text-muted-foreground">{statut}</p>
          <BoutonFinal isEdit={isEdit} categorie={champs.category} saving={saving} onPublier={onPublier} onTerminer={onTerminer} />
        </div>
      </section>

      <section
        ref={voletRef}
        data-volet
        aria-label={t("setlists.editeur.volet")}
        onKeyDown={(e) => {
          if (e.key === "Escape" && v.vue.nom === "bibliotheque") {
            e.preventDefault();
            fermerBibliotheque();
          }
        }}
        className="min-h-0 overflow-y-auto overscroll-contain"
      >
        <div key={v.cle} className="mx-auto min-h-full max-w-[760px] px-9 pb-10 pt-6">
          {v.contenu(fermerBibliotheque)}
        </div>
      </section>
    </div>
  );
}
