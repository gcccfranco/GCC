"use client";

// JV-5b (docs/spec-jianpu-deux-volets.md, point 2, « Reprise du 13/11 ») : dans le mode louange, le nom d'une section ouvre
// le volet Harmonie du chant (porte 2, `HarmonieDuChant`) au bloc de ce passage, posé par-dessus la page : une fenêtre
// comme le menu Setlist, accrochée au nom touché, dès 768 px (Timothée, 13/11/2026 ; elle remplace la colonne de
// 1 024 px, qui coupait la partition), feuille à mi-hauteur en dessous. La page n'est ni rétrécie ni recomptée, le toucher ne la tourne pas.
// Réglage « Idées d'harmonie » éteint par défaut (`perf-idees-harmonie-<uid>`) ; il remplace le point et la bande d'H8.

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { ChordProSection } from "@/types/chordPro";
import type { JianpuSheetBlock, SectionBlock } from "@/lib/performance/blocks";
import type { SongContent } from "@/lib/api/songs";
import { ChantDesAccords, type IciDuChant } from "@/components/accords/AccordsProvider";
import { HarmonieDuChant } from "@/components/harmonie/HarmonieDuChant";
import { useAccesHarmonie, useInstrument } from "@/lib/harmonie/useHarmonie";
import { getTransposedKey } from "@/lib/transpose";
import { compter } from "@/lib/usage";

const cle = (uid: string | null) => (uid ? `perf-idees-harmonie-${uid}` : "perf-idees-harmonie");
export const lireReglageIdees = (uid: string | null) => { try { return localStorage.getItem(cle(uid)) === "1"; } catch { return false; } };
export const ecrireReglageIdees = (uid: string | null, v: boolean) => { try { localStorage.setItem(cle(uid), v ? "1" : "0"); } catch { /* stockage refusé : réglage pour la séance seulement */ } };

export type VoletOuvert = { slug: string; titre: string; sections: ChordProSection[]; tonalite: string; tonaliteOrigine: string; uid: string; cle: number; ancre: HTMLElement | null };

/** Le nom ou l'étiquette de section touché en dernier (pointerdown) : la fenêtre s'y accroche. Au clavier, le focus. */
const NOMS = "[data-section-nom-bouton], [data-jianpu-etiquette]";
let dernierTouche: HTMLElement | null = null;
const ancreDuToucher = () => {
  const el = (dernierTouche?.isConnected ? dernierTouche : null) ?? (document.activeElement?.closest?.(NOMS) as HTMLElement | null) ?? null;
  dernierTouche = null;
  return el;
};

/** Dès 768 px (md, comme `MenuLouange`) : la fenêtre ; en dessous, la feuille du bas. */
const MD = "(min-width: 768px)";
const suivreMd = (f: () => void) => { const mq = window.matchMedia(MD); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); };
const useAuMoinsMd = () => useSyncExternalStore(suivreMd, () => window.matchMedia(MD).matches, () => true);

/** Le chant et la tonalité d'un bloc (une section en 升调 a la sienne ; formes affichées, capo déduit). */
const groupe = (b: SectionBlock) => `${b.songSlug}|${getTransposedKey(b.keyChange ?? b.songKey, -(b.capo ?? 0))}`;

/** Le groupe d'une page de scan 简谱 (JV-5c) : son chant et la tonalité de ses formes. */
export const groupeScan = (b: JianpuSheetBlock) => `${b.songSlug}|${getTransposedKey(b.songKey, -(b.capo ?? 0))}`;

/** Un `ici` par chant et par tonalité : ses sections affichées et l'ouverture du volet. Vide tant que `actif` est faux.
 *  Un chant lu sur son scan (JV-5c) n'a pas de blocs de section : son `ici` prend les sections du chant. */
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
          ouvrir: (uid) => { compter("cmd.louange.harmonie"); ouvrir({ slug, titre: b.songTitle, sections, tonalite, tonaliteOrigine, uid, cle: Date.now(), ancre: ancreDuToucher() }); },
        };
        m.set(k, ici);
      }
      if (!ici.sections.some((s) => s.uid === b.section.uid)) ici.sections.push(b.section);
    }
    for (const b of blocks as JianpuSheetBlock[]) {
      if (b.kind !== "jianpu-sheet" || !b.songSlug || !contents[b.songSlug]) continue;
      const k = groupeScan(b);
      if (m.has(k)) continue;
      const slug = b.songSlug;
      const tonalite = getTransposedKey(b.songKey, -(b.capo ?? 0));
      const sections = contents[slug].ast.sections;
      const tonaliteOrigine = contents[slug].ast.metadata.key ?? tonalite;
      m.set(k, {
        sections,
        tonalite,
        tonaliteOrigine,
        ouvrir: (uid) => { compter("cmd.louange.harmonie"); ouvrir({ slug, titre: b.songTitle, sections, tonalite, tonaliteOrigine, uid, cle: Date.now(), ancre: ancreDuToucher() }); },
      });
    }
    return m;
  }, [actif, blocks, contents, ouvrir]);
}

const Icis = createContext<Map<string, IciDuChant>>(new Map());
export const FournisseurIcis = Icis.Provider;
// Les accords des paroles sont déjà en positions (capo déduit, comme `groupe`) ; ceux du scan reçoivent le capo de `JianpuSheet`.
/** Réglage « Idées d'harmonie » allumé : seulement alors les noms et étiquettes de section sont touchables (l'`ici` du panneau d'accord, lui, suit l'accès). */
const NomsOn = createContext(false);
export const FournisseurNoms = NomsOn.Provider;

/** AL-2 : l'accord touché est la dernière ancre (la fenêtre s'y accroche) ; son appui n'est pas arrêté (appui long → Crayon). */
const noterAccord = (e: { target: EventTarget }) => {
  const accord = (e.target as HTMLElement).closest?.<HTMLElement>("[data-accord-touchable]");
  if (accord) dernierTouche = accord;
};
/** Rend le nom de la section touchable (`NomSection`, SongView) ; le toucher ne remonte pas jusqu'à la page qui tourne.
 *  `contents` : aucune boîte ajoutée, la mesure des pages ne change pas. Les accords restent inertes (fournisseur inactif). */
export function NomsTouchables({ block, children }: { block: SectionBlock; children: ReactNode }) {
  const ici = useContext(Icis).get(groupe(block));
  const noms = useContext(NomsOn);
  if (!block.songSlug) return <>{children}</>;
  const arret = (e: { target: EventTarget; stopPropagation: () => void }) => {
    const nom = (e.target as HTMLElement).closest?.<HTMLElement>("[data-section-nom-bouton]");
    if (nom) { dernierTouche = nom; e.stopPropagation(); }
  };
  return (
    <ChantDesAccords chant={{ slug: block.songSlug, titre: block.songTitle }} tonalite={getTransposedKey(block.keyChange ?? block.songKey, -(block.capo ?? 0))} ici={ici} sansNoms={!noms}>
      <div className="contents" onPointerDown={(e) => { noterAccord(e); arret(e); }} onPointerUp={arret} onPointerCancel={arret}>{children}</div>
    </ChantDesAccords>
  );
}

/** Rend les étiquettes de section d'un scan touchables (JV-5c, `JianpuSheet`) ; le toucher ne tourne pas la page. */
export function ScanTouchable({ block, children }: { block: JianpuSheetBlock; children: ReactNode }) {
  const ici = useContext(Icis).get(groupeScan(block));
  const noms = useContext(NomsOn);
  if (!block.songSlug) return <>{children}</>;
  const arret = (e: { target: EventTarget; stopPropagation: () => void }) => {
    const etiquette = (e.target as HTMLElement).closest?.<HTMLElement>("[data-jianpu-etiquette]");
    if (etiquette) { dernierTouche = etiquette; e.stopPropagation(); }
  };
  return (
    <ChantDesAccords chant={{ slug: block.songSlug, titre: block.songTitle }} tonalite={block.songKey} ici={ici} sansNoms={!noms}>
      <div className="contents" onPointerDown={(e) => { noterAccord(e); arret(e); }} onPointerUp={arret} onPointerCancel={arret}>{children}</div>
    </ChantDesAccords>
  );
}

/** Le volet, par-dessus la page : fenêtre accrochée au nom touché (≥ 768 px), sinon feuille à mi-hauteur. */
export function VoletHarmonieLouange({ volet, onClose }: { volet: VoletOuvert | null; onClose: () => void }) {
  const acces = useAccesHarmonie();
  const [instrument] = useInstrument(acces);
  const grand = useAuMoinsMd();
  // Cinq corrections, point 3 : au téléphone, la feuille à mi-hauteur couvrait une pastille (ou un nom) touchée dans la
  // moitié basse de l'écran ; là, la fenêtre accrochée la remplace et se pose au-dessus. Moitié haute : la feuille, dessous.
  // Lu une fois par ouverture (`cle`) : un rendu de la page, volet ouvert, ne fait pas basculer feuille et fenêtre.
  const ancre = volet?.ancre;
  const cleVolet = volet?.cle;
  const basse = useMemo(() => {
    if (!ancre?.isConnected || cleVolet === undefined) return false;
    return ancre.getBoundingClientRect().bottom + 8 > window.innerHeight / 2;
  }, [ancre, cleVolet]);
  const fenetre = grand || basse;
  // Fenêtre : Échap la ferme, et elle seule (marqué avant l'écouteur du mode louange, qui quitterait).
  // La feuille est un dialogue : Radix marque son Échap lui-même.
  const ouvert = !!volet;
  useEffect(() => {
    if (!ouvert || !fenetre) return;
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); onClose(); } };
    document.addEventListener("keydown", echap, true);
    return () => document.removeEventListener("keydown", echap, true);
  }, [ouvert, fenetre, onClose]);
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
      disposition={fenetre ? "fenetre" : "feuille"}
      ancre={volet.ancre}
      passage={{ uid: volet.uid, cle: volet.cle, miHauteur: !fenetre }}
      louange
    />
  );
  return (
    <div
      data-volet-harmonie-louange
      className="contents"
      onPointerDown={arret}
      onPointerUp={arret}
      onPointerCancel={arret}
    >
      {volet2}
    </div>
  );
}
