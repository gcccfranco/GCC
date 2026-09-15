import type { SetlistItem } from "@/types/setList";
import { withoutLastPhrases } from "@/lib/setlist/lastPhrase";

// Historique des modifications d'une setlist (docs/spec-setlist.md, lot 2).
// Une modification est décrite par des « changements » (données, traduites à
// l'affichage). Chaque passage compare deux états de la setlist écrits dans le
// même format, puis ses phrases rejoignent celles de l'entrée en cours.

/** Réglages d'un chant résumés en une phrase chacun. */
type SongSetting = "structure" | "sectionNotes" | "sectionTransitions" | "nuances" | "sectionKeys" | "songNote" | "adapted" | "lastPhrase";

export type HistoryChange =
  | { kind: "created" | "notes" | "order" | "transitions" }
  | { kind: "title" | "leader" | "category" | "date"; from: string; to: string }
  | { kind: "visibility"; from: boolean; to: boolean }
  | { kind: "songAdded" | "songRemoved"; song: string }
  | { kind: "fused" | "unfused"; songs: string[] }
  | { kind: "key"; song: string; from: string | null; to: string | null }
  | { kind: "jianpuSheet"; song: string; from: boolean; to: boolean }
  | { kind: SongSetting; song: string }
  | { kind: "fusionStructure"; songs: string[] };

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

type SongState = { container: string; key: string | null; jianpu: boolean } & Record<SongSetting, string>;

function readItems(items: SetlistItem[]) {
  const order: string[] = [];
  const songs = new Map<string, SongState>();
  const fusions = new Map<string, { songs: string[]; mixed: string }>();
  const transitions: string[] = [];
  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    if (item.type === "transition") {
      transitions.push(item.transitionText ?? "");
    } else if (item.type === "fusion") {
      const slugs = (item.fusionSongs ?? []).map((f) => f.songSlug);
      const unit = `fusion:${slugs.join("+")}`;
      order.push(unit);
      fusions.set(unit, { songs: slugs, mixed: norm(item.mixedStructure) });
      for (const f of item.fusionSongs ?? []) {
        songs.set(f.songSlug, {
          container: unit,
          key: f.keyOverride ?? null,
          jianpu: false,
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
      songs.set(item.songSlug, {
        container: "",
        key: item.keyOverride ?? null,
        jianpu: !!item.jianpuSheet,
        structure: norm(item.structureOverride),
        sectionNotes: norm(item.sectionNotes),
        sectionTransitions: norm(item.sectionTransitions),
        nuances: norm(item.sectionNuances),
        sectionKeys: norm(item.sectionKeys),
        songNote: norm(item.notes?.trim()),
        adapted: norm(adapted.source),
        lastPhrase: String(adapted.count),
      });
    }
  }
  return { order, songs, fusions, transitions: norm(transitions) };
}

const SETTINGS: SongSetting[] = ["structure", "sectionNotes", "sectionTransitions", "nuances", "sectionKeys", "songNote", "adapted", "lastPhrase"];

/** Changements entre deux états d'une setlist, dans l'ordre de lecture. */
export function diffSetlists(before: SetlistSnapshot, after: SetlistSnapshot): HistoryChange[] {
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
  if ((before.notes ?? "").trim() !== (after.notes ?? "").trim()) changes.push({ kind: "notes" });

  const b = readItems(before.items ?? []);
  const a = readItems(after.items ?? []);
  for (const song of b.songs.keys()) if (!a.songs.has(song)) changes.push({ kind: "songRemoved", song });
  for (const song of a.songs.keys()) if (!b.songs.has(song)) changes.push({ kind: "songAdded", song });

  for (const [unit, fusion] of a.fusions) {
    if (b.fusions.has(unit)) {
      if (b.fusions.get(unit)!.mixed !== fusion.mixed) changes.push({ kind: "fusionStructure", songs: fusion.songs });
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
      changes.push({ kind, song });
    }
  }
  return changes;
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
      if ("to" in combined && combined.from === combined.to) merged.splice(i, 1);
      else merged[i] = combined;
    } else if (previous.kind !== change.kind) {
      merged.splice(i, 1); // ajouté puis retiré, fusionné puis séparé
    }
  }
  return merged;
}
