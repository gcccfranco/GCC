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

/** Structure à ne pas écrire : celle du chant, dans l'ordre. Jamais pour une
 *  version adaptée — sa structure par défaut serait la sienne, Dernière phrase
 *  comprise, et une Dp retirée de la structure se jouerait encore. */
function defaultStructure(item: FormItem, currentIds: string[], allIds: string[]): boolean {
  return !item.contentOverride && JSON.stringify(currentIds) === JSON.stringify(allIds);
}

function formItemToFusionSong(item: FormItem): FusionSong {
  const allIds = (item.song.sections ?? []).map((s) => s.id);
  const currentIds = item.sectionItems.map((s) => s.sectionId);
  const currentUid = item.sectionItems.map((s) => s.uid);
  const structureOverride = defaultStructure(item, currentIds, allIds) ? null : currentUid;
  const sectionNotes = Object.fromEntries(
    item.sectionItems.filter((s) => s.note.trim()).map((s) => [s.uid, s.note.trim()])
  );
  const sectionNuances = buildSectionNuances(item.sectionItems);
  const sectionKeys = Object.fromEntries(
    item.sectionItems.filter((s) => s.keyChange?.trim()).map((s) => [s.uid, s.keyChange.trim()])
  );
  return {
    songSlug: item.song.slug,
    keyOverride: item.keyOverride,
    structureOverride,
    sectionNotes,
    ...(Object.keys(sectionNuances).length > 0 ? { sectionNuances } : {}),
    ...(Object.keys(sectionKeys).length > 0 ? { sectionKeys } : {}),
    // Version adaptée (sa Dernière phrase) : reconduite telle quelle.
    ...(item.contentOverride ? { contentOverride: item.contentOverride } : {}),
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
            ...(ms.keyChange?.trim() ? { keyChange: ms.keyChange.trim() } : {}),
          };
        }) ?? null,
      };
    }
    const allIds = (item.song.sections ?? []).map((s) => s.id);
    const currentIds = item.sectionItems.map((s) => s.sectionId);
    const currentUid = item.sectionItems.map((s) => s.uid);
    const structureOverride = defaultStructure(item, currentIds, allIds) ? null : currentUid;
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
      ...(item.jianpuSheet ? { jianpuSheet: true } : {}),
      structureOverride,
      sectionNotes,
      sectionTransitions,
      ...(Object.keys(sectionNuances).length > 0 ? { sectionNuances } : {}),
      ...(Object.keys(sectionKeys).length > 0 ? { sectionKeys } : {}),
      // Version adaptée du chant (mode Adapter) : reconduite telle quelle, le
      // formulaire ne touche qu'à la structure et aux réglages par section.
      ...(item.contentOverride ? { contentOverride: item.contentOverride } : {}),
      ...(item.sectionOrigins ? { sectionOrigins: item.sectionOrigins } : {}),
      // Accords retouchés sur le scan 简谱 : même chose, sinon tout enregistrement
      // de l'éditeur les effaçait (updateSetlist réécrit les items en entier).
      ...(item.jianpuChords ? { jianpuChords: item.jianpuChords } : {}),
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
