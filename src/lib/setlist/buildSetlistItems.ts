import type { FormItem, FormListItem } from "@/lib/setlist/formItems";
import { isFormFusion, isFormTransition } from "@/lib/setlist/formItems";
import type { SetlistItem, FusionSong } from "@/types/setList";

function formItemToFusionSong(item: FormItem): FusionSong {
  const allIds = (item.song.sections ?? []).map((s) => s.id);
  const currentIds = item.sectionItems.map((s) => s.sectionId);
  const structureOverride =
    JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentIds;
  const sectionNotes: Record<string, string> = {};
  const occ: Record<string, number> = {};
  for (const s of item.sectionItems) {
    const idx = occ[s.sectionId] ?? 0;
    occ[s.sectionId] = idx + 1;
    const key = idx === 0 ? s.sectionId : `${s.sectionId}:${idx}`;
    if (s.note.trim()) sectionNotes[key] = s.note.trim();
  }
  return {
    songSlug: item.song.slug,
    keyOverride: item.keyOverride,
    structureOverride,
    sectionNotes,
  };
}

export function buildSetlistItems(items: FormListItem[]): SetlistItem[] {
  return items.map((item, idx) => {
    if (isFormTransition(item)) {
      return {
        type: "transition" as const,
        songSlug: "",
        position: idx + 1,
        keyOverride: null,
        showChords: false,
        showPinyin: false,
        useJianpu: false,
        structureOverride: null,
        sectionNotes: {},
        notes: "",
        transitionText: item.text,
      };
    }
    if (isFormFusion(item)) {
      return {
        type: "fusion" as const,
        songSlug: "",
        position: idx + 1,
        keyOverride: null,
        showChords: true,
        showPinyin: false,
        useJianpu: false,
        structureOverride: null,
        sectionNotes: {},
        notes: "",
        fusionSongs: item.songs.map((song) => formItemToFusionSong(song)),
        mixedStructure: item.mixedStructure?.map((ms) => ({
          songSlug: ms.songSlug,
          sectionId: ms.sectionId,
          ...(ms.note?.trim() ? { note: ms.note.trim() } : {}),
          ...(ms.transition?.trim() ? { transition: ms.transition.trim() } : {}),
        })) ?? null,
      };
    }
    const allIds = (item.song.sections ?? []).map((s) => s.id);
    const currentIds = item.sectionItems.map((s) => s.sectionId);
    const structureOverride =
      JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentIds;
    const sectionNotes: Record<string, string> = {};
    const sectionTransitions: Record<string, string> = {};
    const occ: Record<string, number> = {};
    for (const s of item.sectionItems) {
      const idx = occ[s.sectionId] ?? 0;
      occ[s.sectionId] = idx + 1;
      const key = idx === 0 ? s.sectionId : `${s.sectionId}:${idx}`;
      if (s.note.trim()) sectionNotes[key] = s.note.trim();
      if (s.transition.trim()) sectionTransitions[key] = s.transition.trim();
    }
    return {
      songSlug: item.song.slug,
      position: idx + 1,
      keyOverride: item.keyOverride,
      showChords: true,
      showPinyin: item.song.language === "zh",
      useJianpu: false,
      structureOverride,
      sectionNotes,
      sectionTransitions,
      notes: item.notes,
    };
  });
}

export function detectSetlistLanguage(items: FormListItem[]): "fr" | "zh" | "mixed" {
  const langs = new Set(
    items.flatMap((i) => {
      if (isFormTransition(i)) return [];
      if (isFormFusion(i)) return i.songs.map((s) => s.song.language);
      return [i.song.language];
    })
  );
  if (langs.size === 0) return "fr";
  if (langs.size === 1) return [...langs][0] as "fr" | "zh";
  return "mixed";
}
