"use client";

// Cours d'Harmonie, tranche C1 (docs/spec-cours-harmonie.md) : un chapitre, avec son
// sommaire. Le texte est celui du cours de Timothée, en français ; en interface 中文, une
// ligne le dit (C3 traduira, chapitre par chapitre).
//
// Lot U4 bis, B3 (Q6) : en grand, la leçon à droite de la liste du cours, qui porte le
// sommaire de ses parties (pas de second sommaire ici, pas de « Retour ») ; tablette debout :
// « Sommaire » ouvre la liste du cours par-dessus la leçon ; téléphone : comme avant.

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Group, GroupRow } from "@/components/ui/group";
import { Button } from "@/components/ui/button";
import { LecteurCours } from "@/components/harmonie/cours/LecteurCours";
import { SCHEMAS_DU_COURS } from "@/components/harmonie/cours/schemas";
import { PanneauSommaire, useCoursCharge } from "@/components/harmonie/cours/SommaireCours";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { leconsDansLOrdre, useChapitre } from "@/lib/harmonie/useCours";
import { cn } from "@/lib/utils";

export function ChapitreHarmonie({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const deuxVolets = useDeuxVolets();
  const { chapitre, chargement } = useChapitre(id);
  const { chapitres, fini, marquer } = useCoursCharge();
  const [sommaire, setSommaire] = useState(false);

  if (chargement) return null;
  if (!chapitre) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("harmonie.cours.introuvable")}</p>;
  }

  return (
    <div
      className={cn("space-y-6 pb-10", deuxVolets ? "max-w-[860px] px-6 pt-6 xl:px-9" : "mx-auto max-w-2xl px-4 pt-3 md:max-w-3xl md:px-6")}
      data-chapitre={chapitre.id}
    >
      {!deuxVolets && (
        <div className="space-y-4">
          <Link href="/harmonie/cours" className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            {t("harmonie.cours.retour")}
          </Link>
          {/* Tablette debout : la liste du cours par-dessus la leçon (planche `harmonie-cours-tablette`). */}
          <div className="hidden md:block">
            <button
              type="button"
              onClick={() => setSommaire(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-[15px] font-semibold text-background"
            >
              <List className="h-4 w-4" aria-hidden />
              {t("harmonie.cours.sommaire")}
            </button>
          </div>
          {sommaire && <PanneauSommaire ouvert={chapitre.id} fermer={() => setSommaire(false)} />}
        </div>
      )}

      <header>
        <h1 className="text-[22px] font-bold leading-tight lg:text-[28px]">
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

      {/* Téléphone : le sommaire de la leçon en tête ; en grand et sur tablette, il est dans la liste du cours. */}
      {!deuxVolets && chapitre.contenu.length > 1 && (
        <div className="raised rounded-2xl px-4 pt-3 pb-1 md:hidden">
          <p className="text-[13px] font-semibold text-muted-foreground">{t("harmonie.cours.sommaire")}</p>
          <nav aria-label={t("harmonie.cours.sommaire")}>
            <ol className="divide-y divide-border text-[15px]">
              {chapitre.contenu.map((s, i) => (
                <li key={i}>
                  <a href={`#partie-${i}`} className="flex items-center justify-between gap-3 py-2.5 active:text-muted-foreground">
                    <span>{s.titre}</span>
                    <span aria-hidden className="text-muted-foreground/60">↓</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}

      <LecteurCours blocs={chapitre.intro} schemas={SCHEMAS_DU_COURS} />

      {chapitre.contenu.map((s, i) => (
        <section key={i} id={`partie-${i}`} className="scroll-mt-[calc(var(--nav-h)+4rem)] space-y-3" data-sous-partie>
          <h2 className="text-[19px] font-bold leading-snug">{s.titre}</h2>
          <LecteurCours blocs={s.blocs} schemas={SCHEMAS_DU_COURS} />
        </section>
      ))}

      {/* « J'ai fini » (C2) : sous les exercices ; le mode d'emploi et les annexes se lisent sans coche. */}
      {chapitre.niveau !== null && (
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
