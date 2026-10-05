"use client";

// Cours d'Harmonie (docs/spec-cours-harmonie.md) : la liste des chapitres, rangée par niveau
// (l'ordre conseillé du mode d'emploi), numéros gardés ; ordre libre (C1). Coches, compteurs
// et prochain chapitre (C2) ; la progression de l'équipe pour les admins (C4).
//
// Lot U4 bis, B3 (Q6, planches `harmonie-cours-*`) : la même liste sert de volet de gauche en
// grand, de page sur téléphone et de panneau « Sommaire » sur la tablette debout ; le chapitre
// ouvert s'y allume et y déplie ses parties (le sommaire de la leçon n'est plus à droite).

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageTitle } from "@/components/layout/PageTitle";
import { Group, GroupRow } from "@/components/ui/group";
import { canSeeTeamCoursProgres } from "@/lib/access";
import { useAuth } from "@/lib/firebase/auth";
import { getProgresDeLEquipe, type Progres } from "@/lib/firebase/coursProgres";
import { listProfiles } from "@/lib/firebase/users";
import { leconsDansLOrdre } from "@/lib/harmonie/useCours";
import { cn } from "@/lib/utils";
import type { ChapitreResume } from "@/types/cours";

const NIVEAUX = [1, 2, 3, 4] as const;

interface CoursCharge {
  chapitres: ChapitreResume[];
  fini: Progres;
  marquer: (id: string, fait: boolean) => Promise<void>;
}

/** Le cours chargé par le layout (`/harmonie/cours`) : la liste et la leçon partagent les
 *  coches, « J'ai fini » allume aussitôt la ligne à gauche. */
export const ContexteCours = createContext<CoursCharge | null>(null);

export function useCoursCharge(): CoursCharge {
  const c = useContext(ContexteCours);
  if (!c) throw new Error("useCoursCharge hors du layout du cours");
  return c;
}

/** Le chapitre où l'on en est : le premier à finir dans l'ordre conseillé (Q3). */
export function chapitreEnCours(chapitres: ChapitreResume[], fini: Progres): ChapitreResume | undefined {
  const lecons = leconsDansLOrdre(chapitres);
  return lecons.find((c) => !fini[c.id]) ?? lecons[0];
}

/** Les parties d'un chapitre, liens vers ses ancres (`#partie-0`…). */
function PartiesDuChapitre({ parties, surLien, className }: { parties: string[]; surLien?: () => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("harmonie.cours.sommaire")} className={className}>
      <ol data-parties className="ml-[27px] space-y-0.5 border-l-2 border-foreground/80 py-1 pl-5">
        {parties.map((titre, i) => (
          <li key={i}>
            <a href={`#partie-${i}`} onClick={surLien} className="block py-1 text-[14px] text-muted-foreground active:text-foreground">
              {titre}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function LigneChapitre({ chapitre, fini, ouvert, surLien }: { chapitre: ChapitreResume; fini: boolean; ouvert: boolean; surLien?: () => void }) {
  const { t } = useTranslation();
  return (
    <>
      <GroupRow
        href={`/harmonie/cours/${chapitre.id}`}
        chevron={!ouvert}
        actif={ouvert}
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
      {ouvert && chapitre.sousParties.length > 1 && <PartiesDuChapitre parties={chapitre.sousParties} surLien={surLien} />}
    </>
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

/**
 * La liste du cours. `ouvert` : le chapitre affiché à côté (allumé, ses parties dépliées).
 * `enTete` : faux dans le panneau « Sommaire » de la tablette, qui a son propre titre.
 * `surLien` : fermer ce panneau quand on touche une partie du chapitre ouvert.
 */
export function SommaireCours({
  ouvert,
  enTete = true,
  niveauTitre = 1,
  surLien,
}: {
  ouvert?: string;
  enTete?: boolean;
  niveauTitre?: 1 | 2;
  surLien?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { chapitres, fini } = useCoursCharge();

  const modeEmploi = chapitres.find((c) => c.partie === 0);
  const annexes = chapitres.filter((c) => c.partie === 4);
  const lecons = leconsDansLOrdre(chapitres);
  const faits = lecons.filter((c) => fini[c.id]).length;
  const prochain = lecons.find((c) => !fini[c.id]);

  return (
    <div className="space-y-6" data-cours>
      {enTete && (
        <div className="space-y-1">
          <Link href="/harmonie" className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t("harmonie.retour")}
          </Link>
          <PageTitle title={t("harmonie.cours.titre")} niveau={niveauTitre} />
          <p className="-mt-3 text-[15px] text-muted-foreground">{t("harmonie.cours.sousTitre")}</p>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-[15px] font-medium" data-cours-progres>
          {t("harmonie.cours.progres", { fait: faits, total: lecons.length })}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
          <div className="h-full rounded-full bg-[var(--sec-verse)]" style={{ width: `${lecons.length ? (100 * faits) / lecons.length : 0}%` }} />
        </div>
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
          <GroupRow href={`/harmonie/cours/${modeEmploi.id}`} chevron actif={ouvert === modeEmploi.id}>
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
            {liste.map((c) => <LigneChapitre key={c.id} chapitre={c} fini={Boolean(fini[c.id])} ouvert={c.id === ouvert} surLien={surLien} />)}
            {finis === liste.length && (
              <p className="py-2 text-[13px] font-medium text-[var(--sec-verse)]" data-niveau-fini={n}>{t("harmonie.cours.niveauFini")}</p>
            )}
          </Group>
        );
      })}

      {annexes.length > 0 && (
        <Group title={t("harmonie.cours.annexes")}>
          {annexes.map((c) => <LigneChapitre key={c.id} chapitre={c} fini={false} ouvert={c.id === ouvert} surLien={surLien} />)}
        </Group>
      )}

      {enTete && canSeeTeamCoursProgres(user) && lecons.length > 0 && <ProgresDeLEquipe lecons={lecons} />}
    </div>
  );
}

/** Le panneau « Sommaire » de la tablette debout (planche `harmonie-cours-tablette`) : la
 *  liste du cours par-dessus la leçon ; il se ferme sur Échap, sur le fond, sur ✕, et de
 *  lui-même quand on change de chapitre (la page se remonte). */
export function PanneauSommaire({ ouvert, fermer }: { ouvert: string; fermer: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[60] bg-black/25" onClick={fermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("harmonie.cours.sommaire")}
        tabIndex={-1}
        ref={(el) => el?.focus()}
        onKeyDown={(e) => { if (e.key === "Escape") fermer(); }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "raised absolute left-4 top-[calc(var(--nav-h)+7rem)] flex max-h-[calc(100dvh-var(--nav-h)-9rem)] w-[min(384px,calc(100vw-2rem))] flex-col rounded-2xl outline-none",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-[19px] font-bold">{t("harmonie.cours.sommaire")}</h2>
          <button type="button" onClick={fermer} aria-label={t("common.buttons.close")} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground active:bg-secondary">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-5">
          <SommaireCours ouvert={ouvert} enTete={false} surLien={fermer} />
        </div>
      </div>
    </div>
  );
}
