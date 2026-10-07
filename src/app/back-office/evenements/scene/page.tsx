"use client";

// Back-Office › Évènements › Pâques · Noël (docs/spec-scene-paques-noel.md, P7, Q9) : l'ancienne
// adresse de la scène mène à la fête dont l'édition a le jour J le plus proche. Réservé à la
// coordination (programmes/{id} : isCoordination).
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isCoordination } from "@/lib/access";
import { VersLaFete } from "@/app/evenements/scene/VersLaFete";

export default function ScenePage() {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  if (loading) return <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!isCoordination(user, profile)) return <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("backOffice.sceneReserve")}</p>;
  return (
    <Suspense fallback={null}>
      <VersLaFete base="/back-office/evenements/scene" />
    </Suspense>
  );
}
