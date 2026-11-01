"use client";

import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/** Choix du rôle à la première ouverture du mode louange. */
export function FeuilleRole<R extends string>({
  open,
  roleIds,
  onFermer,
  onChoisir,
}: {
  open: boolean;
  roleIds: readonly R[];
  onFermer: () => void;
  onChoisir: (id: R | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Drawer open={open} onOpenChange={(open) => !open && onFermer()}>
      <DrawerContent
        className="z-[10000]"
        overlayClassName="z-[10000] bg-black/40"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        {/* Même colonne que les choix : titre et boutons alignés sur tablette. */}
        <DrawerHeader className="pb-1 w-full max-w-md mx-auto">
          <DrawerTitle>{t("performance.rolePrompt.title")}</DrawerTitle>
          <DrawerDescription>{t("performance.rolePrompt.description")}</DrawerDescription>
        </DrawerHeader>
        <div
          className="w-full max-w-md mx-auto px-4 pt-2 flex flex-col gap-1.5"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {[...roleIds, null].map((id) => (
            <button
              key={id ?? "none"}
              type="button"
              onClick={() => onChoisir(id)}
              className="min-h-12 px-4 py-2 rounded-lg border border-border text-left flex items-center justify-between gap-3 transition-colors hover:bg-muted/60 active:bg-muted"
            >
              <span className="text-sm font-semibold text-foreground">
                {id ? t(`performance.roles.${id}`) : t("performance.rolePrompt.none")}
              </span>
              <span className="text-xs text-muted-foreground text-right">
                {t(`performance.rolePrompt.hints.${id ?? "none"}`)}
              </span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
