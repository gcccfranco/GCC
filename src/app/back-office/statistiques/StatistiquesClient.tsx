"use client";

// Lot U7 (docs/spec-statistiques.md), S3 : la vue « Les plus joués » — lecture des setlists et du
// recueil, filtres (période, service, langue, présidence) gardés dans l'URL (Q13), cartes
// « Setlists comptées » et « Les 10 premiers », tableau trié (Q9) ou liste sur téléphone.
// S4 : le sélecteur « Les plus joués · Jamais joués · À redécouvrir » (Q11), mêmes filtres et
// même carte « Setlists comptées » dans les trois vues.
// Calcul : `statsChants` (src/lib/stats/chantsJoues.ts). Rien n'est écrit. Français seul (Q14).
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowDownWideNarrow, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { ALL_CATEGORIES, getSetlists, type FSSetlist } from "@/lib/firebase/setlists";
import {
  SEUIL_A_REDECOUVRIR, bornesDeLaPeriode, choixDesFiltres, libellePart, libelleTendance, statsChants,
  type FiltresStats, type LigneChant, type Periode, type StatsChants,
} from "@/lib/stats/chantsJoues";
import { PageTitle } from "@/components/layout/PageTitle";
import type { SongIndexEntry } from "@/types/song";
import { cn } from "@/lib/utils";

type Vue = "plus" | "jamais" | "redecouvrir";
type ChoixPeriode = "3" | "6" | "12" | "debut" | "libre";

/** Les trois vues et leur nom dans l'adresse (« Les plus joués » : pas de paramètre). */
const VUES: { vue: Vue; libelle: string; adresse: string | null }[] = [
  { vue: "plus", libelle: "Les plus joués", adresse: null },
  { vue: "jamais", libelle: "Jamais joués", adresse: "jamais-joues" },
  { vue: "redecouvrir", libelle: "À redécouvrir", adresse: "a-redecouvrir" },
];
type CleTri = "chant" | "setlists" | "derniere" | "tendance";
type Sens = "asc" | "desc";

const PERIODES: { choix: ChoixPeriode; libelle: string }[] = [
  { choix: "3", libelle: "3 mois" },
  { choix: "6", libelle: "6 mois" },
  { choix: "12", libelle: "12 mois" },
  { choix: "debut", libelle: "Depuis le début" },
];
const COLONNES_TRI: { cle: CleTri; libelle: string }[] = [
  { cle: "chant", libelle: "Chant" },
  { cle: "setlists", libelle: "Setlists" },
  { cle: "derniere", libelle: "Dernière fois" },
  { cle: "tendance", libelle: "Tendance" },
];
/** Le titre se lit A→Z ; les nombres et les dates, du plus grand au plus petit. */
const SENS_PAR_DEFAUT: Record<CleTri, Sens> = { chant: "asc", setlists: "desc", derniere: "desc", tendance: "desc" };

/** Ordre « par défaut » de chaque colonne ; l'autre sens le renverse. Les ex aequo gardent le rang. */
const COMPARER: Record<CleTri, (a: LigneChant, b: LigneChant) => number> = {
  chant: (a, b) => a.titre.localeCompare(b.titre, "fr") || a.rang - b.rang,
  setlists: (a, b) => a.rang - b.rang,
  derniere: (a, b) => b.derniereFois.localeCompare(a.derniereFois) || a.rang - b.rang,
  tendance: (a, b) => (b.tendance ?? -Infinity) - (a.tendance ?? -Infinity) || a.rang - b.rang,
};

type Etat = {
  vue: Vue; periode: ChoixPeriode; du: string; au: string;
  service: string | null; langue: "fr" | "zh" | null; presidence: string | null;
  tri: CleTri; sens: Sens;
};
const ETAT_PAR_DEFAUT: Etat = {
  vue: "plus", periode: "12", du: "", au: "", service: null, langue: null, presidence: null, tri: "setlists", sens: "desc",
};

/** L'écran tel que l'adresse le décrit (Q13) ; une valeur inconnue garde le défaut. */
function lireAdresse(recherche: string): Etat {
  const p = new URLSearchParams(recherche);
  const periode = p.get("periode");
  const tri = p.get("tri");
  const langue = p.get("langue");
  const etat: Etat = { ...ETAT_PAR_DEFAUT };
  etat.vue = VUES.find((v) => v.adresse !== null && v.adresse === p.get("vue"))?.vue ?? "plus";
  if (periode && ["3", "6", "12", "debut", "libre"].includes(periode)) etat.periode = periode as ChoixPeriode;
  etat.du = p.get("du") ?? "";
  etat.au = p.get("au") ?? "";
  etat.service = p.get("service") || null;
  etat.langue = langue === "fr" || langue === "zh" ? langue : null;
  etat.presidence = p.get("presidence") || null;
  if (tri && tri in SENS_PAR_DEFAUT) etat.tri = tri as CleTri;
  etat.sens = p.get("sens") === "asc" || p.get("sens") === "desc" ? (p.get("sens") as Sens) : SENS_PAR_DEFAUT[etat.tri];
  return etat;
}

function ecrireAdresse(e: Etat): string {
  const p = new URLSearchParams();
  const vue = VUES.find((v) => v.vue === e.vue)?.adresse;
  if (vue) p.set("vue", vue);
  if (e.periode !== "12") p.set("periode", e.periode);
  if (e.periode === "libre") { p.set("du", e.du); p.set("au", e.au); }
  if (e.service) p.set("service", e.service);
  if (e.langue) p.set("langue", e.langue);
  if (e.presidence) p.set("presidence", e.presidence);
  if (e.tri !== "setlists") p.set("tri", e.tri);
  if (e.sens !== SENS_PAR_DEFAUT[e.tri]) p.set("sens", e.sens);
  const q = p.toString();
  return window.location.pathname + (q ? `?${q}` : "");
}

function enPeriode(e: Etat): Periode {
  if (e.periode === "debut") return "debut";
  // Dates libres : un champ vidé ne borne plus ce côté (la fin reste ramenée à hier).
  if (e.periode === "libre") return { du: e.du, au: e.au || "9999-12-31" };
  return { mois: Number(e.periode) as 3 | 6 | 12 };
}

/** « 20/09 », l'année si ce n'est pas l'année en cours (« 20/09/2025 »). */
function jourCourt(jour: string, aujourdhui: string): string {
  const [a, m, j] = jour.split("-");
  return a === aujourdhui.slice(0, 4) ? `${j}/${m}` : `${j}/${m}/${a}`;
}

function veille(jour: string): string {
  return new Date(Date.parse(`${jour}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

/** « 24/05/2026 ». */
function jourLong(jour: string): string {
  const [a, m, j] = jour.split("-");
  return `${j}/${m}/${a}`;
}

type Lecture =
  | { etat: "calcul" }
  | { etat: "echec"; message: string }
  | { etat: "pret"; setlists: FSSetlist[]; recueil: SongIndexEntry[] };

export function StatistiquesClient() {
  const { t } = useTranslation();
  // Même « aujourd'hui » que les Archives de l'onglet Setlists (Q3).
  const aujourdhui = useMemo(() => new Date().toISOString().split("T")[0], []);
  // L'adresse d'abord (le retour depuis un chant retrouve l'écran), puis on la tient à jour.
  // La page n'est rendue qu'au navigateur (elle attend le compte) : `window` est là.
  const [etat, setEtat] = useState<Etat>(() =>
    typeof window === "undefined" ? ETAT_PAR_DEFAUT : lireAdresse(window.location.search));
  const [lecture, setLecture] = useState<Lecture>({ etat: "calcul" });
  useEffect(() => { window.history.replaceState(null, "", ecrireAdresse(etat)); }, [etat]);
  const changer = (modif: Partial<Etat>) => setEtat((e) => ({ ...e, ...modif }));

  const lire = useCallback(() => {
    Promise.all([
      getSetlists(),
      fetch("/songs-index.json").then((r) => (r.ok ? (r.json() as Promise<{ songs: SongIndexEntry[] }>) : null)),
    ])
      .then(([setlists, index]) => {
        // La base compte plus de cent setlists : zéro veut dire que la lecture a échoué.
        if (setlists.length === 0) setLecture({ etat: "echec", message: "Impossible de lire les setlists." });
        else if (!index) setLecture({ etat: "echec", message: "Impossible de lire le recueil." });
        else setLecture({ etat: "pret", setlists, recueil: index.songs });
      })
      .catch(() => setLecture({ etat: "echec", message: "Impossible de lire les setlists." }));
  }, []);
  useEffect(() => { lire(); }, [lire]);

  const donnees = lecture.etat === "pret" ? lecture : null;
  const choix = useMemo(
    () => (donnees ? choixDesFiltres(donnees.setlists, aujourdhui, ALL_CATEGORIES) : null),
    [donnees, aujourdhui],
  );
  const stats = useMemo(() => {
    if (!donnees) return null;
    const filtres: FiltresStats = { periode: enPeriode(etat), service: etat.service, langue: etat.langue, presidence: etat.presidence };
    return statsChants(donnees.setlists, donnees.recueil, filtres, aujourdhui);
  }, [donnees, etat, aujourdhui]);
  const lignes = useMemo(() => {
    if (!stats) return [];
    const triees = [...stats.plusJoues].sort(COMPARER[etat.tri]);
    return etat.sens === SENS_PAR_DEFAUT[etat.tri] ? triees : triees.reverse();
  }, [stats, etat]);

  const enTete = (
    <div className="lg:flex lg:items-start lg:justify-between lg:gap-4">
      <PageTitle title="Chants les plus joués" subtitle="Visible par les admins seulement" />
      <SelecteurVue vue={etat.vue} choisir={(vue) => changer({ vue })} />
    </div>
  );

  if (lecture.etat === "echec") {
    return (
      <>
        {enTete}
        <div role="alert" className="raised rounded-2xl px-5 py-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{lecture.message}</p>
          <button type="button" onClick={() => { setLecture({ etat: "calcul" }); lire(); }} className="h-9 px-4 rounded-full bg-foreground text-background text-sm font-semibold transition-transform active:scale-[.97]">
            Réessayer
          </button>
        </div>
      </>
    );
  }
  if (!stats || !choix || !donnees) {
    return <>{enTete}<p role="status" className="text-sm text-muted-foreground">Calcul…</p></>;
  }

  const trier = (cle: CleTri) =>
    changer(cle === etat.tri ? { sens: etat.sens === "asc" ? "desc" : "asc" } : { tri: cle, sens: SENS_PAR_DEFAUT[cle] });
  const choisirPeriode = (periode: ChoixPeriode) => {
    if (periode !== "libre") return changer({ periode });
    // « Dates libres » part de ce qu'on regarde : les bornes de la période ou des setlists comptées.
    const au = veille(aujourdhui);
    const du = stats.comptees.du ?? au;
    changer({ periode, du: etat.periode === "libre" ? etat.du : du, au: etat.periode === "libre" ? etat.au : au });
  };
  const { comptees } = stats;

  return (
    <>
      {enTete}
      <div className="space-y-4">
        <Filtres
          etat={etat} aujourdhui={aujourdhui} services={choix.services} presidences={choix.presidences}
          nomService={(c) => t("categories." + c, { lng: "fr", defaultValue: c })}
          choisirPeriode={choisirPeriode} changer={changer}
        />

        {comptees.nombre === 0 ? (
          <p role="status" className="raised rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground">
            Aucune setlist publiée sur cette période.
          </p>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
              {/* Téléphone : le nombre à gauche, le titre et les dates à droite, sur une ligne. */}
              <section data-testid="setlists-comptees"
                className="raised rounded-2xl px-5 py-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 sm:grid-cols-1 sm:items-start sm:content-start">
                <h2 className="col-start-2 row-start-1 self-end text-sm font-semibold text-muted-foreground sm:col-start-1 sm:self-auto">
                  Setlists comptées
                </h2>
                <p data-testid="nombre" className="col-start-1 row-start-1 row-span-2 text-3xl font-bold tabular-nums sm:row-start-2 sm:row-span-1 sm:mt-1">
                  {comptees.nombre}
                </p>
                <p className="col-start-2 row-start-2 self-start text-sm text-muted-foreground sm:col-start-1 sm:row-start-3 sm:self-auto">
                  publiées, du {jourCourt(comptees.du!, aujourdhui)} au {jourCourt(comptees.au!, aujourdhui)}
                </p>
              </section>
              {etat.vue === "plus" && lignes.length > 0 && <DixPremiers lignes={stats.plusJoues.slice(0, 10)} />}
            </div>

            {etat.vue === "jamais" ? (
              <JamaisJoues chants={stats.jamaisJoues} aujourdhui={aujourdhui}
                total={donnees.recueil.filter((c) => etat.langue === null || c.language === etat.langue).length} />
            ) : etat.vue === "redecouvrir" ? (
              <ARedecouvrir chants={stats.aRedecouvrir} aujourdhui={aujourdhui}
                debutPeriode={bornesDeLaPeriode(enPeriode(etat), aujourdhui).du}
                debutHistorique={premiereSetlist(donnees.setlists, aujourdhui)} />
            ) : stats.plusJoues.length === 0 ? (
              <p role="status" className="raised rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground">
                Aucun chant dans cette langue sur cette période.
              </p>
            ) : (
              <>
                <ListeTelephone lignes={lignes} aujourdhui={aujourdhui} tri={etat.tri} trier={(cle) => changer({ tri: cle, sens: SENS_PAR_DEFAUT[cle] })} />
                <Tableau lignes={lignes} aujourdhui={aujourdhui} tri={etat.tri} sens={etat.sens} trier={trier} />
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

/** La première setlist publiée passée : le début de l'historique (« À redécouvrir », Q11). */
function premiereSetlist(setlists: FSSetlist[], aujourdhui: string): string | null {
  const jours = setlists.map((s) => (s.date ?? "").slice(0, 10)).filter((j) => /^\d{4}-\d{2}-\d{2}$/.test(j) && j < aujourdhui);
  return jours.length ? jours.reduce((min, j) => (j < min ? j : min)) : null;
}

/** « Les plus joués · Jamais joués · À redécouvrir » : à droite du titre sur grand écran, dessous
 *  ailleurs, pleine largeur sur téléphone (planches bo-statistiques et bo-statistiques-telephone). */
function SelecteurVue({ vue, choisir }: { vue: Vue; choisir: (vue: Vue) => void }) {
  return (
    <div role="group" aria-label="Vue" className="flex w-full shrink-0 rounded-full bg-secondary p-[3px] sm:inline-flex sm:w-auto lg:mt-1">
      {VUES.map((v) => (
        <button key={v.vue} type="button" aria-pressed={vue === v.vue} onClick={() => choisir(v.vue)}
          className={cn(
            "flex-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-[background-color,color] duration-150 sm:flex-none",
            vue === v.vue ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}>
          {v.libelle}
        </button>
      ))}
    </div>
  );
}

// ─── Filtres ──────────────────────────────────────────────────────────────────

const PASTILLE = "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.97]";
const pastille = (actif: boolean) =>
  cn(PASTILLE, actif ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-muted");

function Filtres({ etat, aujourdhui, services, presidences, nomService, choisirPeriode, changer }: {
  etat: Etat; aujourdhui: string; services: string[]; presidences: string[];
  nomService: (categorie: string) => string;
  choisirPeriode: (p: ChoixPeriode) => void;
  changer: (modif: Partial<Etat>) => void;
}) {
  const principales = ALL_CATEGORIES.slice(0, 4) as string[];
  const groupes = ALL_CATEGORIES.slice(4) as string[];
  const autres = services.slice(ALL_CATEGORIES.length);
  const hier = veille(aujourdhui);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODES.map(({ choix, libelle }) => (
          <button key={choix} type="button" aria-pressed={etat.periode === choix} onClick={() => choisirPeriode(choix)} className={pastille(etat.periode === choix)}>
            {libelle}
          </button>
        ))}
        <button type="button" aria-pressed={etat.periode === "libre"} onClick={() => choisirPeriode("libre")} className={pastille(etat.periode === "libre")}>
          <CalendarDays className="h-4 w-4" aria-hidden />
          Dates libres
        </button>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <Choix libelle="Service" valeur={etat.service ?? ""} onChange={(v) => changer({ service: v || null })}>
          <option value="">Tous les services</option>
          <optgroup label="Réunions principales">
            {principales.map((c) => <option key={c} value={c}>{nomService(c)}</option>)}
          </optgroup>
          <optgroup label="Groupes">
            {groupes.map((c) => <option key={c} value={c}>{nomService(c)}</option>)}
          </optgroup>
          {autres.length > 0 && (
            <optgroup label="Autres">
              {autres.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          )}
        </Choix>
        <Choix libelle="Langue" valeur={etat.langue ?? ""} onChange={(v) => changer({ langue: v === "fr" || v === "zh" ? v : null })}>
          <option value="">FR et 中文</option>
          <option value="fr">FR</option>
          <option value="zh">中文</option>
        </Choix>
        <Choix libelle="Présidence" valeur={etat.presidence ?? ""} onChange={(v) => changer({ presidence: v || null })}>
          <option value="">Toutes les présidences</option>
          {presidences.map((p) => <option key={p} value={p}>{p}</option>)}
        </Choix>
      </div>
      {etat.periode === "libre" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <span className="font-semibold">Du</span>
            <input type="date" value={etat.du} max={etat.au || hier} onChange={(e) => changer({ du: e.target.value })}
              className="h-9 rounded-lg bg-secondary px-3 focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <label className="inline-flex items-center gap-2">
            <span className="font-semibold">Au</span>
            <input type="date" value={etat.au} min={etat.du || undefined} max={hier} onChange={(e) => changer({ au: e.target.value })}
              className="h-9 rounded-lg bg-secondary px-3 focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
        </div>
      )}
    </div>
  );
}

/** Un `<select>` en pastille (planche : « Tous les services ▾ »). */
function Choix({ libelle, valeur, onChange, children }: {
  libelle: string; valeur: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <select aria-label={libelle} value={valeur} onChange={(e) => onChange(e.target.value)}
        className={cn(PASTILLE, "appearance-none bg-secondary pr-8 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/30")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
    </span>
  );
}

// ─── Cartes et lignes ─────────────────────────────────────────────────────────

/** Étiquette de langue : FR en bleu, 中文 en rouge (couleurs des tonalités, `KeyPill`). */
function Langue({ langue }: { langue: "fr" | "zh" }) {
  const couleur = langue === "zh" ? "var(--zh-accent)" : "var(--fr-accent)";
  return (
    <span data-testid="langue" className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none"
      style={{ color: couleur, background: `color-mix(in srgb, ${couleur} 11%, transparent)` }}>
      {langue === "zh" ? "中文" : "FR"}
    </span>
  );
}

/** Le titre (lien vers le chant) et son étiquette ; un chant absent du recueil garde son slug (Q12). */
function TitreChant({ ligne }: { ligne: Pick<LigneChant, "slug" | "titre" | "langue"> }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      {ligne.langue ? (
        <Link data-champ="titre" href={`/songs/${ligne.slug}`} className="font-semibold hover:underline underline-offset-2">{ligne.titre}</Link>
      ) : (
        <span data-champ="titre" className="font-semibold">{ligne.titre}</span>
      )}
      {ligne.langue ? <Langue langue={ligne.langue} /> : <span className="text-xs text-muted-foreground">absent du recueil</span>}
    </span>
  );
}

function Tendance({ tendance }: { tendance: number | null }) {
  return (
    <span data-champ="tendance" className={cn(
      "tabular-nums",
      tendance !== null && tendance > 0 && "text-emerald-700 dark:text-emerald-400",
      tendance !== null && tendance < 0 && "text-red-700 dark:text-red-400",
    )}>
      {libelleTendance(tendance)}
    </span>
  );
}

function DixPremiers({ lignes }: { lignes: LigneChant[] }) {
  const max = lignes[0]?.setlists ?? 1;
  return (
    <section data-testid="dix-premiers" className="raised rounded-2xl px-5 py-4">
      <h2 className="text-sm font-semibold text-muted-foreground">Les 10 premiers</h2>
      <ol className="mt-2 space-y-1">
        {lignes.map((l) => (
          <li key={l.slug} data-testid="barre-chant" className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-3 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <span className="truncate text-right">{l.titre}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span data-barre aria-hidden="true" className="h-5 shrink-0 rounded-[4px] bg-foreground"
                style={{ width: `calc((100% - 5.5rem) * ${l.setlists / max})` }} />
              <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                <b className="font-bold text-foreground">{l.setlists}</b> · {libellePart(l.part)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Téléphone : une liste (ligne 1 : rang, titre, étiquette ; ligne 2 : les nombres) et « Trier par ». */
function ListeTelephone({ lignes, aujourdhui, tri, trier }: {
  lignes: LigneChant[]; aujourdhui: string; tri: CleTri; trier: (cle: CleTri) => void;
}) {
  return (
    <div className="space-y-3 sm:hidden">
      <label className={cn(PASTILLE, "raised relative pr-8")}>
        <ArrowDownWideNarrow className="h-4 w-4" aria-hidden />
        <span aria-hidden>Trier par :</span>
        <select aria-label="Trier par" value={tri} onChange={(e) => trier(e.target.value as CleTri)}
          className="appearance-none bg-transparent font-semibold focus:outline-none">
          {COLONNES_TRI.map(({ cle, libelle }) => <option key={cle} value={cle}>{libelle}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden />
      </label>
      <ol className="raised rounded-2xl px-4 divide-y divide-border">
        {lignes.map((l) => (
          <li key={l.slug} data-testid="ligne-chant" className="flex gap-3 py-3">
            <span data-champ="rang" className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{l.rang}</span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <TitreChant ligne={l} />
              <p className="text-sm text-muted-foreground">
                <b data-champ="setlists" className="font-bold text-foreground tabular-nums">{l.setlists}</b> setlists
                {" · "}<span data-champ="part" className="tabular-nums">{libellePart(l.part)}</span>
                {" · "}<span data-champ="derniere" className="tabular-nums">{jourCourt(l.derniereFois, aujourdhui)}</span>
                {" · "}<span data-champ="tonalite">{l.tonalites.join(" / ")}</span>
                {" · "}<b className="font-bold"><Tendance tendance={l.tendance} /></b>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Tablette et ordinateur : le tableau de la planche, en-têtes cliquables (Q9). */
function Tableau({ lignes, aujourdhui, tri, sens, trier }: {
  lignes: LigneChant[]; aujourdhui: string; tri: CleTri; sens: Sens; trier: (cle: CleTri) => void;
}) {
  const enTete = (cle: CleTri, libelle: string, className?: string) => {
    const actif = tri === cle;
    const Fleche = sens === "asc" ? ChevronUp : ChevronDown;
    return (
      <th scope="col" aria-sort={actif ? (sens === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3 py-3 font-semibold", className)}>
        <button type="button" onClick={() => trier(cle)} className={cn("inline-flex items-center gap-1 hover:text-foreground", actif && "text-foreground")}>
          {libelle}
          {actif && <Fleche className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        </button>
      </th>
    );
  };
  return (
    <div className="hidden raised rounded-2xl px-2 sm:block">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="w-10 px-3 py-3 text-right font-semibold">#</th>
            {enTete("chant", "Chant")}
            {enTete("setlists", "Setlists", "text-right")}
            <th scope="col" className="px-3 py-3 text-right font-semibold">% des setlists</th>
            {enTete("derniere", "Dernière fois")}
            <th scope="col" className="px-3 py-3 font-semibold">Tonalité la plus jouée</th>
            {enTete("tendance", "Tendance", "text-right")}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lignes.map((l) => (
            <tr key={l.slug} data-testid="ligne-chant">
              <td data-champ="rang" className="px-3 py-3 text-right text-muted-foreground tabular-nums">{l.rang}</td>
              <td className="px-3 py-3"><TitreChant ligne={l} /></td>
              <td data-champ="setlists" className="px-3 py-3 text-right font-bold tabular-nums">{l.setlists}</td>
              <td data-champ="part" className="px-3 py-3 text-right tabular-nums">{libellePart(l.part)}</td>
              <td data-champ="derniere" className="px-3 py-3 tabular-nums">{jourCourt(l.derniereFois, aujourdhui)}</td>
              <td data-champ="tonalite" className="px-3 py-3">{l.tonalites.join(" / ")}</td>
              <td className="px-3 py-3 text-right"><Tendance tendance={l.tendance} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Jamais joués, À redécouvrir (S4) ─────────────────────────────────────────

const MESSAGE = "raised rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground";

/** « Jamais joués » : les chants du recueil absents des setlists comptées, dans l'ordre du recueil
 *  (Q11), avec l'artiste et la dernière fois toutes dates confondues ou « jamais ». */
function JamaisJoues({ chants, total, aujourdhui }: {
  chants: StatsChants["jamaisJoues"]; total: number; aujourdhui: string;
}) {
  if (chants.length === 0) return <p role="status" className={MESSAGE}>Tous les chants ont été joués sur cette période.</p>;
  const derniere = (jour: string | null) => (jour ? jourCourt(jour, aujourdhui) : "jamais");
  return (
    <section className="raised rounded-2xl px-2">
      <h2 className="px-3 pt-4 pb-1 text-sm font-semibold text-muted-foreground">
        {chants.length} {chants.length > 1 ? "chants" : "chant"} sur {total}
      </h2>
      <ol className="divide-y divide-border sm:hidden">
        {chants.map((c) => (
          <li key={c.slug} data-testid="ligne-jamais" className="space-y-0.5 px-2 py-3">
            <TitreChant ligne={c} />
            <p className="text-sm text-muted-foreground">
              <span data-champ="artiste">{c.artiste}</span>
              {" · "}<span data-champ="derniere" className="tabular-nums">{derniere(c.derniereFois)}</span>
            </p>
          </li>
        ))}
      </ol>
      <table className="hidden w-full text-sm sm:table">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="px-3 py-3 font-semibold">Chant</th>
            <th scope="col" className="px-3 py-3 font-semibold">Artiste</th>
            <th scope="col" className="px-3 py-3 font-semibold">Dernière fois</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {chants.map((c) => (
            <tr key={c.slug} data-testid="ligne-jamais">
              <td className="px-3 py-3"><TitreChant ligne={c} /></td>
              <td data-champ="artiste" className="px-3 py-3 text-muted-foreground">{c.artiste}</td>
              <td data-champ="derniere" className="px-3 py-3 tabular-nums">{derniere(c.derniereFois)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** « À redécouvrir » : au moins trois setlists avant la période, aucune pendant (Q11). Sans
 *  setlist avant la période (« Depuis le début », ou une période plus longue que l'historique),
 *  la liste le dit. */
function ARedecouvrir({ chants, aujourdhui, debutPeriode, debutHistorique }: {
  chants: StatsChants["aRedecouvrir"]; aujourdhui: string; debutPeriode: string | null; debutHistorique: string | null;
}) {
  if (!debutPeriode || !debutHistorique || debutHistorique >= debutPeriode) {
    return (
      <p role="status" className={MESSAGE}>
        L&apos;historique commence le {debutHistorique ? jourLong(debutHistorique) : "?"} : choisis une période plus courte.
      </p>
    );
  }
  if (chants.length === 0) return <p role="status" className={MESSAGE}>Aucun chant à redécouvrir sur cette période.</p>;
  return (
    <section className="raised rounded-2xl px-2">
      <h2 className="px-3 pt-4 pb-1 text-sm font-semibold text-muted-foreground">
        Joués au moins {SEUIL_A_REDECOUVRIR} fois avant le {jourCourt(debutPeriode, aujourdhui)}, aucune fois depuis
      </h2>
      <ol className="divide-y divide-border sm:hidden">
        {chants.map((c, i) => (
          <li key={c.slug} data-testid="ligne-redecouvrir" className="flex gap-3 px-2 py-3">
            <span data-champ="rang" className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <TitreChant ligne={c} />
              <p className="text-sm text-muted-foreground">
                <b data-champ="avant" className="font-bold text-foreground tabular-nums">{c.avant}</b> avant la période
                {" · "}<span data-champ="derniere" className="tabular-nums">{jourCourt(c.derniereFois, aujourdhui)}</span>
                {" · "}<span data-champ="tonalite">{c.tonalites.join(" / ")}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
      <table className="hidden w-full text-sm sm:table">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="w-10 px-3 py-3 text-right font-semibold">#</th>
            <th scope="col" className="px-3 py-3 font-semibold">Chant</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Avant la période</th>
            <th scope="col" className="px-3 py-3 font-semibold">Dernière fois</th>
            <th scope="col" className="px-3 py-3 font-semibold">Tonalité la plus jouée</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {chants.map((c, i) => (
            <tr key={c.slug} data-testid="ligne-redecouvrir">
              <td data-champ="rang" className="px-3 py-3 text-right text-muted-foreground tabular-nums">{i + 1}</td>
              <td className="px-3 py-3"><TitreChant ligne={c} /></td>
              <td data-champ="avant" className="px-3 py-3 text-right font-bold tabular-nums">{c.avant}</td>
              <td data-champ="derniere" className="px-3 py-3 tabular-nums">{jourCourt(c.derniereFois, aujourdhui)}</td>
              <td data-champ="tonalite" className="px-3 py-3">{c.tonalites.join(" / ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
