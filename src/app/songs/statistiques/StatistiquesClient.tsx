"use client";

// Lot U7 (docs/spec-statistiques.md), S3 : la vue « Les plus joués » — lecture des setlists et du
// recueil, filtres (période, service, langue, présidence) gardés dans l'URL (Q13), cartes
// « Setlists comptées » et « Les 10 premiers », tableau trié (Q9) ou liste sur téléphone.
// S4 : le sélecteur « Les plus joués · Jamais joués · À redécouvrir » (Q11), mêmes filtres et
// même carte « Setlists comptées » dans les trois vues.
// Calcul : `statsChants` (src/lib/stats/chantsJoues.ts). Rien n'est écrit. Bilingue depuis B5b (Q14 levée).
// Agencement v18 (B13) : en-tête commun « Statistiques » (le compte des setlists dans le sous-titre),
// rail des vues sous le titre, filtres dessous (périodes en pilules, listes) ; « Jamais joués » en
// deux cartes, « En français » sur deux colonnes et « En chinois » sur une, puis « Tout afficher ».
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowDownWideNarrow, ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/firebase/auth";
import { canFiltrerPresidence } from "@/lib/access";
import { ALL_CATEGORIES, getSetlists, type FSSetlist } from "@/lib/firebase/setlists";
import { listProfiles } from "@/lib/firebase/users";
import { normalizeName } from "@/lib/planning/names";
import type { UserProfile } from "@/types/user";
import {
  SEUIL_A_REDECOUVRIR, bornesDeLaPeriode, choixDesFiltres, debutDeLHistorique, jourCourt, jourEnLettres, libellePart, libelleTendance, nomDePresidence,
  presidences, serviceCourt, statsChants, statsGroupe, statsPresidence,
  veille, type FiltresStats, type LigneChant, type LignePresidence, type Periode, type StatsChants, type StatsGroupe, type StatsPresidence,
} from "@/lib/stats/chantsJoues";
import { LargeurBO } from "@/components/backOffice/LargeurBO";
import { EnTetePage } from "@/components/layout/EnTetePage";
import { OngletsRail, Pilules } from "@/components/layout/Onglets";
import { Button } from "@/components/ui/button";
import { KeyPill } from "@/components/ui/key-pill";
import type { SongIndexEntry } from "@/types/song";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import { cn } from "@/lib/utils";

type Vue = "plus" | "jamais" | "redecouvrir";
type ChoixPeriode = "3" | "6" | "12" | "debut" | "libre";

/** Les trois vues et leur nom dans l'adresse (« Les plus joués » : pas de paramètre). */
const VUES: { vue: Vue; adresse: string | null }[] = [
  { vue: "plus", adresse: null },
  { vue: "jamais", adresse: "jamais-joues" },
  { vue: "redecouvrir", adresse: "a-redecouvrir" },
];
type CleTri = "chant" | "setlists" | "derniere" | "tendance";
type Sens = "asc" | "desc";

const PERIODES: ChoixPeriode[] = ["3", "6", "12", "debut", "libre"];
const COLONNES_TRI: CleTri[] = ["chant", "setlists", "derniere", "tendance"];
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

/** « 24/05/2026 ». */
function jourLong(jour: string): string {
  const [a, m, j] = jour.split("-");
  return `${j}/${m}/${a}`;
}

type Lecture =
  | { etat: "calcul" }
  | { etat: "echec"; message: string }
  | { etat: "pret"; setlists: FSSetlist[]; recueil: SongIndexEntry[]; choix: { services: string[]; presidences: string[] } };

/** BO-G, 8 : la largeur de lecture commune du Back-Office (LargeurBO), comme À faire et la page d'une équipe. */
export function StatistiquesClient() {
  return <LargeurBO><StatistiquesContenu /></LargeurBO>;
}

function StatistiquesContenu() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === "zh-CN";
  // `useAuth` n'est pas partagé : sa première lecture rend `null`, ne rien décider avant `loading` faux.
  const { user, loading } = useAuth();
  const peutFiltrerPresidence = canFiltrerPresidence(user);
  // Même « aujourd'hui » que les Archives de l'onglet Setlists (Q3).
  const aujourdhui = useMemo(() => new Date().toISOString().split("T")[0], []);
  // L'adresse d'abord (le retour depuis un chant retrouve l'écran), puis on la tient à jour.
  // La page n'est rendue qu'au navigateur (elle attend le compte) : `window` est là.
  const [etat, setEtat] = useState<Etat>(() =>
    typeof window === "undefined" ? ETAT_PAR_DEFAUT : lireAdresse(window.location.search));
  // Sans le droit, une présidence venue de l'adresse est ignorée (D5).
  useEffect(() => { if (!loading && !peutFiltrerPresidence) setEtat((e) => (e.presidence === null ? e : { ...e, presidence: null })); }, [loading, peutFiltrerPresidence]);
  const [lecture, setLecture] = useState<Lecture>({ etat: "calcul" });
  useEffect(() => { window.history.replaceState(null, "", ecrireAdresse(etat)); }, [etat]);
  const changer = (modif: Partial<Etat>) => setEtat((e) => ({ ...e, ...modif }));

  const lire = useCallback(() => {
    Promise.all([
      getSetlists(),
      chargerIndexChants().catch(() => null),
    ])
      .then(([setlists, index]) => {
        // La base compte plus de cent setlists : zéro veut dire que la lecture a échoué.
        if (setlists.length === 0) setLecture({ etat: "echec", message: t("stats.lireSetlists") });
        else if (!index) setLecture({ etat: "echec", message: t("stats.lireRecueil") });
        else {
          const choix = choixDesFiltres(setlists, aujourdhui, ALL_CATEGORIES);
          setLecture({ etat: "pret", setlists, recueil: index, choix });
          // Un service ou une présidence de l'adresse absents des menus (lien retouché) : ignorés,
          // pour que le menu dise toujours le filtre appliqué.
          setEtat((e) => {
            const service = e.service !== null && !choix.services.includes(e.service) ? null : e.service;
            const presidence = e.presidence !== null && !choix.presidences.includes(e.presidence) ? null : e.presidence;
            return service === e.service && presidence === e.presidence ? e : { ...e, service, presidence };
          });
        }
      })
      .catch(() => setLecture({ etat: "echec", message: t("stats.lireSetlists") }));
  }, [aujourdhui, t]);
  useEffect(() => { lire(); }, [lire]);

  // Lot SP, SP4/P7 : les profils ne sont lus que pour un admin qui a choisi un service, une fois par visite.
  const profilsLus = useRef<Promise<UserProfile[]> | null>(null);
  const [profils, setProfils] = useState<UserProfile[] | null>(null);
  useEffect(() => {
    if (loading || !peutFiltrerPresidence || !etat.service) return;
    profilsLus.current ??= listProfiles();
    let vivant = true;
    profilsLus.current.then((p) => { if (vivant) setProfils(p); }).catch(() => {});
    return () => { vivant = false; };
  }, [loading, peutFiltrerPresidence, etat.service]);

  const donnees = lecture.etat === "pret" ? lecture : null;
  const stats = useMemo(() => {
    if (!donnees) return null;
    const filtres: FiltresStats = { periode: enPeriode(etat), service: etat.service, langue: etat.langue, presidence: peutFiltrerPresidence ? etat.presidence : null };
    return statsChants(donnees.setlists, donnees.recueil, filtres, aujourdhui);
  }, [donnees, etat, aujourdhui, peutFiltrerPresidence]);
  // Lot SP : la rangée du groupe (tout connecté, service choisi), les présidences (admins).
  const groupe = useMemo(() => {
    if (!donnees || !etat.service) return null;
    return statsGroupe(donnees.setlists, donnees.recueil, etat.service, enPeriode(etat), aujourdhui);
  }, [donnees, etat, aujourdhui]);
  const presidenceChoisie = useMemo(() => {
    if (!donnees || !peutFiltrerPresidence || !etat.presidence) return null;
    // Un service choisi : ne garder que ses setlists, comme les vues filtrées.
    const setlists = etat.service ? donnees.setlists.filter((s) => s.category === etat.service) : donnees.setlists;
    return statsPresidence(setlists, donnees.recueil, etat.presidence, enPeriode(etat), aujourdhui);
  }, [donnees, etat, aujourdhui, peutFiltrerPresidence]);
  const lignesPresidence = useMemo(() => {
    if (!donnees || !peutFiltrerPresidence || etat.presidence) return null;
    return presidences(donnees.setlists, enPeriode(etat), aujourdhui, etat.service);
  }, [donnees, etat, aujourdhui, peutFiltrerPresidence]);
  const lignes = useMemo(() => {
    if (!stats) return [];
    const triees = [...stats.plusJoues].sort(COMPARER[etat.tri]);
    return etat.sens === SENS_PAR_DEFAUT[etat.tri] ? triees : triees.reverse();
  }, [stats, etat]);

  const donneesPretes = stats && donnees ? { stats, donnees } : null;
  const comptees = stats?.comptees;
  const debut = donnees ? debutDeLHistorique(donnees.setlists, aujourdhui) : null;
  const depuis = debut ? t("stats.depuis", { date: jourEnLettres(debut, zh) }) : "";
  const suite = !comptees ? ""
    : comptees.nombre === 0 ? t("stats.aucuneSetlist")
    : t("stats.comptees", { count: comptees.nombre, du: jourEnLettres(comptees.du!, zh), au: jourEnLettres(comptees.au!, zh) });
  const sousTitre = [depuis, suite].filter(Boolean).join(" · ");
  const choisirPeriode = (periode: ChoixPeriode) => {
    if (periode !== "libre" || !stats) return changer({ periode });
    // « Dates libres » part de ce qu'on regarde : les bornes de la période ou des setlists comptées.
    const au = veille(aujourdhui);
    const du = stats.comptees.du ?? au;
    changer({ periode, du: etat.periode === "libre" ? etat.du : du, au: etat.periode === "libre" ? etat.au : au });
  };
  const enTete = (
    <EnTetePage
      retour={{ href: "/songs", label: t("common.header.songs") }}
      titre={t("backOffice.entrees.statistiques")}
      sousTitre={sousTitre}
      onglets={<OngletsRail etiquette={t("stats.vue")} onglets={VUES.map((v) => ({ id: v.vue, label: t(`stats.vues.${v.vue}`) }))} actif={etat.vue} choisir={(vue) => changer({ vue: vue as Vue })} />}
      apres={donneesPretes && (
        <Filtres
          etat={etat} aujourdhui={aujourdhui} services={donneesPretes.donnees.choix.services} presidences={peutFiltrerPresidence ? donneesPretes.donnees.choix.presidences : null}
          nomService={(c) => t("categories." + c, { defaultValue: c })}
          choisirPeriode={choisirPeriode} changer={changer}
        />
      )}
    />
  );
  const CORPS = "space-y-4 px-[var(--marge-page)] pb-10";

  if (lecture.etat === "echec") {
    return (
      <>
        {enTete}
        <div className={CORPS}>
        <div role="alert" className="raised rounded-2xl px-5 py-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">{lecture.message}</p>
          <button type="button" onClick={() => { setLecture({ etat: "calcul" }); lire(); }} className="h-9 px-4 rounded-full bg-foreground text-background text-sm font-semibold transition-transform active:scale-[.97]">
            {t("common.retry")}
          </button>
        </div>
        </div>
      </>
    );
  }
  if (!stats || !donnees) {
    return <>{enTete}<p role="status" className={cn(CORPS, "text-sm text-muted-foreground")}>{t("stats.calcul")}</p></>;
  }

  const trier = (cle: CleTri) =>
    changer(cle === etat.tri ? { sens: etat.sens === "asc" ? "desc" : "asc" } : { tri: cle, sens: SENS_PAR_DEFAUT[cle] });
  const bornes = bornesDeLaPeriode(enPeriode(etat), aujourdhui);
  const nombre = stats.comptees.nombre;
  const auRepertoire = donnees.recueil.filter((c) => etat.langue === null || c.language === etat.langue).length;
  const tonalites = new Map(donnees.recueil.map((c) => [c.slug, c.originalKey]));

  // Une période sans setlist n'a pas de bornes : la carte n'est rendue qu'avec au moins une setlist.
  const carteComptees = nombre > 0 && (
    // Téléphone : le nombre à gauche, le titre et les dates à droite, sur une ligne.
    <section data-testid="setlists-comptees"
      className="raised rounded-2xl px-5 py-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 sm:grid-cols-1 sm:items-start sm:content-start">
      <h2 className="col-start-2 row-start-1 self-end text-sm font-semibold text-muted-foreground sm:col-start-1 sm:self-auto">
        {t("stats.setlistsComptees")}
      </h2>
      <p data-testid="nombre" className="col-start-1 row-start-1 row-span-2 text-3xl font-bold tabular-nums sm:row-start-2 sm:row-span-1 sm:mt-1">
        {nombre}
      </p>
      <p className="col-start-2 row-start-2 self-start text-sm text-muted-foreground sm:col-start-1 sm:row-start-3 sm:self-auto">
        {t("stats.publiees", { du: jourCourt(stats.comptees.du!, aujourdhui), au: jourCourt(stats.comptees.au!, aujourdhui) })}
      </p>
    </section>
  );

  // Noms courts : « Fidélité » en français ; 中文 prend la traduction de `categories` (déjà sans « Groupe »).
  const nomService = (c: string) => (zh ? t("categories." + c, { defaultValue: serviceCourt(c) }) : serviceCourt(c));
  // Le filtre attend une graphie présente dans ses choix : celle de `choix.presidences` de même `normalizeName`.
  const choisirPresidence = (nom: string) =>
    changer({ presidence: donnees.choix.presidences.find((p) => normalizeName(p) === normalizeName(nom)) ?? nom });

  return (
    <>
      {enTete}
      {/* Un conteneur : « Les plus joués » se range selon la place laissée par la barre (R6). */}
      <div className={cn(CORPS, "[container-type:inline-size]")}>
        {groupe && groupe.setlists > 0 && <RangeeGroupe groupe={groupe} />}
        {presidenceChoisie && etat.presidence && (
          <BlocPresidence nom={etat.presidence} stats={presidenceChoisie} aujourdhui={aujourdhui} nomService={nomService} />
        )}
        {lignesPresidence && lignesPresidence.length > 0 && (
          <CartePresidences key={[etat.periode, etat.du, etat.au, etat.service].join("|")}
            lignes={lignesPresidence} service={etat.service} aujourdhui={aujourdhui} nomService={nomService}
            choisir={choisirPresidence} profils={profils} />
        )}
        {nombre === 0 ? (
          <p role="status" className="raised rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground">
            {t("stats.aucuneSetlistPeriode")}
          </p>
        ) : etat.vue === "plus" ? (
          // Dès 1 100 px de conteneur (planche v18-bo-statistiques) : les chiffres à gauche, le classement
          // à droite. En dessous (D11, retouches v18 R6), les trois chiffres sur une rangée au-dessus du
          // tableau, qui garde toute la largeur et ne défile pas ; sous 1 024 px de fenêtre, la carte des
          // setlists comptées seule, comme avant.
          <div className="grid items-start gap-4 [@container(min-width:1100px)]:grid-cols-[260px_minmax(0,1fr)]">
            <div className="grid gap-4 lg:grid-cols-3 [@container(min-width:1100px)]:grid-cols-1">
              {carteComptees}
              <section className="raised hidden rounded-2xl px-5 py-4 lg:block">
                <h2 className="text-sm font-semibold text-muted-foreground">{t("stats.chantsDifferents")}</h2>
                {/* Les chants du recueil seuls : un absent du recueil ferait dire « 6 sur 5 ». */}
                <p className="mt-1 text-3xl font-bold tabular-nums">{stats.plusJoues.filter((l) => l.langue).length}</p>
                <p className="text-sm text-muted-foreground">{t("stats.surRepertoire", { n: auRepertoire })}</p>
              </section>
              <button type="button" onClick={() => changer({ vue: "jamais" })}
                className="raised hidden rounded-2xl px-5 py-4 text-left transition-transform active:scale-[.99] lg:block">
                <span className="block text-sm font-semibold text-muted-foreground">{t("stats.vues.jamais")}</span>
                <span className="mt-1 block text-3xl font-bold tabular-nums">{stats.jamaisJoues.length}</span>
                <span className="block text-sm text-muted-foreground">{t("stats.voirOnglet")}</span>
              </button>
            </div>
            <div className="min-w-0 space-y-4">
              {lignes.length > 0 && <DixPremiers lignes={stats.plusJoues.slice(0, 10)} />}
              {stats.plusJoues.length === 0 ? (
                <p role="status" className="raised rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground">
                  {t("stats.aucunChantLangue")}
                </p>
              ) : (
                <>
                  <ListeTelephone lignes={lignes} aujourdhui={aujourdhui} tri={etat.tri} trier={(cle) => changer({ tri: cle, sens: SENS_PAR_DEFAUT[cle] })} />
                  <Tableau lignes={lignes} aujourdhui={aujourdhui} tri={etat.tri} sens={etat.sens} trier={trier} />
                </>
              )}
            </div>
          </div>
        ) : etat.vue === "jamais" ? (
          <>
            {/* En grand, le sous-titre compte les setlists : les deux cartes viennent sous les filtres (planche). */}
            <div className="lg:hidden">{carteComptees}</div>
            {/* Un filtre changé repart des cartes repliées (« Tout afficher » ne survit pas). */}
            <JamaisJoues key={[etat.periode, etat.du, etat.au, etat.service, etat.langue, etat.presidence].join("|")}
              chants={stats.jamaisJoues} tonalites={tonalites} aujourdhui={aujourdhui} />
          </>
        ) : (
          <>
            {carteComptees}
            <ARedecouvrir chants={stats.aRedecouvrir} aujourdhui={aujourdhui}
              debutPeriode={bornes.du} finPeriode={bornes.au < veille(aujourdhui) ? bornes.au : null}
              debutHistorique={debutDeLHistorique(donnees.setlists, aujourdhui)} />
          </>
        )}
      </div>
    </>
  );
}

// ─── Filtres ──────────────────────────────────────────────────────────────────

const PASTILLE = "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.97]";

function Filtres({ etat, aujourdhui, services, presidences, nomService, choisirPeriode, changer }: {
  etat: Etat; aujourdhui: string; services: string[]; presidences: string[] | null;
  nomService: (categorie: string) => string;
  choisirPeriode: (p: ChoixPeriode) => void;
  changer: (modif: Partial<Etat>) => void;
}) {
  const { t } = useTranslation();
  const principales = ALL_CATEGORIES.slice(0, 4) as string[];
  const groupes = ALL_CATEGORIES.slice(4) as string[];
  const autres = services.slice(ALL_CATEGORIES.length);
  const hier = veille(aujourdhui);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 max-w-full">
          <Pilules etiquette={t("stats.periode.label")} options={PERIODES.map((cle) => ({ cle, nom: t(`stats.periode.${cle}`) }))} valeur={etat.periode} choisir={(p) => p && choisirPeriode(p)} obligatoire />
        </div>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
        <Choix libelle={t("stats.service")} valeur={etat.service ?? ""} onChange={(v) => changer({ service: v || null })}>
          <option value="">{t("stats.tousServices")}</option>
          <optgroup label={t("stats.reunionsPrincipales")}>
            {principales.map((c) => <option key={c} value={c}>{nomService(c)}</option>)}
          </optgroup>
          <optgroup label={t("stats.groupes")}>
            {groupes.map((c) => <option key={c} value={c}>{nomService(c)}</option>)}
          </optgroup>
          {autres.length > 0 && (
            <optgroup label={t("stats.autres")}>
              {autres.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          )}
        </Choix>
        <Choix libelle={t("stats.langue")} valeur={etat.langue ?? ""} onChange={(v) => changer({ langue: v === "fr" || v === "zh" ? v : null })}>
          <option value="">{t("stats.frEtZh")}</option>
          <option value="fr">FR</option>
          <option value="zh">中文</option>
        </Choix>
        {presidences && <Choix libelle={t("stats.presidence")} valeur={etat.presidence ?? ""} onChange={(v) => changer({ presidence: v || null })}>
          <option value="">{t("stats.toutesPresidences")}</option>
          {presidences.map((p) => <option key={p} value={p}>{p}</option>)}
        </Choix>}
      </div>
      {etat.periode === "libre" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-2">
            <span className="font-semibold">{t("stats.du")}</span>
            <input type="date" value={etat.du} max={etat.au || hier} onChange={(e) => changer({ du: e.target.value })}
              className="h-9 rounded-lg bg-secondary px-3 focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
          <label className="inline-flex items-center gap-2">
            <span className="font-semibold">{t("stats.au")}</span>
            <input type="date" value={etat.au} min={etat.du || undefined} max={hier} onChange={(e) => changer({ au: e.target.value })}
              className="h-9 rounded-lg bg-secondary px-3 focus:outline-none focus:ring-2 focus:ring-ring/30" />
          </label>
        </div>
      )}
    </div>
  );
}

/** Un `<select>` en pastille (planche : « Tous les services ▾ »), à la hauteur des pilules de la rangée
 *  (`Pilules`, D9) : 40 px au doigt, ≈ 28 px et 13 px dès 1 024 px avec un pointeur fin. */
function Choix({ libelle, valeur, onChange, children }: {
  libelle: string; valeur: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <select aria-label={libelle} value={valeur} onChange={(e) => onChange(e.target.value)}
        className={cn(PASTILLE, "h-10 appearance-none border border-input bg-background pr-8 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/30 [@media(pointer:fine)_and_(min-width:1024px)]:h-7 [@media(pointer:fine)_and_(min-width:1024px)]:text-[13px]")}>
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
  const { t } = useTranslation();
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
      {ligne.langue ? (
        <Link data-champ="titre" href={`/songs/${ligne.slug}`} className="font-semibold hover:underline underline-offset-2">{ligne.titre}</Link>
      ) : (
        <span data-champ="titre" className="font-semibold">{ligne.titre}</span>
      )}
      {ligne.langue ? <Langue langue={ligne.langue} /> : <span className="text-xs text-muted-foreground">{t("stats.absentRecueil")}</span>}
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
  const { t } = useTranslation();
  const max = lignes[0]?.setlists ?? 1;
  return (
    <section data-testid="dix-premiers" className="raised rounded-2xl px-5 py-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{t("stats.dixPremiers")}</h2>
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
  const { t } = useTranslation();
  return (
    <div className="space-y-3 sm:hidden">
      <label className={cn(PASTILLE, "raised relative pr-8")}>
        <ArrowDownWideNarrow className="h-4 w-4" aria-hidden />
        <span aria-hidden>{t("stats.trierPar")}</span>
        <select aria-label={t("stats.trierParAria")} value={tri} onChange={(e) => trier(e.target.value as CleTri)}
          className="appearance-none bg-transparent font-semibold focus:outline-none">
          {COLONNES_TRI.map((cle) => <option key={cle} value={cle}>{t(`stats.col.${cle}`)}</option>)}
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
                <b data-champ="setlists" className="font-bold text-foreground tabular-nums">{l.setlists}</b> {t("stats.setlistMot", { count: l.setlists })}
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
  const { t } = useTranslation();
  const enTete = (cle: CleTri, className?: string) => {
    const libelle = t(`stats.col.${cle}`);
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
  // Les chiffres passent au-dessus sous 1 100 px de conteneur (R6) : le tableau a la largeur et ne
  // défile plus ; `overflow-x-auto` reste un garde-fou (texte agrandi), rien ne sort de la carte.
  return (
    <div className="hidden raised overflow-x-auto rounded-2xl px-2 sm:block">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="w-10 px-3 py-3 text-right font-semibold">#</th>
            {enTete("chant")}
            {enTete("setlists", "text-right")}
            <th scope="col" className="px-3 py-3 text-right font-semibold">{t("stats.col.part")}</th>
            {enTete("derniere")}
            <th scope="col" className="px-3 py-3 font-semibold">{t("stats.col.tonalite")}</th>
            {enTete("tendance", "text-right")}
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
 *  (Q11), avec l'artiste et la dernière fois toutes dates confondues ou « jamais ». Agencement v18
 *  (B13) : une carte par langue, « En français » sur deux colonnes et « En chinois » sur une en grand,
 *  40 et 20 chants (10 sur téléphone), puis « Tout afficher ». */
function JamaisJoues({ chants, tonalites, aujourdhui }: {
  chants: StatsChants["jamaisJoues"]; tonalites: Map<string, string>; aujourdhui: string;
}) {
  const { t } = useTranslation();
  if (chants.length === 0) return <p role="status" className={MESSAGE}>{t("stats.tousJoues")}</p>;
  const fr = chants.filter((c) => c.langue === "fr");
  const zh = chants.filter((c) => c.langue === "zh");
  const deux = fr.length > 0 && zh.length > 0;
  const carte = (testId: string, titre: string, liste: typeof chants, limite: number, colonnes: string) => (
    <CarteJamais testId={testId} titre={titre} chants={liste} limite={limite} colonnes={colonnes} tonalites={tonalites} aujourdhui={aujourdhui} />
  );
  return (
    <div className={cn("grid items-start gap-4", deux && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
      {fr.length > 0 && carte("jamais-fr", t("stats.enFrancais"), fr, 40, "sm:columns-2")}
      {zh.length > 0 && carte("jamais-zh", t("stats.enChinois"), zh, 20, deux ? "sm:columns-2 lg:columns-1" : "sm:columns-2")}
    </div>
  );
}

/** Sur téléphone, une carte montre ses dix premiers chants avant « Tout afficher ». */
const LIMITE_TELEPHONE = 10;

function CarteJamais({ testId, titre, chants, limite, colonnes, tonalites, aujourdhui }: {
  testId: string; titre: string; chants: StatsChants["jamaisJoues"]; limite: number; colonnes: string;
  tonalites: Map<string, string>; aujourdhui: string;
}) {
  const { t } = useTranslation();
  const [tout, setTout] = useState(false);
  const montres = tout ? chants : chants.slice(0, limite);
  return (
    <section data-testid={testId} aria-labelledby={`${testId}-titre`} className="raised min-w-0 rounded-2xl px-[18px] py-3.5">
      <div className="flex min-h-8 items-center gap-3 pb-2">
        <h2 id={`${testId}-titre`} className="text-[15px] font-semibold text-foreground">{titre} · {chants.length}</h2>
        {!tout && chants.length > LIMITE_TELEPHONE && (
          <Button type="button" variant="outline" size="sm" onClick={() => setTout(true)}
            className={cn("ml-auto h-8", chants.length <= limite && "sm:hidden")}>
            {t("stats.toutAfficher")}
          </Button>
        )}
      </div>
      <ol className={cn("gap-x-[22px]", colonnes)}>
        {montres.map((c, i) => {
          const tonalite = tonalites.get(c.slug);
          return (
            <li key={c.slug} data-testid="ligne-jamais"
              className={cn("flex min-w-0 break-inside-avoid items-center gap-2 border-t border-border/60 py-1 text-sm",
                !tout && i >= LIMITE_TELEPHONE && "max-sm:hidden")}>
              <span className="min-w-0 flex-1 truncate">
                <Link data-champ="titre" href={`/songs/${c.slug}`} className="font-medium hover:underline underline-offset-2">{c.titre}</Link>
                <span className="text-xs text-muted-foreground"> · <span data-champ="artiste">{c.artiste}</span></span>
              </span>
              <span data-champ="derniere" className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {c.derniereFois ? jourCourt(c.derniereFois, aujourdhui) : t("stats.jamais")}
              </span>
              {tonalite && <span data-champ="tonalite"><KeyPill tonalite={tonalite} langue={c.langue} /></span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** « À redécouvrir » : au moins trois setlists avant la période, aucune pendant (Q11). Sans
 *  setlist avant la période (« Depuis le début », ou une période plus longue que l'historique),
 *  la liste le dit. `finPeriode` : la fin de dates libres d'avant hier (`null` = jusqu'à hier). */
function ARedecouvrir({ chants, aujourdhui, debutPeriode, finPeriode, debutHistorique }: {
  chants: StatsChants["aRedecouvrir"]; aujourdhui: string;
  debutPeriode: string | null; finPeriode: string | null; debutHistorique: string | null;
}) {
  const { t } = useTranslation();
  // Dates libres, « Du » vidé : la période n'a pas de début, donc pas d'avant.
  if (debutPeriode === "") {
    return <p role="status" className={MESSAGE}>{t("stats.choisirDebut")}</p>;
  }
  if (!debutPeriode || !debutHistorique || debutHistorique >= debutPeriode) {
    return (
      <p role="status" className={MESSAGE}>
        {t("stats.historique", { date: debutHistorique ? jourLong(debutHistorique) : "?" })}
      </p>
    );
  }
  if (chants.length === 0) return <p role="status" className={MESSAGE}>{t("stats.aucunARedecouvrir")}</p>;
  return (
    <section className="raised rounded-2xl px-2">
      <h2 className="px-3 pt-4 pb-1 text-sm font-semibold text-muted-foreground">
        {finPeriode
          ? t("stats.joues", { n: SEUIL_A_REDECOUVRIR, debut: jourCourt(debutPeriode, aujourdhui), fin: jourCourt(finPeriode, aujourdhui) })
          : t("stats.jouesDepuis", { n: SEUIL_A_REDECOUVRIR, debut: jourCourt(debutPeriode, aujourdhui) })}
      </h2>
      <ol className="divide-y divide-border sm:hidden">
        {chants.map((c, i) => (
          <li key={c.slug} data-testid="ligne-redecouvrir" className="flex gap-3 px-2 py-3">
            <span data-champ="rang" className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <TitreChant ligne={c} />
              <p className="text-sm text-muted-foreground">
                <b data-champ="avant" className="font-bold text-foreground tabular-nums">{c.avant}</b> {t("stats.avantLaPeriode")}
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
            <th scope="col" className="px-3 py-3 font-semibold">{t("stats.col.chant")}</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">{t("stats.col.avant")}</th>
            <th scope="col" className="px-3 py-3 font-semibold">{t("stats.col.derniere")}</th>
            <th scope="col" className="px-3 py-3 font-semibold">{t("stats.col.tonalite")}</th>
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

// ─── Un groupe, une personne (lot SP, SP3 et SP4) ─────────────────────────────

/** Le nombre d'une rangée de chiffres : le chiffre, son libellé dessous. */
function Chiffre({ testId, valeur, libelle }: { testId: string; valeur: string; libelle: string }) {
  return (
    <div className="min-w-0">
      <p data-testid={testId} className="text-2xl font-bold tabular-nums">{valeur}</p>
      <p className="text-sm text-muted-foreground">{libelle}</p>
    </div>
  );
}

/** SP4 : la rangée d'un service choisi, pour tout connecté. Elle suit la période, pas la langue
 *  (`statsGroupe` ne la prend pas : la part FR / 中文 en est justement le résultat). */
function RangeeGroupe({ groupe }: { groupe: StatsGroupe }) {
  const { t, i18n } = useTranslation();
  const decimal = new Intl.NumberFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <section data-testid="groupe-rangee" className="raised rounded-2xl px-5 py-4">
      <div className="grid grid-cols-3 gap-3">
        <Chiffre testId="groupe-setlists" valeur={String(groupe.setlists)} libelle={t("stats.groupe.setlists")} />
        <Chiffre testId="groupe-par-mois" valeur={decimal.format(groupe.parMois)} libelle={t("stats.groupe.parMois")} />
        <Chiffre testId="groupe-chants" valeur={String(groupe.chantsDifferents)} libelle={t("stats.groupe.chantsDifferents")} />
      </div>
      <p data-testid="groupe-langues" className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
        {groupe.chantsDifferents > 0
          ? t("stats.groupe.langues", { fr: libellePart(1 - groupe.partZh), zh: libellePart(groupe.partZh) })
          : t("stats.groupe.langues", { fr: "—", zh: "—" })}
        {" · "}{t("stats.groupe.tonalite", { t: groupe.tonalites.join(" / ") || "—" })}
      </p>
    </section>
  );
}

/** Les services d'une présidence, en noms courts : « Fidélité 7 · Paix 2 ». */
function ServicesEtFois({ parService, nomService }: { parService: StatsPresidence["parService"]; nomService: (s: string) => string }) {
  return <>{parService.map((p) => `${nomService(p.service)} ${p.fois}`).join(" · ")}</>;
}

/** SP3 : une présidence choisie, vue par un admin ; suit la période et le service choisis. */
function BlocPresidence({ nom, stats, aujourdhui, nomService }: {
  nom: string; stats: StatsPresidence; aujourdhui: string; nomService: (s: string) => string;
}) {
  const { t } = useTranslation();
  return (
    <section data-testid="presidence-bloc" className="raised rounded-2xl px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("stats.presidencesAdmin.titreDe", { nom })}</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("stats.presidencesAdmin.admins")}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3">
        <Chiffre testId="presidence-fois" valeur={String(stats.total)} libelle={t("stats.presidencesAdmin.fois")} />
        <Chiffre testId="presidence-derniere" valeur={stats.derniere ? jourCourt(stats.derniere.jour, aujourdhui) : "—"} libelle={t("stats.presidencesAdmin.derniere")} />
        <Chiffre testId="presidence-groupes" valeur={String(stats.parService.length)} libelle={t("stats.presidencesAdmin.groupes")} />
      </div>
      {stats.parService.length > 0 && (
        <p data-testid="presidence-services" className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <ServicesEtFois parService={stats.parService} nomService={nomService} />
        </p>
      )}
    </section>
  );
}

const LIGNES_PRESIDENCES = 10;
/** Colonnes Qui · Fois · Dernière (· Groupes dès `sm`), communes à l'en-tête et aux lignes. */
const RANGEE = "grid grid-cols-[minmax(0,1fr)_3rem_4.5rem] gap-x-3 sm:grid-cols-[minmax(0,1fr)_3rem_4.5rem_minmax(0,1.2fr)]";

/** SP3 : « Présidences » (admins), aucune présidence choisie ; avec un service choisi, « Présidences à … »
 *  et, dessous, les membres du groupe qui n'ont pas présidé (P7). */
function CartePresidences({ lignes, service, aujourdhui, nomService, choisir, profils }: {
  lignes: LignePresidence[]; service: string | null; aujourdhui: string; nomService: (s: string) => string;
  choisir: (nom: string) => void; profils: UserProfile[] | null;
}) {
  const { t } = useTranslation();
  const [tout, setTout] = useState(false);
  const [noms, setNoms] = useState(false);
  const montrees = tout ? lignes : lignes.slice(0, LIGNES_PRESIDENCES);
  const absents = useMemo(() => {
    if (!service || !profils) return [];
    const ontPreside = new Set(lignes.map((l) => normalizeName(l.nom)));
    return profils
      .filter((p) => (p.serviceRoles?.[service] ?? []).length > 0)
      .filter((p) => !ontPreside.has(normalizeName(nomDePresidence(p))))
      .map((p) => `${p.firstName} ${p.lastName}`.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));
  }, [service, profils, lignes]);
  const touche = "[@media(pointer:fine)]:min-h-8 min-h-11";
  return (
    <section data-testid="presidences-admin" className="raised rounded-2xl px-[18px] py-3.5">
      <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 pb-1">
        <h2 className="text-[15px] font-semibold text-foreground">
          {service ? t("stats.presidencesAdmin.titreService", { service: nomService(service) }) : t("stats.presidencesAdmin.titre")}
        </h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("stats.presidencesAdmin.admins")}</span>
      </div>
      {/* Des div à rôles ARIA, pas de <table> : les tests d'agencement du tableau des chants le visent par sa balise. */}
      <div role="table" aria-label={t("stats.presidencesAdmin.titre")} className="text-sm">
        <div role="row" className={cn(RANGEE, "border-b border-border py-2 text-xs text-muted-foreground")}>
          <span role="columnheader" className="font-semibold">{t("stats.presidencesAdmin.qui")}</span>
          <span role="columnheader" className="text-right font-semibold">{t("stats.presidencesAdmin.fois")}</span>
          <span role="columnheader" className="text-right font-semibold sm:text-left">{t("stats.presidencesAdmin.derniere")}</span>
          <span role="columnheader" className="hidden font-semibold sm:block">{t("stats.presidencesAdmin.groupes")}</span>
        </div>
        <div className="divide-y divide-border">
          {montrees.map((l) => {
            const services = l.services.map(nomService).join(" · ");
            return (
              <div key={l.nom} role="row" data-testid="ligne-presidence" className={cn(RANGEE, "items-center py-1")}>
                <span role="cell" className="min-w-0">
                  <button type="button" data-champ="nom" onClick={() => choisir(l.nom)}
                    className={cn("inline-flex items-center text-left font-semibold hover:underline underline-offset-2", touche)}>
                    {l.nom}
                  </button>
                  {services && <span className="block pb-1 text-xs text-muted-foreground sm:hidden">{services}</span>}
                </span>
                <span role="cell" data-champ="fois" className="text-right font-bold tabular-nums">{l.fois}</span>
                <span role="cell" data-champ="derniere" className="text-right tabular-nums sm:text-left">{jourCourt(l.derniere, aujourdhui)}</span>
                <span role="cell" data-champ="groupes" className="hidden text-muted-foreground sm:block">{services}</span>
              </div>
            );
          })}
        </div>
      </div>
      {!tout && lignes.length > LIGNES_PRESIDENCES && (
        <Button type="button" variant="outline" size="sm" onClick={() => setTout(true)} className="mt-2 [@media(pointer:coarse)]:h-11">
          {t("stats.toutAfficher")}
        </Button>
      )}
      {absents.length > 0 && (
        <div data-testid="presidences-absents" className="mt-2 border-t border-border/60 pt-1">
          <button type="button" aria-expanded={noms} onClick={() => setNoms((o) => !o)}
            className={cn("inline-flex items-center gap-1 text-left text-sm font-semibold text-muted-foreground hover:text-foreground", touche)}>
            {t("stats.presidencesAdmin.nonPresides", { count: absents.length })}
            <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", noms && "rotate-90")} aria-hidden />
          </button>
          {noms && (
            <ul className="columns-2 gap-x-6 pb-1 text-sm sm:columns-3">
              {absents.map((n) => <li key={n} className="break-inside-avoid py-0.5">{n}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
