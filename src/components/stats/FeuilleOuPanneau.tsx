"use client";

// La coquille du détail d'une statistique (lot ST, ST4 ; lot SP, SP-B) : feuille du bas sur téléphone et
// tablette debout, panneau ancré à droite dès les deux volets (`useDeuxVolets`). Échap et croix de 44 px.
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";

export function FeuilleOuPanneau({ ouvert, onOpenChange, titre, testidPanneau, testidFeuille, children }: {
  ouvert: boolean;
  onOpenChange: (ouvert: boolean) => void;
  titre: string;
  testidPanneau: string;
  testidFeuille: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const deuxVolets = useDeuxVolets();
  useStandaloneScrollLock(ouvert && !deuxVolets);
  return deuxVolets ? (
    <Dialog open={ouvert} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid={testidPanneau}
        aria-describedby={undefined}
        className="bottom-0 right-0 top-[var(--nav-h)] flex w-[380px] max-w-full flex-col overflow-hidden border-l border-border bg-background shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border pl-4 pr-1">
          <DialogTitle className="font-semibold text-foreground">{titre}</DialogTitle>
          <button
            type="button" onClick={() => onOpenChange(false)} aria-label={t("common.buttons.close")}
            className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer open={ouvert} onOpenChange={onOpenChange}>
      <DrawerContent data-testid={testidFeuille} className="max-h-[88vh] md:mx-auto md:max-w-3xl">
        <DrawerTitle className="px-4 pt-3 text-center font-semibold text-foreground">{titre}</DrawerTitle>
        <DrawerDescription className="sr-only">{titre}</DrawerDescription>
        <div className="overflow-y-auto px-4 pb-6 pt-3">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
