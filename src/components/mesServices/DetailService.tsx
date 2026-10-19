"use client";

// Un service de Mes services (lot U4 bis, B4, Q7 ; planches `mes-services-ordinateur`,
// `mes-services-detail-telephone`) : la date, le service à sa couleur et les rôles, la
// répétition (Campus), la setlist liée (« Ouvrir », « Mode louange ») et l'équipe du service
// d'après le planning. En grand, la setlist et l'équipe côte à côte, sans « Retour » ; en un
// volet, « ‹ Mes services », puis l'équipe avant la setlist.
// Agencement v18 (A11, R3, R8, R10) : en deux volets, le titre est un h2 de 24 px (le h1 est celui
// de l'en-tête de la section) et la fiche ne pose plus de marge ; en un volet, le service en page
// garde son h1 et le seul retour du site, `Retour`.

import { useId, useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Clock, ListMusic, MapPin, Play } from "lucide-react";
import { Retour } from "@/components/layout/EnTetePage";
import { Tile } from "@/components/ui/tile";
import { KeyPill } from "@/components/ui/key-pill";
import { CarteEquipe } from "@/components/setlists/CarteEquipe";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { joursAvant } from "@/lib/planning/accueil";
import { serviceCategory } from "@/lib/planning/names";
import { repetitionsDe, type ServiceGroupe } from "@/lib/planning/mesServices";
import { equipeDuService } from "@/lib/setlist/equipeDuService";
import { serviceColor } from "@/lib/serviceColors";
import { serviceButtonFill } from "@/lib/serviceButton";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { SongIndexEntry } from "@/types/song";
import { cn } from "@/lib/utils";
import { useMesServices } from "./SectionMesServices";

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR");
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dateLongue = (iso: string, lang: string) =>
  majuscule(new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`)));

function Roles({ s }: { s: ServiceGroupe }) {
  const couleur = serviceColor(s.service);
  return (
    <span className="flex flex-wrap gap-1">
      {s.roles.map((r) => (
        <span key={r} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `color-mix(in srgb, ${couleur} 13%, transparent)`, color: couleur }}>
          {r}
        </span>
      ))}
    </span>
  );
}

/** Lieu et heure d'une répétition. */
function HeureLieu({ s }: { s: ServiceGroupe }) {
  if (!s.time && !s.location) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
      {s.time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{s.time}</span>}
      {s.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{s.location}</span>}
    </span>
  );
}

export function DetailService({ s }: { s: ServiceGroupe }) {
  const { t, i18n } = useTranslation();
  const deuxVolets = useDeuxVolets();
  const { services, aujourdhui, planning, songs, monNom, setlistDe } = useMesServices();
  const couleur = serviceColor(s.service);
  const jour = new Date(`${s.date}T12:00:00`);
  const mois = new Intl.DateTimeFormat(locale(i18n.language), { month: "short" }).format(jour);
  const n = joursAvant(s.date, aujourdhui);
  const quand = n < 0 ? null : n === 0 ? t("planning.accueil.aujourdhui") : n === 1 ? t("planning.accueil.demain") : t("planning.accueil.dansJours", { count: n });
  const repetitions = repetitionsDe(services, s);
  const setlist = setlistDe(s);
  const equipe = useMemo(() => {
    const categorie = serviceCategory(s.service);
    return categorie ? equipeDuService(planning, { category: categorie, date: s.setlistDate ?? s.date, moment: s.moment }) : [];
  }, [planning, s]);

  const Titre = deuxVolets ? "h2" : "h1";
  const carteEquipe = equipe.length > 0 && <CarteEquipe equipe={equipe} monNom={monNom} niveau={2} />;
  const carteSetlist = setlist && <CarteSetlist setlist={setlist} songs={songs} couleur={couleur} boutonsEnTete={!deuxVolets} />;

  return (
    <div className={cn("service-detail space-y-4 pb-10", !deuxVolets && "mx-auto max-w-2xl px-4 pt-3 md:max-w-3xl md:px-6")}>
      {!deuxVolets && <Retour href="/mes-services">{t("mesServices.title")}</Retour>}

      <header className="flex items-start gap-4">
        <Tile color={couleur} big={jour.getDate()} small={mois} size="lg" className="h-14 w-14 rounded-xl [&>span:first-child]:text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="svc-ink text-[13px] font-semibold" style={{ "--svc": couleur } as React.CSSProperties}>{s.service}</p>
          <Titre className={cn("font-bold leading-tight tracking-tight", deuxVolets ? "text-[24px]" : "text-2xl lg:text-[28px]")}>{dateLongue(s.date, i18n.language)}</Titre>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {quand && <span className="text-sm text-muted-foreground">{quand}</span>}
            {!deuxVolets && <Roles s={s} />}
          </div>
          <HeureLieu s={s} />
        </div>
        {deuxVolets && <div className="shrink-0 pt-1"><Roles s={s} /></div>}
      </header>

      {repetitions.map((r) => (
        <article key={`${r.date}|${r.service}`} className="raised flex items-center gap-3.5 rounded-2xl px-4 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <Clock className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted-foreground">{r.service}</p>
            <p className="text-base font-bold">{dateLongue(r.date, i18n.language)}{r.time && ` · ${r.time}`}</p>
            {r.location && <p className="inline-flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5" aria-hidden />{r.location}</p>}
          </div>
          <Roles s={r} />
        </article>
      ))}

      {(carteEquipe || carteSetlist) && (
        <div className="service-colonnes grid items-start gap-4">
          {deuxVolets ? <>{carteSetlist}{carteEquipe}</> : <>{carteEquipe}{carteSetlist}</>}
        </div>
      )}
    </div>
  );
}

/** La setlist liée : titre, présidence, chants numérotés avec leur tonalité, « Ouvrir » et
 *  « Mode louange » (bouton plein à la couleur du service). Au téléphone, les boutons d'abord. */
function CarteSetlist({ setlist, songs, couleur, boutonsEnTete }: {
  setlist: FSSetlist;
  songs: Record<string, SongIndexEntry>;
  couleur: string;
  boutonsEnTete: boolean;
}) {
  const { t } = useTranslation();
  const id = useId();
  const boutons = (
    <div className="flex flex-wrap gap-2 [&>a]:flex-1 [&>a]:justify-center sm:[&>a]:flex-none">
      <Link href={`/setlists/${setlist.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-transform duration-150 active:scale-[.97]">
        <ListMusic className="h-4 w-4" aria-hidden />
        {t("planning.accueil.ouvrir")}
      </Link>
      <Link
        href={`/setlists/${setlist.id}?louange=1`}
        className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white transition-transform duration-150 active:scale-[.97]"
        style={{ background: serviceButtonFill(couleur) }}
      >
        <Play className="h-4 w-4" aria-hidden />
        {t("setlists.detail.performanceMode")}
      </Link>
    </div>
  );
  return (
    <section aria-labelledby={id} className="raised space-y-3 rounded-2xl px-5 pb-4 pt-4">
      <div>
        <h2 id={id} className="text-[13px] font-semibold text-muted-foreground">{t("planning.accueil.setlistDuService")}</h2>
        <p className="text-lg font-bold leading-snug">{setlist.title}</p>
        {setlist.leader && <p className="text-[13px] text-muted-foreground">{t("planning.accueil.presidence", { nom: setlist.leader })}</p>}
      </div>
      {boutonsEnTete && boutons}
      <ol>
        {setlist.items.filter((it) => it.type !== "transition").map((it, i) => {
          const song = songs[it.songSlug];
          const fusion = it.type === "fusion" && !!it.fusionSongs;
          const titre = fusion ? it.fusionSongs!.map((f) => songs[f.songSlug]?.title ?? f.songSlug).join(" / ") : (song?.title ?? it.songSlug);
          const tonalite = it.keyOverride ?? song?.originalKey;
          return (
            <li key={it.position} className="flex min-h-12 items-center gap-3 border-t border-border/70 py-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{titre}</span>
                {!fusion && song?.artist && <span className="block truncate text-[13px] text-muted-foreground">{song.artist}</span>}
              </span>
              {!fusion && tonalite && <KeyPill tonalite={tonalite} langue={song?.language === "zh" ? "zh" : "fr"} />}
            </li>
          );
        })}
      </ol>
      {!boutonsEnTete && boutons}
    </section>
  );
}
