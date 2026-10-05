"use client";

// Back-Office › Planning : le premier planning de la personne (ordre des onglets).
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { planningsDuBackOffice } from "@/lib/access";

export default function PlanningsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile } = useProfile();
  const premier = planningsDuBackOffice(user, profile)[0];

  useEffect(() => {
    if (premier) router.replace(`/back-office/planning/${premier}`);
  }, [premier, router]);

  return premier ? null : <p className="text-sm text-muted-foreground">{t("backOffice.planningReserve")}</p>;
}
