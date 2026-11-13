"use client";

import { useTranslation } from "react-i18next";
import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/firebase/auth";
import { setNotationAccords, useNotationAccords, type NotationAccords } from "@/lib/notationAccords";
import { TOUCHER_44 } from "@/lib/toucher44";
import { compter } from "@/lib/usage";

// Bascule Lettres / Chiffres (lot Harmonie H7) : deux boutons `aria-pressed`. « barre » : dans la barre du chant, libellés
// courts « A » / « 1 » (titre et aria-label en mots), à partir de 640 px ; « fenetre » : fenêtre de l'armure ; « menu » : rubrique en mots (⋯ du chant, réglages de la vue partitions).
export function ChoixNotation({ variante }: { variante: "barre" | "menu" | "fenetre" }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const uid = loading ? undefined : user?.uid ?? null;
  const notation = useNotationAccords(uid);
  const choisir = (n: NotationAccords) => {
    if (uid === undefined || n === notation) return;
    compter("cmd.chant.notation");
    setNotationAccords(uid, n);
  };
  const bouton = (n: NotationAccords) => {
    const nom = t(`notationAccords.${n}`);
    const court = variante === "barre";
    return (
      <button
        key={n}
        type="button"
        aria-pressed={notation === n}
        disabled={uid === undefined}
        aria-label={court ? nom : undefined}
        title={court ? nom : undefined}
        data-notation={n}
        onClick={() => choisir(n)}
        className={`${court ? `${TOUCHER_44} h-9 min-w-9 lg:h-8 lg:min-w-8 px-2 text-sm font-bold` : "min-h-11 flex-1 px-3 text-sm font-medium"} rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${notation === n ? "bg-foreground text-background" : "text-foreground"}`}
      >
        {court ? (n === "lettres" ? "A" : "1") : nom}
      </button>
    );
  };
  const segments = (
    <div role="group" aria-label={t("notationAccords.titre")} className={variante === "barre" ? "bascule-notation raised hidden sm:flex items-center gap-0.5 rounded-full p-0.5" : "flex gap-1 rounded-full border border-border p-0.5"}>
      {bouton("lettres")}
      {bouton("chiffres")}
    </div>
  );
  if (variante === "barre") return segments;
  // « fenetre » : hors menu Radix (fenêtre de l'armure), un libellé simple.
  if (variante === "fenetre") return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{t("notationAccords.titre")}</p>
      {segments}
    </div>
  );
  return (
    // Dans un menu Radix, les touches s'arrêtent ici (comme ChoixCouleurAccords) ; Tab reste au menu.
    <div className="space-y-1.5 pb-1" onKeyDown={(e) => { if (e.key !== "Tab" && e.key !== "ArrowLeft" && e.key !== "ArrowRight") e.stopPropagation(); }}>
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{t("notationAccords.titre")}</DropdownMenuLabel>
      <div className="px-1">{segments}</div>
    </div>
  );
}
