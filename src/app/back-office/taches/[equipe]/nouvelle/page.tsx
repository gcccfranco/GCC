"use client";

// Nouvelle tâche au Back-Office (agencement v18, B2 ; planche `v18-bo-tache-nouvelle`) : en grand,
// le formulaire est une carte dans le volet de droite (équipe en pilules parmi celles où la personne
// crée, `equipesOuCreer`, EQ8, EQ10) ; créer ouvre la fiche de la tâche, « Annuler » revient à
// l'équipe. En un volet (lien direct), la feuille d'aujourd'hui. Qui ne crée nulle part est ramené à
// la liste de l'équipe.

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TacheForm } from "@/components/taches/TacheForm";
import { useMesTaches } from "@/components/taches/SectionTaches";
import { creerTache, useMembres } from "@/components/taches/creerTache";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { equipesOuCreer } from "@/lib/access";
import { useProfile } from "@/lib/firebase/users";
import type { TacheValues } from "@/lib/firebase/taches";

export default function NouvelleTachePage() {
  const { equipe } = useParams<{ equipe: string }>();
  const router = useRouter();
  const deuxVolets = useDeuxVolets();
  const { user, profile, loading } = useProfile();
  const { reload, racine } = useMesTaches();
  const membres = useMembres(true);
  const ouCreer = equipesOuCreer(user, profile);
  const depart = ouCreer.includes(equipe) ? equipe : ouCreer[0];

  useEffect(() => {
    if (!loading && !depart) router.replace(`${racine}/${equipe}`);
  }, [loading, depart, racine, equipe, router]);

  async function creer(values: TacheValues, e: string) {
    if (!user) return;
    const id = await creerTache(e, values, user.uid);
    await reload(e);
    router.push(`${racine}/${e}/${id}`);
  }

  if (!depart) return null;
  return (
    <TacheForm
      open
      enLigne={deuxVolets}
      equipe={depart}
      equipes={ouCreer}
      initial={null}
      membres={membres}
      onSubmit={creer}
      onClose={() => router.push(`${racine}/${equipe}`)}
    />
  );
}
