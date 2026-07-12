"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

// Pavé de saisie d'accord (mobile-first) : fondamentale + altération + qualité
// + basse optionnelle. Pas de clavier libre → accords toujours parsables et
// transposables (même grammaire que transposeChord).

const ROOTS = ["C", "D", "E", "F", "G", "A", "B"] as const;
// Liste exhaustive — couvre toutes les qualités utilisées dans le répertoire
// (relevé sur content/songs/*.cho), groupées par familles.
const QUALITIES = [
  "", "m", "7", "m7", "maj7", "6",
  "m6", "9", "m9", "maj9", "11", "m11",
  "13", "2", "4", "5", "sus2", "sus4",
  "7sus4", "9sus4", "add2", "add4", "add9", "m7b5",
  "dim", "dim7", "aug", "7b9",
] as const;

function parseChordParts(chord: string) {
  const m = chord.match(/^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/);
  if (!m) return { root: "C", acc: "", quality: "", bassRoot: null as string | null, bassAcc: "" };
  return {
    root: m[1],
    acc: m[2] ?? "",
    quality: m[3] ?? "",
    bassRoot: m[4] ?? null,
    bassAcc: m[5] ?? "",
  };
}

export function composeChord(root: string, acc: string, quality: string, bassRoot: string | null, bassAcc: string): string {
  return `${root}${acc}${quality}${bassRoot ? `/${bassRoot}${bassAcc}` : ""}`;
}

export function ChordPad({
  initial,
  onSubmit,
  onCancel,
}: {
  /** Accord existant à modifier (dans la tonalité affichée), sinon saisie vierge. */
  initial?: string;
  onSubmit: (chord: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const init = parseChordParts(initial ?? "C");
  // Accord « espace » `[ ]` (convention zh : colonne vide) — conservé tel quel
  // tant que l'utilisateur ne choisit rien sur le pavé.
  const initialIsSpacer = initial !== undefined && initial.trim() === "";
  const [isSpacer, setIsSpacer] = useState(initialIsSpacer);
  const [root, setRoot] = useState(init.root);
  const [acc, setAcc] = useState(init.acc);
  const [quality, setQuality] = useState(init.quality);
  const [bassRoot, setBassRoot] = useState<string | null>(init.bassRoot);
  const [bassAcc, setBassAcc] = useState(init.bassAcc);
  const [showBass, setShowBass] = useState(init.bassRoot !== null);

  const chord = isSpacer ? (initial as string) : composeChord(root, acc, quality, bassRoot, bassAcc);
  const isKnownQuality = (QUALITIES as readonly string[]).includes(quality);

  /** Toute sélection sur le pavé sort du mode « colonne vide ». */
  const pick = (fn: () => void) => {
    setIsSpacer(false);
    fn();
  };

  const keyBtn = (active: boolean, small = false) =>
    `h-10 min-w-10 rounded-[8px] border font-bold transition-colors ${
      small ? "px-1 text-[12.5px]" : "px-2 text-[14px]"
    } ${
      active
        ? "border-transparent bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:bg-muted"
    }`;

  return (
    <div className="space-y-2.5">
      {/* Aperçu */}
      <div className="flex items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: "var(--chord-color, #2563EB)" }}>
          {isSpacer ? "␣" : chord}
        </span>
      </div>
      {isSpacer && (
        <p className="text-[11px] text-muted-foreground text-center">
          {t("setlists.contentEdit.spacerKept", {
            defaultValue: "Colonne vide conservée — choisis une note pour la remplacer par un accord.",
          })}
        </p>
      )}

      {/* Fondamentale */}
      <div className="grid grid-cols-7 gap-1.5">
        {ROOTS.map((r) => (
          <button key={r} type="button" className={keyBtn(!isSpacer && root === r)} onClick={() => pick(() => setRoot(r))}>
            {r}
          </button>
        ))}
      </div>

      {/* Altération */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { v: "", label: "♮" },
          { v: "#", label: "♯" },
          { v: "b", label: "♭" },
        ].map((a) => (
          <button key={a.v} type="button" className={keyBtn(!isSpacer && acc === a.v)} onClick={() => pick(() => setAcc(a.v))}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Qualité */}
      <div className="grid grid-cols-6 gap-1.5">
        {QUALITIES.map((q) => (
          <button
            key={q || "maj"}
            type="button"
            className={keyBtn(!isSpacer && quality === q, true)}
            onClick={() => pick(() => setQuality(q))}
          >
            {q || t("setlists.contentEdit.majQuality", { defaultValue: "maj" })}
          </button>
        ))}
      </div>
      {/* Qualité inconnue du pavé (accord importé) : conservée telle quelle */}
      {!isKnownQuality && (
        <p className="text-[11px] text-muted-foreground text-center">
          {t("setlists.contentEdit.customQuality", {
            defaultValue: "Qualité « {{quality}} » conservée",
            quality,
          })}
        </p>
      )}

      {/* Basse (slash chord) + colonne vide */}
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`h-8 px-2.5 rounded-[8px] border text-[12px] font-semibold ${
              showBass ? "border-transparent bg-secondary text-foreground" : "border-border bg-card text-muted-foreground"
            }`}
            onClick={() =>
              pick(() => {
                if (showBass) setBassRoot(null);
                setShowBass((s) => !s);
              })
            }
          >
            {t("setlists.contentEdit.bassToggle", { defaultValue: "/ basse" })}
          </button>
          {/* Colonne vide `[ ]` : détache l'accord voisin de la syllabe (levée).
              Choix terminal → insertion immédiate, sans passer par Valider. */}
          <button
            type="button"
            className="h-8 px-2.5 rounded-[8px] border border-dashed border-border bg-card text-[12px] font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => onSubmit(" ")}
          >
            ␣ {t("setlists.contentEdit.emptyColumn", { defaultValue: "colonne vide" })}
          </button>
        </div>
        {showBass && (
          <div className="mt-1.5 space-y-1.5">
            <div className="grid grid-cols-7 gap-1.5">
              {ROOTS.map((r) => (
                <button key={r} type="button" className={keyBtn(bassRoot === r)} onClick={() => pick(() => setBassRoot(r))}>
                  {r}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: "", label: "♮" },
                { v: "#", label: "♯" },
                { v: "b", label: "♭" },
              ].map((a) => (
                <button key={a.v} type="button" className={keyBtn(bassAcc === a.v)} onClick={() => pick(() => setBassAcc(a.v))}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 h-11" onClick={onCancel}>
          {t("common.cancel", { defaultValue: "Annuler" })}
        </Button>
        <Button className="flex-1 h-11" onClick={() => onSubmit(chord)}>
          {t("setlists.contentEdit.confirmChord", { defaultValue: "Valider l'accord" })}
        </Button>
      </div>
    </div>
  );
}
