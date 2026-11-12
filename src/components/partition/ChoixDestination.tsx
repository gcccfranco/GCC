"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export type Destination = "moi" | "culte";

// shortcut: feuille du bas à toutes les tailles (la spec veut un popover hors téléphone), à reprendre avec la critique-design.
/** « Enregistrer » d'un responsable (`canEditSetlist`) : pour moi (défaut) ou pour tout le culte. */
export function ChoixDestination({ open, dateCourte, onChoisir, onClose }: {
  open: boolean;
  /** « 21 sept. », la date de la setlist. */
  dateCourte: string;
  onChoisir: (d: Destination) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [d, setD] = useState<Destination>("moi");
  const ligne = (v: Destination, titre: string, aide: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ${d === v ? "border-foreground bg-secondary" : "border-border"}`}
    >
      <input type="radio" name="destination-crayon" checked={d === v} onChange={() => setD(v)} className="mt-1 accent-foreground" />
      <span>
        <span className="block text-sm font-semibold">{titre}</span>
        <span className="block text-xs text-muted-foreground">{aide}</span>
      </span>
    </label>
  );
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground={false}>
      <DrawerContent className="md:mx-auto md:max-w-md" data-choix-destination>
        <DrawerHeader className="pb-1">
          <DrawerTitle>{t("maPartition.crayon.choixTitre")}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-2 px-4 pb-6">
          {ligne("moi", t("maPartition.crayon.pourMoi"), t("maPartition.crayon.pourMoiAide"))}
          {ligne("culte", t("maPartition.crayon.pourLeCulte", { date: dateCourte }), t("maPartition.crayon.pourLeCulteAide"))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="h-11 flex-1" onClick={onClose}>{t("common.cancel")}</Button>
            <Button className="h-11 flex-1" onClick={() => onChoisir(d)}>{t("maPartition.crayon.enregistrer")}</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
