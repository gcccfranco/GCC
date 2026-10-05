"use client";

// Back-Office › Évènements › Scène (lot U6, B3 ; U1 Q12) : l'écran de la coordination, tel
// qu'il était dans l'onglet « Scène » de l'App (programmes, saison, ordre de passage). L'App
// garde les réservations des groupes. Règle : programmes/{id} (isCoordination).
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { isCoordination } from "@/lib/access";
import { SceneClient } from "@/app/evenements/scene/SceneClient";

export default function ScenePage() {
  const { t } = useTranslation();
  const { user, profile, loading } = useProfile();
  if (loading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (!isCoordination(user, profile)) return <p className="text-sm text-muted-foreground">{t("backOffice.sceneReserve")}</p>;
  return (
    <Suspense fallback={null}>
      <SceneClient gestion />
    </Suspense>
  );
}
