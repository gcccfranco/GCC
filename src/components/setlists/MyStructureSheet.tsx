"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { SectionStructureEditor } from "@/components/setlists/SetlistFormRows";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import type { FormSectionItem } from "@/lib/setlist/formItems";
import type { ChordProAST } from "@/types/chordPro";
import type { SectionSummary } from "@/types/song";

// Feuille « Sections » de ma version (docs/spec-version-perso.md, V2) : les
// sections à voir et leur ordre, pour moi seul. Réutilise l'éditeur de
// structure de l'éditeur de setlist, sans notes ni « Dernière phrase ».

export type MyStructureTarget = {
  /** Chant tel qu'affiché (ma version d'accords et paroles si elle existe). */
  ast: ChordProAST;
  /** Ma structure ; `null` = celle de la présidence. */
  structure: string[] | null;
  /** Structure de la présidence ; `null` = toutes les sections du chant. */
  presidency: string[] | null;
};

type Props = {
  target: MyStructureTarget | null;
  saving: boolean;
  onClose: () => void;
  /** `null` = revenir à la structure de la présidence. */
  onSave: (structure: string[] | null) => void;
};

export function MyStructureSheet({ target, saving, onClose, onSave }: Props) {
  useStandaloneScrollLock(!!target);
  return (
    <Drawer open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[88vh] md:max-w-3xl md:mx-auto">
        {target && <SheetBody key={target.ast.metadata.title} target={target} saving={saving} onSave={onSave} />}
      </DrawerContent>
    </Drawer>
  );
}

function sectionsOf(ast: ChordProAST): SectionSummary[] {
  return ast.sections.map((s, index) => ({
    id: s.id,
    name: s.name || s.type,
    type: s.type,
    uid: `${s.id}-${index}`,
    number: s.number,
    suffix: s.suffix,
  }));
}

function toItems(sections: SectionSummary[], structure: string[] | null): FormSectionItem[] {
  const ordered = structure && structure.length > 0 ? resolveStructureOverride(sections, structure) : sections;
  return ordered.map((s, index) => ({
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

function SheetBody({ target, saving, onSave }: Omit<Props, "onClose" | "target"> & { target: MyStructureTarget }) {
  const { t } = useTranslation();
  const allSections = sectionsOf(target.ast);
  const [items, setItems] = useState(() => toItems(allSections, target.structure ?? target.presidency));
  const presidencyIds = toItems(allSections, target.presidency).map((i) => i.sectionId);

  function save() {
    const ids = items.map((i) => i.sectionId);
    // Identique à la présidence : rien à garder pour moi.
    onSave(JSON.stringify(ids) === JSON.stringify(presidencyIds) ? null : ids);
  }

  return (
    <>
      <DrawerHeader className="pb-1">
        <DrawerTitle>{t("setlists.myVersion.sections")}</DrawerTitle>
        <DrawerDescription>{t("setlists.myVersion.sectionsHint")}</DrawerDescription>
      </DrawerHeader>
      <div className="overflow-y-auto px-1">
        <SectionStructureEditor allSections={allSections} sectionItems={items} onChange={setItems} hideNotes />
      </div>
      <DrawerFooter className="flex-row justify-end gap-2">
        <Button variant="outline" disabled={saving} onClick={() => onSave(null)}>
          {t("setlists.myVersion.reset")}
        </Button>
        <Button disabled={saving} onClick={save}>
          {saving ? "…" : t("setlists.myVersion.save")}
        </Button>
      </DrawerFooter>
    </>
  );
}
