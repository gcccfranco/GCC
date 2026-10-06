"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X } from "lucide-react";
import { keyOptions } from "@/lib/transpose";
import { useDefaultSensors } from "@/lib/dnd/sensors";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { sectionKindOfName } from "@/lib/chordpro/parser";
import { SECTION_PALETTE_KEY } from "@/components/song/SongView";
import { NUANCES } from "@/lib/setlist/nuances";
import type { FormSectionItem } from "@/lib/setlist/formItems";
import { LastPhraseSheet } from "@/components/setlists/LastPhraseSheet";
import {
  AnnotationFieldInput,
  FIELD_STYLE,
  KeyChangeFieldInput,
  NuanceFieldInput,
  type LastPhraseTarget,
} from "@/components/setlists/SetlistFormRows";
import type { SectionSummary, SongIndexEntry } from "@/types/song";

// Réglages d'un chant dans le volet de l'éditeur (lot U5 bis, T3, planche
// `creer-piste2-ordinateur`) : tonalités en boutons, structure en pastilles,
// « Par section ». Les sous-éditeurs d'aujourd'hui (note, nuance, transition,
// 升调, Dernière phrase) sont repris tels quels ; seul leur dessin change.

/** Une section telle que l'éditeur la montre : abréviation et couleur de sa sorte. */
export function dessinSection(sections: SectionSummary[], sectionId: string, nom: string) {
  const s = sections.find((x) => x.id === sectionId);
  const kind = sectionKindOfName(nom) || (s && s.type !== "other" ? s.type : null);
  const cle = (kind && SECTION_PALETTE_KEY[kind]) || "other";
  return { abbr: abbreviateSection(s ?? { type: "other", name: nom }), cle };
}

/** Pastille ronde d'une section (« C1 », « R », « Dp »), teintée par sa sorte. */
export function PastilleSection({ abbr, cle, grande, className = "" }: { abbr: string; cle: string; grande?: boolean; className?: string }) {
  return (
    <span
      data-pastille
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none ${
        grande ? "h-10 min-w-10 px-1.5 text-[13px]" : "h-[22px] min-w-[22px] px-1 text-[10.5px]"
      } ${className}`}
      style={{ color: `var(--sec-${cle})`, background: `var(--sec-${cle}-tint)` }}
    >
      {abbr}
    </span>
  );
}

/** Les douze tonalités en boutons (groupe radio « Tonalité de <titre> ») ; « orig. » et
 *  « reco. » dessous. Toucher l'origine écrit `null`, comme le `<select>` d'aujourd'hui. */
export function Tonalites({
  song,
  keyOverride,
  onChange,
}: {
  song: SongIndexEntry;
  keyOverride: string | null;
  onChange: (key: string | null) => void;
}) {
  const { t } = useTranslation();
  const choisie = keyOverride ?? song.originalKey;
  const options = keyOptions(keyOverride, song.originalKey);
  const couleur = song.language === "zh" ? "var(--zh-accent)" : "var(--fr-accent)";
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const choisir = (k: string) => onChange(k === song.originalKey ? null : k);

  // Flèches : la tonalité voisine, comme un groupe de boutons radio.
  function onKeyDown(e: KeyboardEvent, i: number) {
    const pas = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!pas) return;
    e.preventDefault();
    const j = (i + pas + options.length) % options.length;
    choisir(options[j]);
    refs.current[j]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={t("setlists.form.songKeyLabel", { title: song.title })} className="flex flex-wrap gap-x-[5px] gap-y-1">
      {options.map((k, i) => {
        const on = k === choisie;
        const legende = k === song.originalKey ? t("setlists.editeur.orig") : k === song.recommendedKey ? t("setlists.editeur.reco") : "";
        return (
          <button
            key={k}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            data-origine={k === song.originalKey ? "" : undefined}
            onClick={() => choisir(k)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="group flex w-10 flex-col items-center gap-1 rounded-lg focus-visible:outline-none"
          >
            <span
              className={`flex h-9 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ring ${
                on ? "text-white" : "bg-background text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-muted"
              }`}
              style={on ? { background: couleur } : undefined}
            >
              {k}
            </span>
            {legende && <span className="text-[11px] leading-none text-muted-foreground">{legende}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Structure en pastilles ────────────────────────────────────────────────────

function PastilleEtape({
  item,
  index,
  sections,
  choisie,
  onChoisir,
  onRetirer,
  onDeplacer,
}: {
  item: FormSectionItem;
  index: number;
  sections: SectionSummary[];
  choisie: boolean;
  onChoisir: () => void;
  onRetirer: () => void;
  onDeplacer: (pas: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const { abbr, cle } = dessinSection(sections, item.sectionId, item.name);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? "z-10" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        // Le clavier choisit (Entrée, espace) et déplace (flèches) ; le glisser reste au doigt et à la souris.
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            onDeplacer(e.key === "ArrowLeft" ? -1 : 1);
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChoisir();
          }
        }}
        onClick={onChoisir}
        aria-label={t("setlists.editeur.etape", { nom: item.name, n: index + 1 })}
        aria-pressed={choisie}
        title={item.name}
        style={{ touchAction: "none" }}
        className={`block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          choisie ? "ring-2 ring-offset-2 ring-offset-background" : ""
        }`}
      >
        <PastilleSection
          abbr={abbr}
          cle={cle}
          grande
          className={choisie ? "shadow-[0_0_0_2px_var(--sec-chorus)]" : ""}
        />
      </button>
      {choisie && (
        <button
          type="button"
          onClick={onRetirer}
          aria-label={t("setlists.editeur.retirerEtape", { nom: item.name })}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3 w-3" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

/** Nouvelle étape de structure. L'uid garde la forme `<section>-<chiffres>` : il est écrit
 *  tel quel dans `structureOverride`, relu par `resolveStructureOverride`. */
function nouvelleEtape(sectionId: string, name: string): FormSectionItem {
  return {
    uid: `${sectionId}-${Date.now()}${Math.floor(Math.random() * 1000)}`,
    sectionId,
    name,
    note: "",
    transition: "",
    nuanceTags: [],
    nuanceNote: "",
    keyChange: "",
  };
}

/** « Structure » : les étapes en pastilles (glisser pour l'ordre, toucher pour choisir,
 *  ✕ pour retirer), puis un bouton par section du chant et « + Dernière phrase ». */
export function StructurePastilles({
  song,
  sections: toutes,
  sectionItems,
  onChange,
  choisie,
  onChoisir,
  lastPhrase,
}: {
  song: SongIndexEntry;
  /** Sections du chant, version adaptée comprise (`itemSections`). */
  sections: SectionSummary[];
  sectionItems: FormSectionItem[];
  onChange: (items: FormSectionItem[]) => void;
  choisie: string | null;
  onChoisir: (uid: string | null) => void;
  lastPhrase?: LastPhraseTarget;
}) {
  const { t } = useTranslation();
  const sensors = useDefaultSensors();
  const [dpOuverte, setDpOuverte] = useState(false);
  const allSections = song.sections ?? [];
  const known = new Set(allSections.map((s) => s.id));
  const dpParDefaut =
    [...sectionItems].reverse().find((si) => known.has(si.sectionId))?.sectionId ?? allSections[0]?.id ?? "";

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = sectionItems.findIndex((s) => s.uid === active.id);
    const vers = sectionItems.findIndex((s) => s.uid === over.id);
    onChange(arrayMove(sectionItems, de, vers));
  }

  return (
    <section className="space-y-2.5">
      <h3 className="text-[13px] font-semibold text-muted-foreground">{t("setlists.editeur.structure")}</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sectionItems.map((s) => s.uid)} strategy={rectSortingStrategy}>
          <div className="flex flex-wrap gap-2.5 py-1">
            {sectionItems.map((si, i) => (
              <PastilleEtape
                key={si.uid}
                item={si}
                index={i}
                sections={toutes}
                choisie={choisie === si.uid}
                onChoisir={() => onChoisir(choisie === si.uid ? null : si.uid)}
                onRetirer={() => {
                  onChange(sectionItems.filter((x) => x.uid !== si.uid));
                  onChoisir(null);
                }}
                onDeplacer={(pas) => {
                  const j = i + pas;
                  if (j >= 0 && j < sectionItems.length) onChange(arrayMove(sectionItems, i, j));
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {sectionItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("setlists.form.emptySections")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("setlists.editeur.structureAide")}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {allSections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange([...sectionItems, nouvelleEtape(s.id, s.name)])}
            className="flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {s.name}
          </button>
        ))}
        {lastPhrase && (
          <button
            type="button"
            onClick={() => setDpOuverte(true)}
            className="flex h-8 items-center gap-1 rounded-full border border-dashed border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t("setlists.form.lastPhrase.add")}
          </button>
        )}
      </div>
      {lastPhrase && (
        <LastPhraseSheet
          open={dpOuverte}
          onClose={() => setDpOuverte(false)}
          song={lastPhrase.song}
          contentOverride={lastPhrase.contentOverride}
          keyOverride={lastPhrase.keyOverride}
          sections={allSections}
          defaultSectionId={dpParDefaut}
          onAdd={({ contentOverride: source, sectionId, name }) => {
            lastPhrase.onAdd({ contentOverride: source, step: nouvelleEtape(sectionId, name) });
            setDpOuverte(false);
          }}
        />
      )}
    </section>
  );
}

// ─── Par section ────────────────────────────────────────────────────────────────

type Champ = "note" | "nuance" | "transition" | "keyChange";

function BoutonChamp({
  champ,
  rempli,
  ouvert,
  texte,
  onClick,
}: {
  champ: Champ;
  rempli: boolean;
  ouvert: boolean;
  texte: string;
  onClick: () => void;
}) {
  const { Icon, filled, ring, title } = FIELD_STYLE[champ];
  return (
    <button
      type="button"
      title={title}
      aria-expanded={ouvert}
      onClick={onClick}
      className={`flex h-[26px] max-w-[14rem] items-center gap-1 rounded-md px-2 text-[12.5px] font-medium transition-colors ${
        rempli ? filled : "text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:text-foreground hover:bg-muted"
      } ${ouvert ? ring : ""}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{texte}</span>
    </button>
  );
}

/** Une ligne de « Par section » : la pastille, le nom, puis Note · Nuance · Transition · 升调 ;
 *  l'éditeur d'aujourd'hui s'ouvre sous la ligne. */
function LigneParSection({
  item,
  sections,
  choisie,
  sansTransition,
  onPatch,
}: {
  item: FormSectionItem;
  sections: SectionSummary[];
  choisie: boolean;
  sansTransition?: boolean;
  onPatch: (patch: Partial<FormSectionItem>) => void;
}) {
  const { t } = useTranslation();
  const [ouvert, setOuvert] = useState<Champ | null>(null);
  const { abbr, cle } = dessinSection(sections, item.sectionId, item.name);
  const basculer = (c: Champ) => setOuvert(ouvert === c ? null : c);
  const nuance = [
    ...item.nuanceTags.map((id) => NUANCES.find((n) => n.id === id)?.label ?? id),
    item.nuanceNote.trim(),
  ].filter(Boolean).join(", ");
  return (
    <div data-ligne-section data-choisie={choisie ? "" : undefined} className={`border-t border-border first:border-t-0 ${choisie ? "bg-muted/60" : ""}`}>
      <div className="flex items-center gap-3 py-2">
        <span className="flex w-8 shrink-0 justify-center">
          <PastilleSection abbr={abbr} cle={cle} />
        </span>
        <span data-nom-section className="w-28 shrink-0 truncate text-sm font-medium text-foreground" title={item.name}>
          {item.name}
        </span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <BoutonChamp champ="note" rempli={!!item.note.trim()} ouvert={ouvert === "note"} texte={item.note.trim() || t("setlists.editeur.note")} onClick={() => basculer("note")} />
          <BoutonChamp champ="nuance" rempli={!!nuance} ouvert={ouvert === "nuance"} texte={nuance || t("setlists.editeur.nuance")} onClick={() => basculer("nuance")} />
          {!sansTransition && (
            <BoutonChamp
              champ="transition"
              rempli={!!(item.transition ?? "").trim()}
              ouvert={ouvert === "transition"}
              texte={(item.transition ?? "").trim() || t("setlists.editeur.transitionSection")}
              onClick={() => basculer("transition")}
            />
          )}
          <BoutonChamp
            champ="keyChange"
            rempli={!!(item.keyChange ?? "").trim()}
            ouvert={ouvert === "keyChange"}
            texte={(item.keyChange ?? "").trim() || t("setlists.editeur.keyChange")}
            onClick={() => basculer("keyChange")}
          />
        </div>
      </div>
      {ouvert === "note" && (
        <AnnotationFieldInput kind="note" value={item.note} onChange={(note) => onPatch({ note })} onClose={() => setOuvert(null)} />
      )}
      {ouvert === "nuance" && (
        <NuanceFieldInput
          tags={item.nuanceTags}
          note={item.nuanceNote}
          onTagsChange={(nuanceTags) => onPatch({ nuanceTags })}
          onNoteChange={(nuanceNote) => onPatch({ nuanceNote })}
        />
      )}
      {ouvert === "transition" && (
        <AnnotationFieldInput kind="transition" value={item.transition ?? ""} onChange={(transition) => onPatch({ transition })} onClose={() => setOuvert(null)} />
      )}
      {ouvert === "keyChange" && (
        <KeyChangeFieldInput value={item.keyChange ?? ""} onChange={(keyChange) => onPatch({ keyChange })} />
      )}
    </div>
  );
}

/** « Par section » : une ligne par étape jouée. Dans une fusion, sans transition (comme aujourd'hui). */
export function ParSection({
  sections,
  sectionItems,
  onChange,
  choisie,
  sansTransition,
}: {
  /** Sections du chant, version adaptée comprise (`itemSections`). */
  sections: SectionSummary[];
  sectionItems: FormSectionItem[];
  onChange: (items: FormSectionItem[]) => void;
  choisie: string | null;
  sansTransition?: boolean;
}) {
  const { t } = useTranslation();
  if (sectionItems.length === 0) return null;
  return (
    <section className="space-y-1">
      <h3 className="text-[13px] font-semibold text-muted-foreground">{t("setlists.editeur.parSection")}</h3>
      <div className="border-t border-border">
        {sectionItems.map((si, i) => (
          <LigneParSection
            key={si.uid}
            item={si}
            sections={sections}
            choisie={choisie === si.uid}
            sansTransition={sansTransition}
            onPatch={(patch) => {
              const next = [...sectionItems];
              next[i] = { ...next[i], ...patch };
              onChange(next);
            }}
          />
        ))}
      </div>
    </section>
  );
}
