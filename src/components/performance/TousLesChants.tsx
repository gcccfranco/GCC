"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { CloudOff, Search } from "lucide-react";
import { useChantsHorsLigne } from "./useChantsHorsLigne";
import { pinyin_font } from "@/components/song/pinyinFont";
import { useSongsIndex } from "@/hooks/useSongsIndex";
import { useJianpuManifest } from "@/lib/jianpu/images";
import { getJianpuAjout, setJianpuAjout } from "@/lib/jianpu/preference";
import { OPTIONS_RECHERCHE_CHANTS } from "@/lib/setlist/bibliotheque";
import type { SongIndexEntry } from "@/types/song";

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// Même règle de tri que la page Chants (SongListClient, non exportée) : un chant chinois se range par son pinyin.
const cleDeTri = (s: SongIndexEntry) => sansAccents(s.language === "zh" && s.titlePinyin ? s.titlePinyin : s.title);

/** Commande segmentée « Cette setlist | Tous les chants ». */
export function OngletsSetlist({ onglet, onChange }: { onglet: "setlist" | "chants"; onChange: (o: "setlist" | "chants") => void }) {
  const { t } = useTranslation();
  return (
    <div role="tablist" data-onglets-setlist className="mb-2 flex gap-1 rounded-lg bg-muted p-1">
      {(["setlist", "chants"] as const).map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          data-onglet={o}
          aria-selected={onglet === o}
          onClick={() => onChange(o)}
          className={`min-h-11 flex-1 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${onglet === o ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {t(o === "setlist" ? "performance.thisSetlist" : "performance.allSongs")}
        </button>
      ))}
    </div>
  );
}

export function ContenuTousLesChants({
  slugsDansSetlist,
  onJouer,
  onFermer,
  autoFocus,
  slugsCharges,
}: {
  slugsDansSetlist: Set<string>;
  /** Chants dont le contenu est déjà chargé : ils s'ouvrent hors ligne. */
  slugsCharges: string[];
  onJouer: (slug: string, avecJianpu: boolean) => void;
  onFermer: () => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const { songs, erreur } = useSongsIndex();
  const manifeste = useJianpuManifest();
  const [requete, setRequete] = useState("");
  const [avec, setAvec] = useState(getJianpuAjout);
  const [lettreActive, setLettreActive] = useState<string | null>(null);
  const derniereLettre = useRef<string | null>(null);
  // L'index tient entier dans la part visible du menu, menu non défilé (sinon ses dernières lettres passaient sous le bas
  // du popover ou de la feuille) : hauteur = du haut de l'index au bas de la zone qui défile, 22 px par lettre au plus.
  const indexRef = useRef<HTMLElement>(null);
  const [hauteurIndex, setHauteurIndex] = useState<number | null>(null);
  useLayoutEffect(() => {
    const nav = indexRef.current;
    let zone = nav?.parentElement ?? null;
    while (zone && !/auto|scroll/.test(getComputedStyle(zone).overflowY)) zone = zone.parentElement;
    if (!nav || !zone) return;
    const z = zone;
    const mesurer = () => {
      const haut = nav.getBoundingClientRect().top - z.getBoundingClientRect().top + z.scrollTop;
      setHauteurIndex(Math.max(120, z.clientHeight - haut - 8));
    };
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(z);
    return () => ro.disconnect();
  });

  const fuse = useMemo(() => new Fuse(songs ?? [], OPTIONS_RECHERCHE_CHANTS), [songs]);
  const liste = useMemo(() => {
    if (!songs) return [];
    const q = requete.trim();
    if (!q) return [...songs].sort((a, b) => cleDeTri(a).localeCompare(cleDeTri(b)) || a.slug.localeCompare(b.slug));
    const trouves = fuse.search(q).map((r) => r.item);
    // Complément : la requête collée (« ni de » → « nide ») contenue dans le pinyin collé (« nǐ de tóng zài »).
    const colle = sansAccents(q);
    const vus = new Set(trouves.map((s) => s.slug));
    const en_plus = colle ? songs.filter((s) => !vus.has(s.slug) && sansAccents(s.titlePinyin ?? "").includes(colle)) : [];
    return [...trouves, ...en_plus];
  }, [songs, fuse, requete]);

  const lettres = useMemo(() => {
    if (requete.trim()) return [];
    const vues = new Map<string, string>();
    for (const s of liste) {
      const c = cleDeTri(s).charAt(0).toUpperCase();
      const l = c >= "A" && c <= "Z" ? c : "#";
      if (!vues.has(l)) vues.set(l, s.slug);
    }
    return [...vues.entries()];
  }, [liste, requete]);

  const aller = (slug: string) => document.getElementById(`tlc-li-${slug}`)?.scrollIntoView({ block: "start" });
  const suivre = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.min(Math.max(Math.floor(((e.clientY - r.top) / r.height) * lettres.length), 0), lettres.length - 1);
    const [lettre, slug] = lettres[i];
    setLettreActive(lettre);
    if (lettre === derniereLettre.current) return;
    derniereLettre.current = lettre;
    aller(slug);
  };
  const lacher = () => { derniereLettre.current = null; setLettreActive(null); };

  const { enLigne, disponible } = useChantsHorsLigne(useMemo(() => (songs ?? []).map((s) => s.slug), [songs]), slugsCharges);
  const choisir = (v: boolean) => { setAvec(v); setJianpuAjout(v); };

  return (
    <div data-tous-les-chants>
      <label className="relative mb-2 block">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          data-recherche-chants
          autoFocus={autoFocus}
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          placeholder={t("performance.searchSongs")}
          aria-label={t("performance.searchSongs")}
          className="min-h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div role="group" aria-label={t("performance.jianpuChoice")} data-interrupteur-jianpu className="mb-2 flex items-center gap-1 rounded-lg bg-muted p-1">
        {/* Le libellé dit que l'interrupteur règle l'ouverture du chant touché, pas un filtre de la liste. */}
        <span className="shrink-0 pl-2 pr-1 text-[13px] text-muted-foreground">{t("performance.openWith")}</span>
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            data-jianpu-ajout={v ? "avec" : "sans"}
            aria-pressed={avec === v}
            onClick={() => choisir(v)}
            className={`min-h-11 flex-1 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${avec === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t(v ? "performance.withJianpu" : "performance.withoutJianpu")}
          </button>
        ))}
      </div>
      {!enLigne && <p data-hors-ligne className="mb-2 px-1 text-[13px] text-muted-foreground">{t("performance.horsLigneChants")}</p>}
      {!songs ? (
        <p className="px-1 text-[13px] text-muted-foreground">{t(erreur ? "performance.songsError" : "performance.songsLoading")}</p>
      ) : liste.length === 0 ? (
        <p className="px-1 text-[13px] text-muted-foreground">{t("performance.noSongFound")}</p>
      ) : (
        <div className="flex items-start">
          <ul className="-mx-1 min-w-0 flex-1">
            {liste.map((s) => {
              const sous = s.titlePinyin || s.artist;
              const indispo = !disponible(s.slug);
              return (
                <li key={s.slug} id={`tlc-li-${s.slug}`}>
                  <button
                    type="button"
                    data-chant-slug={s.slug}
                    aria-disabled={indispo ? "true" : undefined}
                    data-indisponible={indispo ? "" : undefined}
                    onClick={() => { if (indispo) return; onJouer(s.slug, avec); onFermer(); }}
                    className={`flex min-h-12 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${indispo ? "" : "hover:bg-muted/60 active:bg-muted "}focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-base font-medium ${indispo ? "text-muted-foreground" : "text-foreground"}`}>{s.title}</span>
                      {sous && <span className={`block truncate text-[13px] text-muted-foreground ${s.titlePinyin ? pinyin_font.className : ""}`}>{sous}</span>}
                      {indispo && <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground"><CloudOff aria-hidden="true" className="h-3.5 w-3.5" />{t("performance.pasSurAppareil")}</span>}
                      {slugsDansSetlist.has(s.slug) && <span className="block text-[12px] text-muted-foreground">{t("performance.inSetlist")}</span>}
                    </span>
                    {manifeste?.[s.slug] && <span aria-hidden="true" data-marque-jianpu className={`shrink-0 text-sm font-bold${indispo ? " opacity-50" : ""}`} style={{ color: "var(--jianpu-color)" }}>简</span>}
                    <span className={`w-8 shrink-0 text-right text-[13px] font-semibold tabular-nums ${indispo ? "text-muted-foreground" : "text-foreground"}`}>{s.originalKey}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {lettres.length > 1 && (
            <nav
              ref={indexRef}
              data-index-tlc
              className="sticky top-2 ml-1 flex w-8 shrink-0 touch-none select-none flex-col items-center self-start py-1"
              style={{ height: Math.min(lettres.length * 22, hauteurIndex ?? lettres.length * 22) }}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); derniereLettre.current = null; suivre(e); }}
              onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) suivre(e); }}
              onPointerUp={lacher}
              onPointerCancel={lacher}
            >
              {lettres.map(([l, slug]) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => aller(slug)}
                  aria-label={t("common.aria.allerA", { lettre: l })}
                  className={`flex min-h-0 w-8 flex-1 items-center justify-center text-xs font-bold ${l === lettreActive ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {l}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
