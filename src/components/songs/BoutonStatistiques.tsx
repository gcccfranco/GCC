"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChartColumn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canVoirStatistiques } from "@/lib/access";
import { useAuth } from "@/lib/firebase/auth";

/** « Statistiques » côté Chants (BO3, docs/spec-back-office-piste-a.md) : dans l'en-tête dès 768 px,
 *  et sur la ligne du compteur au téléphone (lien texte comme « Proposer un chant », icône + libellé, 44 px de haut, chants-5 B) ; sans compte : rien (lot ST, D5). */
export function BoutonStatistiques() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!canVoirStatistiques(user)) return null;
  return (
    <Button asChild size="sm" variant="outline" className="rounded-full max-md:h-11 max-md:border-0 max-md:bg-transparent max-md:px-0 max-md:text-sm max-md:font-semibold max-md:shadow-none max-md:underline-offset-2 max-md:hover:bg-transparent max-md:hover:underline">
      <Link href="/songs/statistiques">
        <ChartColumn aria-hidden />{t("backOffice.entrees.statistiques")}
      </Link>
    </Button>
  );
}
