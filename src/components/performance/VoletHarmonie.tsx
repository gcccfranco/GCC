"use client";

// JV-5b (docs/spec-jianpu-deux-volets.md, point 2, « Reprise du 13/11 ») : dans le mode louange, le nom d'une section ouvre
// le volet Harmonie du chant (porte 2, `HarmonieDuChant`) au bloc de ce passage, posé par-dessus la page : colonne au bord
// droit dès 1 024 px, feuille à mi-hauteur en dessous. La page n'est ni rétrécie ni recomptée, le toucher ne la tourne pas.
// Réglage « Idées d'harmonie » éteint par défaut (`perf-idees-harmonie-<uid>`) ; il remplace le point et la bande d'H8.

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { ChordProSection } from "@/types/chordPro";
import type { SectionBlock } from "@/lib/performance/blocks";
import type { SongContent } from "@/lib/api/songs";
import { ChantDesAccords, type IciDuChant } from "@/components/accords/AccordsProvider";
import { HarmonieDuChant } from "@/components/harmonie/HarmonieDuChant";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { useGrandEcranHarmonie } from "@/hooks/useColonneHarmonie";
import { getTransposedKey } from "@/lib/transpose";
import { compter } from "@/lib/usage";

const cle = (uid: string | null) => (uid ? `perf-idees-harmonie-${uid}` : "perf-idees-harmonie");
export const lireReglageIdees = (uid: string | null) => { try { return localStorage.getItem(cle(uid)) === "1"; } catch { return false; } };
export const ecrireReglageIdees = (uid: string | null, v: boolean) => { try { localStorage.setItem(cle(uid), v ? "1" : "0"); } catch { /* stockage refusé : réglage pour la séance seulement */ } };

export type VoletOuvert = { slug: string; titre: string; sections: ChordProSection[]; tonalite: string; tonaliteOrigine: string; uid: string; cle: number };

/** Le chant et la tonalité d'un bloc (une section en 升调 a la sienne ; formes affichées, capo déduit). */
const groupe = (b: SectionBlock) => `${b.songSlug}|${getTransposedKey(b.keyChange ?? b.songKey, -(b.capo ?? 0))}`;

/** Un `ici` par chant et par tonalité : ses sections affichées et l'ouverture du volet. Vide tant que `actif` est faux. */
export function useIcisDuLouange(blocks: { kind: string }[], contents: Record<string, SongContent>, actif: boolean, ouvrir: (v: VoletOuvert) => void) {
  return useMemo(() => {
    const m = new Map<string, IciDuChant>();
    if (!actif) return m;
    for (const b of blocks as SectionBlock[]) {
      if (b.kind !== "section" || !b.songSlug) continue;
      const k = groupe(b);
      let ici = m.get(k);
      if (!ici) {
        const slug = b.songSlug;
        const tonalite = getTransposedKey(b.keyChange ?? b.songKey, -(b.capo ?? 0));
        const sections: ChordProSection[] = [];
        const tonaliteOrigine = contents[slug]?.ast.metadata.key ?? tonalite;
        ici = {
          sections,
          tonalite,
          tonaliteOrigine,
          ouvrir: (uid) => { compter("cmd.louange.harmonie"); ouvrir({ slug, titre: b.songTitle, sections, tonalite, tonaliteOrigine, uid, cle: Date.now() }); },
        };
        m.set(k, ici);
      }
      if (!ici.sections.some((s) => s.uid === b.section.uid)) ici.sections.push(b.section);
    }
    return m;
  }, [actif, blocks, contents, ouvrir]);
}

const Icis = createContext<Map<string, IciDuChant>>(new Map());
export const FournisseurIcis = Icis.Provider;

/** Rend le nom de la section touchable (`NomSection`, SongView) ; le toucher ne remonte pas jusqu'à la page qui tourne.
 *  `contents` : aucune boîte ajoutée, la mesure des pages ne change pas. Les accords restent inertes (fournisseur inactif). */
export function NomsTouchables({ block, children }: { block: SectionBlock; children: ReactNode }) {
  const ici = useContext(Icis).get(groupe(block));
  if (!ici || !block.songSlug) return <>{children}</>;
  const arret = (e: { target: EventTarget; stopPropagation: () => void }) => { if ((e.target as HTMLElement).closest?.("[data-section-nom-bouton]")) e.stopPropagation(); };
  return (
    <ChantDesAccords chant={{ slug: block.songSlug, titre: block.songTitle }} ici={ici}>
      <div className="contents" onPointerDown={arret} onPointerUp={arret} onPointerCancel={arret}>{children}</div>
    </ChantDesAccords>
  );
}

/** Le volet, par-dessus la page : colonne au bord droit (≥ 1 024 px) entre les barres (`haut`, `bas`, px : leurs boutons
 *  et la croix du mode louange restent visibles), sinon feuille à mi-hauteur. */
export function VoletHarmonieLouange({ volet, onClose, haut = 0, bas = 0 }: { volet: VoletOuvert | null; onClose: () => void; haut?: number; bas?: number }) {
  const acces = useAccesHarmonie();
  const [instrument] = useInstrument(acces);
  const grand = useGrandEcranHarmonie();
  // Colonne : Échap la ferme, et elle seule (marqué avant l'écouteur de la colonne et celui du mode louange, qui quitterait).
  // La feuille est un dialogue : Radix marque son Échap lui-même.
  const ouvert = !!volet;
  useEffect(() => {
    if (!ouvert || !grand) return;
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); onClose(); } };
    document.addEventListener("keydown", echap, true);
    return () => document.removeEventListener("keydown", echap, true);
  }, [ouvert, grand, onClose]);
  if (!volet) return null;
  // Ni le toucher dans le volet ni celui de sa feuille ne tournent la page (React fait remonter ceux du portail ici) ;
  // le fond de la feuille garde le sien, Radix y lit le toucher extérieur qui la ferme.
  const arret = (e: { target: EventTarget; stopPropagation: () => void }) => { if (!(e.target as HTMLElement).closest?.("[data-vaul-overlay]")) e.stopPropagation(); };
  const volet2 = (
    <HarmonieDuChant
      key={volet.slug + volet.tonalite}
      open
      onClose={onClose}
      slug={volet.slug}
      titre={volet.titre}
      sections={volet.sections}
      tonalite={volet.tonalite}
      tonaliteOrigine={volet.tonaliteOrigine}
      instrument={instrument}
      disposition={grand ? "colonne" : "feuille"}
      styleColonne={{ top: 0, marginTop: 0, height: `calc(100dvh - ${haut + bas}px)` }}
      passage={{ uid: volet.uid, cle: volet.cle, miHauteur: true }}
      louange
    />
  );
  return (
    <div
      data-volet-harmonie-louange
      className={grand ? "absolute right-0 z-[60] flex select-text print:hidden" : "contents"}
      style={grand ? { top: haut, bottom: bas } : undefined}
      onPointerDown={arret}
      onPointerUp={arret}
      onPointerCancel={arret}
    >
      {volet2}
    </div>
  );
}
