"use client";

// Le panneau des organigrammes de groupe (lot 2, OG-C) : 420 px à droite en grand, feuille en dessous,
// comme celui d'une équipe (agencement v18, B8 ; src/app/equipes/EquipesClient.tsx).

import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useDisposition } from "@/hooks/useDisposition";

export function Panneau({
  ouvert, onFermer, titre, sousTitre, outils, children, pleineHauteur = false,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: ReactNode;
  sousTitre?: ReactNode;
  /** À droite du titre (« Modifier », « ⋯ »). */
  outils?: ReactNode;
  children: ReactNode;
  /** Le formulaire d'un rôle : feuille pleine hauteur sur téléphone. */
  pleineHauteur?: boolean;
}) {
  const aDroite = useDisposition() === "grand";
  return (
    <Drawer open={ouvert} onOpenChange={(o) => !o && onFermer()} direction={aDroite ? "right" : "bottom"}>
      <DrawerContent
        {...(sousTitre ? {} : { "aria-describedby": undefined })}
        className={aDroite
          ? "left-auto top-0 bottom-0 mt-0 h-full w-[420px] rounded-none rounded-l-2xl border-y-0 border-r-0 [&>div:first-child]:hidden"
          : pleineHauteur ? "h-[96dvh] max-h-[96dvh]" : "max-h-[90dvh]"}
      >
        <DrawerHeader className="pb-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DrawerTitle>{titre}</DrawerTitle>
              {sousTitre && <DrawerDescription>{sousTitre}</DrawerDescription>}
            </div>
            {outils && <div className="flex shrink-0 items-center gap-2">{outils}</div>}
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
