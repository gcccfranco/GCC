"use client";

// Dictionnaire d'accords (lot DA, DA-2) — la page /accords : une recherche, les douze notes, la carte de l'accord
// choisi et les accords de la note.

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Retour } from "@/components/layout/EnTetePage";
import { ReportDialog } from "@/components/report/ReportDialog";
import { analyserAccord, type Accord } from "@/lib/accords/analyse";
import { notesDeLAccord } from "@/lib/accords/notes";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { noteToIndex } from "@/lib/transpose";
import { ChoixInstrument, PanneauAccord } from "./PanneauAccord";
import { cleDeAccord } from "./outils";

const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const PLUS_JOUES = ["", "m", "7", "m7", "sus4", "2", "maj7", "sus2"];
const PLUS_RARES = ["maj9", "4", "dim", "5", "add2", "m9", "9", "6", "m7b5", "7sus4", "add4", "m11", "13", "dim7", "aug", "m6"];

/** Ce qu'on tape : un accord (« F#m7 »), ou une note seule dont la lettre peut être en minuscule (« f# »). */
function lire(saisie: string): Accord | null {
  const s = saisie.trim();
  if (!s) return null;
  return analyserAccord(s) ?? analyserAccord(s[0].toUpperCase() + s.slice(1));
}

export function PageAccords() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const acces = useAccesHarmonie();
  const [instrument, setInstrument] = useInstrument(acces, "guitare");
  const [texte, setTexte] = useState(() => analyserAccord(params.get("accord") ?? "")?.texte ?? "C");
  const [saisie, setSaisie] = useState("");
  const [signalement, setSignalement] = useState(false);

  const accord = useMemo(() => analyserAccord(texte) as Accord, [texte]);
  const note = NOTES.find((n) => noteToIndex(n) === noteToIndex(accord.fondamentale)) ?? "C";
  const cleAffichee = cleDeAccord(texte);
  const inconnu = saisie.trim() !== "" && !lire(saisie);

  function choisir(nouveau: string, depuisLaSaisie = false) {
    setTexte(nouveau);
    if (!depuisLaSaisie) setSaisie("");
    router.replace(`/accords?accord=${encodeURIComponent(nouveau)}`, { scroll: false });
  }

  // Les basses de la note : sa tierce, sa quinte, sa seconde, sa septième mineure, sa sixte, épelées
  // comme les notes de l'accord (D/F#, D/A, D/E, D/C, D/B).
  const basses = useMemo(() => {
    const nom = (suffixe: string, k: number) => notesDeLAccord(analyserAccord(note + suffixe) as Accord).noms[k];
    return [nom("", 1), nom("", 2), nom("add9", 3), nom("7", 3), nom("6", 3)].map((b) => `${note}/${b}`);
  }, [note]);
  const quinte = notesDeLAccord(analyserAccord(note) as Accord).noms[2];

  const groupes = [
    { titre: t("accords.plusJoues"), accords: PLUS_JOUES.map((q) => note + q) },
    { titre: t("accords.avecUneBasse"), accords: basses },
    { titre: t("accords.plusRares"), accords: PLUS_RARES.map((q) => note + q) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1120px] px-[var(--marge-page)] pb-28 pt-6">
      <Retour href="/">{t("accords.retour")}</Retour>
      <h1 className="text-[32px] font-bold leading-10 tracking-tight text-foreground">{t("accords.titre")}</h1>
      <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{t("accords.sousTitre")}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-[260px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value);
              const lu = lire(e.target.value);
              if (lu) choisir(lu.texte, true);
            }}
            placeholder={t("accords.chercher")}
            aria-label={t("accords.chercherLabel")}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-4 text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <ChoixInstrument instrument={instrument} onChange={setInstrument} />
      </div>
      {inconnu && <p role="status" className="mt-2 pl-4 text-sm text-muted-foreground">{t("accords.inconnu")}</p>}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("accords.aideNotes")}</p>

      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-muted-foreground" id="accords-note">{t("accords.note")}</p>
        <div role="group" aria-labelledby="accords-note" className="flex flex-wrap gap-2">
          {NOTES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n === note}
              onClick={() => choisir(n)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                n === note ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-6">
        <section
          aria-label={accord.texte}
          data-carte-accord=""
          className="min-w-0 flex-[1_1_340px] rounded-2xl border border-border bg-card p-6 lg:max-w-[460px]"
        >
          <PanneauAccord accord={accord} instrument={instrument} variante="carte" onSignaler={() => setSignalement(true)} />
        </section>

        <div className="min-w-0 flex-[2_1_380px] space-y-5">
          {groupes.map((g) => (
            <section key={g.titre}>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{g.titre}</h2>
              <div className="flex flex-wrap gap-2">
                {g.accords.map((a) => {
                  const pleine = cleDeAccord(a) === cleAffichee;
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={pleine}
                      onClick={() => choisir(a)}
                      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        pleine
                          ? "border-transparent bg-[color:var(--chord-color)] text-background"
                          : "border-border bg-card text-[color:var(--chord-color)] hover:bg-secondary"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="text-xs leading-5 text-muted-foreground">{t("accords.dansLesChants", { n: note, a: note, b: quinte })}</p>
        </div>
      </div>

      <ReportDialog
        open={signalement}
        onClose={() => setSignalement(false)}
        kind="site"
        titreInitial={t("accords.signalerTitre", { accord: accord.texte })}
        descriptionInitiale={t("accords.signalerDescription", { accord: accord.texte })}
      />
    </div>
  );
}
