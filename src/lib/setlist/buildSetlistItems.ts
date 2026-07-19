import type { FormItem, FormListItem, FormSectionItem } from "@/lib/setlist/formItems";
import { isFormFusion, isFormTransition } from "@/lib/setlist/formItems";
import type { SetlistItem, FusionSong, SectionNuance } from "@/types/setList";

/** Sérialise les nuances non vides des sections, keyées par uid. */
function buildSectionNuances(
  sectionItems: FormSectionItem[]
): Record<string, SectionNuance> {
  const entries = sectionItems.flatMap((s): [string, SectionNuance][] => {
    const tags = s.nuanceTags ?? [];
    const note = s.nuanceNote?.trim() ?? "";
    if (tags.length === 0 && !note) return [];
    return [[s.uid, { tags, ...(note ? { note } : {}) }]];
  });
  return Object.fromEntries(entries);
}

function formItemToFusionSong(item: FormItem): FusionSong {
  const allIds = (item.song.sections ?? []).map((s) => s.id);
  const currentIds = item.sectionItems.map((s) => s.sectionId);
  const currentUid = item.sectionItems.map((s) => s.uid);
  const structureOverride =
    JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentUid;
  const sectionNotes = Object.fromEntries(
    item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.uid, s.note.trim()])
  );
  const sectionNuances = buildSectionNuances(item.sectionItems);
  return {
    songSlug: item.song.slug,
    keyOverride: item.keyOverride,
    structureOverride,
    sectionNotes,
    ...(Object.keys(sectionNuances).length > 0 ? { sectionNuances } : {}),
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
        mixedStructure: item.mixedStructure?.map((ms) => {
          const nuanceTags = ms.nuanceTags ?? [];
          const nuanceNote = ms.nuanceNote?.trim() ?? "";
          const hasNuance = nuanceTags.length > 0 || nuanceNote;
          return {
            songSlug: ms.songSlug,
            sectionId: ms.sectionId,
            ...(ms.note?.trim() ? { note: ms.note.trim() } : {}),
            ...(ms.transition?.trim() ? { transition: ms.transition.trim() } : {}),
            ...(hasNuance ? { nuance: { tags: nuanceTags, ...(nuanceNote ? { note: nuanceNote } : {}) } } : {}),
          };
        }) ?? null,
      };
    }
    const allIds = (item.song.sections ?? []).map((s) => s.id);
    const currentIds = item.sectionItems.map((s) => s.sectionId);
    const currentUid = item.sectionItems.map((s) => s.uid);
    const structureOverride =
      JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentUid;
    const sectionNotes = Object.fromEntries(
      item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.uid, s.note.trim()])
    );
    const sectionTransitions = Object.fromEntries(
      item.sectionItems.filter((s) => s.transition.trim()).map((s) => [s.uid, s.transition.trim()])
    );
    const sectionNuances = buildSectionNuances(item.sectionItems);
    const sectionKeys = Object.fromEntries(
      item.sectionItems.filter((s) => s.keyChange?.trim()).map((s) => [s.uid, s.keyChange.trim()])
    );
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
      ...(Object.keys(sectionNuances).length > 0 ? { sectionNuances } : {}),
      ...(Object.keys(sectionKeys).length > 0 ? { sectionKeys } : {}),
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
