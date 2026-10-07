"use client";

// Nouvelle tâche au Back-Office (agencement v18, B2 ; planche `v18-bo-tache-nouvelle`) : en grand,
// le formulaire est une carte dans le volet de droite (pôle en pilules parmi ceux de la personne) ;
// créer ouvre la fiche de la tâche, « Annuler » revient au pôle. En un volet (lien direct), la
// feuille d'aujourd'hui.

import { useParams, useRouter } from "next/navigation";
import { TacheForm } from "@/components/taches/TacheForm";
import { useMesTaches } from "@/components/taches/SectionTaches";
import { creerTache, useMembres } from "@/components/taches/creerTache";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useProfile } from "@/lib/firebase/users";
import type { TacheValues } from "@/lib/firebase/taches";
import type { TachePole } from "@/types/tache";

export default function NouvelleTachePage() {
  const { pole } = useParams<{ pole: TachePole }>();
  const router = useRouter();
  const deuxVolets = useDeuxVolets();
  const { user } = useProfile();
  const { poles, reload, racine } = useMesTaches();
  const membres = useMembres(true);

  async function creer(values: TacheValues, p: TachePole) {
    if (!user) return;
    const id = await creerTache(p, values, user.uid);
    await reload(p);
    router.push(`${racine}/${p}/${id}`);
  }

  return (
    <TacheForm
      open
      enLigne={deuxVolets}
      pole={pole}
      poles={poles}
      initial={null}
      membres={membres}
      onSubmit={creer}
      onClose={() => router.push(`${racine}/${pole}`)}
    />
  );
}
