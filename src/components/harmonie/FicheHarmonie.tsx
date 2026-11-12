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
import { ChevronDown } from "lucide-react";
import { Retour } from "@/components/layout/EnTetePage";
import { useTranslation } from "react-i18next";
import { Group, GroupRow } from "@/components/ui/group";
import { OngletsRail } from "@/components/layout/Onglets";
import { Menu } from "@/components/ui/menu";
import { Clavier, DiagrammeGuitare, doigtesDe, notesDe } from "@/components/harmonie/Diagrammes";
import { AvisLangue, useTerme } from "@/components/harmonie/AvisLangue";
import { ParagrapheFiche, TexteFiche, TON_DES_FICHES } from "@/components/harmonie/TexteFiche";
import { useCatalogueHarmonie } from "@/components/harmonie/catalogueContexte";
import { BoutonEcouter } from "@/components/harmonie/BoutonEcouter";
import { avantApres } from "@/lib/harmonie/avantApres";
import { decouperRepertoire } from "@/lib/harmonie/repertoire";
import { useDeuxVolets } from "@/hooks/useDeuxVolets";
import { chargerIndexChants } from "@/hooks/useSongsIndex";
import { ALL_KEYS, getTransposedKey, semitonesTo, transposeLabel } from "@/lib/transpose";
import { cn } from "@/lib/utils";
import { TOUCHER_44 } from "@/lib/toucher44";
import type { Instrument } from "@/types/harmonie";

/** Titre comparable : sans accents, sans casse, ponctuation réduite à des espaces. */
const titreNormalise = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’`]/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").trim();

type Entree = { slug: string; title: string; titlePinyin: string | null; language: string };

/** Une carte de la fiche : le titre dedans, petit et gris, comme la planche. */
const PASTILLE = "rounded-full bg-secondary px-2.5 py-0.5 text-sm text-muted-foreground";

const CARTE = "bloc-info rounded-2xl pt-3.5 pb-1 [&>h2]:px-4";

export function FicheHarmonie({ id }: { id: string }) {
  const { t } = useTranslation();
  const terme = useTerme();
  const { acces, fiches, instrument, setInstrument, comptesDesChants, ordre } = useCatalogueHarmonie();
  const deuxVolets = useDeuxVolets();
  const [tonalite, setTonalite] = useState(TON_DES_FICHES);
  const [capo, setCapo] = useState(0);
  const [tousLesExemples, setTousLesExemples] = useState(false);
  const [toutesLesEcoutes, setToutesLesEcoutes] = useState(false);
  const [chants, setChants] = useState<Entree[]>([]);
  const [comptes, setComptes] = useState<Record<string, number>>({});

  const fiche = fiches.find((f) => f.id === id);
  // Le nom d'un passage : type traduit (clés de section du site) + numéro lu dans `nom` ; type inconnu, `nom`.
  const nomDuPassage = (e: { section: string; nom: string }) => {
    const type = e.section.match(/^([a-z]+)-\d+-\d+$/)?.[1];
    const libelle = type ? t(`songs.sections.${type}`, { defaultValue: "" }) : "";
    return libelle ? [libelle, e.nom.match(/(\d+)\s*$/)?.[1]].filter(Boolean).join(" ") : e.nom;
  };
  const demiTons = semitonesTo(TON_DES_FICHES, tonalite);

  // Les exemples s'ordonnent du plus chanté au moins chanté, compté d'après les
  // setlists (lisibles par tout connecté) plutôt qu'au build : le classement reste
  // à jour sans relancer de script. Le layout de la section les lit une fois.
  useEffect(() => {
    if (!fiche?.exemples.length && !fiche?.repertoire && !fiche?.ecoutes.length) return;
    let vivant = true;
    chargerIndexChants()
      .then((songs) => { if (vivant) setChants(songs); })
      .catch(() => { /* la liste s'affichera par slug */ });
    comptesDesChants().then((n) => { if (vivant) setComptes(n); });
    return () => { vivant = false; };
  }, [fiche?.exemples.length, fiche?.repertoire, fiche?.ecoutes.length, comptesDesChants]);

  // « Où l'entendre » : chaque titre retrouve son chant dans le même index (titre normalisé, le premier gagne) ; introuvable, il reste du texte.
  const slugDuTitre = useMemo(() => new Map([...chants].reverse().map((c) => [titreNormalise(c.title), c.slug])), [chants]);

  // Les chants à passages (`ecoutes`) : une ligne par chant, classés comme les exemples ; ils sortent des exemples.
  const ecoutes = useMemo(() => {
    if (!fiche) return [];
    const parSlug = new Map(chants.map((c) => [c.slug, c]));
    const parChant = new Map<string, { section: string; nom: string }[]>();
    for (const e of fiche.ecoutes) parChant.set(e.slug, [...(parChant.get(e.slug) ?? []), e]);
    return [...parChant]
      .sort((a, b) => (comptes[b[0]] ?? 0) - (comptes[a[0]] ?? 0))
      .map(([slug, passages]) => ({ slug, chant: parSlug.get(slug), passages }));
  }, [fiche, chants, comptes]);

  const exemples = useMemo(() => {
    if (!fiche) return [];
    const parSlug = new Map(chants.map((c) => [c.slug, c]));
    return fiche.exemples
      .filter((slug) => !fiche.ecoutes.some((e) => e.slug === slug))
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
  const famille = terme(`harmonie.familles.${fiche.famille}`, fiche.familleNom);
  const colonnesRepertoire = deuxVolets ? "grid-cols-2 gap-x-8 min-[1440px]:grid-cols-3" : "md:grid-cols-2 md:gap-x-8";
  const phrase = fiche.repertoire ? decouperRepertoire(fiche.repertoire) : null;
  // Le premier passage d'`ecoutes` du chant, s'il y en a un : la page chant y défile (`useAllerAuPassage`).
  const lienChant = (slug: string) => {
    const e = fiche.ecoutes.find((x) => x.slug === slug);
    return `/songs/${slug}${e ? `?passage=${encodeURIComponent(JSON.stringify(e.section))}` : ""}`;
  };
  // Précédente / suivante : la liste filtrée ; une fiche qui n'y est pas suit l'ordre complet.
  const suite = ordre.includes(fiche.id) ? ordre : fiches.map((f) => f.id);
  const rang = suite.indexOf(fiche.id);
  const precedente = fiches.find((f) => f.id === suite[rang - 1]);
  const suivante = fiches.find((f) => f.id === suite[rang + 1]);
  const pastilles = [
    ...fiche.ressentis.map((x) => ({ texte: t(`harmonie.ressenti.${x}`), lang: undefined })),
    ...fiche.usages.map((x) => ({ texte: t(`harmonie.usage.${x}`), lang: undefined })),
    ...(fiche.niveau[instrument] ? [{ texte: t(`harmonie.niveau.${fiche.niveau[instrument]}`), lang: undefined }] : []),
    ...(fiche.niveauNote ? [{ texte: fiche.niveauNote, lang: "fr" as string | undefined }] : []),
  ];
  // Les chants déjà cités dans la phrase écrite y ont leur lien (au passage) : ils ne reviennent pas dans la liste.
  const dansLaPhrase = new Set(phrase?.map((e) => slugDuTitre.get(titreNormalise(e.titre))));
  const ecoutesVisibles = ecoutes.filter((e) => !dansLaPhrase.has(e.slug));
  const suites = fiche.avantApres ? avantApres(fiche.avantApres) : null;
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
      className={cn("[container-type:inline-size] space-y-4 pb-10", deuxVolets ? undefined : "max-w-2xl px-[var(--marge-page)] pt-3 md:max-w-3xl")}
      data-fiche={fiche.id}
    >
      {!deuxVolets && (
        <Retour href="/harmonie">{t("harmonie.retour")}</Retour>
      )}

      <header className="space-y-3">
        <div>
          <div className="min-w-0">
            {/* En grand, sous l'en-tête « Harmonie » : un h2 de 24 px (agencement v18, R3) ; seule, le h1. */}
            <p className="text-sm text-muted-foreground" lang={famille.lang}>{famille.texte}</p>
            <Titre className="text-xl font-bold leading-tight" lang="fr">{fiche.nom}</Titre>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5" data-pastilles>
              {pastilles.slice(0, -1).map((x) => <span key={x.texte} className={PASTILLE} lang={x.lang}>{x.texte}</span>)}
              {/* La dernière pastille et « proposées » ne se séparent pas à la ligne. */}
              {pastilles.length > 0 && (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span className={PASTILLE} lang={pastilles.at(-1)!.lang}>{pastilles.at(-1)!.texte}</span>
                  {fiche.etiquettesProposees && <span className="text-sm text-muted-foreground">{t("harmonie.proposees")}</span>}
                </span>
              )}
            </div>
          </div>
        </div>
        <AvisLangue relecture={fiche.statut !== "validee"} />
      </header>

      {!deuxVolets && choixInstrument}

      {/* Avant → après, le cœur de la fiche */}
      {fiche.avantApres && (
        <Group title={t("harmonie.avantApres")} className={CARTE}>
          <div className="px-4 py-2 text-lg leading-relaxed" lang="fr">
            <ParagrapheFiche texte={fiche.avantApres} demiTons={demiTons} tonalite={tonalite} />
          </div>
          {suites && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-2.5" data-ecouter-avant-apres>
              {(["avant", "apres"] as const).map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t(`harmonie.${k}`)}</span>
                  <BoutonEcouter accords={suites[k].map((c) => transposeLabel(c, demiTons, tonalite))} />
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5">
            <span className="text-sm text-muted-foreground">{t("harmonie.tonalite")}</span>
            <Menu
              label={t("harmonie.tonalite")}
              className="[&:not([data-pose])]:bg-card"
              value={tonalite}
              defaultValue={TON_DES_FICHES}
              onChange={setTonalite}
              options={ALL_KEYS.map((k) => ({ valeur: k, libelle: k }))}
            />
          </div>
          {demiTons !== 0 && (
            <p className="border-t border-border px-4 py-2 text-sm text-muted-foreground">
              {t("harmonie.resteEnD", { ton: TON_DES_FICHES })}
            </p>
          )}
        </Group>
      )}

      {/* Pourquoi à côté de l'instrument dès qu'il y a la place, « Quand l'éviter » en pleine largeur dessous (une colonne : Pourquoi, instrument, Quand l'éviter). */}
      <div className={"grid items-start gap-4 [@container(min-width:640px)]:grid-cols-2"}>
        {fiche.pourquoi && (
          <div className="bloc-info rounded-2xl pt-3.5 pb-1">
            <Group title={t("harmonie.pourquoi")} className="[&>h2]:px-4">
              <ParagrapheFiche className="px-4 pb-3 text-base leading-relaxed" texte={fiche.pourquoi} demiTons={0} tonalite={TON_DES_FICHES} />
            </Group>
          </div>
        )}

        {texteInstrument && (
          <Group title={instrument === "piano" ? t("harmonie.auPiano") : t("harmonie.aLaGuitare")} className={CARTE}>
            {montreCapo && (
              <div className="flex flex-wrap items-center gap-3 px-4 pt-1">
                <span className="text-sm text-muted-foreground">{t("harmonie.capoTitre")}</span>
                <Menu
                  label={t("harmonie.capoTitre")}
                  className="[&:not([data-pose])]:bg-card"
                  value={String(capo)}
                  defaultValue="0"
                  onChange={(v) => setCapo(Number(v))}
                  options={["0", "1", "2", "3", "4", "5", "6", "7"].map((n) => ({ valeur: n, libelle: n === "0" ? t("harmonie.sansCapo") : n }))}
                />
                <span className="text-sm text-muted-foreground">
                  {capo > 0
                    ? t("harmonie.formesSonnent", { ton: TON_DES_FICHES, sonne: tonDesFormes })
                    : t("harmonie.formesEcrites", { ton: TON_DES_FICHES })}
                </span>
              </div>
            )}
            <ParagrapheFiche className="px-4 py-2 text-base leading-relaxed" texte={texteInstrument} demiTons={0} tonalite={TON_DES_FICHES} />
            {instrument === "guitare" && doigtesDe(texteInstrument).length > 0 && (
              <div className="flex flex-wrap gap-4 px-4 py-3 text-foreground">
                {doigtesDe(texteInstrument).map((d, i) => (
                  <figure key={i} className="text-center">
                    <DiagrammeGuitare doigte={d} capo={capo} label={t("harmonie.ariaDoigte", { doigte: d })} />
                    <figcaption className="mt-1 text-sm text-muted-foreground">{d}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            {instrument === "piano" && notesDe(texteInstrument).length > 0 && (
              <div className="flex flex-wrap gap-4 px-4 py-3 text-foreground">
                {notesDe(texteInstrument).slice(0, 4).map((notes, i) => (
                  <figure key={i} className="text-center">
                    <Clavier notes={notes} label={t("harmonie.ariaClavier", { notes: notes.join(" ") })} />
                    <figcaption className="mt-1 text-sm text-muted-foreground">{notes.join(" ")}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </Group>
        )}
        {fiche.eviter.length > 0 && (
          <Group title={t("harmonie.eviter")} className={cn(CARTE, "[@container(min-width:640px)]:col-span-2")}>
            <ul className="divide-y divide-border">
              {fiche.eviter.map((e, i) => (
                <li key={i} className="px-4 py-2.5 text-base leading-relaxed" lang="fr">
                  <TexteFiche texte={e.replace(/\s*\n\s*/g, " ")} demiTons={0} tonalite={TON_DES_FICHES} />
                </li>
              ))}
            </ul>
          </Group>
        )}
      </div>

      {(fiche.repertoire || exemples.length > 0 || ecoutesVisibles.length > 0) && (
        <Group title={t("harmonie.repertoire")} className={cn(CARTE, "pb-2")}>
          {fiche.repertoire && (phrase ? (
            <div className={cn("px-4", ecoutesVisibles.length ? "pb-0" : "pb-2")} data-ou-l-entendre lang="fr">
              {/* Le sous-titre ne sert qu'à séparer la phrase de la liste « n chants qui le jouent déjà » ; seule, le titre de la carte suffit. */}
              {exemples.length > 0 && <h3 className="mb-1 text-sm font-semibold text-muted-foreground">{t("harmonie.ouLEntendre")}</h3>}
              <ul className={cn("grid", colonnesRepertoire)}>
                {phrase.map((e, i) => (
                  <li key={i} className="border-t border-border py-2">
                    {slugDuTitre.has(titreNormalise(e.titre)) ? (
                      <Link href={lienChant(slugDuTitre.get(titreNormalise(e.titre))!)} className={cn("block text-base font-semibold leading-[21px] underline-offset-4 hover:underline", TOUCHER_44)}>{e.titre}</Link>
                    ) : (
                      <span className="block text-base font-semibold leading-[21px]">{e.titre}</span>
                    )}
                    <span className="block min-h-[18px] text-sm leading-[18px] text-muted-foreground">
                      {e.detail.length > 0
                        ? e.detail.map((m, j) => (m.accord ? <span key={j} className="font-chord font-semibold text-[var(--chord-color)]">{m.texte}</span> : <span key={j}>{m.texte}</span>))
                        : chants.find((c) => c.slug === slugDuTitre.get(titreNormalise(e.titre)))?.titlePinyin}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ParagrapheFiche className="px-4 py-2 text-base leading-relaxed" texte={fiche.repertoire} demiTons={0} tonalite={TON_DES_FICHES} />
          ))}
          {ecoutesVisibles.length > 0 && (
            <div className="px-4 pb-2" data-ecoutes>
              <ul className={cn("grid", colonnesRepertoire)}>
                {(toutesLesEcoutes ? ecoutesVisibles : ecoutesVisibles.slice(0, 6)).map(({ slug, chant, passages }) => (
                  <li key={slug} className="border-t border-border py-2">
                    <Link href={lienChant(slug)} className={cn("block text-base font-semibold leading-[21px] underline-offset-4 hover:underline", TOUCHER_44)}>
                      {chant?.titlePinyin ? `${chant.title} · ${chant.titlePinyin}` : chant?.title ?? slug}
                    </Link>
                    <span className="block min-h-[18px] text-sm leading-[18px] text-muted-foreground">
                      {passages.slice(0, 3).map(nomDuPassage).join(" · ")}
                      {passages.length > 3 && ` +${passages.length - 3}`}
                    </span>
                  </li>
                ))}
              </ul>
              {!toutesLesEcoutes && ecoutesVisibles.length > 6 && (
                <GroupRow onClick={() => setToutesLesEcoutes(true)} className="mx-0 mt-2 min-h-11 w-full justify-center bg-secondary py-0 before:hidden hover:bg-secondary-fond active:bg-secondary-fond">
                  <span className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
                    {t("harmonie.voirLesAutresChants", { count: ecoutesVisibles.length - 6 })}
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </span>
                </GroupRow>
              )}
            </div>
          )}
          {exemples.length > 0 && (
            <>
              <p className="px-4 pb-1 text-sm text-muted-foreground">
                {t("harmonie.repertoireCompte", { count: exemples.length })}
              </p>
              <div className={cn("grid px-4", colonnesRepertoire)}>
                {(tousLesExemples ? exemples : exemples.slice(0, 6)).map(({ slug, chant, fois }) => (
                  <GroupRow
                    key={slug}
                    href={`/songs/${slug}`}
                    chevron
                    trailing={fois > 0 ? <span className="text-sm leading-[18px]" aria-label={t("harmonie.foisEnSetlist", { count: fois })}>{fois}×</span> : undefined}
                    className="mx-0 min-h-11 w-full rounded-none border-t border-border px-0 py-0 before:hidden"
                  >
                    <span className="block truncate font-medium">{chant?.titlePinyin ? `${chant.title} · ${chant.titlePinyin}` : chant?.title ?? slug}</span>
                  </GroupRow>
                ))}
              </div>
              {!tousLesExemples && exemples.length > 6 && (
                <div className="px-4">
                  <GroupRow onClick={() => setTousLesExemples(true)} className="mx-0 mt-2 min-h-11 w-full justify-center bg-secondary py-0 before:hidden hover:bg-secondary-fond active:bg-secondary-fond">
                    <span className="flex items-center justify-center gap-1.5 font-semibold text-foreground">
                      {t("harmonie.voirLesAutresChants", { count: exemples.length - 6 })}
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </span>
                  </GroupRow>
                </div>
              )}
            </>
          )}
        </Group>
      )}

      {fiche.regle && (
        <p className="text-sm leading-relaxed text-muted-foreground" lang="fr">
          <TexteFiche texte={fiche.regle.replace(/\s*\n\s*/g, " ")} demiTons={0} tonalite={TON_DES_FICHES} />
        </p>
      )}
      <nav className="flex items-center justify-between gap-4 border-t border-border pt-3" data-fiche-nav>
        {precedente ? (
          <Link href={`/harmonie/${precedente.id}`} aria-label={t("harmonie.fichePrecedente")} className={cn("min-w-0 text-sm font-medium underline-offset-4 hover:underline", TOUCHER_44)}>
            <span className="block text-xs font-normal text-muted-foreground">{t("harmonie.precedente")}</span>
            <span lang="fr">‹ {precedente.nom}</span>
          </Link>
        ) : <span />}
        {suivante && (
          <Link href={`/harmonie/${suivante.id}`} aria-label={t("harmonie.ficheSuivante")} className={cn("min-w-0 text-right text-sm font-medium underline-offset-4 hover:underline", TOUCHER_44)}>
            <span className="block text-xs font-normal text-muted-foreground">{t("harmonie.suivante")}</span>
            <span lang="fr">{suivante.nom} ›</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
