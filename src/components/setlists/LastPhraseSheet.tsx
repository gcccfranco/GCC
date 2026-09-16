"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { SectionView } from "@/components/song/SongView";
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock";
import { fetchSongAST } from "@/lib/api/songs";
import { formatSectionName, parseChordPro } from "@/lib/chordpro/parser";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { materializeLastPhrase } from "@/lib/setlist/lastPhrase";
import { semitonesTo } from "@/lib/transpose";
import { transposeSection } from "@/lib/transposeAST";
import type { SectionSummary, SongIndexEntry } from "@/types/song";

export type LastPhraseResult = { contentOverride: string; sectionId: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  song: SongIndexEntry;
  /** Version adaptée pour cette setlist, s'il y en a une : le Dp s'y ajoute. */
  contentOverride?: string | null;
  /** Tonalité de la setlist : l'aperçu s'y transpose. */
  keyOverride: string | null;
  /** Sections du chant proposées comme source. */
  sections: SectionSummary[];
  defaultSectionId: string;
  onAdd: (result: LastPhraseResult) => void;
};

/** Feuille « Dernière phrase » (Dp) de l'éditeur de structure : section
 *  source, nombre de lignes (1 à 3), aperçu avec les accords, puis l'étape est
 *  ajoutée comme une vraie section du chant adapté (docs/spec-coup-d-oeil.md). */
export function LastPhraseSheet(props: Props) {
  useStandaloneScrollLock(props.open);
  return (
    <Drawer open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DrawerContent className="max-h-[88vh] md:max-w-2xl md:mx-auto">
        {props.open && <LastPhraseForm {...props} />}
      </DrawerContent>
    </Drawer>
  );
}

// Monté à chaque ouverture : l'état repart des valeurs proposées.
function LastPhraseForm({ onClose, song, contentOverride, keyOverride, sections, defaultSectionId, onAdd }: Props) {
  const { t } = useTranslation();
  const [source, setSource] = useState<string | null>(contentOverride ?? null);
  const [sectionId, setSectionId] = useState(defaultSectionId);
  const [count, setCount] = useState(1);

  // Sans version adaptée, le source vient du chant (l'index n'a pas les lignes).
  useEffect(() => {
    if (contentOverride) return;
    let alive = true;
    fetchSongAST(song.slug).then((c) => {
      if (alive && c) setSource(c.source);
    });
    return () => {
      alive = false;
    };
  }, [contentOverride, song.slug]);

  // Nom de la section créée : « Dernière phrase – R ». L'abréviation, sans
  // numéro : un mot de section ou un chiffre serait relu par le parseur.
  const label = useMemo(() => {
    const s = sections.find((x) => x.id === sectionId);
    return s ? abbreviateSection(s).replace(/\d+/g, "") : "";
  }, [sections, sectionId]);
  const result = useMemo(
    () => (source ? materializeLastPhrase(source, sectionId, count, label) : null),
    [source, sectionId, count, label],
  );
  const preview = useMemo(() => {
    const section = result ? parseChordPro(result.source).sections.at(-1) : undefined;
    if (!section || !keyOverride || keyOverride === song.originalKey) return section;
    return transposeSection(section, semitonesTo(song.originalKey, keyOverride), keyOverride);
  }, [result, keyOverride, song.originalKey]);
  const language = song.language === "zh" ? "zh" : "fr";

  return (
    <>
      <DrawerHeader className="pb-1">
        <DrawerTitle>{t("setlists.form.lastPhrase.title")}</DrawerTitle>
      </DrawerHeader>
      <div className="px-4 pb-6 overflow-y-auto space-y-4">
        <p className="text-xs text-muted-foreground">{t("setlists.form.lastPhrase.hint")}</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {t("setlists.form.lastPhrase.section")}
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="h-9 px-2 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{formatSectionName(s, t)}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            {t("setlists.form.lastPhrase.lines")}
            <div className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  onClick={() => setCount(n)}
                  className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
                    count === n ? "border-primary/40 bg-secondary text-foreground" : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {t("setlists.form.lastPhrase.nLines", { count: n })}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div aria-label={t("setlists.form.lastPhrase.preview")} className="rounded-lg border border-dashed border-border px-3 pt-3">
          {preview ? (
            <SectionView section={preview} language={language} showChords showPinyin={language === "zh"} useJianpu={false} />
          ) : (
            <p className="pb-3 text-sm text-muted-foreground">
              {source ? t("setlists.form.lastPhrase.empty") : t("common.loading")}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.buttons.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!result || !preview}
            onClick={() => result && preview && onAdd({ contentOverride: result.source, sectionId: result.sectionId, name: preview.name })}
          >
            {t("setlists.form.lastPhrase.confirm")}
          </Button>
        </div>
      </div>
    </>
  );
}
