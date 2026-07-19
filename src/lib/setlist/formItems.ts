import { nextUid } from "@/lib/uid";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import type { SetlistItem, SectionNuance } from "@/types/setList";
import type { SongIndexEntry, SectionSummary } from "@/types/song";

export interface FormSectionItem {
  uid: string;
  sectionId: string;
  name: string;
  note: string;
  transition: string;
  nuanceTags: string[];
  nuanceNote: string;
  /** Modulation (升调) : tonalité cible de cette section, "" = aucune. */
  keyChange: string;
}

export interface FormItem {
  uid: string;
  song: SongIndexEntry;
  keyOverride: string | null;
  notes: string;
  sectionItems: FormSectionItem[];
}

export interface FusionMixedSectionForm {
  uid: string;
  songSlug: string;
  sectionId: string;
  sectionName: string;
  songTitle: string;
  note: string;
  transition: string;
  nuanceTags: string[];
  nuanceNote: string;
}

export interface FormFusionItem {
  uid: string;
  kind: "fusion";
  songs: FormItem[];
  mixedStructure: FusionMixedSectionForm[] | null;
}

export interface FormTransitionItem {
  uid: string;
  kind: "transition";
  text: string;
}

export type FormListItem = FormItem | FormFusionItem | FormTransitionItem;

export function isFormFusion(item: FormListItem): item is FormFusionItem {
  return (item as FormFusionItem).kind === "fusion";
}

export function isFormTransition(item: FormListItem): item is FormTransitionItem {
  return (item as FormTransitionItem).kind === "transition";
}

export function makeDefaultSections(sections: SectionSummary[]): FormSectionItem[] {
  return sections.map((s, index) => ({
    uid: `${s.id}-${index}`,
    sectionId: s.id,
    name: s.name,
    note: "",
    transition: "",
    nuanceTags: [],
    nuanceNote: "",
    keyChange: "",
  }));
}

/** Résout la nuance d'une section depuis un Record keyé par uid/clé/id. */
function resolveNuance(
  nuances: Record<string, SectionNuance> | undefined,
  uid: string,
  key: string,
  id: string
): SectionNuance | undefined {
  return nuances?.[uid] ?? nuances?.[key] ?? nuances?.[id];
}

function toFormItem(
  song: SongIndexEntry,
  keyOverride: string | null,
  notes: string,
  structureOverride: string[] | null,
  sectionNotes: Record<string, string>,
  sectionTransitions: Record<string, string> = {},
  sectionNuances: Record<string, SectionNuance> = {},
  sectionKeys: Record<string, string> = {}
): FormItem {
  const allSections = song.sections ?? [];
  const orderedSections: SectionSummary[] = structureOverride && structureOverride.length > 0
    ? resolveStructureOverride(allSections, structureOverride)
    : allSections;
  const occ: Record<string, number> = {};
  return {
    uid: nextUid(),
    song,
    keyOverride,
    notes,
    sectionItems: orderedSections.map((s, index) => {
      const uid = s.uid ?? `${s.id}-${index}`;
      const idx = occ[s.id] ?? 0;
      occ[s.id] = idx + 1;
      const key = idx === 0 ? s.id : `${s.id}:${idx}`;
      const nuance = resolveNuance(sectionNuances, uid, key, s.id);
      return {
        uid,
        sectionId: s.id,
        name: s.name || s.type,
        note: sectionNotes?.[uid] ?? sectionNotes?.[key] ?? sectionNotes?.[s.id] ?? "",
        transition: sectionTransitions?.[uid] ?? sectionTransitions?.[key] ?? sectionTransitions?.[s.id] ?? "",
        nuanceTags: nuance?.tags ?? [],
        nuanceNote: nuance?.note ?? "",
        keyChange: sectionKeys?.[uid] ?? sectionKeys?.[key] ?? sectionKeys?.[s.id] ?? "",
      };
    }),
  };
}

export function buildFormItems(
  items: SetlistItem[],
  songsMap: Record<string, SongIndexEntry>
): FormListItem[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .flatMap((item): FormListItem[] => {
      if (item.type === "transition") {
        return [{ uid: nextUid(), kind: "transition", text: item.transitionText ?? "" }];
      }
      if (item.type === "fusion" && item.fusionSongs) {
        const songs: FormItem[] = item.fusionSongs.flatMap((fs) => {
          const song = songsMap[fs.songSlug];
          if (!song) return [];
          return [toFormItem(song, fs.keyOverride, "", fs.structureOverride, fs.sectionNotes, {}, fs.sectionNuances)];
        });
        if (songs.length === 0) return [];

        let mixedStructure: FusionMixedSectionForm[] | null = null;
        if (item.mixedStructure && item.mixedStructure.length > 0) {
          mixedStructure = item.mixedStructure.flatMap((ms): FusionMixedSectionForm[] => {
            const song = songsMap[ms.songSlug];
            if (!song) return [];
            const section = (song.sections ?? []).find((s) => s.id === ms.sectionId);
            if (!section) return [];
            const fusionSong = item.fusionSongs!.find((fs) => fs.songSlug === ms.songSlug);
            const nuance = ms.nuance ?? fusionSong?.sectionNuances?.[ms.sectionId];
            return [{
              uid: nextUid(),
              songSlug: ms.songSlug,
              sectionId: ms.sectionId,
              sectionName: section.name || section.type,
              songTitle: song.title,
              note: ms.note ?? fusionSong?.sectionNotes?.[ms.sectionId] ?? "",
              transition: ms.transition ?? "",
              nuanceTags: nuance?.tags ?? [],
              nuanceNote: nuance?.note ?? "",
            }];
          });
        }

        return [{ uid: nextUid(), kind: "fusion", songs, mixedStructure }];
      }

      const song = songsMap[item.songSlug];
      if (!song) return [];
      return [toFormItem(song, item.keyOverride, item.notes, item.structureOverride, item.sectionNotes, item.sectionTransitions, item.sectionNuances, item.sectionKeys)];
    });
}
