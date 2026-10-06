"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";
import { chantsDeLaBibliotheque } from "@/lib/setlist/bibliotheque";
import { KeyPill } from "@/components/ui/key-pill";
import type { SongIndexEntry } from "@/types/song";
import { TitreVolet, useFeuille } from "@/components/setlists/editeur/feuille";

// Bibliothèque de l'éditeur (lot U5 bis, T3, planche `creer-piste2-bibliotheque`) :
// elle prend la place des réglages. Recherche titre, pinyin, artiste, sans limite ;
// un chant pris reste, marqué « Dans la setlist » (« Ajouté » s'il vient de l'être),
// sans « + ». Filtres langue, thème, tempo et aperçu des premières lignes : T5.
// Sur téléphone et tablette en portrait, dans une feuille (T4, planche
// `creer-piste2-telephone-ajouter`) : « N chants dans la setlist » et « Terminé » en bas.

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
  const { t } = useTranslation();
  const feuille = useFeuille();
  const [recherche, setRecherche] = useState("");
  const [deplie, setDeplie] = useState<string | null>(null);
  const resultats = useMemo(
    () => chantsDeLaBibliotheque(songs, { recherche, langue: "tous", theme: null, tempo: null }),
    [songs, recherche],
  );

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
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          aria-label={t("setlists.form.searchSongsPlaceholder")}
          placeholder={t("setlists.form.searchSongsPlaceholder")}
          className="h-11 w-full rounded-full bg-secondary pl-11 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 [&::-webkit-search-cancel-button]:hidden"
        />
        {recherche && (
          <button
            type="button"
            onClick={() => setRecherche("")}
            aria-label={t("common.buttons.reset")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <p role="status" className="mt-4 text-[13px] text-muted-foreground">
        {t("setlists.editeur.nChants", { count: resultats.length })}
      </p>

      {resultats.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("setlists.editeur.aucunResultat")}</p>
      ) : (
        <ul className="mt-2 flex-1 border-t border-border">
          {resultats.map((song) => {
            const ajoute = ajoutes.has(song.slug);
            const dedans = pris.has(song.slug);
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
                {ouvert && song.sections && song.sections.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-1.5 rounded-xl bg-muted/50 px-3 py-2.5">
                    {song.sections.map((s) => (
                      <span key={s.id} className="rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground">
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
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
