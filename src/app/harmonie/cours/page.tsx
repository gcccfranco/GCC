"use client";

// Cours d'Harmonie (docs/spec-cours-harmonie.md) : la liste des chapitres,
// rangée par niveau (l'ordre conseillé du mode d'emploi), numéros gardés ;
// ordre libre (C1). Coches, compteurs et prochain chapitre (C2) ; la
// progression de l'équipe pour les admins (C4). Accès : celui d'Harmonie.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import { canSeeTeamCoursProgres } from "@/lib/access";
import { useAuth } from "@/lib/firebase/auth";
import { getProgresDeLEquipe, type Progres } from "@/lib/firebase/coursProgres";
import { listProfiles } from "@/lib/firebase/users";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { leconsDansLOrdre, useCoursIndex, useCoursProgres } from "@/lib/harmonie/useCours";
import type { ChapitreResume } from "@/types/cours";

const NIVEAUX = [1, 2, 3, 4] as const;

function LigneChapitre({ chapitre, fini }: { chapitre: ChapitreResume; fini: boolean }) {
  const { t } = useTranslation();
  return (
    <GroupRow
      href={`/harmonie/cours/${chapitre.id}`}
      chevron
      leading={
        fini ? <Check aria-hidden />
          : chapitre.numero !== null ? <span className="text-[13px] font-semibold tabular-nums">{chapitre.numero}</span>
          : undefined
      }
    >
      <span className="block truncate font-medium" data-fini={fini || undefined}>
        {fini && <span className="sr-only">{t("harmonie.cours.fini")} : </span>}
        {fini && chapitre.numero !== null && <span className="tabular-nums">{chapitre.numero}. </span>}
        {chapitre.titre}
      </span>
      {chapitre.niveau !== null && (
        <span className="block truncate text-[13px] text-muted-foreground">
          {t("harmonie.cours.parties", { count: chapitre.sousParties.length })} · {t("harmonie.cours.exercices", { count: chapitre.exercices })}
        </span>
      )}
    </GroupRow>
  );
}

/** C4 : qui a fini quoi, par niveau. Les admins seulement (règles comprises). */
function ProgresDeLEquipe({ lecons }: { lecons: ChapitreResume[] }) {
  const { t } = useTranslation();
  const [lignes, setLignes] = useState<{ nom: string; parNiveau: number[]; total: number }[] | null>(null);

  useEffect(() => {
    let vivant = true;
    Promise.all([getProgresDeLEquipe(), listProfiles()])
      .then(([progres, profils]) => {
        const nom = (uid: string) => {
          const p = profils.find((x) => x.uid === uid);
          return p ? `${p.firstName} ${p.lastName}`.trim() || p.email : uid;
        };
        const compte = (fini: Progres) => ({
          parNiveau: NIVEAUX.map((n) => lecons.filter((c) => c.niveau === n && fini[c.id]).length),
          total: lecons.filter((c) => fini[c.id]).length,
        });
        const suite = Object.entries(progres)
          .map(([uid, fini]) => ({ nom: nom(uid), ...compte(fini) }))
          .filter((l) => l.total > 0)
          .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, "fr"));
        if (vivant) setLignes(suite);
      })
      .catch(() => { if (vivant) setLignes([]); });
    return () => { vivant = false; };
  }, [lecons]);

  if (lignes === null) return null;
  return (
    <Group title={t("harmonie.cours.equipe")}>
      {lignes.length === 0 ? (
        <p className="py-2 text-[15px] text-muted-foreground">{t("harmonie.cours.equipeVide")}</p>
      ) : (
        <div className="overflow-x-auto" data-cours-equipe>
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="text-left text-[13px] text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium" />
                {NIVEAUX.map((n) => <th key={n} className="px-2 py-1.5 text-right font-medium">N{n}</th>)}
                <th className="py-1.5 pl-2 text-right font-medium">{t("harmonie.cours.total")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.nom} className="border-t border-border">
                  <td className="py-2 pr-3">{l.nom}</td>
                  {l.parNiveau.map((x, i) => (
                    <td key={i} className="px-2 py-2 text-right tabular-nums">
                      {x} / {lecons.filter((c) => c.niveau === NIVEAUX[i]).length}
                    </td>
                  ))}
                  <td className="py-2 pl-2 text-right font-semibold tabular-nums">{l.total} / {lecons.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Group>
  );
}

function CoursClient() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const acces = useAccesHarmonie();
  const { chapitres, chargement } = useCoursIndex();
  const { fini, chargement: progresEnCours } = useCoursProgres();

  if (acces.chargement || chargement || progresEnCours) return null;
  if (!acces.peut) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }

  const modeEmploi = chapitres.find((c) => c.partie === 0);
  const annexes = chapitres.filter((c) => c.partie === 4);
  const lecons = leconsDansLOrdre(chapitres);
  const faits = lecons.filter((c) => fini[c.id]).length;
  const prochain = lecons.find((c) => !fini[c.id]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 pb-10 space-y-6" data-cours>
      <Link href="/harmonie" className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("harmonie.retour")}
      </Link>
      <div>
        <PageTitle title={t("harmonie.cours.titre")} />
        <p className="mt-1 text-[15px] text-muted-foreground">{t("harmonie.cours.sousTitre")}</p>
        <p className="mt-1 text-[15px] font-medium" data-cours-progres>
          {t("harmonie.cours.progres", { fait: faits, total: lecons.length })}
        </p>
      </div>

      <Group>
        {prochain ? (
          <GroupRow href={`/harmonie/cours/${prochain.id}`} chevron>
            <span className="block text-[13px] text-muted-foreground">{t("harmonie.cours.prochain")}</span>
            <span className="block truncate font-medium" data-prochain>{prochain.numero}. {prochain.titre}</span>
          </GroupRow>
        ) : (
          <p className="py-2 text-[15px]">{t("harmonie.cours.tousFinis")}</p>
        )}
        {modeEmploi && (
          <GroupRow href={`/harmonie/cours/${modeEmploi.id}`} chevron>
            <span className="font-medium">{t("harmonie.cours.modeEmploi")}</span>
          </GroupRow>
        )}
      </Group>

      {NIVEAUX.map((n) => {
        const liste = lecons.filter((c) => c.niveau === n);
        if (!liste.length) return null;
        const finis = liste.filter((c) => fini[c.id]).length;
        return (
          <Group key={n} title={`${t(`harmonie.cours.niveau${n}`)} · ${finis} / ${liste.length}`}>
            {liste.map((c) => <LigneChapitre key={c.id} chapitre={c} fini={Boolean(fini[c.id])} />)}
            {finis === liste.length && (
              <p className="py-2 text-[13px] font-medium text-[var(--sec-verse)]" data-niveau-fini={n}>{t("harmonie.cours.niveauFini")}</p>
            )}
          </Group>
        );
      })}

      {annexes.length > 0 && (
        <Group title={t("harmonie.cours.annexes")}>
          {annexes.map((c) => <LigneChapitre key={c.id} chapitre={c} fini={false} />)}
        </Group>
      )}

      {canSeeTeamCoursProgres(user) && lecons.length > 0 && <ProgresDeLEquipe lecons={lecons} />}
    </div>
  );
}

export default function CoursPage() {
  return (
    <RequireAuth>
      <CoursClient />
    </RequireAuth>
  );
}
