import type { SectionNuance } from "@/types/setList";
import { sectionKindOfName } from "@/lib/chordpro/parser";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { LAST_PHRASE } from "@/lib/setlist/lastPhrase";
import { SECTION_PALETTE_KEY } from "@/lib/sectionPalette";
import { isRepeatOf, type SectionOccurrence } from "@/lib/setlist/sectionSteps";

// Règles des « Dernière phrase » (Dp) dans les bandeaux de structure et en
// Structure seule (docs/spec-rappel-structure-louange.md, lot RS-A) : couleur
// de la section d'origine, numérotation, regroupement du même Dp joué de suite.

// Inverse des abréviations de `materializeLastPhrase` (« – R », « – C »…).
const ORIGIN_OF_ABBR: Record<string, string> = {
  i: "intro",
  c: "verse",
  pr: "prechorus",
  r: "chorus",
  po: "postchorus",
  p: "bridge",
  pm: "interlude",
  f: "outro",
  tag: "tag",
};

const DASH = /\s[–—-]\s*/;

type NamedSection = { type: string; name?: string };

/** La section est-elle une « Dernière phrase » ? */
export function isDp(section: NamedSection): boolean {
  return LAST_PHRASE.test(section.name ?? "");
}

/** Texte écrit après le tiret du nom d'un Dp (« R » dans « Dernière phrase – R »), sans chiffre. */
function originText(section: NamedSection): string | null {
  if (!isDp(section)) return null;
  const parts = (section.name ?? "").split(DASH);
  if (parts.length < 2) return null;
  return parts[parts.length - 1].replace(/\d+/g, "").trim() || null;
}

/** Sorte de section d'où vient un Dp, lue après le tiret de son nom (« R » →
 *  chorus, « C » → verse, « P » → bridge…) ; null si ce n'est pas un Dp ou si
 *  l'origine est illisible. */
export function dpOrigin(section: NamedSection): string | null {
  const text = originText(section);
  if (!text) return null;
  return ORIGIN_OF_ABBR[text.toLowerCase()] ?? sectionKindOfName(text);
}

/** Clé --sec-* d'une section : celle de son origine pour un Dp, sinon celle de
 *  son type ; « other » à défaut. */
export function paletteKeyOf(section: NamedSection): string {
  const kind = dpOrigin(section) ?? section.type;
  return SECTION_PALETTE_KEY[kind] ?? "other";
}

/** Nom d'un Dp avec l'origine en entier (« Dernière phrase – Refrain »), ou
 *  null si ce n'est pas un Dp lisible. `t` : la fonction de traduction. */
export function dpFullName(
  section: NamedSection,
  t: (key: string, options?: { defaultValue?: string }) => string,
): string | null {
  const kind = dpOrigin(section);
  if (!kind) return null;
  const word = t(`songs.sections.${kind}`, { defaultValue: "" });
  if (!word) return null;
  const parts = (section.name ?? "").split(DASH);
  return `${parts.slice(0, -1).join(" – ").trim()} – ${word}`;
}

export type StepGroup = {
  step: SectionOccurrence;
  abbr: string;
  full: string;
  repeat: number;
  uids: string[];
  /** Nuances des passages repliés, dans l'ordre, sans doublon consécutif. */
  nuances: SectionNuance[];
};

const nuanceKey = (n: SectionNuance) => `${n.tags.join(",")}|${n.note ?? ""}`;
const hasNuance = (n?: SectionNuance): n is SectionNuance => !!n && (n.tags.length > 0 || !!n.note);

/** Étapes regroupées pour le bandeau : le même Dp (même `section.id`) joué de
 *  suite = un groupe « ×n », quelles que soient nuance, note et modulation ;
 *  les autres sections se replient par `isRepeatOf`. Deux Dp différents de la
 *  même origine deviennent Dp1, Dp2 dans l'ordre de leur 1re apparition.
 *  `labelOf` : le nom complet d'une section (ce que `isRepeatOf` compare). */
export function groupSteps(
  steps: SectionOccurrence[],
  labelOf: (section: SectionOccurrence["section"]) => string,
): StepGroup[] {
  // Dp distincts par origine, dans l'ordre de leur 1re apparition.
  const byOrigin = new Map<string, string[]>();
  for (const s of steps) {
    if (!isDp(s.section)) continue;
    const key = dpOrigin(s.section) ?? "";
    const ids = byOrigin.get(key) ?? [];
    if (!ids.includes(s.section.id)) ids.push(s.section.id);
    byOrigin.set(key, ids);
  }
  const abbrOf = (section: SectionOccurrence["section"]) => {
    if (!isDp(section)) return abbreviateSection(section);
    const ids = byOrigin.get(dpOrigin(section) ?? "") ?? [];
    return ids.length > 1 ? `Dp${ids.indexOf(section.id) + 1}` : "Dp";
  };

  const groups: StepGroup[] = [];
  for (const step of steps) {
    const full = labelOf(step.section);
    const last = groups[groups.length - 1];
    const dp = isDp(step.section);
    if (last && (dp || isDp(last.step.section))) {
      if (dp && last.step.section.id === step.section.id) {
        last.repeat++;
        last.uids.push(step.section.uid);
        const prev = last.nuances[last.nuances.length - 1];
        if (hasNuance(step.nuance) && (!prev || nuanceKey(prev) !== nuanceKey(step.nuance))) last.nuances.push(step.nuance);
        continue;
      }
    } else if (last && isRepeatOf({ ...last.step, label: last.full }, { ...step, label: full })) {
      last.repeat++;
      last.uids.push(step.section.uid);
      continue;
    }
    groups.push({
      step,
      abbr: abbrOf(step.section),
      full,
      repeat: 1,
      uids: [step.section.uid],
      nuances: hasNuance(step.nuance) ? [step.nuance] : [],
    });
  }
  return groups;
}
