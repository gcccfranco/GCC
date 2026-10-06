"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link2, Shuffle, Trash2, Unlink } from "lucide-react";
import { useJianpuScore } from "@/lib/jianpu/images";
import { nextUid } from "@/lib/uid";
import {
  itemSections,
  type FormFusionItem,
  type FormItem,
  type FormTransitionItem,
  type FusionMixedSectionForm,
} from "@/lib/setlist/formItems";
import { MixedStructureEditor, type LastPhraseTarget } from "@/components/setlists/SetlistFormRows";
import { KeyPill } from "@/components/ui/key-pill";
import { ParSection, StructurePastilles, Tonalites } from "@/components/setlists/editeur/Reglages";

// Le volet de droite de l'éditeur (lot U5 bis, T3) : les réglages de l'élément
// choisi dans la liste — chant, fusion, transition — et le choix des chants à
// fusionner. Chaque réglage écrit comme l'éditeur d'aujourd'hui.

const titreDeSection = "text-[13px] font-semibold text-muted-foreground";
const boutonGris =
  "flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const boutonRetirer =
  "flex h-10 items-center gap-2 rounded-full bg-destructive/10 px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** En-tête commun : petite ligne, « n · Titre », sous-titre, lien à droite. */
function EnTeteVolet({ surtitre, titre, sousTitre, lien }: { surtitre: string; titre: string; sousTitre?: string; lien?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">{surtitre}</p>
        <h2 className="mt-0.5 text-2xl font-bold leading-tight tracking-tight text-foreground">{titre}</h2>
        {sousTitre && <p className="mt-1 text-sm text-muted-foreground">{sousTitre}</p>}
      </div>
      {lien}
    </div>
  );
}

/** Lien vers la page du chant, dans un nouvel onglet (Q10 : quitter l'éditeur de
 *  création supprimerait le brouillon), dans la tonalité choisie. */
function lienPartition(slug: string, cle: string | null) {
  return `/songs/${encodeURIComponent(slug)}${cle ? `?key=${encodeURIComponent(JSON.stringify(cle))}` : ""}`;
}

/** Chant seul : tonalité, Partition 简谱 / Paroles, structure, par section, note ; Fusionner, Retirer. */
export function VoletChant({
  numero,
  item,
  peutFusionner,
  onPatch,
  onFusionner,
  onRetirer,
}: {
  numero: number;
  item: FormItem;
  peutFusionner: boolean;
  onPatch: (update: Partial<FormItem>) => void;
  onFusionner: () => void;
  onRetirer: () => void;
}) {
  const { t } = useTranslation();
  const scan = useJianpuScore(item.song.slug);
  const [etape, setEtape] = useState<string | null>(null);
  const sections = useMemo(() => itemSections(item.song, item.contentOverride), [item.song, item.contentOverride]);
  const allSections = item.song.sections ?? [];
  const noms = [...new Set(allSections.map((s) => s.name))].join(", ");
  const sousTitre = [item.song.artist, noms].filter(Boolean).join(" · ");
  const idNote = useId();
  const lastPhrase: LastPhraseTarget = {
    song: item.song,
    contentOverride: item.contentOverride,
    keyOverride: item.keyOverride,
    onAdd: ({ contentOverride, step }) => onPatch({ contentOverride, sectionItems: [...item.sectionItems, step] }),
  };

  return (
    <div className="space-y-7">
      <EnTeteVolet
        surtitre={t("setlists.editeur.reglagesChant")}
        titre={`${numero} · ${item.song.title}`}
        sousTitre={sousTitre}
        lien={
          <a
            href={lienPartition(item.song.slug, item.keyOverride)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 shrink-0 text-sm font-medium text-foreground underline underline-offset-2 hover:text-muted-foreground"
          >
            {t("setlists.editeur.voirPartition")}
          </a>
        }
      />

      <section className="space-y-2.5">
        <h3 className={titreDeSection}>{t("setlists.editeur.tonalite")}</h3>
        <Tonalites song={item.song} keyOverride={item.keyOverride} onChange={(keyOverride) => onPatch({ keyOverride })} />
      </section>

      {scan && (
        <section className="space-y-2.5">
          <h3 className={titreDeSection}>{t("setlists.editeur.jouerSur")}</h3>
          <div role="radiogroup" aria-label={t("setlists.editeur.jouerSur")} className="inline-flex rounded-full bg-secondary p-1">
            {[
              { sur: true, libelle: t("setlists.editeur.partition") },
              { sur: false, libelle: t("setlists.editeur.paroles") },
            ].map(({ sur, libelle }) => {
              const on = !!item.jianpuSheet === sur;
              return (
                <button
                  key={libelle}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onPatch({ jianpuSheet: sur })}
                  className={`h-8 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    on ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {libelle}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {allSections.length > 1 && (
        <>
          <StructurePastilles
            song={item.song}
            sections={sections}
            sectionItems={item.sectionItems}
            onChange={(sectionItems) => onPatch({ sectionItems })}
            choisie={etape}
            onChoisir={setEtape}
            lastPhrase={lastPhrase}
          />
          <ParSection
            sections={sections}
            sectionItems={item.sectionItems}
            onChange={(sectionItems) => onPatch({ sectionItems })}
            choisie={etape}
          />
        </>
      )}

      <section className="space-y-2">
        <label htmlFor={idNote} className={`block ${titreDeSection}`}>{t("setlists.editeur.noteDuChant")}</label>
        <input
          id={idNote}
          type="text"
          value={item.notes}
          onChange={(e) => onPatch({ notes: e.target.value })}
          placeholder={t("setlists.form.songNotePlaceholder")}
          className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </section>

      <div className="flex items-center justify-between gap-3">
        {peutFusionner ? (
          <button type="button" onClick={onFusionner} className={boutonGris}>
            <Link2 className="h-4 w-4" aria-hidden />
            {t("setlists.editeur.fusionner")}
          </button>
        ) : <span />}
        <button type="button" onClick={onRetirer} className={boutonRetirer}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("setlists.editeur.retirer")}
        </button>
      </div>
    </div>
  );
}

/** Un chant dans les réglages d'une fusion : tonalité, structure (Dp compris), par section sans transition. */
function ChantDeFusion({
  item,
  avecStructure,
  onPatch,
}: {
  item: FormItem;
  avecStructure: boolean;
  onPatch: (update: Partial<FormItem>) => void;
}) {
  const [etape, setEtape] = useState<string | null>(null);
  const sections = useMemo(() => itemSections(item.song, item.contentOverride), [item.song, item.contentOverride]);
  return (
    <section data-fusion-song className="space-y-4 rounded-2xl border border-border p-5">
      <div className="flex items-baseline gap-2">
        <h3 className="text-base font-semibold text-foreground">{item.song.title}</h3>
        {item.song.titlePinyin && <span className="text-sm text-muted-foreground">{item.song.titlePinyin}</span>}
      </div>
      <Tonalites song={item.song} keyOverride={item.keyOverride} onChange={(keyOverride) => onPatch({ keyOverride })} />
      {avecStructure && (item.song.sections ?? []).length > 1 && (
        <>
          <StructurePastilles
            song={item.song}
            sections={sections}
            sectionItems={item.sectionItems}
            onChange={(sectionItems) => onPatch({ sectionItems })}
            choisie={etape}
            onChoisir={setEtape}
            lastPhrase={{
              song: item.song,
              contentOverride: item.contentOverride,
              keyOverride: item.keyOverride,
              onAdd: ({ contentOverride, step }) => onPatch({ contentOverride, sectionItems: [...item.sectionItems, step] }),
            }}
          />
          <ParSection
            sections={sections}
            sectionItems={item.sectionItems}
            onChange={(sectionItems) => onPatch({ sectionItems })}
            choisie={etape}
            sansTransition
          />
        </>
      )}
    </section>
  );
}

/** Fusion : par chant, tonalité et structure ; « Mélanger » et le mélange ; « Défusionner », « Retirer ». */
export function VoletFusion({
  numero,
  item,
  onPatchSong,
  onChangeMixed,
  onDefusionner,
  onRetirer,
}: {
  numero: number;
  item: FormFusionItem;
  onPatchSong: (songUid: string, update: Partial<FormItem>) => void;
  onChangeMixed: (mixed: FusionMixedSectionForm[] | null) => void;
  onDefusionner: () => void;
  onRetirer: () => void;
}) {
  const { t } = useTranslation();
  const melange = item.mixedStructure !== null;

  // Comme aujourd'hui (FusionRow) : le mélange part de l'ordre des chants, ou s'arrête.
  function basculerMelange() {
    if (melange) return onChangeMixed(null);
    onChangeMixed(
      item.songs.flatMap((song) =>
        song.sectionItems.map((si) => ({
          uid: nextUid(),
          songSlug: song.song.slug,
          sectionId: si.sectionId,
          sectionName: si.name,
          songTitle: song.song.title,
          note: si.note,
          keyChange: si.keyChange ?? "",
          transition: si.transition ?? "",
          nuanceTags: si.nuanceTags ?? [],
          nuanceNote: si.nuanceNote ?? "",
        })),
      ),
    );
  }

  return (
    <div className="space-y-6">
      <EnTeteVolet
        surtitre={t("setlists.editeur.reglagesFusion")}
        titre={`${numero} · ${item.songs.map((s) => s.song.title).join(" / ")}`}
        sousTitre={t("setlists.editeur.chantsDeLaFusion", { count: item.songs.length })}
      />
      {item.songs.map((song) => (
        <ChantDeFusion key={song.uid} item={song} avecStructure={!melange} onPatch={(update) => onPatchSong(song.uid, update)} />
      ))}
      <section className="space-y-3">
        <button
          type="button"
          onClick={basculerMelange}
          aria-pressed={melange}
          title={t("setlists.form.mixedStructureToggle")}
          className={`${boutonGris} ${melange ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
        >
          <Shuffle className="h-4 w-4" aria-hidden />
          {t("setlists.form.mixedStructureLabel")}
        </button>
        {melange && (
          <div className="rounded-2xl border border-border">
            <MixedStructureEditor fusionItem={item} onChangeMixed={onChangeMixed} onPatchSong={onPatchSong} />
          </div>
        )}
      </section>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onDefusionner} className={boutonGris}>
          <Unlink className="h-4 w-4" aria-hidden />
          {t("setlists.form.unfuseButton")}
        </button>
        <button type="button" onClick={onRetirer} className={boutonRetirer}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("setlists.editeur.retirer")}
        </button>
      </div>
    </div>
  );
}

/** Transition : son texte, « Retirer ». */
export function VoletTransition({
  item,
  onTexte,
  onRetirer,
}: {
  item: FormTransitionItem;
  onTexte: (texte: string) => void;
  onRetirer: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="space-y-6">
      <EnTeteVolet surtitre={t("setlists.editeur.volet")} titre={t("setlists.form.transitionLabel")} />
      <section className="space-y-2">
        <label htmlFor={id} className={`block ${titreDeSection}`}>{t("setlists.editeur.texteTransition")}</label>
        <textarea
          id={id}
          value={item.text}
          onChange={(e) => onTexte(e.target.value)}
          rows={5}
          placeholder={t("setlists.form.transitionPlaceholder")}
          className="w-full resize-none rounded-xl border border-dashed border-amber-300 bg-amber-50/50 px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-amber-700 dark:bg-amber-950/20"
        />
      </section>
      <div className="flex justify-end">
        <button type="button" onClick={onRetirer} className={boutonRetirer}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {t("setlists.editeur.retirer")}
        </button>
      </div>
    </div>
  );
}

/** « Fusionner <titre> avec… » (Q1) : le chant de départ coché en tête, les autres chants
 *  seuls avec une case ; la ligne de la question 7 ; « Annuler », « Fusionner (n) ». */
export function ChoixFusion({
  depart,
  autres,
  numeros,
  onAnnuler,
  onFusionner,
}: {
  depart: FormItem;
  autres: FormItem[];
  numeros: Map<string, number>;
  onAnnuler: () => void;
  onFusionner: (uids: string[]) => void;
}) {
  const { t } = useTranslation();
  const titreId = useId();
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const n = coches.size + 1;
  const ligne = (item: FormItem, coche: boolean, onToggle?: () => void) => (
    <li key={item.uid} className="border-t border-border first:border-t-0">
      <label className={`flex items-center gap-4 py-3 ${onToggle ? "cursor-pointer" : ""}`}>
        <input
          type="checkbox"
          checked={coche}
          // Le chant de départ reste coché : la case ne se décoche pas (sans le gris d'une case inactive).
          aria-disabled={!onToggle || undefined}
          onChange={onToggle ?? (() => {})}
          className="h-5 w-5 shrink-0 rounded accent-foreground"
        />
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
          {numeros.get(item.uid)}
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold text-foreground">{item.song.title}</span>
          {item.song.titlePinyin && <span className="ml-1.5 text-sm text-muted-foreground">{item.song.titlePinyin}</span>}
        </span>
        <KeyPill tonalite={item.keyOverride ?? item.song.originalKey} langue={item.song.language === "zh" ? "zh" : "fr"} />
      </label>
    </li>
  );
  return (
    <div role="group" aria-labelledby={titreId} className="space-y-5">
      <h2 id={titreId} className="text-2xl font-bold leading-tight tracking-tight text-foreground">
        {t("setlists.editeur.fusionnerAvec", { titre: depart.song.title })}
      </h2>
      <ul className="border-y border-border">
        {ligne(depart, true)}
        {autres.map((item) =>
          ligne(item, coches.has(item.uid), () =>
            setCoches((prev) => {
              const next = new Set(prev);
              if (next.has(item.uid)) next.delete(item.uid);
              else next.add(item.uid);
              return next;
            }),
          ),
        )}
      </ul>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{t("setlists.editeur.fusionnerPerte")}</p>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onAnnuler} className={boutonGris}>
          {t("setlists.editeur.annuler")}
        </button>
        <button
          type="button"
          disabled={n < 2}
          onClick={() => onFusionner([depart.uid, ...coches])}
          className="flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {t("setlists.editeur.fusionnerN", { count: n })}
        </button>
      </div>
    </div>
  );
}
