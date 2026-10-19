"use client";

// Lot U7 (docs/spec-statistiques.md), S2 : l'adresse de la page Statistiques et son droit.
// Interrupteur coupé : 404, et sans compte ou sans droit de responsable : « Réservé aux
// responsables » + « Se connecter », par la garde de l'espace (back-office/layout.tsx).
// Ici, un responsable non admin lit le message de /admin (Q2). Français seul (Q14).
// S3, S4 : le titre, le sélecteur des trois vues et leur contenu (StatistiquesClient) ; en-tête v18.
import { ShieldCheck } from "lucide-react";
import { useProfile } from "@/lib/firebase/users";
import { canVoirStatistiques } from "@/lib/access";
import { StatistiquesClient } from "./StatistiquesClient";

export default function StatistiquesPage() {
  // Le profil porte Bêta (admin) : on attend sa lecture avant d'afficher un refus.
  const { user, profile, loading } = useProfile();

  if (loading) return null;
  if (!canVoirStatistiques(user, profile)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Page réservée aux administrateurs.</p>
      </div>
    );
  }

  // Toute la zone (agencement v18, B13) : `StatistiquesClient` pose l'en-tête commun et la marge.
  return <StatistiquesClient />;
}
