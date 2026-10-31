"use client";

// Lot ST, ST4 (docs/spec-jianpu-entete-statistiques.md) : la ligne de statistiques sous l'en-tête de la page
// d'un chant (« Joué 14 fois · dernière fois 26/10, Fidélité › ») et son détail : feuille du bas sur
// téléphone et tablette debout, panneau ancré à droite dès les deux volets (`useDeuxVolets`).
// Connecté seulement ; rien pendant le chargement, hors ligne ou en erreur. Calcul : `statsDuChant`.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trans, useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { canVoirStatistiques } from "@/lib/access";
import { setlistsPourStats } from "@/lib/stats/setlistsPourStats";
import {
  debutDeLHistorique, jourCourt, jourEnLettres, serviceCourt, statsDuChant, type Periode,
} from "@/lib/stats/chantsJoues";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import { Pilules } from "@/components/layout/Onglets";
import { FeuilleOuPanneau } from "@/components/stats/FeuilleOuPanneau";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { SongIndexEntry } from "@/types/song";

type ChoixPeriode = "3" | "12" | "debut";
const PERIODES: ChoixPeriode[] = ["3", "12", "debut"];
const enPeriode = (p: ChoixPeriode): Periode => (p === "debut" ? "debut" : { mois: Number(p) as 3 | 12 });

type Lecture = { setlists: FSSetlist[]; recueil: SongIndexEntry[] };

export function StatistiquesDuChant({ slug }: { slug: string }) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  const { user, loading } = useAuth();
  const connecte = !loading && canVoirStatistiques(user);
  // Même « aujourd'hui » que la page Statistiques.
  const aujourdhui = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [periode, setPeriode] = useState<ChoixPeriode>("debut");

  useEffect(() => {
    if (!connecte) return;
    let annule = false;
    Promise.all([setlistsPourStats(), chargerIndexChants().catch(() => null)]).then(([setlists, recueil]) => {
      // Hors ligne ou en erreur : pas de setlists, pas de ligne.
      if (!annule && setlists.length > 0 && recueil) setLecture({ setlists, recueil });
    }).catch(() => {});
    return () => { annule = true; };
  }, [connecte]);

  const depuisLeDebut = useMemo(
    () => (lecture ? statsDuChant(lecture.setlists, lecture.recueil, slug, "debut", aujourdhui) : null),
    [lecture, slug, aujourdhui],
  );
  const stats = useMemo(
    () => (lecture ? statsDuChant(lecture.setlists, lecture.recueil, slug, enPeriode(periode), aujourdhui) : null),
    [lecture, slug, periode, aujourdhui],
  );
  if (!connecte || !lecture || !depuisLeDebut || !stats) return null;

  // 中文 : le nom du service traduit ; sinon le nom court.
  const nom = (service: string) => (zh ? t("categories." + service, { defaultValue: serviceCourt(service) }) : serviceCourt(service));
  // « Jamais : Groupe Bonté, 高班 » (ST4) : le nom entier, une liste à lire hors contexte.
  const nomEntier = (service: string) => (zh ? t("categories." + service, { defaultValue: service }) : service);
  const jour = (j: string) => jourCourt(j, aujourdhui);
  const noeud = { n: <span className="font-medium text-foreground" /> };
  const debut = debutDeLHistorique(lecture.setlists, aujourdhui);

  const detail = (
    <DetailContenu
      stats={stats} nom={nom} nomEntier={nomEntier} jour={jour} periode={periode} setPeriode={setPeriode}
      note={debut ? t("stats.chant.note", { date: jourEnLettres(debut, zh) }) : null}
    />
  );

  return (
    <>
      <button
        type="button"
        data-testid="statistiques-chant"
        aria-haspopup="dialog"
        onClick={(e) => { e.stopPropagation(); setOuvert(true); }}
        className="page-fade mt-2 -ml-1 flex min-h-8 max-w-full items-center gap-0.5 rounded-md px-1 text-left text-[13px] leading-snug text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden [@media(pointer:coarse)]:min-h-11"
      >
        <span className="min-w-0">
          {depuisLeDebut.derniere ? (
            <Trans
              i18nKey="stats.chant.joue" count={depuisLeDebut.total} components={noeud}
              values={{ date: jour(depuisLeDebut.derniere.jour), service: nom(depuisLeDebut.derniere.service) }}
            />
          ) : (
            <span className="font-medium text-foreground">{t("stats.chant.jamais")}</span>
          )}
          {depuisLeDebut.prochaine && (
            <>{" · "}{t("stats.chant.prevu", { date: jour(depuisLeDebut.prochaine.jour), service: nom(depuisLeDebut.prochaine.service) })}</>
          )}
        </span>
        <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
      </button>

      <FeuilleOuPanneau
        ouvert={ouvert} onOpenChange={setOuvert} titre={t("stats.chant.titre")}
        testidPanneau="statistiques-chant-panneau" testidFeuille="statistiques-chant-feuille"
      >
        {detail}
      </FeuilleOuPanneau>
    </>
  );
}

function DetailContenu({ stats, nom, nomEntier, jour, periode, setPeriode, note }: {
  stats: ReturnType<typeof statsDuChant>;
  nom: (service: string) => string;
  nomEntier: (service: string) => string;
  jour: (j: string) => string;
  periode: ChoixPeriode;
  setPeriode: (p: ChoixPeriode) => void;
  note: string | null;
}) {
  const { t } = useTranslation();
  const max = Math.max(1, ...stats.parService.map((l) => l.fois));
  const chiffres: { cle: string; libelle: string; valeur: string }[] = [
    { cle: "setlists", libelle: t("stats.chant.setlists"), valeur: String(stats.total) },
    { cle: "derniere", libelle: t("stats.chant.derniere"), valeur: stats.derniere ? jour(stats.derniere.jour) : "—" },
    { cle: "tonalite", libelle: t("stats.chant.tonalite"), valeur: stats.tonalites.length ? stats.tonalites.join(" / ") : "—" },
  ];
  return (
    <div className="space-y-4 text-foreground">
      <dl className="grid grid-cols-3 gap-2">
        {chiffres.map((c) => (
          <div key={c.cle} data-testid={`chiffre-${c.cle}`} className="min-w-0 rounded-2xl bg-secondary px-3 py-2.5">
            <dt className="text-[11px] leading-tight text-muted-foreground">{c.libelle}</dt>
            <dd className="mt-1 break-words text-[17px] font-semibold tabular-nums leading-tight">{c.valeur}</dd>
          </div>
        ))}
      </dl>

      <Pilules
        etiquette={t("stats.periode.label")}
        options={PERIODES.map((cle) => ({ cle, nom: t(`stats.periode.${cle}`) }))}
        valeur={periode} choisir={(p) => p && setPeriode(p)} obligatoire
      />

      {stats.parService.length > 0 ? (
        <table data-testid="statistiques-chant-tableau" className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[11px] font-medium text-muted-foreground">
              <th scope="col" className="pb-1.5 font-medium">{t("stats.chant.service")}</th>
              <th scope="col" className="pb-1.5 text-right font-medium">{t("stats.chant.fois")}</th>
              <th scope="col" className="pb-1.5 pl-3 text-right font-medium">{t("stats.chant.derniereCol")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.parService.map((l) => (
              <tr key={l.service} data-testid="ligne-service" className="border-t border-border/60 align-top">
                <td className="py-2 pr-2">
                  <span data-champ="service">{nom(l.service)}</span>
                  <div aria-hidden className="mt-1 h-1 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-foreground/80" style={{ width: `${(l.fois / max) * 100}%` }} />
                  </div>
                </td>
                <td data-champ="fois" className="py-2 text-right tabular-nums">{l.fois}</td>
                <td data-champ="derniere" className="py-2 pl-3 text-right tabular-nums">{jour(l.derniere)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p data-testid="statistiques-chant-aucune" className="text-[14px] text-muted-foreground">{t("stats.chant.aucune")}</p>
      )}

      {stats.jamaisDans.length > 0 && (
        <p data-testid="jamais-dans" className="text-[14px] text-muted-foreground">
          {t("stats.chant.jamaisDans", { services: stats.jamaisDans.map(nomEntier).join(", ") })}
        </p>
      )}

      {stats.prochaine && (
        <p data-testid="prochaine" className="text-[14px]">
          <Link href={`/setlists/${stats.prochaine.setlistId}`} className="underline underline-offset-4 decoration-1">
            {t("stats.chant.prochaine", { date: jour(stats.prochaine.jour), service: nom(stats.prochaine.service) })}
          </Link>
        </p>
      )}

      <div className="space-y-1.5 border-t border-border pt-3">
        {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
        <Link
          href="/songs/statistiques"
          className="inline-flex min-h-8 items-center gap-0.5 text-[14px] font-medium underline-offset-4 hover:underline [@media(pointer:coarse)]:min-h-11"
        >
          {t("stats.chant.toutes")}<ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
