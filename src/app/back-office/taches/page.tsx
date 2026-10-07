"use client";

// Back-Office › Tâches : le premier pôle de la personne (ordre de TACHE_POLES).
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { tachesDuBackOffice } from "@/lib/access";
import { EnTetePage } from "@/components/layout/EnTetePage";

export default function TachesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile } = useProfile();
  const premier = tachesDuBackOffice(user, profile)[0];

  useEffect(() => {
    if (premier) router.replace(`/back-office/taches/${premier}`);
  }, [premier, router]);

  if (premier) return null;
  return (
    <>
      <EnTetePage titre={t("backOffice.entrees.taches")} />
      <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("taches.aucunPole")}</p>
    </>
  );
}
