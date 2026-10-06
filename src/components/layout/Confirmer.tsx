"use client";

// Les confirmations dans le site (agencement v18, R9 de docs/spec-agencement-v18.md) : jamais la
// fenêtre grise du navigateur. `ConfirmerProvider`, posé une fois à la racine (app/layout.tsx),
// tient une petite fenêtre (`AlertDialog`) ; `useConfirmer()` rend une fonction qui l'ouvre et rend
// une promesse : `true` sur l'action, `false` sur « Annuler », Échap ou un clic à côté. Elle se
// substitue à `window.confirm` ligne pour ligne, sans changer la logique :
//
//   const confirmer = useConfirmer();
//   if (!(await confirmer({ titre: "Supprimer la tâche ?", texte: "Elle disparaît pour tout le pôle.",
//                           action: "Supprimer", destructif: true }))) return;
//
// Une seule fenêtre à la fois : une demande pendant qu'une autre est ouverte répond `false` à la
// première.

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

export type DemandeDeConfirmation = {
  /** La question, qui nomme ce qui va se passer : « Supprimer « Fond PPT » ? ». */
  titre: ReactNode;
  /** Une phrase de plus : ce qui disparaît, ce qui reste. */
  texte?: ReactNode;
  /** Le libellé du bouton d'action (« Supprimer », « Publier ») ; « Confirmer » par défaut. */
  action?: string;
  /** Le libellé du refus ; « Annuler » par défaut. */
  annuler?: string;
  /** Une action qui retire ou supprime : bouton rouge. */
  destructif?: boolean;
};

type Confirmer = (demande: DemandeDeConfirmation) => Promise<boolean>;

const Contexte = createContext<Confirmer | null>(null);

/** La fonction qui demande une confirmation dans le site. Sous `ConfirmerProvider` seulement. */
export function useConfirmer(): Confirmer {
  const confirmer = useContext(Contexte);
  if (!confirmer) throw new Error("useConfirmer hors de ConfirmerProvider (app/layout.tsx)");
  return confirmer;
}

export function ConfirmerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  // La demande reste affichée pendant le fondu de fermeture : seul `ouvert` repasse à faux.
  const [demande, setDemande] = useState<DemandeDeConfirmation | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const reponse = useRef<((oui: boolean) => void) | null>(null);

  const repondre = useCallback((oui: boolean) => {
    reponse.current?.(oui);
    reponse.current = null;
    setOuvert(false);
  }, []);

  const confirmer = useCallback<Confirmer>((d) => {
    reponse.current?.(false);
    setDemande(d);
    setOuvert(true);
    return new Promise<boolean>((resoudre) => {
      reponse.current = resoudre;
    });
  }, []);

  return (
    <Contexte.Provider value={confirmer}>
      {children}
      <AlertDialog open={ouvert} onOpenChange={(o) => { if (!o) repondre(false); }}>
        <AlertDialogContent className="max-w-[calc(100%-32px)] rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{demande?.titre}</AlertDialogTitle>
            {/* Toujours une description (Radix l'attend) ; vide si la demande n'a pas de texte. */}
            <AlertDialogDescription>{demande?.texte}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 rounded-full" onClick={() => repondre(false)}>
              {demande?.annuler ?? t("common.buttons.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: demande?.destructif ? "destructive" : "default", className: "rounded-full" })}
              onClick={() => repondre(true)}
            >
              {demande?.action ?? t("common.buttons.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Contexte.Provider>
  );
}
