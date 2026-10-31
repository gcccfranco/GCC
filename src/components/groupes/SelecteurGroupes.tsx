"use client";

// Le sélecteur des organigrammes (lot 2, D10, OG-C) : Église · Paix · Fidélité · Bonté · Amour · Joie,
// en pilules ; la pilule active à la couleur du groupe (Église à l'encre), un point de couleur devant
// chaque groupe.

import { useTranslation } from "react-i18next";
import { Pilules } from "@/components/layout/Onglets";
import { TABLE_GROUPES, type GroupeId } from "@/lib/groupes/table";
import { categoryColor } from "@/lib/serviceColors";

export function SelecteurGroupes({ valeur, choisir }: { valeur: GroupeId | null; choisir: (g: GroupeId | null) => void }) {
  const { t } = useTranslation();
  return (
    <Pilules<"eglise" | GroupeId>
      etiquette={t("groupes.selecteur")}
      obligatoire
      valeur={valeur ?? "eglise"}
      choisir={(v) => choisir(!v || v === "eglise" ? null : v)}
      options={[
        { cle: "eglise", nom: t("groupes.eglise") },
        ...TABLE_GROUPES.map((g) => ({
          cle: g.id, nom: t(`groupes.court.${g.id}`), couleur: categoryColor(g.categorie), pastille: categoryColor(g.categorie),
        })),
      ]}
    />
  );
}
