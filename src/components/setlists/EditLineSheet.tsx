"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ChevronLeft, ChevronRight, Trash2, Pencil, Music } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChordPad } from "@/components/setlists/ChordPad";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { transposeChord } from "@/lib/transpose";
import {
  type EditableLine,
  parseEditableLine,
  serializeEditableLine,
  addChord,
  replaceChord,
  removeChord,
  moveChord,
  setLyrics,
  isInstrumentalLine,
  instrumentalParts,
  makeInstrumentalLine,
} from "@/lib/chordpro/editSource";

// Bottom sheet d'édition d'une ligne de chant dans une setlist (mobile-first).
// La ligne y est affichée agrandie : accords = chips tactiles (remplacer /
// déplacer / supprimer), points « + » = insertion d'un accord. Les paroles et
// le pinyin s'éditent dans un champ dédié ; une ligne instrumentale (accords
// seuls + annotation) peut être insérée après la ligne courante.
//
// Tous les accords sont AFFICHÉS dans la tonalité de la setlist (keyOverride)
// et re-stockés dans la tonalité d'origine du chant à la validation.

export type EditLineTarget = {
  itemIndex: number;
  /** Ligne source brute (sans le pinyin si celui-ci est sur une ligne séparée). */
  raw: string;
  /** Pinyin de la ligne (inline ou ligne séparée), tel que parsé. */
  pinyin: string | null;
  language: "fr" | "zh";
  /** Transposition d'affichage active. 0 si pas de keyOverride. */
  semitones: number;
  targetKey: string;
  originalKey: string;
  /** Index de la ligne dans le source — sert aussi de clé d'identité de la sheet. */
  srcLine?: number;
};

type PadTarget = { kind: "add"; offset: number } | { kind: "edit"; index: number } | null;
type Mode = "line" | "lyrics" | "instr";

function isCJK(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}

function transposeLine(line: EditableLine, semitones: number, targetKey: string): EditableLine {
  if (semitones === 0) return line;
  return {
    ...line,
    anchors: line.anchors.map((a) => ({ ...a, chord: transposeChord(a.chord, semitones, targetKey) })),
  };
}

// ─── Ligne interactive agrandie ───────────────────────────────────────────────

function InsertDot({ onTap, active, small = false }: { onTap: () => void; active: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="+"
      className={`self-end mb-1 shrink-0 rounded-full border border-dashed flex items-center justify-center transition-colors ${
        small ? "mx-px h-5 w-5" : "mx-0.5 h-6 w-6"
      } ${
        active ? "border-foreground bg-secondary text-foreground" : "border-border text-muted-foreground/60 hover:text-foreground hover:border-foreground"
      }`}
    >
      <Plus className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />
    </button>
  );
}

function Chip({ chord, selected, onTap }: { chord: string; selected: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`h-8 px-2 mb-0.5 rounded-[8px] border text-[15px] font-bold whitespace-nowrap transition-colors ${
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-[color:var(--chord-color,#2563EB)]/40 bg-[color:var(--chord-color,#2563EB)]/10 text-[color:var(--chord-color,#2563EB)]"
      }`}
    >
      {/* Convention zh `[ ]` : accord « espace » (colonne vide) — rendu ␣ pour rester tappable */}
      {chord.trim() || "␣"}
    </button>
  );
}

function LineCanvas({
  draft,
  language,
  padTarget,
  onChip,
  onInsert,
}: {
  draft: EditableLine;
  language: "fr" | "zh";
  padTarget: PadTarget;
  onChip: (index: number) => void;
  onInsert: (offset: number) => void;
}) {
  const selectedIdx = padTarget?.kind === "edit" ? padTarget.index : -1;
  const insertOffset = padTarget?.kind === "add" ? padTarget.offset : -1;
  const indexed = draft.anchors.map((a, ai) => ({ ...a, ai }));
  // FR : mot « déplié » en lettre à lettre pour placer un accord au milieu du mot.
  const [expandedWord, setExpandedWord] = useState<number | null>(null);

  if (language === "zh") {
    const chars = [...draft.text];
    const pyWords = (draft.pinyin ?? "").split(/\s+/).filter(Boolean);
    let pIdx = 0;
    return (
      <div className="flex flex-wrap items-end gap-y-3 py-2">
        <InsertDot onTap={() => onInsert(0)} active={insertOffset === 0} />
        {chars.map((ch, ci) => {
          const chips = indexed.filter((a) => a.offset === ci);
          const py = isCJK(ch) ? pyWords[pIdx++] ?? "" : "";
          return (
            <span key={ci} className="inline-flex items-end">
              <span className="inline-flex flex-col items-center">
                <span className="flex gap-0.5">
                  {chips.map((a) => (
                    <Chip key={a.ai} chord={a.chord} selected={a.ai === selectedIdx} onTap={() => onChip(a.ai)} />
                  ))}
                </span>
                <span className="text-[22px] leading-[1.3] px-0.5">{ch === " " ? " " : ch}</span>
                <span className="text-[10px] text-muted-foreground leading-tight min-h-[13px]">{py || " "}</span>
              </span>
              <InsertDot onTap={() => onInsert(ci + 1)} active={insertOffset === ci + 1} />
            </span>
          );
        })}
        {indexed.filter((a) => a.offset >= chars.length).map((a) => (
          <Chip key={a.ai} chord={a.chord} selected={a.ai === selectedIdx} onTap={() => onChip(a.ai)} />
        ))}
      </div>
    );
  }

  // FR : unités = mots ; « + » aux frontières de mots, mot dépliable pour
  // l'insertion intra-mot, nudge ◀▶ pour l'ajustement fin.
  const words = [...draft.text.matchAll(/\S+/g)].map((m) => ({
    start: m.index!,
    end: m.index! + m[0].length,
    text: m[0],
  }));
  return (
    <div className="flex flex-wrap items-end gap-y-3 py-2">
      {words.map((w, wi) => {
        const gapStart = wi === 0 ? 0 : words[wi - 1].end;
        const here = indexed.filter((a) => a.offset >= gapStart && a.offset < w.end);
        const bounds = [...new Set([0, ...here.map((a) => Math.max(a.offset - w.start, 0))])].sort((x, y) => x - y);

        // Mot déplié : lettres séparées par des points d'insertion (placement
        // intra-mot précis, ex. « con+dui+ra »). Re-taper une lettre replie.
        if (expandedWord === wi) {
          return (
            <span key={wi} className="inline-flex items-end rounded-lg bg-secondary/60 ring-1 ring-foreground/20 px-0.5">
              <InsertDot onTap={() => onInsert(w.start)} active={insertOffset === w.start} />
              {[...w.text].map((ch, ci) => {
                const chips = here.filter((a) => Math.max(a.offset - w.start, 0) === ci);
                return (
                  <span key={ci} className="inline-flex items-end">
                    {ci > 0 && (
                      <InsertDot small onTap={() => onInsert(w.start + ci)} active={insertOffset === w.start + ci} />
                    )}
                    <span className="inline-flex flex-col items-start">
                      <span className="flex gap-0.5">
                        {chips.map((a) => (
                          <Chip key={a.ai} chord={a.chord} selected={a.ai === selectedIdx} onTap={() => onChip(a.ai)} />
                        ))}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedWord(null)}
                        onKeyDown={(e) => e.key === "Enter" && setExpandedWord(null)}
                        className="text-[19px] leading-[1.4] whitespace-pre cursor-pointer"
                      >
                        {ch}
                      </span>
                    </span>
                  </span>
                );
              })}
            </span>
          );
        }

        return (
          <span key={wi} className="inline-flex items-end">
            <InsertDot onTap={() => onInsert(w.start)} active={insertOffset === w.start} />
            {bounds.map((b, bi) => {
              const partEnd = bi + 1 < bounds.length ? bounds[bi + 1] : w.text.length;
              const chips = here.filter((a) => Math.max(a.offset - w.start, 0) === b);
              return (
                <span key={bi} className="inline-flex flex-col items-start">
                  <span className="flex gap-0.5">
                    {chips.map((a) => (
                      <Chip key={a.ai} chord={a.chord} selected={a.ai === selectedIdx} onTap={() => onChip(a.ai)} />
                    ))}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedWord(wi)}
                    onKeyDown={(e) => e.key === "Enter" && setExpandedWord(wi)}
                    className="text-[19px] leading-[1.4] whitespace-pre cursor-pointer rounded hover:bg-secondary/70 active:bg-secondary"
                  >
                    {w.text.slice(b, partEnd)}
                  </span>
                </span>
              );
            })}
          </span>
        );
      })}
      <InsertDot onTap={() => onInsert(draft.text.length)} active={insertOffset === draft.text.length} />
      {indexed
        .filter((a) => words.length > 0 && a.offset >= words[words.length - 1].end)
        .map((a) => (
          <Chip key={a.ai} chord={a.chord} selected={a.ai === selectedIdx} onTap={() => onChip(a.ai)} />
        ))}
    </div>
  );
}

// ─── Sheet principale ─────────────────────────────────────────────────────────

type SheetProps = {
  target: EditLineTarget | null;
  saving: boolean;
  onClose: () => void;
  /** Remplace la ligne courante (raw déjà en tonalité d'origine). */
  onSaveLine: (newRaw: string) => void;
  /** Insère une ligne instrumentale après la ligne courante. */
  onInsertAfter: (newRaw: string) => void;
  onDeleteLine: () => void;
};

export function EditLineSheet({ target, saving, onClose, onSaveLine, onInsertAfter, onDeleteLine }: SheetProps) {
  useStandaloneScrollLock(!!target);
  return (
    <Drawer open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[88vh] md:max-w-3xl md:mx-auto">
        {target && (
          <SheetBody
            // Remonte le corps à chaque changement de ligne → états réinitialisés
            key={`${target.itemIndex}-${target.srcLine ?? "?"}-${target.raw}`}
            target={target}
            saving={saving}
            onClose={onClose}
            onSaveLine={onSaveLine}
            onInsertAfter={onInsertAfter}
            onDeleteLine={onDeleteLine}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function SheetBody({
  target,
  saving,
  onClose,
  onSaveLine,
  onInsertAfter,
  onDeleteLine,
}: SheetProps & { target: EditLineTarget }) {
  const { t } = useTranslation();

  // Ligne affichée (tonalité de la setlist), calculée une fois au montage —
  // le composant est re-monté (key) à chaque changement de ligne cible.
  const initial = useMemo(() => {
    const parsed = parseEditableLine(target.raw, target.language);
    return transposeLine(
      { ...parsed, pinyin: parsed.pinyin ?? target.pinyin },
      target.semitones,
      target.targetKey
    );
  }, [target]);
  const initialInstr = isInstrumentalLine(initial);
  const initialParts = useMemo(
    () => (initialInstr ? instrumentalParts(initial) : { annotation: "", chords: [] }),
    [initialInstr, initial]
  );

  const [draft, setDraft] = useState<EditableLine>(initial);
  const [mode, setMode] = useState<Mode>(initialInstr ? "instr" : "line");
  const [padTarget, setPadTarget] = useState<PadTarget>(null);
  const [lyricsDraft, setLyricsDraft] = useState("");
  const [pinyinDraft, setPinyinDraft] = useState("");
  const [instrNew, setInstrNew] = useState(false);
  const [instrAnnotation, setInstrAnnotation] = useState(initialParts.annotation);
  const [instrChords, setInstrChords] = useState<string[]>(initialParts.chords);
  const [instrPad, setInstrPad] = useState<number | null>(null); // -1 = ajout
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toSourceKey = (line: EditableLine): EditableLine =>
    transposeLine(line, -target.semitones, target.originalKey);

  function handleValidate() {
    if (mode === "instr") {
      if (instrChords.length === 0) return;
      // Aucun changement sur une ligne instrumentale existante → simple fermeture.
      if (
        !instrNew &&
        instrAnnotation.trim() === initialParts.annotation &&
        JSON.stringify(instrChords) === JSON.stringify(initialParts.chords)
      ) {
        onClose();
        return;
      }
      const line = makeInstrumentalLine(instrAnnotation, instrChords);
      const raw = serializeEditableLine(toSourceKey(line));
      if (instrNew) onInsertAfter(raw);
      else onSaveLine(raw);
      return;
    }
    // Aucun changement → simple fermeture, pas de « Version modifiée » fantôme.
    if (JSON.stringify(draft) === JSON.stringify(initial)) {
      onClose();
      return;
    }
    onSaveLine(serializeEditableLine(toSourceKey(draft)));
  }

  function nudge(delta: number) {
    if (padTarget?.kind !== "edit") return;
    const res = moveChord(draft, padTarget.index, delta);
    setDraft(res.line);
    // L'ancre peut changer d'index en croisant un autre accord : on la suit.
    setPadTarget({ kind: "edit", index: res.index });
  }

  // Avertissement zh : pinyin désaligné (un mot pinyin par caractère chinois)
  const cjkCount = [...lyricsDraft].filter(isCJK).length;
  const pyCount = pinyinDraft.trim() ? pinyinDraft.trim().split(/\s+/).filter(Boolean).length : 0;
  const pinyinMismatch = target.language === "zh" && pyCount > 0 && cjkCount !== pyCount;

  const title =
    mode === "lyrics"
      ? t("setlists.contentEdit.lyricsTitle", { defaultValue: "Modifier les paroles" })
      : mode === "instr"
        ? instrNew
          ? t("setlists.contentEdit.instrNewTitle", { defaultValue: "Nouvelle ligne instrumentale" })
          : t("setlists.contentEdit.instrTitle", { defaultValue: "Ligne instrumentale" })
        : t("setlists.contentEdit.lineTitle", { defaultValue: "Modifier la ligne" });

  const actionBtn =
    "h-10 px-3 rounded-[8px] border border-border bg-card text-[13px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors";

  return (
    <>
      <DrawerHeader className="pb-1">
        <DrawerTitle className="flex items-center justify-between gap-2">
          <span>{title}</span>
          {target.semitones !== 0 && (
            <span className="text-[11px] font-normal text-muted-foreground">
              {t("setlists.contentEdit.displayedKey", {
                defaultValue: "Tonalité affichée : {{key}}",
                key: target.targetKey,
              })}
            </span>
          )}
        </DrawerTitle>
      </DrawerHeader>

      <div className="px-4 pb-6 overflow-y-auto">
        {/* ── Mode paroles ── */}
        {mode === "lyrics" && (
          <div className="space-y-3">
            <Textarea
              value={lyricsDraft}
              onChange={(e) => setLyricsDraft(e.target.value)}
              rows={2}
              className="text-base"
              autoFocus
            />
            {target.language === "zh" && (
              <div>
                <label className="text-xs text-muted-foreground">Pinyin</label>
                <Input value={pinyinDraft} onChange={(e) => setPinyinDraft(e.target.value)} className="mt-1" />
              </div>
            )}
            {!lyricsDraft.trim() && (
              <p className="text-xs text-destructive">
                {t("setlists.contentEdit.lyricsRequired", {
                  defaultValue: "Les paroles ne peuvent pas être vides.",
                })}
              </p>
            )}
            {pinyinMismatch && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t("setlists.contentEdit.pinyinMismatch", {
                  defaultValue:
                    "Attention : {{py}} mot(s) pinyin pour {{zh}} caractère(s) chinois — l'alignement sera décalé.",
                  py: pyCount,
                  zh: cjkCount,
                })}
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setMode("line")}>
                {t("common.cancel", { defaultValue: "Annuler" })}
              </Button>
              <Button
                className="flex-1 h-11"
                disabled={!lyricsDraft.trim()}
                onClick={() => {
                  setDraft((d) => ({
                    ...setLyrics(d, lyricsDraft, target.language),
                    pinyin: target.language === "zh" ? pinyinDraft.trim() || null : d.pinyin,
                  }));
                  setMode("line");
                }}
              >
                {t("common.confirm", { defaultValue: "Valider" })}
              </Button>
            </div>
          </div>
        )}

        {/* ── Mode instrumental ── */}
        {mode === "instr" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">
                {t("setlists.contentEdit.annotation", { defaultValue: "Annotation (x2, arpège, piano seul…)" })}
              </label>
              <Input
                value={instrAnnotation}
                onChange={(e) => setInstrAnnotation(e.target.value)}
                className="mt-1"
                placeholder="x2"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {instrAnnotation.trim() && (
                <span className="text-sm italic text-muted-foreground mr-1">({instrAnnotation.trim()})</span>
              )}
              {instrChords.map((c, i) => (
                <Chip key={i} chord={c} selected={instrPad === i} onTap={() => setInstrPad(i)} />
              ))}
              <button
                type="button"
                onClick={() => setInstrPad(-1)}
                className={`h-8 px-2.5 rounded-[8px] border border-dashed text-[13px] font-semibold flex items-center gap-1 ${
                  instrPad === -1 ? "border-foreground text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("setlists.contentEdit.addChord", { defaultValue: "Accord" })}
              </button>
            </div>
            {instrChords.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {t("setlists.contentEdit.instrNeedsChord", {
                  defaultValue: "Ajoute au moins un accord pour valider.",
                })}
              </p>
            )}

            {instrPad !== null && (
              <div className="border border-border rounded-xl p-3">
                {instrPad >= 0 && (
                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      className="text-xs text-destructive flex items-center gap-1"
                      onClick={() => {
                        setInstrChords((cs) => cs.filter((_, i) => i !== instrPad));
                        setInstrPad(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("setlists.contentEdit.removeChord", { defaultValue: "Supprimer l'accord" })}
                    </button>
                  </div>
                )}
                <ChordPad
                  key={`instr-${instrPad}`}
                  initial={instrPad >= 0 ? instrChords[instrPad] : undefined}
                  onCancel={() => setInstrPad(null)}
                  onSubmit={(chord) => {
                    setInstrChords((cs) => (instrPad === -1 ? [...cs, chord] : cs.map((c, i) => (i === instrPad ? chord : c))));
                    setInstrPad(null);
                  }}
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {!instrNew && (
                <Button
                  variant="outline"
                  className="h-11 text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => (instrNew ? setMode("line") : onClose())}
              >
                {t("common.cancel", { defaultValue: "Annuler" })}
              </Button>
              <Button className="flex-1 h-11" disabled={instrChords.length === 0 || saving} onClick={handleValidate}>
                {saving ? "…" : t("common.confirm", { defaultValue: "Valider" })}
              </Button>
            </div>
          </div>
        )}

        {/* ── Mode ligne (accords sur paroles) ── */}
        {mode === "line" && (
          <div className="space-y-3">
            <LineCanvas
              // Reset du mot déplié quand le texte change (édition des paroles)
              key={draft.text}
              draft={draft}
              language={target.language}
              padTarget={padTarget}
              onChip={(index) => setPadTarget({ kind: "edit", index })}
              onInsert={(offset) => setPadTarget({ kind: "add", offset })}
            />
            {target.language === "fr" && !padTarget && (
              <p className="text-[11px] text-muted-foreground -mt-1">
                {t("setlists.contentEdit.tapWordHint", {
                  defaultValue:
                    "Touche un mot pour choisir la lettre exacte où placer l'accord.",
                })}
              </p>
            )}

            {padTarget && (
              <div className="border border-border rounded-xl p-3">
                {padTarget.kind === "edit" && (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        aria-label="◀"
                        className="h-9 w-9 rounded-[8px] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => nudge(-1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="▶"
                        className="h-9 w-9 rounded-[8px] border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                        onClick={() => nudge(1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-destructive flex items-center gap-1"
                      onClick={() => {
                        setDraft((d) => removeChord(d, padTarget.index));
                        setPadTarget(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("setlists.contentEdit.removeChord", { defaultValue: "Supprimer l'accord" })}
                    </button>
                  </div>
                )}
                <ChordPad
                  key={padTarget.kind === "edit" ? `edit-${padTarget.index}` : `add-${padTarget.offset}`}
                  initial={padTarget.kind === "edit" ? draft.anchors[padTarget.index]?.chord : undefined}
                  onCancel={() => setPadTarget(null)}
                  onSubmit={(chord) => {
                    setDraft((d) =>
                      padTarget.kind === "add"
                        ? addChord(d, padTarget.offset, chord)
                        : replaceChord(d, padTarget.index, chord)
                    );
                    setPadTarget(null);
                  }}
                />
              </div>
            )}

            {!padTarget && (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={actionBtn}
                    onClick={() => {
                      setLyricsDraft(draft.text);
                      setPinyinDraft(draft.pinyin ?? "");
                      setMode("lyrics");
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("setlists.contentEdit.editLyrics", { defaultValue: "Modifier les paroles" })}
                  </button>
                  <button
                    type="button"
                    className={actionBtn}
                    onClick={() => {
                      setInstrNew(true);
                      setInstrAnnotation("");
                      setInstrChords([]);
                      setInstrPad(-1);
                      setMode("instr");
                    }}
                  >
                    <Music className="h-3.5 w-3.5" />
                    {t("setlists.contentEdit.addInstrumental", { defaultValue: "+ Ligne instrumentale après" })}
                  </button>
                  <button
                    type="button"
                    className={`${actionBtn} text-destructive hover:text-destructive`}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("setlists.contentEdit.deleteLine", { defaultValue: "Supprimer la ligne" })}
                  </button>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
                    {t("common.cancel", { defaultValue: "Annuler" })}
                  </Button>
                  <Button className="flex-1 h-11" disabled={saving} onClick={handleValidate}>
                    {saving ? "…" : t("common.confirm", { defaultValue: "Valider" })}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Confirmation de suppression de ligne */}
        {confirmDelete && (
          <div className="mt-3 border border-destructive/40 bg-destructive/5 rounded-xl p-3 space-y-2">
            <p className="text-sm text-foreground">
              {t("setlists.contentEdit.deleteLineConfirm", {
                defaultValue: "Supprimer cette ligne de la version de la setlist ?",
              })}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setConfirmDelete(false)}>
                {t("common.cancel", { defaultValue: "Annuler" })}
              </Button>
              <Button
                className="flex-1 h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={saving}
                onClick={onDeleteLine}
              >
                {saving ? "…" : t("setlists.contentEdit.deleteLineYes", { defaultValue: "Supprimer" })}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
