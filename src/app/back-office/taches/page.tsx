"use client";

// Back-Office › Tâches : le premier pôle de la personne (ordre de TACHE_POLES).
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { tachesDuBackOffice } from "@/lib/access";

export default function TachesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile } = useProfile();
  const premier = tachesDuBackOffice(user, profile)[0];

  useEffect(() => {
    if (premier) router.replace(`/back-office/taches/${premier}`);
  }, [premier, router]);

  return premier ? null : <p className="text-sm text-muted-foreground">{t("taches.aucunPole")}</p>;
}
