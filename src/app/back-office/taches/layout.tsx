"use client";

// Back-Office › Tâches (lot U6, B3, table Q2) : un onglet par pôle de la personne (Louange
// compris ; tous pour un admin), la page d'un pôle dessous. Dans l'App, `/taches` garde
// « À faire pour moi » (question 3). Le menu règle l'affichage seulement : poles/{pôle}/taches
// garde sa règle (isTachePole).
// Agencement v18 (B1, docs/spec-agencement-v18.md) : les tâches de tous les pôles de la personne
// se lisent une fois ici, pour le compte du rail et pour la fiche (`FicheTache`, la même que dans
// l'App) ; l'en-tête et les deux volets sont posés par `[pole]/layout.tsx`. Les pages lisent
// `?date=` : Suspense pour le rendu statique.
import { Suspense, useMemo } from "react";
import { useProfile } from "@/lib/firebase/users";
import { tachesDuBackOffice } from "@/lib/access";
import { useTaches } from "@/lib/taches/useTaches";
import { todayIso } from "@/lib/scene/dimanches";
import { FournirTaches } from "@/components/taches/SectionTaches";

function Taches({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useProfile();
  const poles = useMemo(() => tachesDuBackOffice(user, profile), [user, profile]);
  const { items, loading: chargement, reload } = useTaches(loading ? [] : poles);
  const parNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user?.email ?? "";
  const valeur = { poles, items, chargement, reload, aujourdhui: todayIso(), parNom, racine: "/back-office/taches", backOffice: true };
  return <FournirTaches value={valeur}>{children}</FournirTaches>;
}

export default function TachesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Taches>{children}</Taches>
    </Suspense>
  );
}
