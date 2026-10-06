"use client";

// Le menu « ⋯ » (agencement v18, R9 de docs/spec-agencement-v18.md) : Dupliquer, Supprimer,
// Retirer… — tout ce qui n'est pas l'action principale ni « Modifier ». Rond à contour de 36 px,
// posé dans `EnTetePage outils` ou à côté du titre d'une fiche. Une action avec `confirmer` passe
// d'abord par la fenêtre du site (`useConfirmer`) ; refusée, rien n'est fait.
//
//   <MenuActions actions={[
//     { label: "Dupliquer", icone: Copy, onSelect: dupliquer },
//     { label: "Supprimer", icone: Trash2, destructif: true, onSelect: supprimer,
//       confirmer: { titre: `Supprimer « ${titre} » ?`, texte: "Elle disparaît pour tout le pôle.", action: "Supprimer" } },
//   ]} />
//
// Il s'ouvre au clavier (Entrée, Espace, flèche bas) et se parcourt aux flèches (Radix).

import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useConfirmer, type DemandeDeConfirmation } from "./Confirmer";

export type ActionDuMenu = {
  label: string;
  onSelect: () => void | Promise<void>;
  icone?: LucideIcon;
  /** Retire ou supprime : en rouge. */
  destructif?: boolean;
  /** Demande d'abord confirmation dans le site (bouton rouge si `destructif`). */
  confirmer?: Omit<DemandeDeConfirmation, "destructif">;
};

export function MenuActions({ actions, label }: { actions: ActionDuMenu[]; label?: string }) {
  const { t } = useTranslation();
  const confirmer = useConfirmer();

  const choisir = async (a: ActionDuMenu) => {
    if (a.confirmer && !(await confirmer({ ...a.confirmer, destructif: a.destructif }))) return;
    await a.onSelect();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={label ?? t("common.moreActions")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {actions.map((a) => {
          const Icone = a.icone;
          return (
            <DropdownMenuItem
              key={a.label}
              // Le menu se ferme d'abord : la fenêtre de confirmation prend alors le focus.
              onSelect={() => { void choisir(a); }}
              className={cn(a.destructif && "text-destructive focus:text-destructive")}
            >
              {Icone && <Icone className="h-4 w-4" aria-hidden />}
              {a.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
