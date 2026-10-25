"use client";

import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Impasse } from "@/components/layout/Impasse";
import { useProfile } from "@/lib/firebase/users";

/** « Cette page est réservée aux musiciens » : « Se connecter » pour un visiteur, sinon « Voir les chants ». */
export function ImpasseHarmonie() {
  const { t } = useTranslation();
  const { user } = useProfile();
  const chemin = usePathname() || "/harmonie";
  const sortie = user
    ? { href: "/songs", label: t("common.notFound.cta") }
    : { href: `/login?from=${chemin}`, label: t("mesServices.login") };
  return <Impasse icone={Lock} titre={t("common.noAccess")} aide={user ? t("common.noAccessAide") : undefined} sortie={sortie} />;
}
