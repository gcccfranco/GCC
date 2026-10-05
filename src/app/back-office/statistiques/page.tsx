"use client";

// Lot U7 (docs/spec-statistiques.md), S2 : l'adresse de la page Statistiques et son droit.
// Interrupteur coupé : 404, et sans compte ou sans droit de responsable : « Réservé aux
// responsables » + « Se connecter », par la garde de l'espace (back-office/layout.tsx).
// Ici, un responsable non admin lit le message de /admin (Q2). Français seul (Q14).
// Les vues, filtres et tableau arrivent avec S3 et S4, sous le titre.
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { canVoirStatistiques } from "@/lib/access";
import { PageTitle } from "@/components/layout/PageTitle";

export default function StatistiquesPage() {
  // `useAuth` n'est pas partagé : sa première lecture rend `null`, ne pas l'afficher comme un refus.
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!canVoirStatistiques(user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Page réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    // Pleine largeur, comme la planche bo-statistiques et le tableau de bord.
    <div className="px-4 pt-6 pb-10 space-y-6 sm:px-6 lg:px-8">
      <PageTitle title="Chants les plus joués" subtitle="Visible par les admins seulement" />
    </div>
  );
}
