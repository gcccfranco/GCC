import { useTranslation } from "react-i18next";
import { HarmonieDuChant } from "@/components/harmonie/HarmonieDuChant";
import { AccordsProvider } from "@/components/accords/AccordsProvider";
import { appliquerDansLaSource } from "@/lib/harmonie/appliquer";
import { semitonesTo } from "@/lib/transpose";
import { itemAst } from "@/lib/chordpro/itemContent";
import { sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference";
import type { JianpuManifest } from "@/lib/jianpu/images";
import type { SongContent } from "@/lib/api/songs";
import type { SongIndexEntry } from "@/types/song";
import type { SetlistItem } from "@/types/setList";
import type { Instrument } from "@/types/harmonie";

/** Idées d'harmonie du chant (lot 9). */
export function IdeesDuChant({
  ideesTarget,
  ideesChant,
  items,
  contents,
  songsMap,
  editMine,
  canEdit,
  instrument,
  jianpuManifest,
  jianpuPref,
  withMine,
  sourceForItem,
  applyNewSource,
  flashFeedback,
  setIdeesTarget,
  setIdeesChant,
}: {
  ideesTarget: number;
  ideesChant: string | null;
  items: SetlistItem[];
  contents: Record<string, SongContent>;
  songsMap: Record<string, SongIndexEntry>;
  editMine: boolean;
  canEdit: boolean;
  instrument: Instrument;
  jianpuManifest: JianpuManifest | undefined;
  jianpuPref: JianpuPref;
  withMine: (item: SetlistItem) => SetlistItem;
  sourceForItem: (item: SetlistItem) => string | null;
  applyNewSource: (itemIndex: number, next: string, extra?: Partial<SetlistItem>) => Promise<void>;
  flashFeedback: (msg: string) => void;
  setIdeesTarget: (index: number | null) => void;
  setIdeesChant: (slug: string | null) => void;
}) {
  const { t } = useTranslation();
  const item = items[ideesTarget];
  if (!item) return null;
  // Fusion : les idées du chant touché, dans sa tonalité et sa version
  // adaptée. Elles se lisent ; rien ne s'applique à la fusion.
  const chantFusion = item.type === "fusion" ? item.fusionSongs?.find((fs) => fs.songSlug === ideesChant) : undefined;
  if (item.type === "fusion" && !chantFusion) return null;
  const slug = chantFusion?.songSlug ?? item.songSlug;
  const ast = chantFusion
    ? itemAst(chantFusion, contents[slug])
    : itemAst(editMine ? withMine(item) : item, contents[item.songSlug]);
  if (!ast) return null;
  const tonalite = (chantFusion ?? item).keyOverride ?? ast.metadata.key;
  // Le chant suivant, pour la transition : les fusions et les items sans
  // chant sont sautés (la spec les exclut).
  const suivantItem = items
    .slice(ideesTarget + 1)
    .find((i) => i.songSlug && i.type !== "fusion");
  const suivantAst = suivantItem ? itemAst(suivantItem, contents[suivantItem.songSlug]) : null;
  const suivant =
    suivantItem && suivantAst
      ? {
          titre: songsMap[suivantItem.songSlug]?.title ?? suivantItem.songSlug,
          tonalite: suivantItem.keyOverride ?? suivantAst.metadata.key,
        }
      : undefined;
  return (
    // Les accords proposés s'ouvrent au toucher, même en « Ma version » (DA-3, Q13).
    <AccordsProvider chant={{ slug, titre: songsMap[slug]?.title ?? slug }}>
    <HarmonieDuChant
      open
      onClose={() => { setIdeesTarget(null); setIdeesChant(null); }}
      slug={slug}
      titre={songsMap[slug]?.title ?? slug}
      sections={ast.sections}
      tonalite={tonalite}
      tonaliteOrigine={ast.metadata.key}
      instrument={instrument}
      // « Montrer » cherche dans ce chant : les identifiants de section
      // se répètent d'un chant à l'autre, et d'un chant à l'autre d'une fusion.
      portee={`[data-outline-item="${item.position}"]${chantFusion ? ` [data-chant-slug="${CSS.escape(slug)}"]` : ""}`}
      suivant={item.type === "fusion" ? undefined : suivant}
      onModuler={
        canEdit && !editMine && item.type !== "fusion"
          ? (_m, prop) => {
              // Le 升调 existant porte la montée ; l'accord d'approche se
              // pose à la fin de la section d'avant, dans le chant adapté.
              const sectionKeys = { ...(item.sectionKeys ?? {}), [prop.sectionUid]: prop.tonaliteCible };
              const source = sourceForItem(item);
              const next =
                source && prop.endroitApproche && prop.approche.length
                  ? appliquerDansLaSource(
                      source,
                      prop.endroitApproche,
                      [...prop.endroitApproche.accords, ...prop.approche],
                      semitonesTo(ast.metadata.key, tonalite),
                      ast.metadata.key,
                    )
                  : source;
              void applyNewSource(ideesTarget, next ?? "", { sectionKeys });
              setIdeesTarget(null);
            }
          : undefined
      }
      onEssayer={
        editMine && !chantFusion
          ? (s, changements, sectionNom) => {
              const source = sourceForItem(item);
              if (!source || !changements.length) return;
              const demiTons = semitonesTo(ast.metadata.key, tonalite);
              // Du dernier au premier : les accords en trop d'un
              // remplacement décalent les index des suivants d'une ligne.
              void applyNewSource(
                ideesTarget,
                changements.slice().reverse().reduce(
                  (src, c) => appliquerDansLaSource(src, c.endroit, c.apres, demiTons, ast.metadata.key),
                  source,
                ),
              );
              // Chant affiché en scan 简谱 : la retouche va bien dans la
              // version texte, mais elle ne se verra pas sur l'image —
              // on le dit, avec le changement à reporter à la main.
              if (jianpuManifest?.[item.songSlug] && sheetEnabled(jianpuPref, item.jianpuSheet)) {
                flashFeedback(
                  t("harmonie.reporterJianpu", {
                    quoi: `${sectionNom} : ${changements[0].endroit.accords.join(" – ")} → ${changements[0].apres.join(" – ")}`,
                  }),
                );
              }
              setIdeesTarget(null);
            }
          : undefined
      }
    />
    </AccordsProvider>
  );
}
