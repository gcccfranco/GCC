"use client";

// Cours d'Harmonie (docs/spec-cours-harmonie.md), lot U4 bis, B3 (Q6) : la liste du cours dans
// le layout de `/harmonie/cours` (`DeuxVolets`), la leçon en page. En grand : le sommaire du
// cours à gauche, la leçon à droite ; sans leçon choisie, le chapitre où l'on en est (Q3).
// Accès : celui d'Harmonie, vérifié une fois ici.

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DeuxVolets } from "@/components/layout/DeuxVolets";
import { ChapitreHarmonie } from "@/components/harmonie/cours/ChapitreHarmonie";
import { ContexteCours, SommaireCours, chapitreEnCours } from "@/components/harmonie/cours/SommaireCours";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { useCoursIndex, useCoursProgres } from "@/lib/harmonie/useCours";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Le chapitre de l'adresse (`/harmonie/cours/les-cadences`), ou rien sur la liste. */
function chapitreDeLAdresse(chemin: string): string | undefined {
  const m = chemin.match(/^\/harmonie\/cours\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function CoursHarmonie({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const acces = useAccesHarmonie();
  const deuxVolets = useDeuxVolets();
  const chemin = usePathname() ?? "/harmonie/cours";
  const { chapitres, chargement } = useCoursIndex();
  const { fini, chargement: progresEnCours, marquer } = useCoursProgres();
  const valeur = useMemo(() => ({ chapitres, fini, marquer }), [chapitres, fini, marquer]);

  if (acces.chargement || chargement || progresEnCours) return null;
  if (!acces.peut) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }

  const enCours = chapitreEnCours(chapitres, fini);
  const ouvert = chapitreDeLAdresse(chemin) ?? (deuxVolets ? enCours?.id : undefined);

  return (
    <ContexteCours.Provider value={valeur}>
      <DeuxVolets
        racine="/harmonie/cours"
        liste={
          <div className={cn(deuxVolets ? "px-5 pt-4 pb-10" : "mx-auto max-w-2xl px-4 pt-3 pb-10")}>
            <SommaireCours ouvert={ouvert} niveauTitre={deuxVolets ? 2 : 1} />
          </div>
        }
        premier={enCours ? <ChapitreHarmonie id={enCours.id} /> : null}
      >
        {children}
      </DeuxVolets>
    </ContexteCours.Provider>
  );
}
