"use client";

// Cours d'Harmonie, tranche C1 (docs/spec-cours-harmonie.md) : un chapitre,
// avec son sommaire. Le texte est celui du cours de Timothée, en français ;
// en interface 中文, une ligne le dit (C3 traduira, chapitre par chapitre).

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Group, GroupRow } from "@/components/ui/group";
import { Button } from "@/components/ui/button";
import { LecteurCours } from "@/components/harmonie/cours/LecteurCours";
import { SCHEMAS_DU_COURS } from "@/components/harmonie/cours/schemas";
import { useAccesHarmonie } from "@/lib/harmonie/useHarmonie";
import { leconsDansLOrdre, useChapitre, useCoursIndex, useCoursProgres } from "@/lib/harmonie/useCours";

function Chapitre() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const acces = useAccesHarmonie();
  const { chapitre, chargement } = useChapitre(id);
  const { chapitres } = useCoursIndex();
  const { fini, chargement: progresEnCours, marquer } = useCoursProgres();

  if (acces.chargement || chargement) return null;
  if (!acces.peut) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }
  if (!chapitre) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("harmonie.cours.introuvable")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 pb-10 space-y-6" data-chapitre={chapitre.id}>
      <Link href="/harmonie/cours" className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("harmonie.cours.retour")}
      </Link>

      <header>
        <h1 className="text-[22px] font-bold leading-tight">
          {chapitre.numero !== null && `${chapitre.numero}. `}
          {chapitre.titre}
        </h1>
        {chapitre.niveau !== null && (
          <p className="mt-1 text-[13px] text-muted-foreground">{t(`harmonie.cours.niveau${chapitre.niveau}`)}</p>
        )}
        {i18n.language.startsWith("zh") && (
          <p className="mt-2 rounded-xl bg-card px-3 py-2 text-[13px] text-muted-foreground">{t("harmonie.cours.nonTraduit")}</p>
        )}
      </header>

      {chapitre.contenu.length > 1 && (
        <nav aria-label={t("harmonie.cours.sommaire")}>
          <Group title={t("harmonie.cours.sommaire")}>
            <ol className="space-y-1.5 text-[15px]">
              {chapitre.contenu.map((s, i) => (
                <li key={i}>
                  <a href={`#partie-${i}`} className="underline-offset-4 active:underline">{s.titre}</a>
                </li>
              ))}
            </ol>
          </Group>
        </nav>
      )}

      <LecteurCours blocs={chapitre.intro} schemas={SCHEMAS_DU_COURS} />

      {chapitre.contenu.map((s, i) => (
        <section key={i} id={`partie-${i}`} className="scroll-mt-[calc(var(--nav-h)+4rem)] space-y-3" data-sous-partie>
          <h2 className="text-[19px] font-bold leading-snug">{s.titre}</h2>
          <LecteurCours blocs={s.blocs} schemas={SCHEMAS_DU_COURS} />
        </section>
      ))}

      {/* « J'ai fini » (C2) : sous les exercices ; le mode d'emploi et les annexes se lisent sans coche. */}
      {chapitre.niveau !== null && !progresEnCours && (
        <JaiFini
          date={fini[chapitre.id]}
          marquer={(fait) => marquer(chapitre.id, fait)}
          prochain={leconsDansLOrdre(chapitres).find((c) => c.id !== chapitre.id && !fini[c.id])}
        />
      )}
    </div>
  );
}

function JaiFini({ date, marquer, prochain }: {
  date?: string;
  marquer: (fait: boolean) => void;
  prochain?: { id: string; numero: number | null; titre: string };
}) {
  const { t, i18n } = useTranslation();
  const jour = date && new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" }).format(new Date(date));
  return (
    <div className="space-y-3 border-t border-border pt-5" data-j-ai-fini>
      {date ? (
        <p className="flex flex-wrap items-center gap-x-2 text-[15px]">
          <Check className="h-4 w-4 text-[var(--sec-verse)]" aria-hidden />
          <span>{t("harmonie.cours.finiLe", { date: jour })}</span>
          <span className="text-muted-foreground" aria-hidden>·</span>
          <button type="button" onClick={() => marquer(false)} className="text-muted-foreground underline underline-offset-4">
            {t("harmonie.cours.annuler")}
          </button>
        </p>
      ) : (
        <Button className="w-full" onClick={() => marquer(true)}>{t("harmonie.cours.jaiFini")}</Button>
      )}
      {date && prochain && (
        <Group>
          <GroupRow href={`/harmonie/cours/${prochain.id}`} chevron>
            <span className="block text-[13px] text-muted-foreground">{t("harmonie.cours.prochain")}</span>
            <span className="block truncate font-medium">{prochain.numero}. {prochain.titre}</span>
          </GroupRow>
        </Group>
      )}
    </div>
  );
}

export function ChapitreClient() {
  return (
    <RequireAuth>
      <Chapitre />
    </RequireAuth>
  );
}
