import type { FusionMixedSection, SetlistItem } from "@/types/setList";
import type { SectionSummary } from "@/types/song";
import { withoutLastPhrases } from "@/lib/setlist/lastPhrase";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { parseChordPro } from "@/lib/chordpro/parser";
import { resolveStructureOverride } from "@/lib/chordpro/structure";

// Historique des modifications d'une setlist (docs/spec-setlist.md, lot 2).
// Une modification est décrite par des « changements » (données, traduites à
// l'affichage). Chaque passage compare deux états de la setlist écrits dans le
// même format, puis ses phrases rejoignent celles de l'entrée en cours.

/** Réglages d'un chant résumés en une phrase chacun. */
type SongSetting = "structure" | "sectionNotes" | "sectionTransitions" | "nuances" | "sectionKeys" | "songNote" | "adapted" | "lastPhrase";
type PhraseOnlySetting = Exclude<SongSetting, "structure" | "songNote" | "sectionNotes">;

/** Note d'une section, nommée par son abréviation (« R (2) » quand elle revient). */
export type SectionNote = { section: string; note: string };

export type HistoryChange =
  | { kind: "created" | "order" | "transitions" }
  | { kind: "title" | "leader" | "category" | "date"; from: string; to: string }
  | { kind: "visibility"; from: boolean; to: boolean }
  | { kind: "songAdded" | "songRemoved"; song: string }
  | { kind: "fused" | "unfused"; songs: string[] }
  | { kind: "key"; song: string; from: string | null; to: string | null }
  | { kind: "jianpuSheet"; song: string; from: boolean; to: boolean }
  | { kind: PhraseOnlySetting; song: string }
  // Réglages de l'ordre mélangé d'une fusion : mêmes phrases que pour un chant.
  | { kind: "sectionTransitions" | "nuances" | "sectionKeys"; songs: string[] }
  | { kind: "sectionNotes"; songs: string[]; from?: SectionNote[]; to?: SectionNote[] }
  // Avant / après (docs/spec-historique-avant-apres.md) : abréviations telles
  // qu'affichées au moment de la modification ; absents sur les entrées plus
  // anciennes ou quand les sections du chant sont inconnues.
  | { kind: "structure"; song: string; from?: string[]; to?: string[] }
  | { kind: "fusionStructure"; songs: string[]; from?: string[]; to?: string[] }
  | { kind: "notes"; from?: string; to?: string }
  | { kind: "songNote"; song: string; from?: string; to?: string }
  | { kind: "sectionNotes"; song: string; from?: SectionNote[]; to?: SectionNote[] }
  // Chants dans l'ordre, une fusion pour un (« abba-pere+ma-passion ») ; sans phrase à lui.
  | { kind: "songs"; from: string[]; to: string[] };

/** Sections d'un chant d'après l'index (absent : chant inconnu). */
export type SectionsOf = (slug: string) => SectionSummary[] | undefined;

/** Ce que l'historique compare d'une setlist. */
export type SetlistSnapshot = {
  title: string;
  leader: string;
  category: string;
  date: string;
  moment?: string | null;
  notes: string;
  isPrivate?: boolean;
  items: SetlistItem[];
};

/** Valeur comparable : vide (null, "", {}, []) = "", clés d'objet triées. */
function norm(v: unknown): string {
  if (v == null || v === "" || v === false) return "";
  if (Array.isArray(v)) return v.length ? `[${v.map(norm).join(",")}]` : "";
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => [k, norm(x)] as const)
      .filter(([, x]) => x !== "")
      .sort(([a], [b]) => a.localeCompare(b));
    return entries.length ? `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${x}`).join(",")}}` : "";
  }
  return JSON.stringify(v);
}

type SongState = {
  container: string;
  key: string | null;
  jianpu: boolean;
  noteText: string;
  /** Avant / après : abréviations de la structure jouée et notes de section (sections connues). */
  labels?: string[];
  notes?: SectionNote[];
} & Record<SongSetting, string>;

type Step = { id: string; uid: string; label: string };

/** Passages de la structure jouée (`null` = structure du chant), avec leur
 *  abréviation ; undefined si les sections sont inconnues. */
function playedSteps(sections: SectionSummary[] | undefined, structure: string[] | null | undefined): Step[] | undefined {
  if (!sections?.length) return undefined;
  // Uid par défaut `<id>-<rang>`, la convention de l'éditeur (formItems.ts).
  const ranked = sections.map((s, i) => ({ ...s, uid: `${s.id}-${i}` }));
  const played = structure?.length ? resolveStructureOverride(ranked, structure) : ranked;
  return played.map((s) => ({ id: s.id, uid: s.uid, label: abbreviateSection(s) }));
}

/** Notes des passages, nommées par leur abréviation (« R (2) » quand elle revient). */
function namedNotes(steps: { label: string; note: string }[]): SectionNote[] {
  const total: Record<string, number> = {};
  for (const { label } of steps) total[label] = (total[label] ?? 0) + 1;
  const rank: Record<string, number> = {};
  return steps.flatMap(({ label, note }) => {
    rank[label] = (rank[label] ?? 0) + 1;
    const text = note.trim();
    return text ? [{ section: total[label] > 1 ? `${label} (${rank[label]})` : label, note: text }] : [];
  });
}

/** Notes de section dans l'ordre joué. Clés essayées comme dans
 *  resolveSectionOccurrences (sectionSteps.ts) : uid, occurrence (`id:n`), id. */
function sectionNoteList(steps: Step[], notes: Record<string, string> | undefined): SectionNote[] {
  const seen: Record<string, number> = {};
  return namedNotes(steps.map((step) => {
    const n = seen[step.id] ?? 0;
    seen[step.id] = n + 1;
    return { label: step.label, note: notes?.[step.uid] ?? notes?.[n === 0 ? step.id : `${step.id}:${n}`] ?? notes?.[step.id] ?? "" };
  }));
}

type MixSetting = "structure" | "sectionNotes" | "sectionTransitions" | "nuances" | "sectionKeys";
type FusionState = { songs: string[]; labels?: string[]; notes?: SectionNote[] } & Record<MixSetting, string>;

/** Une fusion : sa structure jouée et les réglages de son ordre mélangé, passage
 *  par passage (« chant:section#n »), pour les comparer un à un. */
function readFusion(item: SetlistItem, sectionsOf?: SectionsOf): FusionState {
  const mixed = item.mixedStructure ?? [];
  const seen: Record<string, number> = {};
  const steps = mixed.map((ms) => {
    const key = `${ms.songSlug}:${ms.sectionId}`;
    seen[key] = (seen[key] ?? 0) + 1;
    return `${key}#${seen[key]}`;
  });
  const byStep = (pick: (ms: FusionMixedSection) => unknown) => norm(Object.fromEntries(mixed.map((ms, i) => [steps[i], pick(ms)])));
  const labels = fusionLabels(item, sectionsOf);
  return {
    songs: (item.fusionSongs ?? []).map((f) => f.songSlug),
    labels,
    // Sans mélange, pas de notes propres à la fusion : `labels` sont alors ceux des chants à la suite.
    notes: labels && namedNotes(mixed.map((ms, i) => ({ label: labels[i], note: ms.note ?? "" }))),
    structure: norm(steps),
    sectionNotes: byStep((ms) => ms.note?.trim()),
    sectionTransitions: byStep((ms) => ms.transition?.trim()),
    nuances: byStep((ms) => ms.nuance),
    sectionKeys: byStep((ms) => ms.keyChange),
  };
}

function readItems(items: SetlistItem[], sectionsOf?: SectionsOf) {
  const order: string[] = [];
  const songs = new Map<string, SongState>();
  const fusions = new Map<string, FusionState>();
  const transitions: string[] = [];
  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    if (item.type === "transition") {
      transitions.push(item.transitionText ?? "");
    } else if (item.type === "fusion") {
      const slugs = (item.fusionSongs ?? []).map((f) => f.songSlug);
      const unit = `fusion:${slugs.join("+")}`;
      order.push(unit);
      fusions.set(unit, readFusion(item, sectionsOf));
      for (const f of item.fusionSongs ?? []) {
        const steps = sectionsOf && playedSteps(sectionsOf(f.songSlug), f.structureOverride);
        songs.set(f.songSlug, {
          container: unit,
          key: f.keyOverride ?? null,
          jianpu: false,
          noteText: "",
          labels: steps?.map((s) => s.label),
          notes: steps && sectionNoteList(steps, f.sectionNotes),
          structure: norm(f.structureOverride),
          sectionNotes: norm(f.sectionNotes),
          sectionTransitions: "",
          nuances: norm(f.sectionNuances),
          sectionKeys: norm(f.sectionKeys),
          songNote: "",
          adapted: "",
          lastPhrase: "0",
        });
      }
    } else {
      order.push(item.songSlug);
      // Les sections « Dernière phrase » comptent à part : un Dp ajouté n'est
      // pas une adaptation des accords ou des paroles.
      const adapted = withoutLastPhrases(item.contentOverride ?? "");
      // Chant adapté : ses sections (copies, « Dernière phrase ») sont dans la
      // version adaptée, pas dans l'index.
      const steps = sectionsOf && playedSteps(
        item.contentOverride ? parseChordPro(item.contentOverride).sections : sectionsOf(item.songSlug),
        item.structureOverride,
      );
      songs.set(item.songSlug, {
        container: "",
        key: item.keyOverride ?? null,
        jianpu: !!item.jianpuSheet,
        noteText: item.notes?.trim() ?? "",
        labels: steps?.map((s) => s.label),
        notes: steps && sectionNoteList(steps, item.sectionNotes),
        structure: norm(item.structureOverride),
        sectionNotes: norm(item.sectionNotes),
        sectionTransitions: norm(item.sectionTransitions),
        nuances: norm(item.sectionNuances),
        sectionKeys: norm(item.sectionKeys),
        songNote: norm(item.notes?.trim()),
        // Les accords retouchés sur un scan 简谱 (lot 9) sont une adaptation
        // comme une autre : même état, donc même phrase dans l'historique.
        adapted: norm(adapted.source) + norm(item.jianpuChords),
        lastPhrase: String(adapted.count),
      });
    }
  }
  return { order, songs, fusions, transitions: norm(transitions) };
}

/** Structure jouée d'une fusion, chaque abréviation précédée du numéro de son
 *  chant dans la fusion (« 1 R », « 2 C1 ») ; undefined si une section est inconnue. */
function fusionLabels(item: SetlistItem, sectionsOf?: SectionsOf): string[] | undefined {
  if (!sectionsOf) return undefined;
  const slugs = (item.fusionSongs ?? []).map((f) => f.songSlug);
  const labels: string[] = [];
  if (item.mixedStructure?.length) {
    for (const ms of item.mixedStructure) {
      const section = sectionsOf(ms.songSlug)?.find((s) => s.id === ms.sectionId);
      if (!section) return undefined;
      labels.push(`${slugs.indexOf(ms.songSlug) + 1} ${abbreviateSection(section)}`);
    }
    return labels;
  }
  for (const [i, f] of (item.fusionSongs ?? []).entries()) {
    const own = playedSteps(sectionsOf(f.songSlug), f.structureOverride);
    if (!own) return undefined;
    labels.push(...own.map((step) => `${i + 1} ${step.label}`));
  }
  return labels;
}

const sameList = (a: string[], b: string[]) => a.join("\n") === b.join("\n");

const SETTINGS: SongSetting[] = ["structure", "sectionNotes", "sectionTransitions", "nuances", "sectionKeys", "songNote", "adapted", "lastPhrase"];

/** Changements entre deux états d'une setlist, dans l'ordre de lecture.
 *  `sectionsOf` donné : les structures se comparent telles qu'elles s'écrivent,
 *  avec leur avant / après. */
export function diffSetlists(before: SetlistSnapshot, after: SetlistSnapshot, sectionsOf?: SectionsOf): HistoryChange[] {
  const changes: HistoryChange[] = [];
  for (const kind of ["title", "leader", "category"] as const) {
    const from = before[kind] ?? "";
    const to = after[kind] ?? "";
    if (from !== to) changes.push({ kind, from, to });
  }
  const dateOf = (s: SetlistSnapshot) => (s.moment ? `${s.date}|${s.moment}` : s.date ?? "");
  if (dateOf(before) !== dateOf(after)) changes.push({ kind: "date", from: dateOf(before), to: dateOf(after) });
  if (!!before.isPrivate !== !!after.isPrivate) {
    changes.push({ kind: "visibility", from: !!before.isPrivate, to: !!after.isPrivate });
  }
  const [notesBefore, notesAfter] = [(before.notes ?? "").trim(), (after.notes ?? "").trim()];
  if (notesBefore !== notesAfter) changes.push({ kind: "notes", from: notesBefore, to: notesAfter });

  const b = readItems(before.items ?? [], sectionsOf);
  const a = readItems(after.items ?? [], sectionsOf);
  for (const song of b.songs.keys()) if (!a.songs.has(song)) changes.push({ kind: "songRemoved", song });
  for (const song of a.songs.keys()) if (!b.songs.has(song)) changes.push({ kind: "songAdded", song });

  for (const [unit, fusion] of a.fusions) {
    if (b.fusions.has(unit)) {
      const prev = b.fusions.get(unit)!;
      const songs = fusion.songs;
      if (prev.structure !== fusion.structure) {
        if (!prev.labels || !fusion.labels) changes.push({ kind: "fusionStructure", songs });
        // Même écriture : rien de visible, comme pour un chant.
        else if (!sameList(prev.labels, fusion.labels)) changes.push({ kind: "fusionStructure", songs, from: prev.labels, to: fusion.labels });
      }
      if (prev.sectionNotes !== fusion.sectionNotes) {
        if (!prev.notes || !fusion.notes) changes.push({ kind: "sectionNotes", songs });
        else if (JSON.stringify(prev.notes) !== JSON.stringify(fusion.notes)) changes.push({ kind: "sectionNotes", songs, from: prev.notes, to: fusion.notes });
      }
      for (const kind of ["sectionTransitions", "nuances", "sectionKeys"] as const) {
        if (prev[kind] !== fusion[kind]) changes.push({ kind, songs });
      }
    } else if (fusion.songs.filter((s) => b.songs.has(s)).length >= 2) {
      changes.push({ kind: "fused", songs: fusion.songs });
    }
  }
  for (const [unit, fusion] of b.fusions) {
    if (!a.fusions.has(unit) && fusion.songs.filter((s) => a.songs.has(s)).length >= 2) {
      changes.push({ kind: "unfused", songs: fusion.songs });
    }
  }

  const kept = (order: string[], other: string[]) => order.filter((u) => other.includes(u)).join("\n");
  if (kept(b.order, a.order) !== kept(a.order, b.order)) changes.push({ kind: "order" });
  const units = (order: string[]) => order.map((unit) => unit.replace(/^fusion:/, ""));
  if (!sameList(units(b.order), units(a.order))) changes.push({ kind: "songs", from: units(b.order), to: units(a.order) });
  if (b.transitions !== a.transitions) changes.push({ kind: "transitions" });

  for (const [song, next] of a.songs) {
    const prev = b.songs.get(song);
    if (!prev) continue;
    if (prev.key !== next.key) changes.push({ kind: "key", song, from: prev.key, to: next.key });
    // Passé dans une fusion (ou sorti) : ses réglages changent de forme, pas de sens.
    if (prev.container !== next.container) continue;
    if (prev.jianpu !== next.jianpu) changes.push({ kind: "jianpuSheet", song, from: prev.jianpu, to: next.jianpu });
    const dpAdded = Number(next.lastPhrase) > Number(prev.lastPhrase);
    for (const kind of SETTINGS) {
      if (prev[kind] === next[kind]) continue;
      // Un Dp ajouté à un chant qui n'était pas adapté : la version adaptée
      // n'est que l'original plus la dernière phrase, une phrase suffit.
      if (kind === "adapted" && prev.adapted === "" && dpAdded) continue;
      if (kind === "lastPhrase" && !dpAdded) continue;
      if (kind === "songNote") {
        changes.push({ kind, song, from: prev.noteText, to: next.noteText });
        continue;
      }
      if (kind === "sectionNotes") {
        if (!prev.notes || !next.notes) changes.push({ kind, song });
        else if (JSON.stringify(prev.notes) !== JSON.stringify(next.notes)) changes.push({ kind, song, from: prev.notes, to: next.notes });
        continue;
      }
      if (kind === "structure") {
        if (!prev.labels || !next.labels) changes.push({ kind, song });
        // Même écriture (une copie du mode Adapter, par exemple) : rien de visible.
        else if (!sameList(prev.labels, next.labels)) changes.push({ kind, song, from: prev.labels, to: next.labels });
        continue;
      }
      changes.push({ kind, song });
    }
  }
  return changes;
}

export type SequenceMark = "same" | "removed" | "added" | "moved";

/**
 * Avant / après d'une suite (sections, chants) : ce qui reste dans l'ordre
 * (plus longue suite commune) est inchangé ; ce qui en sort des deux côtés
 * sous le même nom est déplacé ; le reste est retiré (avant) ou ajouté (après).
 */
export function compareSequences(
  before: string[],
  after: string[],
  { moves = true }: { moves?: boolean } = {},
): { before: SequenceMark[]; after: SequenceMark[] } {
  const n = before.length;
  const m = after.length;
  const common = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      common[i][j] = before[i] === after[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }
  const b = new Array<SequenceMark>(n).fill("removed");
  const a = new Array<SequenceMark>(m).fill("added");
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (before[i] === after[j]) {
      b[i++] = "same";
      a[j++] = "same";
    } else if (common[i + 1][j] >= common[i][j + 1]) i++;
    else j++;
  }
  for (let j = 0; moves && j < m; j++) {
    if (a[j] !== "added") continue;
    const i = b.findIndex((mark, k) => mark === "removed" && before[k] === after[j]);
    if (i !== -1) b[i] = a[j] = "moved";
  }
  return { before: b, after: a };
}

/** Ce qu'un changement modifie : deux changements de même identité se fondent. */
function identity(c: HistoryChange): string {
  if (c.kind === "songAdded" || c.kind === "songRemoved") return `song:${c.song}`;
  if (c.kind === "fused" || c.kind === "unfused") return `fusion:${c.songs.join("+")}`;
  if ("songs" in c) return `${c.kind}:${c.songs.join("+")}`;
  return `${c.kind}:${"song" in c ? c.song : ""}`;
}

/**
 * Phrases d'une entrée : celles déjà écrites (`prior`), puis celles du passage
 * en cours. Un ajout puis un retrait s'annulent ; « G → A » puis « A → G »
 * aussi ; « G → A » puis « A → B » devient « G → B ».
 */
export function mergeChanges(prior: HistoryChange[], next: HistoryChange[]): HistoryChange[] {
  const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
  const merged = [...prior];
  for (const change of next) {
    const i = merged.findIndex((p) => identity(p) === identity(change));
    if (i === -1) {
      merged.push(change);
      continue;
    }
    const previous = merged[i];
    if ("from" in previous && "from" in change) {
      const combined = { ...change, from: previous.from } as HistoryChange;
      if ("to" in combined && same(combined.from, combined.to)) merged.splice(i, 1);
      else merged[i] = combined;
    } else if (previous.kind !== change.kind) {
      merged.splice(i, 1); // ajouté puis retiré, fusionné puis séparé
    } else if ("from" in previous || "from" in change) {
      // L'avant du premier passage ou l'après du dernier manque : phrase seule.
      const { from: _from, to: _to, ...phrase } = change as HistoryChange & { from?: unknown; to?: unknown };
      merged[i] = phrase as HistoryChange;
    }
  }
  return merged;
}
