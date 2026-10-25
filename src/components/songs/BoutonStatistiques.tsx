"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChartColumn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canVoirStatistiques } from "@/lib/access";
import { BACK_OFFICE } from "@/lib/backOffice";
import { useAuth } from "@/lib/firebase/auth";

/** « Statistiques » côté Chants (BO3, docs/spec-back-office-piste-a.md) : dans l'en-tête dès 768 px,
 *  et, plus petit, sur la ligne du compteur (icône seule) ; interrupteur coupé ou sans droit : rien. */
export function BoutonStatistiques({ icone = false }: { icone?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!BACK_OFFICE || !canVoirStatistiques(user)) return null;
  return (
    <Button asChild size="sm" variant="outline" className={icone ? "size-9 rounded-full px-0" : "rounded-full"}>
      <Link href="/back-office/statistiques" aria-label={t("backOffice.entrees.statistiques")}>
        <ChartColumn aria-hidden />{!icone && t("backOffice.entrees.statistiques")}
      </Link>
    </Button>
  );
}
