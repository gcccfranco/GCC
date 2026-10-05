"use client";

import { useTranslation } from "react-i18next";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import type { Entree } from "@/types/backOffice";

type Lien = { href: string; cle: string };

/** Les écrans d'aujourd'hui de chaque entrée (table Q3). */
function liensDe(entree: Entree): Lien[] {
  switch (entree) {
    case "taches": return [{ href: "/taches", cle: "common.header.taches" }];
    case "evenements": return [{ href: "/evenements", cle: "common.header.evenements" }, { href: "/evenements/scene", cle: "backOffice.scene" }];
    default: return [];
  }
}

export function EntreeEnAttente({ entree }: { entree: Entree }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">
      <PageTitle title={t(`backOffice.entrees.${entree}`)} />
      {/* Chaque écran d'aujourd'hui garde sa propre garde d'accès. */}
      <Group title={t("backOffice.enAttente")}>
        {liensDe(entree).map(({ href, cle }) => (
          <GroupRow key={href} href={href} chevron>{t(cle)}</GroupRow>
        ))}
      </Group>
    </div>
  );
}
