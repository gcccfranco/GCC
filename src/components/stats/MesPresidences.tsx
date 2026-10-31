"use client";

// Lot SP, SP-B (docs/spec-stats-personnes-groupes.md, SP2) : la carte « Mes présidences » de Moi, sous
// « Mes services », et son détail (feuille du bas ou panneau ancré, comme les statistiques d'un chant).
// Connecté seulement, visible de la personne et des admins (P2, côté site). Rien pendant le chargement,
// hors ligne ou en erreur, ni sans présidence comptée ni prochaine. Calcul : `statsPresidence`.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { canVoirStatsPersonne } from "@/lib/access";
import { setlistsPourStats } from "@/lib/stats/setlistsPourStats";
import {
  jourCourt, nomDePresidence, serviceCourt, statsPresidence, type Periode, type StatsPresidence,
} from "@/lib/stats/chantsJoues";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import { Pilules } from "@/components/layout/Onglets";
import { FeuilleOuPanneau } from "@/components/stats/FeuilleOuPanneau";
import type { FSSetlist } from "@/lib/firebase/setlists";
import type { UserProfile } from "@/types/user";
import type { SongIndexEntry } from "@/types/song";

type ChoixPeriode = "3" | "12" | "debut";
const PERIODES: ChoixPeriode[] = ["3", "12", "debut"];
const enPeriode = (p: ChoixPeriode): Periode => (p === "debut" ? "debut" : { mois: Number(p) as 3 | 12 });

type Lecture = { setlists: FSSetlist[]; recueil: SongIndexEntry[] };

export function MesPresidences({ profile }: { profile: Pick<UserProfile, "planningName" | "firstName" | "lastName"> | null }) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  const { user, loading } = useAuth();
  const nomPresidence = profile ? nomDePresidence(profile) : "";
  const connecte = !loading && !!user && canVoirStatsPersonne(user, user.uid) && nomPresidence !== "";
  // Même « aujourd'hui » que la page Statistiques.
  const aujourdhui = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [periode, setPeriode] = useState<ChoixPeriode>("debut");

  useEffect(() => {
    if (!connecte) return;
    let annule = false;
    Promise.all([setlistsPourStats(), chargerIndexChants().catch(() => null)]).then(([setlists, recueil]) => {
      // Hors ligne ou en erreur : pas de setlists, pas de carte.
      if (!annule && setlists.length > 0 && recueil) setLecture({ setlists, recueil });
    }).catch(() => {});
    return () => { annule = true; };
  }, [connecte]);

  const depuisLeDebut = useMemo(
    () => (lecture ? statsPresidence(lecture.setlists, lecture.recueil, nomPresidence, "debut", aujourdhui) : null),
    [lecture, nomPresidence, aujourdhui],
  );
  const stats = useMemo(
    () => (lecture ? statsPresidence(lecture.setlists, lecture.recueil, nomPresidence, enPeriode(periode), aujourdhui) : null),
    [lecture, nomPresidence, periode, aujourdhui],
  );
  if (!connecte || !lecture || !depuisLeDebut || !stats) return null;
  if (depuisLeDebut.total === 0 && !depuisLeDebut.prochaine) return null;

  // 中文 : le nom du service traduit ; sinon le nom court.
  const nom = (service: string) => (zh ? t("categories." + service, { defaultValue: serviceCourt(service) }) : serviceCourt(service));
  const jour = (j: string) => jourCourt(j, aujourdhui);
  const titres = new Map(lecture.recueil.map((c) => [c.slug, c.title]));
  const premier = depuisLeDebut.parService[0];

  return (
    <>
      <button
        type="button"
        data-testid="mes-presidences"
        aria-haspopup="dialog"
        onClick={() => setOuvert(true)}
        className="raised block w-full min-w-0 rounded-2xl px-4 pb-3.5 pt-3.5 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[16px] font-bold text-foreground">{t("stats.presidences.titre")}</span>
          <span className="text-[12px] text-muted-foreground">{t("stats.presidences.visible")}</span>
        </span>
        <dl className="mt-2.5 grid grid-cols-3 gap-2">
          <Chiffre cle="presidences" libelle={t("stats.presidences.nombre")} valeur={String(depuisLeDebut.total)} />
          <Chiffre cle="derniere" libelle={t("stats.presidences.derniere")} valeur={depuisLeDebut.derniere ? jour(depuisLeDebut.derniere.jour) : "—"} />
          <Chiffre cle="groupes" libelle={t("stats.presidences.groupes")} valeur={String(depuisLeDebut.parService.length)} />
        </dl>
        <span className="mt-2.5 flex items-center gap-0.5 text-[13px] leading-snug text-muted-foreground">
          <span data-testid="mes-presidences-ligne" className="min-w-0">
            {premier && t("stats.presidences.surtout", { service: nom(premier.service), count: premier.fois })}
            {premier && depuisLeDebut.prochaine && " · "}
            {depuisLeDebut.prochaine && t("stats.presidences.prochaineLe", { date: jour(depuisLeDebut.prochaine.jour) })}
          </span>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
        </span>
      </button>

      <FeuilleOuPanneau
        ouvert={ouvert} onOpenChange={setOuvert} titre={t("stats.presidences.titre")}
        testidPanneau="mes-presidences-panneau" testidFeuille="mes-presidences-feuille"
      >
        <Detail
          stats={stats} nom={nom} jour={jour} titres={titres} periode={periode} setPeriode={setPeriode}
          nomPresidence={nomPresidence}
        />
      </FeuilleOuPanneau>
    </>
  );
}

function Chiffre({ cle, libelle, valeur }: { cle: string; libelle: string; valeur: string }) {
  return (
    <div data-testid={`chiffre-${cle}`} className="min-w-0 rounded-2xl bg-secondary px-3 py-2.5">
      <dt className="text-[11px] leading-tight text-muted-foreground">{libelle}</dt>
      <dd className="mt-1 break-words text-[17px] font-semibold tabular-nums leading-tight text-foreground">{valeur}</dd>
    </div>
  );
}

function Detail({ stats, nom, jour, titres, periode, setPeriode, nomPresidence }: {
  stats: StatsPresidence;
  nom: (service: string) => string;
  jour: (j: string) => string;
  titres: Map<string, string>;
  periode: ChoixPeriode;
  setPeriode: (p: ChoixPeriode) => void;
  nomPresidence: string;
}) {
  const { t } = useTranslation();
  const max = Math.max(1, ...stats.parService.map((l) => l.fois));
  return (
    <div className="space-y-4 text-foreground">
      <dl className="grid grid-cols-3 gap-2">
        <Chiffre cle="detail-presidences" libelle={t("stats.presidences.nombre")} valeur={String(stats.total)} />
        <Chiffre cle="detail-derniere" libelle={t("stats.presidences.derniere")} valeur={stats.derniere ? jour(stats.derniere.jour) : "—"} />
        <Chiffre cle="detail-groupes" libelle={t("stats.presidences.groupes")} valeur={String(stats.parService.length)} />
      </dl>

      <Pilules
        etiquette={t("stats.periode.label")}
        options={PERIODES.map((cle) => ({ cle, nom: t(`stats.periode.${cle}`) }))}
        valeur={periode} choisir={(p) => p && setPeriode(p)} obligatoire
      />

      {stats.parService.length > 0 ? (
        <table data-testid="mes-presidences-tableau" className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[11px] font-medium text-muted-foreground">
              <th scope="col" className="pb-1.5 font-medium">{t("stats.presidences.groupe")}</th>
              <th scope="col" className="pb-1.5 text-right font-medium">{t("stats.chant.fois")}</th>
              <th scope="col" className="pb-1.5 pl-3 text-right font-medium">{t("stats.chant.derniereCol")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.parService.map((l) => (
              <tr key={l.service} data-testid="ligne-groupe" className="border-t border-border/60 align-top">
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
        <p data-testid="mes-presidences-aucune" className="text-[14px] text-muted-foreground">{t("stats.presidences.aucune")}</p>
      )}

      {stats.chants.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-[13px] font-semibold">{t("stats.presidences.chants")}</h3>
          <ul data-testid="mes-chants" className="text-[14px]">
            {stats.chants.slice(0, 5).map((c) => (
              <li key={c.slug} data-testid="mon-chant" className="flex items-baseline gap-3 border-t border-border/60 py-1.5 first:border-t-0">
                <Link href={`/songs/${c.slug}`} className="min-w-0 flex-1 truncate underline-offset-4 hover:underline">
                  {titres.get(c.slug) ?? c.slug}
                </Link>
                <span data-champ="fois" className="shrink-0 tabular-nums text-muted-foreground">{c.fois}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.jamaisChoisis > 0 && (
        <p className="text-[14px]">
          <Link
            data-testid="jamais-choisis" href="/songs/statistiques?vue=jamais-joues"
            className="inline-flex min-h-8 items-center gap-0.5 underline underline-offset-4 decoration-1 [@media(pointer:coarse)]:min-h-11"
          >
            {t("stats.presidences.jamais", { count: stats.jamaisChoisis })}<ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        </p>
      )}

      {stats.prochaine && (
        <p data-testid="prochaine" className="text-[14px]">
          <Link href={`/setlists/${stats.prochaine.setlistId}`} className="underline underline-offset-4 decoration-1">
            {t("stats.chant.prochaine", { date: jour(stats.prochaine.jour), service: nom(stats.prochaine.service) })}
          </Link>
        </p>
      )}

      <p className="border-t border-border pt-3 text-[12px] text-muted-foreground">
        {t("stats.presidences.note", { nom: nomPresidence })}
      </p>
    </div>
  );
}
