"use client";

// Back-Office › une tâche d'une équipe (lot 7, docs/spec-taches.md ; piste A, BO7). La liste des tâches
// d'une équipe est devenue la page de l'équipe (`/back-office/equipes/<équipe>`) ; ce gabarit garde la
// fiche (`[id]`) et le formulaire (`nouvelle`) à leur adresse, en une colonne sous un en-tête qui
// ramène à l'équipe (« ‹ TEAM DA »). En un volet, la fiche pose son propre en-tête. Réservé aux membres
// de l'équipe (Louange élargi) et aux admins (affichage ; equipes/{équipe}/taches garde sa règle).

import { useParams, usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { useMesTaches } from "@/components/taches/SectionTaches";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { cleNomEquipe } from "@/lib/equipes/table";

export default function EquipeLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { equipe: brut } = useParams<{ equipe: string }>();
  const chemin = usePathname() ?? "";
  const deuxVolets = useDeuxVolets();
  const { equipes, chargement } = useMesTaches();
  const equipe = equipes.includes(brut) ? brut : null;
  const nouvelle = chemin.replace(/\/+$/, "").endsWith("/nouvelle");

  // En un volet, la fiche est une page qui pose son propre en-tête ; le formulaire n'en a pas.
  const enTete = (deuxVolets || nouvelle || !equipe) && (
    <EnTetePage
      retour={{ href: `/back-office/equipes/${encodeURIComponent(brut)}`, label: t(cleNomEquipe(brut, true)) }}
      titre={t("backOffice.entrees.taches")}
    />
  );

  if (!equipe) {
    return (
      <>
        {enTete}
        {!chargement && <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("taches.pasMembre")}</p>}
      </>
    );
  }
  return (
    <div className="pb-16">
      {enTete}
      {/* La fiche en un volet pose sa propre marge avec son en-tête. */}
      <div className={deuxVolets || nouvelle ? "max-w-[720px] px-[var(--marge-page)]" : "max-w-[720px]"}>{children}</div>
    </div>
  );
}
