"use client";

// Dictionnaire d'accords (lot DA, DA-2) — le contenu d'un accord : nom, notes, dessin (guitare ou piano), autres
// positions. Un seul composant pour la feuille du bas, la bulle de l'ordinateur et la carte de la page /accords.
// Les décisions sont dans docs/spec-dictionnaire-accords.md (Q5, Q10, Q11, Q17, Q18).

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { DiagrammeGuitare, ClavierMains } from "@/components/harmonie/Diagrammes";
import { positionsGuitare } from "@/lib/accords/guitare";
import type { Accord } from "@/lib/accords/analyse";
import type { Instrument } from "@/types/harmonie";
import { decrire, grilleDe, notesEnLettres, pianoDe } from "./outils";

export type Variante = "feuille" | "bulle" | "carte";

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

const TAILLE_NOM: Record<Variante, string> = { feuille: "text-[32px]", bulle: "text-[26px]", carte: "text-[40px]" };

export function PanneauAccord({
  accord,
  instrument,
  onInstrument,
  variante,
  capo,
  onFermer,
  onSignaler,
}: {
  accord: Accord;
  instrument: Instrument;
  /** Donné : le panneau montre son propre choix Guitare | Piano (la page, elle, l'a dans sa rangée). */
  onInstrument?: (i: Instrument) => void;
  variante: Variante;
  capo?: number;
  /** Donné : le bouton ✕ et la fermeture au clic sur « Voir tout le dictionnaire ». */
  onFermer?: () => void;
  /** Ouvre le signalement d'un doigté manquant. */
  onSignaler?: () => void;
}) {
  const { t } = useTranslation();
  const bulle = variante === "bulle";
  const carte = variante === "carte";
  const { doigtes, basseAJouer } = useMemo(() => positionsGuitare(accord), [accord]);
  // Position affichée : repart de la première quand l'accord change.
  const [choix, setChoix] = useState<{ pour: string; i: number }>({ pour: accord.texte, i: 0 });
  const position = choix.pour === accord.texte ? choix.i % Math.max(doigtes.length, 1) : 0;
  const aller = (delta: number) =>
    setChoix({ pour: accord.texte, i: (position + delta + doigtes.length) % doigtes.length });

  const piano = useMemo(() => pianoDe(accord), [accord]);
  const doigte = doigtes[position];
  const rondBouton = bulle ? "h-8 w-8" : "h-11 w-11";
  const puissance = accord.qualite === "5" && accord.ecrite === "5";
  const quinte = piano.nomsDroite[piano.nomsDroite.length - 1];

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
          <p className={`mt-1 text-muted-foreground ${bulle ? "text-[13px] leading-[18px]" : "text-sm leading-5"}`}>
            {decrire(accord, t)}
            {" · "}
            {t("accords.notesLigne", { notes: notesEnLettres(accord) })}
          </p>
        </div>
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
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => aller(-1)}
                    aria-label={t("accords.positionPrecedente")}
                    className={`${rondBouton} flex items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <span aria-live="polite" className="min-w-[8.5rem] text-center text-sm font-medium text-foreground">
                    {t("accords.position", { n: position + 1, total: doigtes.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() => aller(1)}
                    aria-label={t("accords.positionSuivante")}
                    className={`${rondBouton} flex items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}
              {!carte && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {[
                    doigte.doigts.includes("P") && t("accords.legendePouce"),
                    doigte.cases.includes(null) && t("accords.legendeEtouffee"),
                    doigte.cases.includes(0) && t("accords.legendeVide"),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
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
            <div className="flex justify-center text-foreground [&_svg]:h-auto [&_svg]:max-w-full">
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
              <dd className="text-foreground">{t("accords.doigtsLegende")}</dd>
              <dt className="text-muted-foreground">{t("accords.cordes")}</dt>
              <dd className="text-foreground">{t("accords.cordesLegende")}</dd>
            </>
          )}
        </dl>
      )}

      {!carte && (
        <div className="mt-4 text-center">
          <Link
            href={`/accords?accord=${encodeURIComponent(accord.texte)}`}
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
