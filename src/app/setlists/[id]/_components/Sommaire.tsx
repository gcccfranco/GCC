"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { TOUCHER_PILULE } from "@/lib/toucher44";
import { Check, Copy, ListOrdered } from "lucide-react";
import type { SetlistItem } from "@/types/setList";
import type { SongIndexEntry } from "@/types/song";
import type { SongContent } from "@/lib/api/songs";
import { KeyPill } from "@/components/ui/key-pill";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { playedSections } from "@/lib/setlist/playedSections";
import { useJianpuManifest } from "@/lib/jianpu/images";
import { sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference";
import { compter } from "@/lib/usage";

/** Sommaire de la setlist en deux volets (lot U5, docs/spec-deux-volets.md, Q6) :
 *  par chant, numéro, titre, tonalité et « orig. », une pastille par étape jouée,
 *  notes, « Partition 简谱 ». Toucher un chant ou une pastille y amène ; le chant lu
 *  est en encre, sa pastille marquée. « Copier toutes les paroles » en pied. La
 *  page suit la lecture et amène la vue (`current`, `uidsLus`, `onGo`). */
export function Sommaire({
  items,
  contents,
  songsMap,
  jianpuPref,
  current,
  uidsLus,
  onGo,
  copier,
  copierPret = true,
  className,
  style,
}: {
  /** Items tels que joués pour moi (ma structure comprise) : `stageItems`. */
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  songsMap: Record<string, SongIndexEntry>;
  jianpuPref: JianpuPref;
  /** Position du chant lu (celle de `data-outline-item`). */
  current: number;
  /** Occurrences de la section lue dans le chant lu (`data-section-uids`). */
  uidsLus: string[];
  onGo: (position: number, uid?: string) => void;
  /** Texte de « Copier toutes les paroles » ; absent : le bouton n'est pas proposé. */
  copier?: () => string;
  /** Faux tant qu'un chant n'est pas chargé : le bouton est là, inactif. */
  copierPret?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const manifest = useJianpuManifest();
  const sorted = [...items].sort((a, b) => a.position - b.position);
  // Numéro = nombre de chants jusqu'ici inclus (les transitions n'en sont pas), comme la liste.
  const chants = sorted.filter((item) => item.type !== "transition");

  return (
    <nav aria-label={t("setlists.detail.sommaire")} className={`flex flex-col ${className ?? ""}`} style={style}>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-5">
        <p className="px-2 pb-2 text-sm font-semibold text-muted-foreground">{t("setlists.detail.sommaire")}</p>
        <ol className="space-y-1">
          {chants.map((item, i) => {
            // Une proposition garde son numéro (comme la liste) mais n'a rien à ouvrir.
            if (item.type === "proposition") return null;
            const num = i + 1;
            const lu = item.position === current;
            const fusion = item.type === "fusion" && !!item.fusionSongs;
            const song = songsMap[item.songSlug];
            const titre = fusion
              ? item.fusionSongs!.map((fs) => songsMap[fs.songSlug]?.title ?? fs.songSlug).join(" / ")
              : (song?.title ?? item.songSlug);
            const tonalite = item.keyOverride ?? song?.originalKey;
            const transpose = !!item.keyOverride && item.keyOverride !== song?.originalKey;
            const etapes = playedSections(item, contents);
            const surScan = !fusion && sheetEnabled(jianpuPref) && !!manifest?.[item.songSlug];
            return (
              <li
                key={item.position}
                data-sommaire={item.position}
                className={`relative rounded-xl px-3 py-2.5 transition-colors ${
                  lu ? "bg-foreground text-background" : "hover:bg-muted/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-4 shrink-0 pt-px text-right text-sm font-bold tabular-nums ${lu ? "" : "text-muted-foreground"}`}>
                    {num}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Le bouton couvre toute la carte (sauf les pastilles, au-dessus de lui). */}
                    <button
                      type="button"
                      data-sommaire-chant
                      aria-current={lu ? "true" : undefined}
                      onClick={() => onGo(item.position)}
                      className="block w-full text-left text-base font-semibold leading-snug before:absolute before:inset-0 before:rounded-xl focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring"
                    >
                      {titre}
                    </button>
                    {etapes.length > 0 && (
                      <div className="relative mt-1.5 flex flex-wrap gap-1.5">
                        {etapes.map((s, i) => {
                          const ici = lu && uidsLus.includes(s.uid);
                          return (
                            <button
                              key={`${s.uid}-${i}`}
                              type="button"
                              data-pastille
                              aria-current={ici ? "true" : undefined}
                              onClick={() => onGo(item.position, s.uid)}
                              className={`${TOUCHER_PILULE} h-[18px] min-w-[18px] rounded-full px-1.5 text-xs font-semibold leading-[18px] transition-colors ${
                                ici
                                  ? "bg-background text-foreground"
                                  : lu
                                    ? "bg-background/15 text-background/90 hover:bg-background/25"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {abbreviateSection(s)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {item.notes && (
                      <p className={`mt-1.5 text-xs leading-snug ${lu ? "text-background/80" : "text-muted-foreground"}`}>{item.notes}</p>
                    )}
                    {surScan && (
                      <p className={`mt-1 text-xs ${lu ? "text-background/80" : "text-muted-foreground"}`}>{t("performance.jianpuSheet")}</p>
                    )}
                  </div>
                  {!fusion && tonalite && (
                    <KeyPill
                      tonalite={tonalite}
                      langue={song?.language === "zh" ? "zh" : "fr"}
                      origine={transpose ? song?.originalKey : undefined}
                      // Sur la carte en encre : la pastille garde le fond de la page, lisible
                      // (`!` : son fond est posé en ligne).
                      className={lu ? "[&>[data-testid=tonalite]]:!bg-background [&>[data-testid=tonalite-origine]]:!text-background/70" : undefined}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {copier && <CopierTout copier={copier} pret={copierPret} />}
    </nav>
  );
}

/** Grand écran (docs/spec-exemples-usage.md, T3) : le sommaire devient un rail de 56 px, un numéro par chant ;
 *  son bouton ouvre le `Sommaire` en panneau par-dessus la partition. Toucher un numéro amène au chant sans
 *  ouvrir le panneau ; Échap, un toucher en dehors ou un choix dans le panneau le ferment. */
export function RailSommaire({ className, style, ...sommaire }: ComponentProps<typeof Sommaire>) {
  const { t } = useTranslation();
  // Phases du panneau : monté pour toutes sauf « ferme » ; « entree » le monte en position fermée, puis « ouvert » le fait glisser.
  const [phase, setPhase] = useState<"ferme" | "entree" | "ouvert" | "fermeture">("ferme");
  const ouvert = phase === "entree" || phase === "ouvert";
  const ouvrir = () => setPhase((p) => (p === "fermeture" ? "ouvert" : p === "ferme" ? "entree" : p));
  const fermer = () => setPhase((p) => (p === "entree" || p === "ouvert" ? "fermeture" : p));
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  const { items, songsMap, current, onGo } = sommaire;
  const chants = [...items].sort((a, b) => a.position - b.position).filter((item) => item.type !== "transition");

  useLayoutEffect(() => {
    if (phase !== "entree") return;
    panneauRef.current?.getBoundingClientRect(); // reflow : la position fermée est peinte avant la transition
    setPhase("ouvert");
  }, [phase]);
  useEffect(() => {
    if (phase !== "fermeture") return;
    const minuteur = window.setTimeout(() => setPhase("ferme"), 400);
    return () => window.clearTimeout(minuteur);
  }, [phase]);

  useEffect(() => {
    if (!ouvert) return;
    // Le chant lu, sinon le premier (le chant lu peut être une proposition, absente du panneau).
    (panneauRef.current?.querySelector<HTMLElement>("[data-sommaire-chant][aria-current]")
      ?? panneauRef.current?.querySelector<HTMLElement>("[data-sommaire-chant]"))?.focus({ preventScroll: true });
    const dehors = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (!panneauRef.current?.contains(cible) && !boutonRef.current?.contains(cible)) fermer();
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      fermer();
      boutonRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  const libelle = t(ouvert ? "setlists.detail.fermerSommaire" : "setlists.detail.ouvrirSommaire");
  return (
    <div className={className} style={style}>
      <div className="flex h-full w-14 flex-col items-center gap-1.5 overflow-y-auto pb-4">
        <button
          ref={boutonRef}
          type="button"
          aria-expanded={ouvert}
          aria-controls="sommaire-panneau"
          aria-label={libelle}
          title={libelle}
          onClick={ouvert ? fermer : ouvrir}
          className="flex h-11 w-14 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ListOrdered className="h-5 w-5" aria-hidden />
        </button>
        {chants.map((item, i) => {
          if (item.type === "proposition") return null;
          const lu = item.position === current;
          const titre =
            item.type === "fusion" && item.fusionSongs
              ? item.fusionSongs.map((fs) => songsMap[fs.songSlug]?.title ?? fs.songSlug).join(" / ")
              : (songsMap[item.songSlug]?.title ?? item.songSlug);
          const nom = `${i + 1}. ${titre}`;
          return (
            <button
              key={item.position}
              type="button"
              data-rail-numero={item.position}
              aria-current={lu ? "true" : undefined}
              aria-label={nom}
              title={nom}
              onClick={() => onGo(item.position)}
              className={`h-11 w-14 shrink-0 rounded-xl text-base font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                lu ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      {phase !== "ferme" && (
        <div className="absolute left-full top-0 z-10 h-full w-[380px]" style={{ clipPath: "inset(0 -48px 0 0)" }}>
        <div
          ref={panneauRef}
          id="sommaire-panneau"
          inert={phase === "fermeture"}
          data-ouvert={phase === "ouvert" ? "" : undefined}
          className="sommaire-panneau h-full w-full border-r border-border bg-background shadow-xl"
        >
          <Sommaire
            {...sommaire}
            onGo={(position, uid) => {
              fermer();
              onGo(position, uid);
              // Le focus ne tombe pas sur la page : il revient au bouton du rail.
              boutonRef.current?.focus({ preventScroll: true });
            }}
            className="h-full"
          />
        </div>
        </div>
      )}
    </div>
  );
}

/** « Copier toutes les paroles » (question 6), en pied du sommaire. */
function CopierTout({ copier, pret }: { copier: () => string; pret: boolean }) {
  const { t } = useTranslation();
  const [copie, setCopie] = useState(false);
  const minuteur = useRef(0);
  useEffect(() => () => window.clearTimeout(minuteur.current), []);
  return (
    <div className="shrink-0 border-t border-border px-5 py-3">
      <button
        type="button"
        disabled={!pret}
        aria-disabled={!pret}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(copier());
          } catch {
            return; // presse-papiers refusé : rien n'est annoncé
          }
          compter("cmd.chant.copierParoles");
          setCopie(true);
          window.clearTimeout(minuteur.current);
          minuteur.current = window.setTimeout(() => setCopie(false), 2000);
        }}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors enabled:hover:text-foreground disabled:opacity-50"
      >
        {copie ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copie ? t("setlists.detail.copyLyricsDone") : t("setlists.detail.copyAllLyrics")}
      </button>
    </div>
  );
}
