"use client";

// Lot U7 (docs/spec-statistiques.md), S2 : l'adresse de la page Statistiques et son droit.
// Interrupteur coupé : 404, et sans compte ou sans droit de responsable : « Réservé aux
// responsables » + « Se connecter », par la garde de l'espace (back-office/layout.tsx).
// Ici, un responsable non admin lit le message de /admin (Q2), dans la langue choisie (B5).
// S3, S4 : le titre, le sélecteur des trois vues et leur contenu (StatistiquesClient) ; en-tête v18.
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/firebase/auth";
import { canVoirStatistiques } from "@/lib/access";
import { StatistiquesClient } from "./StatistiquesClient";

export default function StatistiquesPage() {
  // `useAuth` n'est pas partagé : sa première lecture rend `null`, ne pas l'afficher comme un refus.
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) return null;
  if (!canVoirStatistiques(user)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("backOffice.adminReserve")}</p>
      </div>
    );
  }

  // Toute la zone (agencement v18, B13) : `StatistiquesClient` pose l'en-tête commun et la marge.
  return <StatistiquesClient />;
}
