"use client";

// L'agenda du calendrier (lot U8, C4, planche bo-telephone-calendrier) : la liste par
// jour depuis aujourd'hui, jours vides sautés ; une carte par entrée (vignette colorée
// à icône, titre, détail) qui ouvre sa feuille (date, détail, « Ouvrir » ; « Déplacer… »
// pour une entrée déplaçable, C6). Les mêmes cartes servent la liste du jour sous le Mois à points.
// Agencement v18 (B5, piste A, planche v18-bo-calendrier-agenda-a) : dès 768 px, `AgendaSemaines` —
// les semaines, une ligne par jour (jour de la semaine et numéro, le jour choisi en encre), une ligne
// par entrée (trait de couleur, heure, titre, détail, étiquette du type) ; toucher un jour ou une de
// ses lignes le choisit (volet du jour à droite, ou sa feuille). Le téléphone garde `ListeAgenda`.

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { EntreeCalendrier } from "@/lib/calendrier/entrees";
import { jourDeLaSemaine, jourEtMois, lundiDe, titreJour } from "@/lib/calendrier/grille";
import { cn } from "@/lib/utils";
import type { NotifLang } from "@/types/user";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ICONES, couleurSource, couleurTrait, styleCase } from "./apparence";

/** « Aujourd'hui · jeudi 1er octobre », sinon « Vendredi 2 octobre ». */
export function useTitreDuJour(lang: NotifLang, aujourdhui: string) {
  const { t } = useTranslation();
  return (date: string) => {
    const titre = titreJour(date, lang);
    if (date !== aujourdhui) return titre;
    return `${t("calendrier.aujourdhui")} · ${lang === "zh-CN" ? titre : titre.charAt(0).toLowerCase() + titre.slice(1)}`;
  };
}

function CarteAgenda({ e, onOuvrir }: { e: EntreeCalendrier; onOuvrir: (e: EntreeCalendrier) => void }) {
  const Icone = ICONES[e.source];
  return (
    <button
      type="button"
      data-source={e.source}
      onClick={() => onOuvrir(e)}
      className="raised flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span aria-hidden style={styleCase(e)} className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]">
        <Icone className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold leading-snug text-foreground">{e.titre}</span>
        {e.detail && <span className="block truncate text-[13px] text-muted-foreground">{e.detail}</span>}
      </span>
    </button>
  );
}

/** Les cartes d'un jour. */
export function CartesDuJour({ entrees, onOuvrir }: { entrees: EntreeCalendrier[]; onOuvrir: (e: EntreeCalendrier) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {entrees.map((e) => (
        <li key={e.cle}>
          <CarteAgenda e={e} onOuvrir={onOuvrir} />
        </li>
      ))}
    </ul>
  );
}

/** La liste par jour : `parJour` arrive dans l'ordre des jours, sans jour vide. */
export function ListeAgenda({
  parJour,
  titreDuJour,
  vide,
  onOuvrir,
}: {
  parJour: Map<string, EntreeCalendrier[]>;
  titreDuJour: (date: string) => string;
  vide: string;
  onOuvrir: (e: EntreeCalendrier) => void;
}) {
  if (parJour.size === 0) return <p className="mt-4 text-sm text-muted-foreground">{vide}</p>;
  return (
    <div data-testid="agenda">
      {[...parJour].map(([date, entrees]) => (
        <section key={date} data-jour={date} aria-labelledby={`agenda-${date}`}>
          <h2 id={`agenda-${date}`} className="mx-0.5 mb-1.5 mt-4 text-[13px] font-semibold text-muted-foreground">
            {titreDuJour(date)}
          </h2>
          <CartesDuJour entrees={entrees} onOuvrir={onOuvrir} />
        </section>
      ))}
    </div>
  );
}

/** Le détail sans l'heure du début, déjà dans sa colonne (« 20:00 · Salle 2 » → « Salle 2 »). */
function detailSansHeure(e: EntreeCalendrier): string {
  if (!e.heure) return e.detail;
  const plage = e.heureFin ? `${e.heure} – ${e.heureFin}` : e.heure;
  return e.detail.startsWith(plage) ? e.detail.slice(plage.length).replace(/^ · /, "") : e.detail;
}

function LigneAgenda({ e, onChoisir }: { e: EntreeCalendrier; onChoisir: () => void }) {
  const { t } = useTranslation();
  const couleur = couleurTrait(e);
  const detail = detailSansHeure(e);
  return (
    <button
      type="button"
      data-source={e.source}
      onClick={onChoisir}
      className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span aria-hidden className="w-1 shrink-0 self-stretch rounded-full" style={{ background: couleur }} />
      <span className="w-12 shrink-0 tabular-nums">
        <span data-heure className={cn("block text-sm font-bold", e.heure ? "text-foreground" : "text-muted-foreground")}>{e.heure || "–"}</span>
        {e.heureFin && <span className="block text-xs text-muted-foreground">{e.heureFin}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-snug text-foreground">{e.titre}</span>
        {detail && <span className="block truncate text-[13px] text-muted-foreground">{detail}</span>}
      </span>
      <span
        data-etiquette
        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ background: `color-mix(in srgb, ${couleur} 12%, transparent)`, color: couleurSource(e) }}
      >
        {t(`calendrier.carte.${e.source}`)}
      </span>
    </button>
  );
}

/** L'agenda en grand : `parJour` arrive dans l'ordre des jours, sans jour vide ; groupé par semaine
 *  (« Semaine du 28 septembre », du lundi). */
export function AgendaSemaines({
  parJour,
  choisi,
  lang,
  titreDuJour,
  vide,
  onChoisir,
}: {
  parJour: Map<string, EntreeCalendrier[]>;
  choisi: string;
  lang: NotifLang;
  titreDuJour: (date: string) => string;
  vide: string;
  onChoisir: (date: string) => void;
}) {
  const { t } = useTranslation();
  const semaines = new Map<string, [string, EntreeCalendrier[]][]>();
  for (const [date, entrees] of parJour) {
    const lundi = lundiDe(date);
    semaines.set(lundi, [...(semaines.get(lundi) ?? []), [date, entrees]]);
  }
  return (
    <div data-testid="agenda">
      {semaines.size === 0 && <p className="mt-4 text-sm text-muted-foreground">{vide}</p>}
      {[...semaines].map(([lundi, jours]) => (
        <section key={lundi} aria-labelledby={`semaine-${lundi}`}>
          <h2 id={`semaine-${lundi}`} className="pb-1.5 pt-4 text-[13px] font-semibold text-muted-foreground">
            {t("calendrier.semaineDu", { date: jourEtMois(lundi, lang) })}
          </h2>
          {jours.map(([date, entrees]) => {
            const on = date === choisi;
            return (
              <div key={date} data-jour={date} className="flex gap-4 border-t border-border/60 py-2.5">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={titreDuJour(date)}
                  onClick={() => onChoisir(date)}
                  className="w-14 shrink-0 self-start rounded-xl pt-1.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <span className="block text-xs font-semibold text-muted-foreground">{jourDeLaSemaine(date, lang)}</span>
                  <span
                    className={cn(
                      "mx-1.5 mt-0.5 block rounded-xl text-2xl font-bold tracking-tight transition-colors duration-150",
                      on ? "bg-foreground text-background" : "text-foreground",
                    )}
                  >
                    {Number(date.slice(8))}
                  </span>
                </button>
                <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {entrees.map((e) => (
                    <li key={e.cle}>
                      <LigneAgenda e={e} onChoisir={() => onChoisir(date)} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

const BOUTON_PLEIN =
  "flex h-11 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-semibold text-background transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const BOUTON_SECOND =
  "flex h-11 w-full items-center justify-center rounded-full bg-secondary text-[15px] font-semibold text-foreground transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

/** La feuille d'une entrée : sa source, son titre, sa date, son détail, « Ouvrir », et
 *  « Déplacer… » si elle bouge (C6 : seul moyen sur téléphone, Q5) ; une tâche répétée
 *  dit « Change la répétition dans la tâche » (Q6). */
export function FeuilleEntree({
  entree,
  ouverte,
  lang,
  onFermer,
  onDeplacer,
}: {
  entree: EntreeCalendrier | null;
  ouverte: boolean;
  lang: NotifLang;
  onFermer: () => void;
  onDeplacer: (e: EntreeCalendrier) => void;
}) {
  const { t } = useTranslation();
  return (
    <Drawer open={ouverte && !!entree} onOpenChange={(o) => !o && onFermer()}>
      <DrawerContent className="md:mx-auto md:max-w-md">
        {entree && (
          <>
            <DrawerHeader className="pb-2 text-left">
              <span className="text-xs font-bold" style={{ color: couleurSource(entree) }}>
                {t(`calendrier.carte.${entree.source}`)}
              </span>
              <DrawerTitle>{entree.titre}</DrawerTitle>
              <DrawerDescription>{titreJour(entree.date, lang)}</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-1 px-4 pb-8">
              {entree.detail && <p className="text-[15px] text-foreground">{entree.detail}</p>}
              {entree.duSheet && <p className="text-xs text-muted-foreground">{t("calendrier.duSheet")}</p>}
              {entree.repetee && <p className="text-[13px] text-muted-foreground">{t("calendrier.deplacer.repetee")}</p>}
              <div className="mt-4 flex flex-col gap-2">
                {entree.duSheet ? (
                  <a href={entree.lien} target="_blank" rel="noopener noreferrer" className={BOUTON_PLEIN}>
                    {t("calendrier.ouvrir")}
                  </a>
                ) : (
                  <Link href={entree.lien} className={BOUTON_PLEIN}>
                    {t("calendrier.ouvrir")}
                  </Link>
                )}
                {entree.deplacable && (
                  <button type="button" onClick={() => onDeplacer(entree)} className={BOUTON_SECOND}>
                    {t("calendrier.deplacer.bouton")}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
