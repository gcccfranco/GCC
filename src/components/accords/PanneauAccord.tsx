"use client";

// Dictionnaire d'accords (lot DA, DA-2) — le contenu d'un accord : nom, notes, dessin (guitare ou piano), autres
// positions. Un seul composant pour la feuille du bas, la bulle de l'ordinateur et la carte de la page /accords.
// Les décisions sont dans docs/spec-dictionnaire-accords.md (Q5, Q10, Q11, Q17, Q18).

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import { AccordTouchable } from "./AccordTouchable";
import { LigneIci } from "./LigneIci";
import type { HarmonieDuPanneau } from "./AccordsProvider";
import { BoutonEcouter } from "@/components/harmonie/BoutonEcouter";
import { chiffreDuDegre, chiffrerEtiquette, degreDeLAccord } from "@/lib/harmonie/degres";
import { ensuite, notesGardeesEtMouvantes } from "@/lib/harmonie/suites";
import { transposeChord } from "@/lib/transpose";
import { useNotationDuCompte } from "@/components/song/NotationAccordsProvider";
import { NotationAccordsContext } from "@/lib/notationAccords";
import { DiagrammeGuitare, ClavierMains } from "@/components/harmonie/Diagrammes";
import { positionsGuitare } from "@/lib/accords/guitare";
import type { Accord } from "@/lib/accords/analyse";
import type { Instrument } from "@/types/harmonie";
import { decrire, grilleDe, nombreDeRenversements, notesEnLettres, pianoDe } from "./outils";

type Variante = "feuille" | "bulle" | "carte";

/** Une légende « a · b · c » dont chaque élément ne se coupe jamais (« P pouce » seul en bout de ligne, musiciens-5). */
function Insecables({ elements }: { elements: string[] }) {
  return (
    <>
      {elements.map((e, i) => (
        <span key={i}>
          {i > 0 && " · "}
          <span className="whitespace-nowrap">{e}</span>
        </span>
      ))}
    </>
  );
}

/** Guitare | Piano : deux vrais boutons dans un groupe (comme le segment 简谱 · Paroles de la page chant). */
export function ChoixInstrument({
  instrument,
  onChange,
  compact,
}: {
  instrument: Instrument;
  onChange: (i: Instrument) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t("accords.instrument")} className="inline-flex rounded-full bg-secondary p-1">
      {(["guitare", "piano"] as const).map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={instrument === i}
          onClick={() => onChange(i)}
          className={`rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            compact ? "h-8" : "h-11"
          } ${instrument === i ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t(`accords.${i}`)}
        </button>
      ))}
    </div>
  );
}

/** La rangée ‹ texte › sous le dessin : positions de la guitare, renversements du piano (même rangée, même geste). */
function Fleches({
  rondBouton,
  precedent,
  suivant,
  texte,
  aller,
}: {
  rondBouton: string;
  precedent: string;
  suivant: string;
  texte: string;
  aller: (delta: number) => void;
}) {
  const classe = `${rondBouton} flex items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`;
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <button type="button" onClick={() => aller(-1)} aria-label={precedent} className={classe}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-[8.5rem] text-center text-sm font-medium text-foreground">
        {texte}
      </span>
      <button type="button" onClick={() => aller(1)} aria-label={suivant} className={classe}>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** « Ensuite : 5 · 6m · 1 », repliée ; dépliée, une ligne par suite (lettre, notes gardées, écoute). Repliée à chaque nouvel accord (`key`). */
function Ensuite({ accord, harmonie, capo, bulle }: { accord: string; harmonie: HarmonieDuPanneau; capo?: number; bulle: boolean }) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState(false);
  const notation = useNotationDuCompte();
  const { tonalite } = harmonie;
  const degre = degreDeLAccord(accord, tonalite);
  if (!degre) return null;
  const suivant = harmonie.suivant ? degreDeLAccord(harmonie.suivant, tonalite) : null;
  const lignes = ensuite(
    chiffreDuDegre({ ...degre, basse: null }),
    tonalite,
    harmonie.suivant && suivant ? { accord: harmonie.suivant, chiffre: chiffreDuDegre(suivant) } : undefined,
  );
  if (!lignes.length) return null;
  const sonore = (a: string) => (capo ? transposeChord(a, capo, tonalite) : a);
  const Fleche = ouvert ? ChevronUp : ChevronDown;
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={ouvert}
        onClick={() => setOuvert(!ouvert)}
        className={`flex w-full items-center gap-1 rounded-lg text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${bulle ? "min-h-8" : "min-h-11"}`}
      >
        <span className="min-w-0 flex-1">
          {t("accords.ensuite")}{" "}
          <span className="font-chord font-semibold text-[color:var(--chord-color)]">{lignes.map((l) => (notation === "chiffres" ? chiffrerEtiquette(l.accord, tonalite) : l.accord)).join(" · ")}</span>
        </span>
        <Fleche className="h-4 w-4 shrink-0" aria-hidden />
      </button>
      {ouvert && (
        <NotationAccordsContext.Provider value={{ notation, tonalite }}>
        <ul data-ensuite="" className="mt-1 divide-y divide-border">
          {lignes.map((l) => {
            const notes = notesGardeesEtMouvantes(accord, l.accord);
            return (
              <li key={l.chiffre} className={`grid items-center gap-x-2 py-1 text-sm ${bulle ? "grid-cols-[2.75rem_1fr_auto]" : "min-h-11 grid-cols-[3.5rem_1fr_auto]"}`}>
                <span className="font-chord font-semibold text-[color:var(--chord-color)]"><AccordTouchable etiquette={l.accord} visible variante="nu" /></span>
                <span className="min-w-0 text-muted-foreground">
                  {l.dansCeChant && <span className="block text-xs">{t("accords.dansCeChant")}</span>}
                  {notes && (
                    <Insecables
                      elements={[
                        notes.gardees.length ? t("accords.garde", { notes: notes.gardees.join(" ") }) : t("accords.toutBouge"),
                        ...notes.bougent.map((m) => `${m.de} → ${m.vers}`),
                      ]}
                    />
                  )}
                </span>
                <BoutonEcouter compact accords={[sonore(accord), sonore(l.accord)]} className={`px-0 ${bulle ? ROND_BULLE : "h-11 w-11"}`} />
              </li>
            );
          })}
        </ul>
        </NotationAccordsContext.Provider>
      )}
    </div>
  );
}

/** Ronds de la bulle : 32 px à la souris, 44 px sur un écran tactile. */
const ROND_BULLE = "h-8 w-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11";

const TAILLE_NOM: Record<Variante, string> = { feuille: "text-[32px]", bulle: "text-[26px]", carte: "text-[40px]" };

export function PanneauAccord({
  accord,
  instrument,
  onInstrument,
  variante,
  capo,
  harmonie,
  chant,
  onFermer,
  onSignaler,
}: {
  accord: Accord;
  instrument: Instrument;
  /** Donné : le panneau montre son propre choix Guitare | Piano (la page, elle, l'a dans sa rangée). */
  onInstrument?: (i: Instrument) => void;
  variante: Variante;
  capo?: number;
  /** Donné (accord touché dans la partition d'un chant) : chiffre, Écouter et Ensuite. */
  harmonie?: HarmonieDuPanneau;
  /** Le chant lu : la ligne « Ici » y charge ses idées. */
  chant?: { slug: string };
  /** Donné : le bouton ✕ et la fermeture au clic sur « Voir tout le dictionnaire ». */
  onFermer?: () => void;
  /** Ouvre le signalement d'un doigté manquant. */
  onSignaler?: () => void;
}) {
  const { t } = useTranslation();
  // Ouvert depuis la page d'un chant : le lien du dictionnaire le dit (`?depuis=<slug>`) pour le retour.
  const depuisChant = /^\/songs\/([^/]+)\/?$/.exec(usePathname() ?? "")?.[1];
  const bulle = variante === "bulle";
  const carte = variante === "carte";
  const { doigtes, basseAJouer } = useMemo(() => positionsGuitare(accord), [accord]);
  // Position affichée : repart de la première quand l'accord change.
  const [choix, setChoix] = useState<{ pour: string; i: number }>({ pour: accord.texte, i: 0 });
  const position = choix.pour === accord.texte ? choix.i % Math.max(doigtes.length, 1) : 0;
  const aller = (delta: number) =>
    setChoix({ pour: accord.texte, i: (position + delta + doigtes.length) % doigtes.length });

  const nbRenversements = useMemo(() => nombreDeRenversements(accord), [accord]);
  const [choixPiano, setChoixPiano] = useState<{ pour: string; i: number }>({ pour: accord.texte, i: 0 });
  const renversement = choixPiano.pour === accord.texte ? choixPiano.i % Math.max(nbRenversements, 1) : 0;
  const allerPiano = (delta: number) =>
    setChoixPiano({ pour: accord.texte, i: (renversement + delta + nbRenversements) % nbRenversements });
  const piano = useMemo(() => pianoDe(accord, renversement), [accord, renversement]);
  const doigte = doigtes[position];
  const rondBouton = bulle ? ROND_BULLE : "h-11 w-11";
  const puissance = accord.qualite === "5" && accord.ecrite === "5";
  const quinte = piano.nomsDroite[piano.nomsDroite.length - 1];
  const degre = harmonie ? degreDeLAccord(accord.texte, harmonie.tonalite) : null;
  const sonore = (a: string) => (harmonie && capo ? transposeChord(a, capo, harmonie.tonalite) : a);

  return (
    <div className={carte ? "" : bulle ? "p-4" : "px-5 pb-6 pt-2"}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div
            data-accord-nom=""
            className={`${TAILLE_NOM[variante]} break-words font-bold leading-tight text-[color:var(--chord-color)]`}
          >
            {accord.texte}
          </div>
          {degre && harmonie && (
            <p data-accord-chiffre="" className="mt-1 font-chord text-sm font-semibold text-[color:var(--chord-color)]">
              {t("accords.chiffreDans", { chiffre: chiffreDuDegre(degre), tonalite: harmonie.tonalite })}
            </p>
          )}
          <p className={`mt-1 text-muted-foreground ${bulle ? "text-sm leading-[18px]" : "text-sm leading-5"}`}>
            {decrire(accord, t)}
            {" · "}
            <span className="whitespace-nowrap">{t("accords.notesLigne", { notes: notesEnLettres(accord) })}</span>
          </p>
        </div>
        {harmonie && <BoutonEcouter accords={[sonore(accord.texte)]} className={`shrink-0 ${bulle ? "h-8 [@media(pointer:coarse)]:h-11" : "h-11"}`} />}
        {onFermer && (
          <button
            type="button"
            onClick={onFermer}
            aria-label={t("accords.fermer")}
            className={`${rondBouton} flex shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {onInstrument && (
        <div className="mt-4 flex justify-center">
          <ChoixInstrument instrument={instrument} onChange={onInstrument} compact={bulle} />
        </div>
      )}

      {accord.equivalent && (
        <p className="mt-3 text-center text-sm font-medium text-foreground">{`${accord.texte} = ${accord.equivalent}`}</p>
      )}
      {puissance && (
        <p className="mt-3 text-center text-sm font-medium text-foreground">
          {t("accords.puissance", { accord: accord.texte, a: accord.fondamentale, b: quinte })}
        </p>
      )}
      {capo !== undefined && capo > 0 && (
        <p className="mt-3 text-center text-sm text-muted-foreground">{t("accords.capo", { n: capo })}</p>
      )}

      <div className="mt-4">
        {instrument === "guitare" ? (
          doigte ? (
            <>
              <div
                data-grille={grilleDe(doigte.cases)}
                className="flex justify-center text-foreground [&_svg]:h-auto [&_svg]:max-w-full"
              >
                <DiagrammeGuitare
                  grand
                  agrandi={carte}
                  cases={doigte.cases}
                  doigts={doigte.doigts}
                  depart={doigte.depart}
                  barre={doigte.barre}
                  label={t("accords.labelGuitare", { accord: accord.texte, cases: grilleDe(doigte.cases) })}
                />
              </div>
              {basseAJouer && (
                <p className="mt-3 text-center text-sm text-muted-foreground">{t("accords.basseAJouer", { note: basseAJouer })}</p>
              )}
              {doigtes.length > 1 && (
                <Fleches
                  rondBouton={rondBouton}
                  precedent={t("accords.positionPrecedente")}
                  suivant={t("accords.positionSuivante")}
                  texte={t("accords.position", { n: position + 1, total: doigtes.length })}
                  aller={aller}
                />
              )}
              {!carte && (
                <p className="accords-legende mt-3 text-center text-sm text-muted-foreground">
                  <Insecables
                    elements={[
                      doigte.doigts.includes("P") && t("accords.legendePouce"),
                      doigte.cases.includes(null) && t("accords.legendeEtouffee"),
                      doigte.cases.includes(0) && t("accords.legendeVide"),
                    ].filter((x): x is string => Boolean(x))}
                  />
                </p>
              )}
            </>
          ) : (
            <div data-sans-doigte="" className="rounded-xl bg-secondary px-4 py-5 text-center">
              <p className="text-sm font-semibold text-foreground">{t("accords.pasDeDoigte")}</p>
              {onSignaler && (
                <button
                  type="button"
                  onClick={onSignaler}
                  className="mt-3 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t("accords.signaler")}
                </button>
              )}
            </div>
          )
        ) : (
          <>
            <div data-renversement={renversement} className="flex justify-center text-foreground [&_svg]:h-auto [&_svg]:max-w-full">
              <ClavierMains
                gauche={piano.gauche}
                droite={piano.droite}
                nomsGauche={piano.nomsGauche}
                nomsDroite={piano.nomsDroite}
                label={t("accords.labelPiano", {
                  accord: accord.texte,
                  gauche: piano.nomsGauche.join(" "),
                  droite: piano.nomsDroite.join(" "),
                })}
              />
            </div>
            {nbRenversements > 1 && (
              <Fleches
                rondBouton={rondBouton}
                precedent={t("accords.renversementPrecedent")}
                suivant={t("accords.renversementSuivant")}
                texte={t("accords.renversement", {
                  nom: t(`accords.renversements.${renversement}`),
                  n: renversement + 1,
                  total: nbRenversements,
                })}
                aller={allerPiano}
              />
            )}
            <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-foreground">
              <li>
                <span aria-hidden className="text-foreground">●</span>{" "}
                {t("accords.mainGauche", { notes: piano.nomsGauche.join(" ") })}
              </li>
              <li>
                <span aria-hidden className="text-[color:var(--chord-color)]">●</span>{" "}
                {t("accords.mainDroite", { notes: piano.nomsDroite.join(" ") })}
              </li>
            </ul>
          </>
        )}
      </div>

      {carte && (
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">{t("accords.notes")}</dt>
          <dd className="text-foreground">{notesEnLettres(accord)}</dd>
          <dt className="text-muted-foreground">{t("accords.basse")}</dt>
          <dd className="text-foreground">{accord.basse ?? accord.fondamentale}</dd>
          {instrument === "guitare" && doigte && (
            <>
              <dt className="text-muted-foreground">{t("accords.doigts")}</dt>
              <dd className="accords-legende text-foreground"><Insecables elements={t("accords.doigtsLegende").split(" · ")} /></dd>
              <dt className="text-muted-foreground">{t("accords.cordes")}</dt>
              <dd className="text-foreground">{t("accords.cordesLegende")}</dd>
            </>
          )}
        </dl>
      )}

      {harmonie?.enSection && <Ensuite key={accord.texte} accord={accord.texte} harmonie={harmonie} capo={capo} bulle={bulle} />}
      {harmonie?.ici && harmonie.sectionUids && (
        <LigneIci key={`ici-${accord.texte}`} accord={accord.texte} harmonie={harmonie} slug={chant?.slug} bulle={bulle} />
      )}

      {!carte && (
        <div className="mt-4 text-center">
          <Link
            href={`/accords?accord=${encodeURIComponent(accord.texte)}${depuisChant ? `&depuis=${depuisChant}` : ""}`}
            onClick={onFermer}
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-[color:var(--chord-color)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("accords.voirTout")} ›
          </Link>
        </div>
      )}
    </div>
  );
}
