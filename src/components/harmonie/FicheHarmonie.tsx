"use client";

// Une fiche du catalogue « Harmonie » (lot 9, H1). Tout est écrit en D dans
// `docs/harmonie/*.md` : la tonalité choisie ici ne transpose que les accords
// (ce qui est entre accents graves), pas les explications — la phrase « le C#
// de la mélodie » resterait fausse une fois transposée.
//
// Lot U4 bis, B3 (Q6, planches `harmonie-*`) : la fiche se lit en cartes ; en grand, à droite
// du catalogue, sans « Retour » (la liste est là), le choix Piano · Guitare dans l'en-tête,
// « Pourquoi » et l'instrument côte à côte, le répertoire sur plusieurs colonnes.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { Group, GroupRow } from "@/components/ui/group";
import { OngletsRail } from "@/components/layout/Onglets";
import { Clavier, DiagrammeGuitare, doigtesDe, notesDe } from "@/components/harmonie/Diagrammes";
import { ParagrapheFiche, TexteFiche, TON_DES_FICHES } from "@/components/harmonie/TexteFiche";
import { useCatalogueHarmonie } from "@/components/harmonie/catalogueContexte";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { ALL_KEYS, getTransposedKey, semitonesTo } from "@/lib/transpose";
import { cn } from "@/lib/utils";
import type { Instrument } from "@/types/harmonie";

type Entree = { slug: string; title: string; titlePinyin: string | null; language: string };

/** Une carte de la fiche : le titre dedans, petit et gris, comme la planche. */
const CARTE = "raised rounded-2xl pt-3.5 pb-1 [&>h2]:px-4";

export function FicheHarmonie({ id }: { id: string }) {
  const { t } = useTranslation();
  const { acces, fiches, instrument, setInstrument, comptesDesChants } = useCatalogueHarmonie();
  const deuxVolets = useDeuxVolets();
  const [tonalite, setTonalite] = useState(TON_DES_FICHES);
  const [capo, setCapo] = useState(0);
  const [tousLesExemples, setTousLesExemples] = useState(false);
  const [chants, setChants] = useState<Entree[]>([]);
  const [comptes, setComptes] = useState<Record<string, number>>({});

  const fiche = fiches.find((f) => f.id === id);
  const demiTons = semitonesTo(TON_DES_FICHES, tonalite);

  // Les exemples s'ordonnent du plus chanté au moins chanté, compté d'après les
  // setlists (lisibles par tout connecté) plutôt qu'au build : le classement reste
  // à jour sans relancer de script. Le layout de la section les lit une fois.
  useEffect(() => {
    if (!fiche?.exemples.length) return;
    let vivant = true;
    fetch("/songs-index.json")
      .then((r) => r.json())
      .then((d: { songs: Entree[] }) => { if (vivant) setChants(d.songs); })
      .catch(() => { /* la liste s'affichera par slug */ });
    comptesDesChants().then((n) => { if (vivant) setComptes(n); });
    return () => { vivant = false; };
  }, [fiche?.exemples.length, comptesDesChants]);

  const exemples = useMemo(() => {
    if (!fiche) return [];
    const parSlug = new Map(chants.map((c) => [c.slug, c]));
    return [...fiche.exemples]
      .sort((a, b) => (comptes[b] ?? 0) - (comptes[a] ?? 0))
      .map((slug) => ({ slug, chant: parSlug.get(slug), fois: comptes[slug] ?? 0 }));
  }, [fiche, chants, comptes]);

  if (!fiche) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-muted-foreground">{t("harmonie.aucuneFiche")}</p>
        {!deuxVolets && <Link href="/harmonie" className="mt-3 inline-block underline underline-offset-4">{t("harmonie.retour")}</Link>}
      </div>
    );
  }

  const Titre = deuxVolets ? "h2" : "h1";
  const texteInstrument = instrument === "piano" ? fiche.piano : fiche.guitare;
  const montreCapo = instrument === "guitare";
  // Les doigtés écrits dans la fiche sont ceux de D (tout y est écrit). Le
  // capo ne les change pas : il dit en quelle tonalité ces formes sonnent —
  // capo 2 sur des formes de D, ça sonne en E. On ne transpose pas non plus
  // les explications : « E, » et « E » ne se transposeraient pas pareil, et
  // une phrase à moitié transposée est pire que pas transposée du tout.
  const tonDesFormes = getTransposedKey(TON_DES_FICHES, capo);
  const choixInstrument = acces.piano && acces.guitare && !fiche.instrument && (
    <OngletsRail
      etiquette={t("harmonie.instrument.piano")}
      onglets={(["piano", "guitare"] as Instrument[]).map((i) => ({ id: i, label: t(`harmonie.instrument.${i}`) }))}
      actif={instrument}
      choisir={(v) => setInstrument(v as Instrument)}
    />
  );

  return (
    <div
      className={cn("space-y-4 pb-10", deuxVolets ? undefined : "mx-auto max-w-2xl px-4 pt-3 md:max-w-3xl md:px-6")}
      data-fiche={fiche.id}
    >
      {!deuxVolets && (
        <Link
          href="/harmonie"
          className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t("harmonie.retour")}
        </Link>
      )}

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* En grand, sous l'en-tête « Harmonie » : un h2 de 24 px (agencement v18, R3) ; seule, le h1. */}
            <Titre className={deuxVolets ? "text-[24px] font-bold leading-tight" : "text-[22px] font-bold leading-tight lg:text-[26px]"}>{fiche.nom}</Titre>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {fiche.familleNom} · {fiche.sensations.map((s) => t(`harmonie.sensation.${s}`)).join(" · ")}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {fiche.moments.map((m) => t(`harmonie.moment.${m}`)).join(" · ")}
              {fiche.niveau[instrument] && ` · ${t(`harmonie.niveau.${fiche.niveau[instrument]}`)}`}
              {fiche.niveauNote && ` · ${fiche.niveauNote}`}
            </p>
          </div>
          {deuxVolets && choixInstrument && <div className="shrink-0">{choixInstrument}</div>}
        </div>
        {fiche.statut !== "validee" && (
          <p className="rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">{t("harmonie.aRelireTout")}</p>
        )}
      </header>

      {!deuxVolets && choixInstrument}

      {/* Avant → après, le cœur de la fiche */}
      {fiche.avantApres && (
        <Group title={t("harmonie.avantApres")} className={CARTE}>
          <div className="px-4 py-2 text-[17px] leading-relaxed lg:text-[19px]">
            <ParagrapheFiche texte={fiche.avantApres} demiTons={demiTons} tonalite={tonalite} />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5">
            <label className="text-[13px] text-muted-foreground" htmlFor="ton-fiche">{t("harmonie.tonalite")}</label>
            <select
              id="ton-fiche"
              value={tonalite}
              onChange={(e) => setTonalite(e.target.value)}
              className="h-9 rounded-lg bg-secondary px-2 text-[15px]"
            >
              {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {demiTons !== 0 && (
            <p className="border-t border-border px-4 py-2 text-[13px] text-muted-foreground">
              {t("harmonie.resteEnD", { ton: TON_DES_FICHES })}
            </p>
          )}
        </Group>
      )}

      {/* Pourquoi (et quand l'éviter) à côté de l'instrument, dès qu'il y a la place. */}
      <div className={cn("grid items-start gap-4", deuxVolets ? "grid-cols-2" : "md:grid-cols-2")}>
        {(fiche.pourquoi || fiche.eviter.length > 0) && (
          <div className="raised space-y-1 rounded-2xl pt-3.5 pb-1">
            {fiche.pourquoi && (
              <Group title={t("harmonie.pourquoi")} className="[&>h2]:px-4">
                <ParagrapheFiche className="px-4 pb-3 text-[15px] leading-relaxed" texte={fiche.pourquoi} demiTons={0} tonalite={TON_DES_FICHES} />
              </Group>
            )}
            {fiche.eviter.length > 0 && (
              <Group title={t("harmonie.eviter")} className="[&>h2]:px-4">
                <ul className="divide-y divide-border">
                  {fiche.eviter.map((e, i) => (
                    <li key={i} className="px-4 py-2.5 text-[15px] leading-relaxed">
                      <TexteFiche texte={e.replace(/\s*\n\s*/g, " ")} demiTons={0} tonalite={TON_DES_FICHES} />
                    </li>
                  ))}
                </ul>
              </Group>
            )}
          </div>
        )}

        {texteInstrument && (
          <Group title={instrument === "piano" ? t("harmonie.auPiano") : t("harmonie.aLaGuitare")} className={CARTE}>
            {montreCapo && (
              <div className="flex flex-wrap items-center gap-3 px-4 pt-1">
                <label className="text-[13px] text-muted-foreground" htmlFor="capo-fiche">{t("harmonie.capoTitre")}</label>
                <select
                  id="capo-fiche"
                  value={capo}
                  onChange={(e) => setCapo(Number(e.target.value))}
                  className="h-9 rounded-lg bg-secondary px-2 text-[15px]"
                >
                  <option value={0}>{t("harmonie.sansCapo")}</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-[13px] text-muted-foreground">
                  {capo > 0
                    ? t("harmonie.formesSonnent", { ton: TON_DES_FICHES, sonne: tonDesFormes })
                    : t("harmonie.formesEcrites", { ton: TON_DES_FICHES })}
                </span>
              </div>
            )}
            <ParagrapheFiche className="px-4 py-2 text-[15px] leading-relaxed" texte={texteInstrument} demiTons={0} tonalite={TON_DES_FICHES} />
            {instrument === "guitare" && doigtesDe(texteInstrument).length > 0 && (
              <div className="flex flex-wrap gap-4 px-4 py-3 text-foreground">
                {doigtesDe(texteInstrument).map((d, i) => (
                  <figure key={i} className="text-center">
                    <DiagrammeGuitare doigte={d} capo={capo} label={t("harmonie.ariaDoigte", { doigte: d })} />
                    <figcaption className="mt-1 text-[11px] text-muted-foreground">{d}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            {instrument === "piano" && notesDe(texteInstrument).length > 0 && (
              <div className="flex flex-wrap gap-4 px-4 py-3 text-foreground">
                {notesDe(texteInstrument).slice(0, 4).map((notes, i) => (
                  <figure key={i} className="text-center">
                    <Clavier notes={notes} label={t("harmonie.ariaClavier", { notes: notes.join(" ") })} />
                    <figcaption className="mt-1 text-[11px] text-muted-foreground">{notes.join(" ")}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </Group>
        )}
      </div>

      {(fiche.repertoire || exemples.length > 0) && (
        <Group title={t("harmonie.repertoire")} className={cn(CARTE, "pb-2")}>
          {fiche.repertoire && (
            <ParagrapheFiche className="px-4 py-2 text-[15px] leading-relaxed" texte={fiche.repertoire} demiTons={0} tonalite={TON_DES_FICHES} />
          )}
          {exemples.length > 0 && (
            <>
              <p className="px-4 pb-1 text-[13px] text-muted-foreground">
                {t("harmonie.repertoireCompte", { count: exemples.length })}
              </p>
              <div className={cn("grid px-4", deuxVolets ? "grid-cols-2 gap-x-8 min-[1440px]:grid-cols-3" : "md:grid-cols-2 md:gap-x-8")}>
                {(tousLesExemples ? exemples : exemples.slice(0, 6)).map(({ slug, chant, fois }) => (
                  <GroupRow key={slug} href={`/songs/${slug}`} chevron className="mx-0 w-full rounded-none border-t border-border px-0 before:hidden">
                    <span className="block truncate font-medium">{chant?.titlePinyin ? `${chant.title} · ${chant.titlePinyin}` : chant?.title ?? slug}</span>
                    {fois > 0 && (
                      <span className="block text-[13px] text-muted-foreground">
                        {t("harmonie.foisEnSetlist", { count: fois })}
                      </span>
                    )}
                  </GroupRow>
                ))}
              </div>
              {!tousLesExemples && exemples.length > 6 && (
                <div className="px-4">
                  <GroupRow onClick={() => setTousLesExemples(true)}>
                    <span className="font-medium text-muted-foreground">{t("harmonie.voirPlus")}</span>
                  </GroupRow>
                </div>
              )}
            </>
          )}
        </Group>
      )}

      {fiche.regle && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          <TexteFiche texte={fiche.regle.replace(/\s*\n\s*/g, " ")} demiTons={0} tonalite={TON_DES_FICHES} />
        </p>
      )}
    </div>
  );
}
