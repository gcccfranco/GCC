"use client";

// « À faire » (piste A, BO-B, BO6) : l'entrée du Back-Office, qui remplace le tableau de bord. L'en-tête commun
// et la marge de la zone sont posés par `AFaire`.
import { useTranslation } from "react-i18next";
import { AFaire } from "@/components/backOffice/aFaire/AFaire";

export default function AFairePage() {
  const { t } = useTranslation();
  return <AFaire titre={t("backOffice.entrees.afaire")} />;
}
