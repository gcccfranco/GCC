"use client";

// Une fiche du catalogue « Harmonie » (lot 9, H1). Tout est écrit en D dans
// `docs/harmonie/*.md` : la tonalité choisie ici ne transpose que les accords
// (ce qui est entre accents graves), pas les explications — la phrase « le C#
// de la mélodie » resterait fausse une fois transposée.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Group, GroupRow } from "@/components/ui/group";
import { Pilules } from "@/components/harmonie/Pilules";
import { Clavier, DiagrammeGuitare, doigtesDe, notesDe } from "@/components/harmonie/Diagrammes";
import { ParagrapheFiche, TexteFiche } from "@/components/harmonie/TexteFiche";
import { useAccesHarmonie, useCatalogue, useInstrument } from "@/lib/harmonie/useHarmonie";
import { getSetlists } from "@/lib/firebase/setlists";
import { ALL_KEYS, getTransposedKey, semitonesTo } from "@/lib/transpose";
import type { Instrument } from "@/types/harmonie";

/** Les fiches sont écrites dans cette tonalité. */
const TON_DES_FICHES = "D";

type Entree = { slug: string; title: string; titlePinyin: string | null; language: string };

function Fiche() {
  const { t } = useTranslation();
  const params = useParams<{ fiche: string[] }>();
  const id = (Array.isArray(params.fiche) ? params.fiche : [params.fiche]).filter(Boolean).join("/");
  const acces = useAccesHarmonie();
  const { fiches, chargement } = useCatalogue();
  const [instrument, setInstrument] = useInstrument(acces);
  const [tonalite, setTonalite] = useState(TON_DES_FICHES);
  const [capo, setCapo] = useState(0);
  const [tousLesExemples, setTousLesExemples] = useState(false);
  const [chants, setChants] = useState<Entree[]>([]);
  const [comptes, setComptes] = useState<Record<string, number>>({});

  const fiche = fiches.find((f) => f.id === id);
  const demiTons = semitonesTo(TON_DES_FICHES, tonalite);

  // Les exemples s'ordonnent du plus chanté au moins chanté, compté ici (les
  // setlists sont déjà lisibles par tout connecté) plutôt qu'au build : le
  // classement reste à jour sans relancer de script.
  useEffect(() => {
    if (!fiche?.exemples.length) return;
    let vivant = true;
    fetch("/songs-index.json")
      .then((r) => r.json())
      .then((d: { songs: Entree[] }) => { if (vivant) setChants(d.songs); })
      .catch(() => { /* la liste s'affichera par slug */ });
    getSetlists()
      .then((setlists) => {
        if (!vivant) return;
        const n: Record<string, number> = {};
        for (const s of setlists) for (const it of s.items ?? []) if (it.songSlug) n[it.songSlug] = (n[it.songSlug] ?? 0) + 1;
        setComptes(n);
      })
      .catch(() => { /* sans les setlists, l'ordre reste celui du répertoire */ });
    return () => { vivant = false; };
  }, [fiche?.exemples.length]);

  const exemples = useMemo(() => {
    if (!fiche) return [];
    const parSlug = new Map(chants.map((c) => [c.slug, c]));
    return [...fiche.exemples]
      .sort((a, b) => (comptes[b] ?? 0) - (comptes[a] ?? 0))
      .map((slug) => ({ slug, chant: parSlug.get(slug), fois: comptes[slug] ?? 0 }));
  }, [fiche, chants, comptes]);

  if (acces.chargement || chargement) return null;
  if (!acces.peut) {
    return <p className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">{t("common.noAccess")}</p>;
  }
  if (!fiche) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-muted-foreground">{t("harmonie.aucuneFiche")}</p>
        <Link href="/harmonie" className="mt-3 inline-block underline underline-offset-4">{t("harmonie.retour")}</Link>
      </div>
    );
  }

  const texteInstrument = instrument === "piano" ? fiche.piano : fiche.guitare;
  const montreCapo = instrument === "guitare";
  // Les doigtés écrits dans la fiche sont ceux de D (tout y est écrit). Le
  // capo ne les change pas : il dit en quelle tonalité ces formes sonnent —
  // capo 2 sur des formes de D, ça sonne en E. On ne transpose pas non plus
  // les explications : « E, » et « E » ne se transposeraient pas pareil, et
  // une phrase à moitié transposée est pire que pas transposée du tout.
  const tonDesFormes = getTransposedKey(TON_DES_FICHES, capo);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3 pb-10 space-y-5" data-fiche={fiche.id}>
      <Link
        href="/harmonie"
        className="inline-flex items-center gap-1 text-[15px] text-muted-foreground active:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("harmonie.retour")}
      </Link>

      <header>
        <h1 className="text-[22px] font-bold leading-tight">{fiche.nom}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {fiche.familleNom} · {fiche.sensations.map((s) => t(`harmonie.sensation.${s}`)).join(" · ")}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {fiche.moments.map((m) => t(`harmonie.moment.${m}`)).join(" · ")}
          {fiche.niveau[instrument] && ` · ${t(`harmonie.niveau.${fiche.niveau[instrument]}`)}`}
          {fiche.niveauNote && ` · ${fiche.niveauNote}`}
        </p>
        {fiche.statut !== "validee" && (
          <p className="mt-2 rounded-xl bg-card px-3 py-2 text-[13px] text-muted-foreground">{t("harmonie.aRelireTout")}</p>
        )}
      </header>

      {acces.piano && acces.guitare && !fiche.instrument && (
        <Pilules
          etiquette={t("harmonie.instrument.piano")}
          options={(["piano", "guitare"] as Instrument[]).map((i) => ({ cle: i, nom: t(`harmonie.instrument.${i}`) }))}
          valeur={instrument}
          choisir={(v) => setInstrument((v ?? "piano") as Instrument)}
          obligatoire
        />
      )}

      {/* Avant → après, le cœur de la fiche */}
      {fiche.avantApres && (
        <Group title={t("harmonie.avantApres")}>
          <div className="px-4 py-3 text-[17px] leading-relaxed">
            <ParagrapheFiche texte={fiche.avantApres} demiTons={demiTons} tonalite={tonalite} />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--filet)] px-4 py-2.5">
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
            <p className="border-t border-[var(--filet)] px-4 py-2 text-[13px] text-muted-foreground">
              {t("harmonie.resteEnD", { ton: TON_DES_FICHES })}
            </p>
          )}
        </Group>
      )}

      {fiche.pourquoi && (
        <Group title={t("harmonie.pourquoi")}>
          <ParagrapheFiche className="px-4 py-3 text-[15px] leading-relaxed" texte={fiche.pourquoi} demiTons={0} tonalite={TON_DES_FICHES} />
        </Group>
      )}

      {fiche.eviter.length > 0 && (
        <Group title={t("harmonie.eviter")}>
          <ul className="divide-y divide-[var(--filet)]">
            {fiche.eviter.map((e, i) => (
              <li key={i} className="px-4 py-2.5 text-[15px] leading-relaxed">
                <TexteFiche texte={e.replace(/\s*\n\s*/g, " ")} demiTons={0} tonalite={TON_DES_FICHES} />
              </li>
            ))}
          </ul>
        </Group>
      )}

      {texteInstrument && (
        <Group title={instrument === "piano" ? t("harmonie.auPiano") : t("harmonie.aLaGuitare")}>
          {montreCapo && (
            <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
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
          <ParagrapheFiche className="px-4 py-3 text-[15px] leading-relaxed" texte={texteInstrument} demiTons={0} tonalite={TON_DES_FICHES} />
          {instrument === "guitare" && doigtesDe(texteInstrument).length > 0 && (
            <div className="flex flex-wrap gap-4 border-t border-[var(--filet)] px-4 py-3 text-foreground">
              {doigtesDe(texteInstrument).map((d, i) => (
                <figure key={i} className="text-center">
                  <DiagrammeGuitare doigte={d} capo={capo} label={t("harmonie.ariaDoigte", { doigte: d })} />
                  <figcaption className="mt-1 text-[11px] text-muted-foreground">{d}</figcaption>
                </figure>
              ))}
            </div>
          )}
          {instrument === "piano" && notesDe(texteInstrument).length > 0 && (
            <div className="flex flex-wrap gap-4 border-t border-[var(--filet)] px-4 py-3 text-foreground">
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

      {(fiche.repertoire || exemples.length > 0) && (
        <Group title={t("harmonie.repertoire")}>
          {fiche.repertoire && (
            <ParagrapheFiche className="px-4 py-3 text-[15px] leading-relaxed" texte={fiche.repertoire} demiTons={0} tonalite={TON_DES_FICHES} />
          )}
          {exemples.length > 0 && (
            <>
              <p className="border-t border-[var(--filet)] px-4 py-2 text-[13px] text-muted-foreground">
                {t("harmonie.repertoireCompte", { count: exemples.length })}
              </p>
              {(tousLesExemples ? exemples : exemples.slice(0, 8)).map(({ slug, chant, fois }) => (
                <GroupRow key={slug} href={`/songs/${slug}`} chevron>
                  <span className="block truncate">{chant?.titlePinyin ? `${chant.title} · ${chant.titlePinyin}` : chant?.title ?? slug}</span>
                  {fois > 0 && (
                    <span className="block text-[13px] text-muted-foreground">
                      {t("harmonie.foisEnSetlist", { count: fois })}
                    </span>
                  )}
                </GroupRow>
              ))}
              {!tousLesExemples && exemples.length > 8 && (
                <GroupRow onClick={() => setTousLesExemples(true)}>
                  <span className="font-medium">{t("harmonie.voirPlus")}</span>
                </GroupRow>
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

export function FicheClient() {
  return (
    <RequireAuth>
      <Fiche />
    </RequireAuth>
  );
}
