"use client";

// Back-Office › Tâches : la première équipe du rail (EQ9 : celles qui ont une tâche, plus celles dont
// on est référent), dans l'ordre de la table. Sans aucun onglet : « Pas encore de tâche pour tes
// équipes. », avec « + Nouvelle tâche » si la personne crée quelque part.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { equipesOuCreer } from "@/lib/access";
import { equipesDuRail } from "@/lib/taches/echeances";
import { BoutonNouveau } from "@/components/layout/BoutonNouveau";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { useMesTaches } from "@/components/taches/SectionTaches";

export default function TachesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, profile } = useProfile();
  const { equipes, items, chargement, racine } = useMesTaches();
  const premiere = equipesDuRail(equipes, items.map((x) => x.tache), profile?.referentDe)[0];
  const ouCreer = equipesOuCreer(user, profile);

  useEffect(() => {
    if (!chargement && premiere) router.replace(`${racine}/${premiere}`);
  }, [chargement, premiere, racine, router]);

  if (chargement || premiere) return null;
  return (
    <>
      <EnTetePage
        titre={t("backOffice.entrees.taches")}
        action={ouCreer.length > 0 && <BoutonNouveau label={t("taches.nouvelle")} href={`${racine}/${ouCreer[0]}/nouvelle`} />}
      />
      <p className="px-[var(--marge-page)] text-sm text-muted-foreground">
        {t(equipes.length === 0 ? "taches.aucuneEquipe" : "taches.aucuneTache")}
      </p>
    </>
  );
}
