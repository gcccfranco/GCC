"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Drawer as DrawerPrimitive } from "vaul";

// Le volet dans une feuille (lot U5 bis, T4) : sur téléphone et tablette en
// portrait, les réglages, le choix à fusionner et la bibliothèque s'ouvrent dans
// une feuille `Drawer`. Le contenu est le même que dans la colonne de droite ;
// ce contexte lui dit qu'il est dans une feuille (titre du dialogue, « OK »).

export const FeuilleContexte = createContext<{ fermer: () => void } | null>(null);

export const useFeuille = () => useContext(FeuilleContexte);

/** Titre du volet : dans une feuille, il nomme aussi le dialogue. */
export function TitreVolet({ className, children }: { className: string; children: ReactNode }) {
  const feuille = useFeuille();
  const titre = <h2 className={className}>{children}</h2>;
  return feuille ? <DrawerPrimitive.Title asChild>{titre}</DrawerPrimitive.Title> : titre;
}

/** « OK » : ferme la feuille (rien d'autre, tout est déjà enregistré). */
export function BoutonOK() {
  const { t } = useTranslation();
  const feuille = useFeuille();
  if (!feuille) return null;
  return (
    <button
      type="button"
      onClick={feuille.fermer}
      className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-foreground px-3.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {t("setlists.editeur.ok")}
    </button>
  );
}
