"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { EnTeteEditeur } from "@/components/setlists/editeur/EnTeteEditeur";
import { ListeCourte } from "@/components/setlists/editeur/ListeCourte";
import { BoutonFinal, type ProprietesEditeur } from "@/components/setlists/editeur/EditeurDeuxColonnes";
import { FeuilleContexte } from "@/components/setlists/editeur/feuille";
import { useVolet } from "@/components/setlists/editeur/useVolet";

// Éditeur de setlist « piste 2 » sur téléphone et tablette en portrait (lot U5 bis, T4,
// docs/spec-editeur-setlist.md ; planches `creer-piste2-telephone-setlist`,
// `creer-piste2-telephone`, `creer-piste2-telephone-ajouter`, `creer-piste2-tablette`).
// La liste en grand : en-tête compact, liste courte, « + Transition » ; barre du bas :
// repère, « Ajouter des chants », « Publier » / « Terminé ». Toucher un élément ouvre
// ses réglages dans une feuille (« OK », glisser vers le bas, voile, Échap) ; le choix
// des chants à fusionner remplace le contenu de la même feuille ; la bibliothèque est
// une feuille aussi. Le contenu est celui du volet des grands écrans (useVolet).

export function EditeurFeuilles({
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
  const [ouverte, setOuverte] = useState(false);
  const feuille = useMemo(() => ({ fermer: () => setOuverte(false) }), []);
  const v = useVolet({ items, setItems, songs, actions, feuille });
  useStandaloneScrollLock(ouverte);

  const ouvrir = (uid: string) => {
    v.choisir(uid);
    setOuverte(true);
  };
  const bibliotheque = v.vue.nom === "bibliotheque";

  return (
    <div data-editeur-feuilles className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 pb-44 pt-4 sm:px-7">
        <EnTeteEditeur champs={champs} retour={{ onClick: isEdit ? onTerminer : undefined }} />
        <div className="mt-4 border-t border-border pt-3">
          {items.length > 0 ? (
            <ListeCourte
              items={items}
              // La ligne en encre tant que sa feuille est ouverte.
              choisi={ouverte && !bibliotheque ? v.choisi : null}
              onChoisir={ouvrir}
              onDragEnd={actions.onDragEnd}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              {t("setlists.editeur.listeVide")}
            </p>
          )}
        </div>
        <button
          type="button"
          data-ajouter-transition
          onClick={() => ouvrir(actions.addTransition())}
          className="mt-4 flex h-9 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t("setlists.form.addTransition")}
        </button>
        {items.length > 0 && <p className="mt-4 text-[13px] text-muted-foreground">{t("setlists.editeur.aideListe")}</p>}
      </div>

      {/* Barre du bas. z-50 : devant la barre d'onglets (z-40, fixée en bas elle aussi) ;
          fond opaque pour qu'elle ne transparaisse pas. */}
      <div data-barre-editeur className="fixed bottom-0 left-[var(--barre-laterale)] right-0 z-50 border-t border-border bg-background">
        <div className="mx-auto max-w-3xl space-y-2 px-4 pt-2.5 sm:px-7" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <p role="status" className="min-h-4 text-xs font-medium text-muted-foreground">{statut}</p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              data-ouvrir-bibliotheque
              onClick={() => {
                v.ouvrirBibliotheque();
                setOuverte(true);
              }}
              className="flex h-11 min-w-0 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{t("setlists.editeur.ajouterDesChants")}</span>
            </button>
            <BoutonFinal isEdit={isEdit} categorie={champs.category} saving={saving} onPublier={onPublier} onTerminer={onTerminer} />
          </div>
        </div>
      </div>

      {/* `autoFocus` : le focus entre dans la feuille à l'ouverture (vaul l'en empêche sinon). */}
      <Drawer open={ouverte} onOpenChange={(o) => !o && feuille.fermer()} autoFocus>
        <DrawerContent
          data-volet
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            // Le focus revient à ce qui a ouvert la feuille : la ligne de l'élément, ou
            // « Ajouter des chants » (un toucher ne donne pas toujours le focus au bouton).
            const cible = bibliotheque
              ? document.querySelector<HTMLElement>("[data-barre-editeur] [data-ouvrir-bibliotheque]")
              : document.querySelector<HTMLElement>(`[data-liste-courte] [data-uid="${CSS.escape(v.choisi ?? "")}"] [data-ligne]`);
            if (!cible) return;
            e.preventDefault();
            cible.focus();
          }}
          className={`${bibliotheque ? "h-[92svh]" : "max-h-[92svh]"} md:mx-auto md:max-w-3xl`}
        >
          <FeuilleContexte.Provider value={feuille}>
            <div key={v.cle} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-6 pt-3 sm:px-7">
              {v.contenu(feuille.fermer)}
            </div>
          </FeuilleContexte.Provider>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
