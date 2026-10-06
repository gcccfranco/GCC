"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, CopyPlus, Plus } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { getSetlistsFrom } from "@/lib/firebase/setlists";
import { loadPlanningData, setlistSeances, type SetlistSeance } from "@/lib/planning/names";
import { lienPreparer, prochainsServicesSansSetlist } from "@/lib/setlist/prochainsServices";
import { categoryColor } from "@/lib/serviceColors";
import { todayIso } from "@/lib/scene/dimanches";

// Entrée de « Nouvelle setlist » (lot U5 bis, docs/spec-editeur-setlist.md,
// Q3) : les prochains services sans setlist d'après le planning, « Préparer »
// ouvre l'éditeur prérempli. « Autre setlist » et « Repartir d'une setlist
// passée » restent toujours là : la création ne dépend jamais du planning.

type Etat = "chargement" | "erreur" | SetlistSeance[];

/** « Dimanche 18 octobre » / « 10月18日星期日 ». */
function jourDuService(iso: string, langue: string): string {
  const texte = new Intl.DateTimeFormat(langue === "zh-CN" ? "zh-CN" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T12:00:00`));
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export function PourQuelService({ categories }: { categories: string[] }) {
  const { t, i18n } = useTranslation();
  const [etat, setEtat] = useState<Etat>("chargement");

  useEffect(() => {
    let annule = false;
    const aujourdhui = todayIso();
    // Seules les setlists à venir servent (4 semaines) : lecture bornée par date, avec de la
    // marge (tous services confondus) ; brouillons et privées sont écartés par
    // `prochainsServicesSansSetlist`. Une lecture refusée lève : sinon les services déjà
    // préparés seraient re-proposés (doublon), le message d'erreur s'affiche.
    Promise.all([loadPlanningData(), getSetlistsFrom(aujourdhui, 200, { strict: true })])
      .then(([planning, setlists]) => {
        if (annule) return;
        setEtat(prochainsServicesSansSetlist(setlistSeances(planning), setlists, categories, aujourdhui));
      })
      .catch(() => {
        if (!annule) setEtat("erreur");
      });
    return () => {
      annule = true;
    };
  }, [categories]);

  const autres = [
    { href: "/setlists/new?autre=1", Icone: Plus, titre: t("setlists.entree.autre"), sous: t("setlists.entree.autreHint") },
    { href: "/setlists/new?depuis=passee", Icone: CopyPlus, titre: t("setlists.entree.passee"), sous: t("setlists.entree.passeeHint") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 pt-3 pb-28 lg:px-8 lg:pt-6">
        <Link
          href="/setlists"
          className="mb-2 inline-flex min-h-11 items-center gap-1 text-[15px] text-muted-foreground hover:text-foreground active:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t("common.header.setlists")}
        </Link>
        <PageTitle title={t("setlists.form.titleNew")} />

        <section aria-labelledby="pour-quel-service" className="mt-5">
          <h2 id="pour-quel-service" className="text-[17px] font-bold text-foreground lg:text-xl">
            {t("setlists.entree.pourQuelService")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("setlists.entree.pourQuelServiceHint")}</p>

          {etat === "chargement" ? (
            <p className="py-8 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : etat === "erreur" ? (
            <p role="status" className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              {t("setlists.entree.planningIllisible")}
            </p>
          ) : etat.length === 0 ? (
            <p role="status" className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              {t("setlists.entree.aucunService")}
            </p>
          ) : (
            <ul aria-labelledby="pour-quel-service" className="mt-3 grid gap-2.5 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
              {etat.map((s) => {
                const couleur = categoryColor(s.category);
                const service = t("categories." + s.category, { defaultValue: s.category });
                const moment = s.moment ? t(s.moment === "soir" ? "setlists.entree.soir" : "setlists.entree.matin") : "";
                const jour = jourDuService(s.date, i18n.language);
                return (
                  <li
                    key={`${s.category}|${s.date}|${s.moment ?? ""}`}
                    className="raised flex items-center gap-3 rounded-xl px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="svc-ink flex items-center gap-1.5 text-[13px] font-bold"
                        style={{ "--svc": couleur } as React.CSSProperties}
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: couleur }} aria-hidden />
                        <span className="truncate">{service}</span>
                      </p>
                      <p className="mt-0.5 text-[17px] font-bold text-foreground">
                        {moment ? `${jour} · ${moment}` : jour}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t("setlists.entree.presidence", {
                          name: s.leader || t("setlists.entree.presidenceADefinir"),
                        })}
                      </p>
                    </div>
                    <Link
                      href={lienPreparer(s)}
                      aria-label={t("setlists.entree.preparerLabel", { service, date: moment ? `${jour} · ${moment}` : jour })}
                      className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[.97]"
                    >
                      {t("setlists.entree.preparer")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ul className="mt-6 grid md:grid-cols-2 md:gap-x-8">
          {autres.map(({ href, Icone, titre, sous }) => (
            <li key={href} className="border-t border-border">
              <Link
                href={href}
                className="flex min-h-14 items-center gap-3 px-0.5 py-3 transition-colors duration-150 active:bg-secondary/70"
              >
                <span className="grid h-9 w-9 shrink-0 place-content-center rounded-[10px] bg-secondary text-foreground" aria-hidden>
                  <Icone className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">{titre}</span>
                  <span className="block text-sm text-muted-foreground">{sous}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
