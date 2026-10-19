"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { BACK_OFFICE } from "@/lib/backOffice";
import { useTranslation } from "react-i18next";
import {
  Music,
  SlidersHorizontal,
  Pencil,
  ListMusic,
  ListPlus,
  CalendarDays,
  CalendarClock,
  Ticket,
  FileMusic,
  PenLine,
  ListChecks,
  UserRound,
  Bell,
  AlertCircle,
  ShieldCheck,
  UserCog,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Halo } from "@/components/layout/Halo";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { useDisposition } from "@/hooks/useDisposition";
import { GuideFigure } from "@/components/guide/GuideFigure";
import { FIGURES } from "@/lib/guide/figures";
import { dernierJourDuSheet } from "@/lib/evenements/bascule";

// Les ancres (#songs, #setlists, #planning, #evenements…) sont visées par les
// liens « Comment ça marche ? » des pages (lot 8).
const TOUTES_LES_SECTIONS = [
  { key: "songs", Icon: Music },
  { key: "customize", Icon: SlidersHorizontal },
  { key: "performance", Icon: Pencil },
  { key: "setlists", Icon: ListMusic },
  { key: "partitions", Icon: FileMusic },
  { key: "maVersion", Icon: PenLine },
  { key: "compose", Icon: ListPlus },
  { key: "planning", Icon: CalendarDays },
  { key: "evenements", Icon: Ticket },
  { key: "scene", Icon: CalendarClock },
  { key: "harmonie", Icon: Sparkles },
  { key: "taches", Icon: ListChecks },
  { key: "notifications", Icon: Bell },
  { key: "report", Icon: AlertCircle },
  { key: "roles", Icon: ShieldCheck },
  { key: "moi", Icon: UserRound },
  { key: "account", Icon: UserCog },
] as const;

// Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : le guide ne décrit pas
// des sections qui ne sont pas en ligne.
const COUPEES: readonly string[] = ["evenements", "scene", "taches"];
const SECTIONS = TOUTES_LES_SECTIONS.filter((s) => BACK_OFFICE || !COUPEES.includes(s.key));

/** Rend un texte en mettant en gras les termes entre **doubles astérisques**. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

/** La partie lue : la dernière dont le haut est passé sous la barre (120 px du haut de l'écran) ;
 *  au bas de la page, la dernière, que le défilement ne peut pas monter jusque-là. */
function usePartieLue(cles: readonly string[], actif: boolean) {
  const [lue, setLue] = useState<string>(cles[0]);
  const lire = useCallback(() => {
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2 && window.scrollY > 0) {
      setLue(cles[cles.length - 1]);
      return;
    }
    let courante = cles[0];
    for (const cle of cles) {
      const el = document.getElementById(cle);
      if (el && el.getBoundingClientRect().top <= 120) courante = cle;
    }
    setLue(courante);
  }, [cles]);
  useEffect(() => {
    if (!actif) return;
    const premier = requestAnimationFrame(lire);
    window.addEventListener("scroll", lire, { passive: true });
    return () => {
      cancelAnimationFrame(premier);
      window.removeEventListener("scroll", lire);
    };
  }, [actif, lire]);
  return [lue, setLue] as const;
}

const CLES = SECTIONS.map((s) => s.key);

export default function GuidePage() {
  const { t } = useTranslation();
  // Lot U4 bis, B6 (docs/spec-pages-en-grand.md, Q11 ; planches `guide-*`) : en grand, le
  // sommaire collant à gauche (260 px depuis la v18, R14) et la lecture à 720 px ; tablette portrait, le sommaire
  // sur deux colonnes en tête ; téléphone, une ligne par partie, en tête.
  const disposition = useDisposition();
  const grand = disposition === "grand";
  const [lue, setLue] = usePartieLue(CLES, disposition !== "telephone");

  const sommaire = (
    <nav
      aria-label={t("guide.tocTitle")}
      className={
        grand
          ? "sticky top-[calc(var(--nav-h)+24px)] max-h-[calc(100dvh-var(--nav-h)-48px)] self-start overflow-y-auto"
          : "raised rounded-2xl p-3"
      }
    >
      <p className={`text-sm font-semibold text-muted-foreground ${grand ? "mb-1.5 px-2.5" : "mb-1 px-2"}`}>
        {t("guide.tocTitle")}
      </p>
      <ul
        className={
          disposition === "tablette"
            ? "grid grid-cols-2 gap-x-4 gap-y-0.5"
            : grand
              ? "flex flex-col gap-0.5"
              : "flex flex-col divide-y divide-border"
        }
      >
        {SECTIONS.map(({ key, Icon }) => {
          const allume = disposition !== "telephone" && lue === key;
          return (
            <li key={key}>
              <a
                href={`#${key}`}
                aria-current={allume ? "location" : undefined}
                onClick={() => setLue(key)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                  disposition === "telephone" ? "min-h-11 py-2.5 text-[15px]" : "py-1.5"
                } ${
                  allume
                    ? "bg-foreground text-background"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${allume ? "" : "text-muted-foreground"}`} />
                {t(`guide.sections.${key}.title`)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <RequireAuth>
      <div className="relative min-h-screen">
        <Halo variant="moi" color="hsl(var(--foreground))" />
        {/* A14 (agencement v18) : l'en-tête commun, « ‹ Moi », sans icône ; en grand, la lecture (R14) :
            sommaire de 260 px collant à gauche, colonne de 720 px, calés sur le titre. */}
        <div className="relative pb-16">
          <EnTetePage retour={{ href: "/moi", label: t("moi.title") }} titre={t("guide.title")} sousTitre={t("guide.subtitle")} />
          <div
            className={
              grand
                ? "grid grid-cols-[260px_minmax(0,720px)] gap-x-10 px-[var(--marge-page)]"
                : "max-w-[calc(720px+2*var(--marge-page))] space-y-6 px-[var(--marge-page)]"
            }
          >
            {sommaire}

            {/* Sections */}
            <div className="min-w-0 space-y-5">
              {SECTIONS.map(({ key, Icon }) => {
                const points = t(`guide.sections.${key}.points`, {
                  returnObjects: true,
                  defaultValue: [],
                  // U9 (Q7 c) : « Où créer un évènement » cite le dernier jour du Sheet.
                  jour: dernierJourDuSheet(),
                }) as unknown as string[];
                const tip = t(`guide.sections.${key}.tip`, { defaultValue: "" });
                const forWhom = t(`guide.sections.${key}.for`, { defaultValue: "" });

                return (
                  <section
                    key={key}
                    id={key}
                    className="raised scroll-mt-[calc(var(--nav-h)+16px)] space-y-3 rounded-2xl p-4 md:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                        <Icon className="h-5 w-5 shrink-0 text-foreground" />
                        {t(`guide.sections.${key}.title`)}
                      </h2>
                      {forWhom && (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {forWhom}
                        </span>
                      )}
                    </div>

                    <p className="text-[15px] leading-relaxed text-muted-foreground">
                      <RichText text={t(`guide.sections.${key}.body`)} />
                    </p>

                    {(FIGURES[key] ?? []).map((figure) => (
                      <GuideFigure key={figure.id} figure={figure} />
                    ))}

                    {points.length > 0 && (
                      <ul className="space-y-1.5">
                        {points.map((point, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-[15px] leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span>
                              <RichText text={point} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {tip && (
                      <div className="flex gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>
                          <RichText text={tip} />
                        </span>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
