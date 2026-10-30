"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { ChampRecherche } from "@/components/layout/ChampRecherche";
import { chantsDeLaBibliotheque, premieresLignes, trierMoinsJouesIci, type FiltresBibliotheque, type Tempo } from "@/lib/setlist/bibliotheque";
import { useAuth } from "@/lib/firebase/auth";
import { canVoirStatistiques } from "@/lib/access";
import { setlistsPourStats } from "@/lib/stats/setlistsPourStats";
import { jourCourt, serviceCourt, statsBibliotheque, type ContexteBibliotheque, type StatsBibliotheque } from "@/lib/stats/chantsJoues";
import type { FSSetlist } from "@/lib/firebase/setlists";
import { fetchSongAST } from "@/lib/api/songs";
import type { Token } from "@/types/chordPro";
import { KeyPill } from "@/components/ui/key-pill";
import { ChordLine } from "@/components/song/ChordLine";
import type { SongIndexEntry, Theme } from "@/types/song";
import { TitreVolet, useFeuille } from "@/components/setlists/editeur/feuille";
import { PastilleSection, dessinSection } from "@/components/setlists/editeur/Reglages";
import { lienPartition } from "@/components/setlists/editeur/Volets";
import themesJson from "../../../../content/themes.json";

// Bibliothèque de l'éditeur (lot U5 bis, planche `creer-piste2-bibliotheque`) : elle
// prend la place des réglages (T3) ou s'ouvre en feuille sur téléphone et tablette en
// portrait (T4, planche `creer-piste2-telephone-ajouter` : « N chants dans la setlist »
// et « Terminé » en bas). Recherche titre, pinyin, artiste, sans limite ; un chant pris
// reste, marqué « Dans la setlist » (« Ajouté » s'il vient de l'être), sans « + ».
// T5 : filtres langue, thème, tempo (Q11) ; toucher un titre déplie l'aperçu (Q12) —
// pastilles, deux premières lignes chantées, « Voir la partition » —, chargé à la demande.

const THEMES = (themesJson as { themes: Theme[] }).themes;
const TEMPOS: Tempo[] = ["lent", "modere", "rapide"];
const CLE_TEMPO: Record<Tempo, string> = { lent: "tempoLent", modere: "tempoModere", rapide: "tempoRapide" };

const pilule = (actif: boolean) =>
  `h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    actif ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"
  }`;

/** « Thèmes ▾ », « Tempo ▾ » : une pilule à la largeur de son libellé (le choix fait, sinon
 *  « Thèmes »), un menu natif transparent posé dessus — accessible, sans dépendance. */
function MenuPilule({ label, vide, valeur, options, onChange }: {
  label: string;
  vide: string;
  valeur: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const affiche = options.find((o) => o.value === valeur)?.label ?? vide;
  return (
    <span className={`${pilule(valeur !== "")} relative flex items-center gap-1.5 focus-within:ring-2 focus-within:ring-ring`}>
      <span className="max-w-[12rem] truncate">{affiche}</span>
      <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${valeur ? "text-background" : "text-muted-foreground"}`} aria-hidden />
      <select
        aria-label={label}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        <option value="">{vide}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </span>
  );
}

const PASTILLE = "inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-semibold leading-none";
const VERTE = `${PASTILLE} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`;
const ORANGE = `${PASTILLE} bg-orange-500/10 text-orange-700 dark:text-orange-400`;

/** Ordinateur à pointeur fin : la bibliothèque y montre des colonnes « {Service} » et « Total » (lot ST, ST5). */
const REQUETE_COLONNES = "(pointer: fine) and (min-width: 1024px)";
function suivreColonnes(changement: () => void) {
  const liste = window.matchMedia(REQUETE_COLONNES);
  liste.addEventListener("change", changement);
  return () => liste.removeEventListener("change", changement);
}
const useColonnes = () =>
  useSyncExternalStore(suivreColonnes, () => window.matchMedia(REQUETE_COLONNES).matches, () => false);

/** Repère orange (D6) : « Fidélité : il y a 7 j » ou « Fidélité : prévu le 09/11 ». */
function PastilleRecente({ recent, nom, jour }: { recent: NonNullable<StatsBibliotheque["recent"]>; nom: string; jour: (j: string) => string }) {
  const { t } = useTranslation();
  return (
    <span data-stats-recent className={ORANGE}>
      {recent.avant
        ? t("stats.biblio.ilYa", { service: nom, n: recent.jours })
        : t("stats.biblio.prevu", { service: nom, date: jour(recent.jour) })}
    </span>
  );
}

/** Sous le titre : ce que les setlists disent du chant (lot ST, ST5). Sur ordinateur à colonnes, les chiffres
 *  vont dans les colonnes : ne restent ici « Jamais joué à GCC » et le repère orange. */
function LigneStats({ st, colonnes, service, nomService, jour }: {
  st: StatsBibliotheque;
  colonnes: boolean;
  service: string | null;
  nomService: string;
  jour: (j: string) => string;
}) {
  const { t } = useTranslation();
  const total = t("stats.biblio.total_fois", { count: st.total });
  const recent = st.recent && service !== null ? <PastilleRecente recent={st.recent} nom={nomService} jour={jour} /> : null;
  let texte: React.ReactNode;
  if (st.jamaisNullePart) texte = <span data-stats-jamais>{t("stats.chant.jamais")}</span>;
  else if (colonnes) texte = null;
  else if (service !== null && st.dansService) {
    texte = <span>{t("stats.biblio.dansService", { service: nomService, date: jour(st.dansService.derniere), count: st.total })}</span>;
  } else if (service !== null) {
    texte = (
      <>
        <span data-stats-vert className={VERTE}>{t("stats.biblio.jamaisA", { service: nomService })}</span>
        <span>{"· " + total}</span>
      </>
    );
  } else texte = <span>{total}</span>;
  if (!texte && !recent) return null;
  return (
    <span data-stats-ligne className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] leading-snug text-muted-foreground">
      {texte}
      {recent}
    </span>
  );
}

/** Aperçu d'un chant de la bibliothèque, chargé quand on le déplie (`/api/song`). */
function ApercuChant({ song }: { song: SongIndexEntry }) {
  const { t } = useTranslation();
  const cible = song.recommendedKey ?? song.originalKey;
  // undefined : en cours ; null : indisponible.
  const [lignes, setLignes] = useState<Token[][] | null | undefined>(undefined);

  useEffect(() => {
    let vivant = true;
    void fetchSongAST(song.slug).then((c) => {
      if (vivant) setLignes(c ? premieresLignes(c.ast, cible) : null);
    });
    return () => {
      vivant = false;
    };
  }, [song.slug, cible]);

  return (
    <div data-apercu className="mb-3 rounded-xl bg-muted/50 px-3.5 py-3">
      {song.sections && song.sections.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {song.sections.map((s) => {
            const { abbr, cle } = dessinSection(song.sections ?? [], s.id, s.name);
            return <PastilleSection key={s.id} abbr={abbr} cle={cle} />;
          })}
        </div>
      )}
      <div className="mt-2.5 min-h-[3.25rem]" aria-busy={lignes === undefined}>
        {lignes === undefined ? (
          <p className="text-[13px] text-muted-foreground">{t("setlists.editeur.apercuChargement")}</p>
        ) : lignes === null || lignes.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("setlists.editeur.apercuIndisponible")}</p>
        ) : (
          lignes.map((tokens, i) => (
            <div key={i} data-apercu-ligne>
              <ChordLine tokens={tokens} fontSize={0.8125} />
            </div>
          ))
        )}
      </div>
      <a
        href={lienPartition(song.slug, song.recommendedKey ?? null)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-block text-[13px] font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground"
      >
        {t("setlists.editeur.voirPartition")}
      </a>
    </div>
  );
}

export function Bibliotheque({
  songs,
  contexte,
  pris,
  ajoutes,
  onAjouter,
  onTermine,
  proposer,
}: {
  songs: SongIndexEntry[];
  /** Service, date et id de la setlist en cours (lot ST, ST5) : les statistiques de chaque chant. */
  contexte: ContexteBibliotheque;
  /** Slugs déjà dans la setlist (chants seuls et chants des fusions). */
  pris: Set<string>;
  /** Slugs ajoutés depuis l'ouverture de la bibliothèque. */
  ajoutes: Set<string>;
  onAjouter: (song: SongIndexEntry) => void;
  onTermine: () => void;
  /** Setlist de fête (CF20) : « Proposer « … » » quand la recherche ne trouve rien. */
  proposer?: (titre: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const feuille = useFeuille();
  const [filtres, setFiltres] = useState<FiltresBibliotheque>({ recherche: "", langue: "tous", theme: null, tempo: null });
  const [deplie, setDeplie] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const connecte = !loading && canVoirStatistiques(user);
  const colonnes = useColonnes();
  const zh = i18n.language === "zh-CN";
  const [setlists, setSetlists] = useState<FSSetlist[] | null>(null);
  const [moinsJoues, setMoinsJoues] = useState(false);
  // « Aujourd'hui » comme la page Statistiques.
  const aujourdhui = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Lecture partagée (5 min) ; hors ligne ou en erreur : liste vide, aucune statistique.
  useEffect(() => {
    if (!connecte) return;
    let annule = false;
    setlistsPourStats().then((liste) => { if (!annule && liste.length > 0) setSetlists(liste); }).catch(() => {});
    return () => { annule = true; };
  }, [connecte]);

  const { service, date, setlistId } = contexte;
  const stats = useMemo(
    () => (connecte && setlists ? statsBibliotheque(setlists, songs.map((s) => s.slug), { service, date, setlistId }, aujourdhui) : null),
    [connecte, setlists, songs, service, date, setlistId, aujourdhui],
  );
  const triActif = moinsJoues && service !== null && stats !== null;
  const resultats = useMemo(() => {
    const trouves = chantsDeLaBibliotheque(songs, filtres);
    return triActif ? trierMoinsJouesIci(trouves, stats) : trouves;
  }, [songs, filtres, triActif, stats]);
  // 中文 : le nom du service traduit ; sinon le nom court.
  const nom = (s: string) => (zh ? t("categories." + s, { defaultValue: serviceCourt(s) }) : serviceCourt(s));
  const jour = (j: string) => jourCourt(j, aujourdhui);
  const nomService = service !== null ? nom(service) : "";
  const changer = (f: Partial<FiltresBibliotheque>) => setFiltres((prev) => ({ ...prev, ...f }));

  // Thèmes portés par au moins un chant, comme la page Chants.
  const themes = useMemo(() => {
    const utilises = new Set(songs.flatMap((s) => s.themes));
    const zh = i18n.language === "zh-CN";
    return THEMES.filter((th) => utilises.has(th.slug)).map((th) => ({ value: th.slug, label: zh ? th.name_zh : th.name_fr }));
  }, [songs, i18n.language]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between gap-4">
        <TitreVolet className="text-2xl font-bold tracking-tight text-foreground">{t("setlists.editeur.ajouterDesChants")}</TitreVolet>
        {!feuille && (
          <button
            type="button"
            onClick={onTermine}
            className="h-10 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("setlists.editeur.termine")}
          </button>
        )}
      </div>

      <ChampRecherche
        className="mt-5"
        value={filtres.recherche}
        onChange={(v) => changer({ recherche: v })}
        placeholder={t("setlists.form.searchSongsPlaceholder")}
        label={t("setlists.form.searchSongsPlaceholder")}
        inputProps={{ autoFocus: true }}
      />

      {/* Pilules Tous · FR · 中文 · Thèmes ▾ · Tempo ▾ ; elles défilent si la place manque. */}
      <div className="-mx-1 mt-3 flex shrink-0 gap-2 overflow-x-auto px-1 py-0.5" style={{ scrollbarWidth: "none" }}>
        <div role="group" aria-label={t("setlists.editeur.langue")} className="flex shrink-0 gap-2">
          {(["tous", "fr", "zh"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={filtres.langue === l} onClick={() => changer({ langue: l })} className={pilule(filtres.langue === l)}>
              {l === "tous" ? t("setlists.editeur.tous") : l === "fr" ? "FR" : "中文"}
            </button>
          ))}
        </div>
        <MenuPilule
          label={t("setlists.editeur.theme")}
          vide={t("setlists.editeur.themes")}
          valeur={filtres.theme ?? ""}
          options={themes}
          onChange={(v) => changer({ theme: v || null })}
        />
        <MenuPilule
          label={t("setlists.editeur.tempo")}
          vide={t("setlists.editeur.tempo")}
          valeur={filtres.tempo ?? ""}
          options={TEMPOS.map((tp) => ({ value: tp, label: t(`setlists.editeur.${CLE_TEMPO[tp]}`) }))}
          onChange={(v) => changer({ tempo: (v || null) as Tempo | null })}
        />
        {stats && (
          <button
            type="button"
            data-tri-moins-joues
            aria-pressed={triActif}
            aria-disabled={service === null}
            aria-describedby={service === null ? "aide-moins-joues" : undefined}
            disabled={service === null}
            onClick={() => setMoinsJoues((v) => !v)}
            className={`${pilule(triActif)} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {t("stats.biblio.moinsJoues")}
          </button>
        )}
      </div>
      {stats && service === null && (
        <p id="aide-moins-joues" className="mt-1.5 text-[12.5px] text-muted-foreground">{t("stats.biblio.choisirService")}</p>
      )}

      <p role="status" className="mt-4 text-[13px] text-muted-foreground">
        {t("setlists.editeur.nChants", { count: resultats.length })}
      </p>

      {resultats.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("setlists.editeur.aucunResultat")}</p>
          {proposer && filtres.recherche.trim() && chantsDeLaBibliotheque(songs, { ...filtres, langue: "tous", theme: null, tempo: null }).length === 0 && (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => proposer(filtres.recherche.trim())}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                {t("setlists.fete.proposer", { titre: filtres.recherche.trim() })}
              </button>
              <p className="mx-auto max-w-sm text-[13px] text-muted-foreground">{t("setlists.fete.propositionAide")}</p>
            </div>
          )}
        </div>
      ) : (
        <>
        {stats && colonnes && (
          <div aria-hidden data-stats-entete className="mt-2 flex items-center gap-3 pl-1 text-xs font-semibold text-muted-foreground">
            <span className="min-w-0 flex-1" />
            {service !== null && <span className="w-24 truncate text-right">{nomService}</span>}
            <span className="w-12 text-right">{t("stats.biblio.total")}</span>
            <span className="w-[11rem] shrink-0" />
          </div>
        )}
        <ul className="mt-2 flex-1 border-t border-border">
          {resultats.map((song) => {
            const dedans = pris.has(song.slug);
            // Ajouté puis retiré (la setlist a pu se vider, la bibliothèque revenir) : son « + » revient.
            const ajoute = dedans && ajoutes.has(song.slug);
            const ouvert = deplie === song.slug;
            const cle = song.recommendedKey ?? song.originalKey;
            const st = stats?.get(song.slug) ?? null;
            return (
              <li key={song.slug} data-resultat className="border-b border-border">
                <div className="flex items-center gap-3 py-2.5 pl-1">
                  <button
                    type="button"
                    aria-expanded={ouvert}
                    onClick={() => setDeplie(ouvert ? null : song.slug)}
                    className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="truncate text-[15px] font-semibold text-foreground">{song.title}</span>
                      {song.titlePinyin && <span className="truncate text-sm text-muted-foreground">{song.titlePinyin}</span>}
                      {ouvert ? (
                        <ChevronUp className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" aria-hidden />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" aria-hidden />
                      )}
                    </span>
                    {song.artist && <span className="block truncate text-[13px] text-muted-foreground">{song.artist}</span>}
                    {st && (
                      <LigneStats
                        st={st} colonnes={colonnes} service={service} nomService={nomService} jour={jour}
                      />
                    )}
                  </button>
                  {st && colonnes && (
                    <>
                      {service !== null && (
                        <span data-stats-col-service className="flex w-24 shrink-0 justify-end text-[13px] text-muted-foreground">
                          {st.dansService ? jour(st.dansService.derniere)
                            : st.jamaisDansService && !st.jamaisNullePart ? (
                              <span className={VERTE}><span aria-hidden>{t("stats.biblio.jamaisCourt")}</span><span className="sr-only">{t("stats.biblio.jamaisA", { service: nomService })}</span></span>
                            ) : "—"}
                        </span>
                      )}
                      <span data-stats-col-total className="w-12 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground">{st.total}</span>
                    </>
                  )}
                  <span className={colonnes && stats ? "flex w-[11rem] shrink-0 items-center justify-end gap-3" : "contents"}>
                  <span className="flex flex-col items-center gap-0.5">
                    <KeyPill tonalite={cle} langue={song.language === "zh" ? "zh" : "fr"} />
                    {song.recommendedKey && <span className="text-[11px] leading-none text-muted-foreground">{t("setlists.editeur.reco")}</span>}
                  </span>
                  {ajoute ? (
                    <span className="flex h-8 items-center gap-1 rounded-full bg-emerald-500/10 px-3 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {t("setlists.editeur.ajoute")}
                    </span>
                  ) : dedans ? (
                    <span className="flex h-8 items-center gap-1 px-1 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {t("setlists.editeur.dansLaSetlist")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAjouter(song)}
                      aria-label={t("setlists.editeur.ajouter", { titre: song.title })}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  </span>
                </div>
                {ouvert && <ApercuChant song={song} />}
              </li>
            );
          })}
        </ul>
        </>
      )}

      {feuille ? (
        <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-border bg-background py-3">
          <p className="text-sm font-semibold text-foreground">{t("setlists.editeur.nDansLaSetlist", { count: pris.size })}</p>
          <button
            type="button"
            onClick={onTermine}
            className="h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("setlists.editeur.termine")}
          </button>
        </div>
      ) : (
        <p className="sticky bottom-0 mt-auto border-t border-border bg-background py-3 text-[13px] text-muted-foreground">
          {t("setlists.editeur.aideBibliotheque")}
        </p>
      )}
    </div>
  );
}
