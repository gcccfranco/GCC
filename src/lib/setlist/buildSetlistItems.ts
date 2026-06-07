import type { FormItem, FormListItem } from "@/lib/setlist/formItems";
import { isFormFusion } from "@/lib/setlist/formItems";
import type { SetlistItem, FusionSong } from "@/types/setList";

function formItemToFusionSong(item: FormItem): FusionSong {
  const allIds = (item.song.sections ?? []).map((s) => s.id);
  const currentIds = item.sectionItems.map((s) => s.sectionId);
  const structureOverride =
    JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentIds;
  const sectionNotes = Object.fromEntries(
    item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.sectionId, s.note.trim()])
  );
  return {
    songSlug: item.song.slug,
    keyOverride: item.keyOverride,
    structureOverride,
    sectionNotes,
  };
}

export function buildSetlistItems(items: FormListItem[]): SetlistItem[] {
  return items.map((item, idx) => {
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
        fusionSongs: item.songs.map(formItemToFusionSong),
        mixedStructure: item.mixedStructure?.map((ms) => ({
          songSlug: ms.songSlug,
          sectionId: ms.sectionId,
        })) ?? null,
      };
    }
    const allIds = (item.song.sections ?? []).map((s) => s.id);
    const currentIds = item.sectionItems.map((s) => s.sectionId);
    const structureOverride =
      JSON.stringify(currentIds) === JSON.stringify(allIds) ? null : currentIds;
    const sectionNotes = Object.fromEntries(
      item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.sectionId, s.note.trim()])
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
      notes: item.notes,
    };
  });
}

export function detectSetlistLanguage(items: FormListItem[]): "fr" | "zh" | "mixed" {
  const langs = new Set(
    items.flatMap((i) =>
      isFormFusion(i) ? i.songs.map((s) => s.song.language) : [i.song.language]
    )
  );
  if (langs.size === 0) return "fr";
  if (langs.size === 1) return [...langs][0] as "fr" | "zh";
  return "mixed";
}
