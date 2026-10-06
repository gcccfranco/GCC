"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";
import { chantsDeLaBibliotheque, premieresLignes, type FiltresBibliotheque, type Tempo } from "@/lib/setlist/bibliotheque";
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
  pris,
  ajoutes,
  onAjouter,
  onTermine,
}: {
  songs: SongIndexEntry[];
  /** Slugs déjà dans la setlist (chants seuls et chants des fusions). */
  pris: Set<string>;
  /** Slugs ajoutés depuis l'ouverture de la bibliothèque. */
  ajoutes: Set<string>;
  onAjouter: (song: SongIndexEntry) => void;
  onTermine: () => void;
}) {
  const { t, i18n } = useTranslation();
  const feuille = useFeuille();
  const [filtres, setFiltres] = useState<FiltresBibliotheque>({ recherche: "", langue: "tous", theme: null, tempo: null });
  const [deplie, setDeplie] = useState<string | null>(null);
  const resultats = useMemo(() => chantsDeLaBibliotheque(songs, filtres), [songs, filtres]);
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

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          autoFocus
          value={filtres.recherche}
          onChange={(e) => changer({ recherche: e.target.value })}
          aria-label={t("setlists.form.searchSongsPlaceholder")}
          placeholder={t("setlists.form.searchSongsPlaceholder")}
          className="h-11 w-full rounded-full bg-secondary pl-11 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {filtres.recherche && (
          <button
            type="button"
            onClick={() => changer({ recherche: "" })}
            aria-label={t("common.buttons.reset")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

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
      </div>

      <p role="status" className="mt-4 text-[13px] text-muted-foreground">
        {t("setlists.editeur.nChants", { count: resultats.length })}
      </p>

      {resultats.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("setlists.editeur.aucunResultat")}</p>
      ) : (
        <ul className="mt-2 flex-1 border-t border-border">
          {resultats.map((song) => {
            const dedans = pris.has(song.slug);
            // Ajouté puis retiré (la setlist a pu se vider, la bibliothèque revenir) : son « + » revient.
            const ajoute = dedans && ajoutes.has(song.slug);
            const ouvert = deplie === song.slug;
            const cle = song.recommendedKey ?? song.originalKey;
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
                  </button>
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
                </div>
                {ouvert && <ApercuChant song={song} />}
              </li>
            );
          })}
        </ul>
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
