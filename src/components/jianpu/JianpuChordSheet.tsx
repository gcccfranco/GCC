"use client";

import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ChordPad } from "@/components/setlists/ChordPad";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";

// Feuille de retouche d'un accord sur un scan 简谱 (lot 9,
// docs/spec-harmonie.md) : le pavé du mode Adapter, plus « Supprimer
// l'accord » quand il y a déjà quelque chose de gravé à cet endroit.
//
// L'accord est affiché et saisi dans la tonalité JOUÉE, comme sur le scan ;
// l'appelant le re-stocke dans la tonalité de la gravure.

export function JianpuChordSheet({
  accord,
  tonalite,
  onValider,
  onEffacer,
  onFermer,
}: {
  /** Accord visé, dans la tonalité jouée ; absent = nouvel accord. */
  accord?: string;
  /** Tonalité affichée, rappelée quand elle n'est pas celle de la gravure. */
  tonalite?: string;
  onValider: (accord: string) => void;
  /** Absent : rien à effacer (place libre sur une ligne d'accords). */
  onEffacer?: () => void;
  onFermer: () => void;
}) {
  const { t } = useTranslation();
  useStandaloneScrollLock(true);
  return (
    <Drawer open onOpenChange={(o) => !o && onFermer()}>
      <DrawerContent className="max-h-[88vh] md:max-w-lg md:mx-auto">
        <DrawerHeader className="pb-1">
          <DrawerTitle className="flex items-center justify-between gap-2">
            <span>{t("setlists.contentEdit.addChord", { defaultValue: "Accord" })}</span>
            {tonalite && (
              <span className="text-[11px] font-normal text-muted-foreground">
                {t("setlists.contentEdit.displayedKey", {
                  defaultValue: "Tonalité affichée : {{key}}",
                  key: tonalite,
                })}
              </span>
            )}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <ChordPad initial={accord} onSubmit={onValider} onCancel={onFermer} />
          {onEffacer && (
            <button
              type="button"
              onClick={onEffacer}
              className="mt-3 h-10 w-full rounded-sm border border-border bg-card text-[13px] font-semibold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("setlists.contentEdit.removeChord", { defaultValue: "Supprimer l'accord" })}
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
