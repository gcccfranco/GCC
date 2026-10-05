"use client";

import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import type { Entree } from "@/types/backOffice";

type Lien = { href: string; cle: string };

/** Les écrans d'aujourd'hui de chaque entrée (table Q3), selon les droits. */
function liensDe(entree: Entree, admin: boolean, notify: boolean): Lien[] {
  const administration: Lien[] = admin ? [{ href: "/admin", cle: "backOffice.administration" }] : [];
  switch (entree) {
    case "planning": return [{ href: "/planning", cle: "common.header.planning" }, ...administration];
    case "taches": return [{ href: "/taches", cle: "common.header.taches" }];
    case "evenements": return [{ href: "/evenements", cle: "common.header.evenements" }, { href: "/evenements/scene", cle: "backOffice.scene" }];
    case "equipes": return [{ href: "/equipes", cle: "backOffice.entrees.equipes" }, ...administration];
    case "messages": return [...(admin || notify ? [{ href: "/notifier", cle: "common.header.notify" }] : []), ...administration];
    default: return [];
  }
}

export function EntreeEnAttente({ entree }: { entree: Entree }) {
  const { t } = useTranslation();
  const { user, profile } = useProfile();

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-6">
      <PageTitle title={t(`backOffice.entrees.${entree}`)} />
      {/* Chaque écran d'aujourd'hui garde sa propre garde d'accès. */}
      <Group title={t("backOffice.enAttente")}>
        {liensDe(entree, isAdminUser(user), (profile?.notify?.length ?? 0) > 0).map(({ href, cle }) => (
          <GroupRow key={href} href={href} chevron>{t(cle)}</GroupRow>
        ))}
      </Group>
    </div>
  );
}
