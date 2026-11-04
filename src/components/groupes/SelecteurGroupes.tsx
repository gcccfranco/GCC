"use client";

// Le sélecteur des organigrammes (lot 2, D10, OG-C) : Église · Paix · Fidélité · Bonté · Amour · Joie,
// en rail (lot CD, T3c : choisir une vue), un point de couleur devant chaque groupe (Église sans couleur).

import { useTranslation } from "react-i18next";
import { OngletsRail } from "@/components/layout/Onglets";
import { TABLE_GROUPES, type GroupeId } from "@/lib/groupes/table";
import { categoryColor } from "@/lib/serviceColors";

export function SelecteurGroupes({ valeur, choisir }: { valeur: GroupeId | null; choisir: (g: GroupeId | null) => void }) {
  const { t } = useTranslation();
  return (
    <OngletsRail
      etiquette={t("groupes.selecteur")}
      actif={valeur ?? "eglise"}
      choisir={(v) => choisir(v === "eglise" ? null : (v as GroupeId))}
      onglets={[
        { id: "eglise", label: t("groupes.eglise") },
        ...TABLE_GROUPES.map((g) => ({ id: g.id, label: t(`groupes.court.${g.id}`), couleur: categoryColor(g.categorie) })),
      ]}
    />
  );
}
