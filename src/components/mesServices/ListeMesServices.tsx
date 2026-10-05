"use client";

// La liste de Mes services (lot U4 bis, B4, Q7 ; planches `mes-services-*`) : titre, « N à
// venir », À venir · Passés, puis les services par mois. Toucher une ligne ouvre le service
// (`/mes-services/[date]`) ; le lien « Setlist » mène toujours à la setlist. En grand : des
// lignes, celle du service ouvert en encre. Tablette portrait : une carte par service, sur
// deux colonnes. Téléphone : les lignes d'un mois dans une carte, avec un chevron.

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, Clock, ListMusic, MapPin } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { PushPrompt } from "@/components/push/PushPrompt";
import { Tile } from "@/components/ui/tile";
import { useDisposition } from "@/hooks/useDisposition";
import type { FSSetlist } from "@/lib/firebase/setlists";
import { MOIS } from "@/lib/planning/utils";
import { joursAvant } from "@/lib/planning/accueil";
import { adresseDuService, cleDuService, type ServiceGroupe } from "@/lib/planning/mesServices";
import { serviceColor } from "@/lib/serviceColors";
import { cn } from "@/lib/utils";

export type Onglet = "upcoming" | "past";

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR");

/** « mer. 15 juil. » / « 7月15日 周三 » selon la langue. */
function jourCourt(date: string, lang: string): string {
  const jour = new Date(`${date}T12:00:00`).toLocaleDateString(locale(lang), { weekday: "short", day: "numeric", month: "short" });
  // « Dim. 4 oct. » : la majuscule au jour seulement (`capitalize` en mettait une au mois).
  return jour.charAt(0).toUpperCase() + jour.slice(1);
}

/** Regroupe par mois (« Juin 2026 » / « 2026年6月 ») en conservant l'ordre. */
function parMois(entries: ServiceGroupe[], lang: string): { label: string; items: ServiceGroupe[] }[] {
  const out: { label: string; items: ServiceGroupe[] }[] = [];
  for (const e of entries) {
    const [y, m] = e.date.split("-").map(Number);
    const label = lang === "zh-CN" ? `${y}年${m}月` : `${MOIS[m - 1]} ${y}`;
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(e);
    else out.push({ label, items: [e] });
  }
  return out;
}

export function ListeMesServices({
  services, affiches, charge, onglet, setOnglet, nom, aujourdhui, actif, setlistDe, aDroite,
}: {
  services: ServiceGroupe[];
  affiches: ServiceGroupe[];
  charge: boolean;
  onglet: Onglet;
  setOnglet: (o: Onglet) => void;
  nom: string;
  aujourdhui: string;
  /** Clé du service ouvert à droite (en grand). */
  actif?: string;
  setlistDe?: (s: ServiceGroupe) => FSSetlist | undefined;
  /** Un service est ouvert à droite (il porte le h1) ; sinon le titre de la liste le porte. */
  aDroite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const disposition = useDisposition();
  const aVenir = services.filter((e) => e.date >= aujourdhui).length;
  const mois = parMois(affiches, i18n.language);

  return (
    <div className={cn("space-y-4 pb-10", disposition === "grand" ? "px-5 pt-6" : "mx-auto max-w-2xl px-4 pt-6 md:max-w-3xl md:px-6")}>
      <PageTitle
        niveau={disposition === "grand" && aDroite ? 2 : 1}
        title={t("mesServices.title")}
        subtitle={t("mesServices.subtitle", { name: nom })}
        action={aVenir > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-foreground">
            {t("mesServices.upcomingCount", { count: aVenir })}
          </span>
        )}
      />

      <PushPrompt />

      {/* Onglets À venir / Passés */}
      <div className={cn("flex rounded-lg bg-secondary p-0.5 gap-0.5 text-sm", disposition === "tablette" && "max-w-sm")}>
        {(["upcoming", "past"] as Onglet[]).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`flex-1 px-3 py-2 rounded-md font-semibold transition-colors ${
              onglet === o ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o === "upcoming" ? t("mesServices.tabUpcoming") : t("mesServices.tabPast")}
          </button>
        ))}
      </div>

      {!charge ? (
        <p className="text-sm text-muted-foreground text-center py-16">{t("mesServices.loading")}</p>
      ) : affiches.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl space-y-1">
          <p className="text-sm text-muted-foreground">
            {onglet === "upcoming" ? t("mesServices.emptyUpcoming") : t("mesServices.emptyPast")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {mois.map((m) => (
            <div key={m.label}>
              <p className={cn("text-sm font-semibold text-muted-foreground mb-1.5 capitalize", disposition !== "tablette" && "px-1")}>{m.label}</p>
              <ul className={cn(
                disposition === "tablette" && "grid grid-cols-2 gap-3",
                disposition === "telephone" && "raised rounded-2xl",
              )}>
                {m.items.map((e) => (
                  <LigneService
                    key={cleDuService(e)}
                    e={e}
                    href={adresseDuService(e, services)}
                    setlistId={setlistDe?.(e)?.id}
                    jours={onglet === "upcoming" ? joursAvant(e.date, aujourdhui) : -1}
                    actif={disposition === "grand" && actif === cleDuService(e)}
                    carte={disposition === "tablette"}
                    chevron={disposition === "telephone"}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LigneService({ e, href, setlistId, jours, actif, carte, chevron }: {
  e: ServiceGroupe;
  href: string;
  setlistId?: string;
  jours: number;
  actif: boolean;
  carte: boolean;
  chevron: boolean;
}) {
  const { t, i18n } = useTranslation();
  const color = serviceColor(e.service);
  const jour = new Date(`${e.date}T12:00:00`);
  const moisCourt = new Intl.DateTimeFormat(locale(i18n.language), { month: "short" }).format(jour);
  const date = jourCourt(e.date, i18n.language);
  return (
    <li
      data-testid={carte ? "carte-service" : undefined}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3",
        carte ? "raised rounded-2xl" : "group-row",
        actif && "rounded-xl bg-foreground text-background [&_.text-muted-foreground]:text-background/70",
      )}
    >
      {/* Toute la ligne ouvre le service ; le lien « Setlist » passe au-dessus. */}
      <Link
        href={href}
        aria-label={`${e.service}, ${date}`}
        aria-current={actif ? "page" : undefined}
        className="absolute inset-0 rounded-[inherit] transition-colors active:bg-secondary/40"
      />
      <Tile color={color} big={jour.getDate()} small={moisCourt} size="lg" className={cn(actif && "!bg-background")} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-semibold">{e.service}</p>
          {jours === 0 && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-foreground text-background">{t("mesServices.today")}</span>
          )}
          {jours > 0 && jours <= 14 && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-foreground">{t("mesServices.inDays", { count: jours })}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{date}</p>
        {(e.time || e.location) && (
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {e.time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{e.time}</span>}
            {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <div className="flex flex-wrap gap-1 justify-end">
          {e.roles.map((r) => (
            <span
              key={r}
              className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", actif && "!bg-background")}
              style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }}
            >
              {r}
            </span>
          ))}
        </div>
        {setlistId && (
          <Link
            href={`/setlists/${setlistId}`}
            className={cn(
              "relative z-10 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors",
              actif ? "bg-background/15 text-background" : "bg-secondary text-foreground hover:bg-secondary/80",
            )}
          >
            <ListMusic className="h-3 w-3" />
            {t("mesServices.setlist")}
          </Link>
        )}
      </div>
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
    </li>
  );
}
