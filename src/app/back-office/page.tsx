"use client";

// Tableau de bord du Back-Office (lot U6). B4 : les widgets (`TableauDeBord`, qui porte aussi
// le titre et, B5, « Personnaliser »). Sur téléphone et tablette en portrait, la barre du bas
// du Back-Office (B6) mène aux autres entrées ; sur grand écran, la barre latérale.
import { useTranslation } from "react-i18next";
import { useProfile } from "@/lib/firebase/users";
import { TableauDeBord } from "@/components/backOffice/TableauDeBord";

export default function TableauDeBordPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useProfile();
  const jour = new Date().toLocaleDateString(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
  const jourAffiche = jour.charAt(0).toUpperCase() + jour.slice(1);
  const prenom = profile?.firstName?.trim();

  // Toute la zone (agencement v18, B14) : `TableauDeBord` pose l'en-tête commun et la marge de la zone.
  return (
    <TableauDeBord
      titre={t("backOffice.entrees.tableau")}
      sousTitre={prenom ? t("backOffice.bonjour", { jour: jourAffiche, prenom }) : jourAffiche}
    />
  );
}
