"use client";

import { Fragment, useCallback, useEffect, useId, useState } from "react";
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
  List,
  ChevronDown,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { useDisposition } from "@/hooks/useDisposition";
import { ouvrirVisite } from "@/components/onboarding/Accueil";
import { useProfile } from "@/lib/firebase/users";
import { cartesDeLaVisite } from "@/lib/onboarding/visite";
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
  const { user, profile, loading } = useProfile();
  // Visite par rôle (docs/spec-visite-par-role.md, VR9) : « Pour toi, en N cartes ».
  const nCartes = cartesDeLaVisite(user, profile, BACK_OFFICE).length;
  // Lot U4 bis, B6 (docs/spec-pages-en-grand.md, Q11 ; planches `guide-*`) : en grand, le
  // sommaire collant à gauche (260 px depuis la v18, R14) et la lecture à 720 px ; tablette portrait, le sommaire
  // sur deux colonnes en tête ; téléphone, une ligne par partie, en tête.
  const disposition = useDisposition();
  const grand = disposition === "grand";
  const [lue, setLue] = usePartieLue(CLES, disposition !== "telephone");
  // Téléphone : le sommaire est replié sur une ligne (eglise-18), la liste s'ouvre au toucher.
  const telephone = disposition === "telephone";
  const [ouvert, setOuvert] = useState(false);
  const idListe = useId();

  const liste = (
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
                onClick={() => {
                  setLue(key);
                  if (telephone) setOuvert(false);
                }}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                  disposition === "telephone" ? "min-h-11 py-2.5 text-base" : "py-1.5"
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
  );

  const sommaire = (
    <nav
      aria-label={t("guide.tocTitle")}
      className={
        grand
          ? "sticky top-[calc(var(--nav-h)+24px)] max-h-[calc(100dvh-var(--nav-h)-48px)] self-start overflow-y-auto"
          : telephone
            ? "bloc-info rounded-2xl"
            : "bloc-info rounded-2xl p-3"
      }
    >
      {telephone ? (
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls={idListe}
          onClick={() => setOuvert((o) => !o)}
          className="flex h-[52px] w-full items-center gap-2.5 rounded-2xl px-4 text-left text-base font-semibold text-foreground"
        >
          <List className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{t("guide.tocReplie", { count: SECTIONS.length })}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 [transition-timing-function:cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none ${ouvert ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      ) : (
        <p className={`text-sm font-semibold text-muted-foreground ${grand ? "mb-1.5 px-2.5" : "mb-1 px-2"}`}>
          {t("guide.tocTitle")}
        </p>
      )}
      {telephone ? (
        // Hauteur et opacité sans rebond (réponse 0,3 s) ; sous `prefers-reduced-motion`, un simple fondu de 150 ms.
        <div
          id={idListe}
          inert={!ouvert}
          className={`grid transition-[grid-template-rows,opacity] duration-300 [transition-timing-function:cubic-bezier(.32,.72,0,1)] motion-reduce:transition-opacity motion-reduce:duration-150 ${
            ouvert ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3">{liste}</div>
          </div>
        </div>
      ) : (
        liste
      )}
    </nav>
  );

  return (
    <RequireAuth>
      <div className="relative min-h-screen">
        {/* A14 (agencement v18) : l'en-tête commun, « ‹ Moi », sans icône ; en grand, la lecture (R14) :
            sommaire de 260 px collant à gauche, colonne de 720 px, calés sur le titre. */}
        <div className="relative pb-16">
          <EnTetePage fond="blanc" retour={{ href: "/moi", label: t("moi.title") }} titre={t("guide.title")} sousTitre={t("guide.subtitle")} />
          <div
            className={
              grand
                ? "grid grid-cols-[260px_minmax(0,720px)] gap-x-10 px-[var(--marge-page)]"
                : "max-w-[calc(720px+2*var(--marge-page))] space-y-6 px-[var(--marge-page)]"
            }
          >
            {/* eglise-7 : la bande « Pour toi » est la première rangée de la grille, sur toute sa largeur
                (ses bords tombent sur ceux du sommaire et de la colonne de lecture). */}
            {user && !loading && (
              <div data-testid="bande-pour-toi" className={`col-span-full flex items-center justify-between gap-3 rounded-2xl bg-secondary px-4 py-3 ${grand ? "mb-6" : ""}`}>
                <p className="min-w-0 text-base font-semibold text-foreground">{t("accueil.pourToi", { count: nCartes })}</p>
                <button
                  type="button"
                  onClick={ouvrirVisite}
                  className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform duration-150 active:scale-[.98]"
                >
                  {t("accueil.revoir")}
                </button>
              </div>
            )}
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
                    className="bloc-info scroll-mt-[calc(var(--nav-h)+16px)] space-y-3 rounded-2xl p-4 md:p-5"
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

                    <p className="text-base leading-relaxed text-muted-foreground">
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
                            className="flex gap-2 text-base leading-relaxed text-muted-foreground"
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
                      <div className="flex gap-2 rounded-lg bg-background px-3 py-2 text-base leading-relaxed text-foreground/80">
                        <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>
                          <RichText text={tip} />
                        </span>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
            <p className="col-span-full mt-2 text-sm text-muted-foreground">{t("guide.compteUsage")}</p>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
