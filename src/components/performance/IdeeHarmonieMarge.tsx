"use client";

// H8-1 : un point dans la marge d'une section qui a une idée d'harmonie ; le toucher ouvre sous le nom une bande
// « 4 5 → 2m7 5 · G A → Em7 A ». Réglage éteint par défaut (`perf-idees-harmonie-<uid>`), donné aux blocs par un contexte
// pour que la mesure de la page et le rendu portent la même hauteur.

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SectionBlock } from "@/lib/performance/blocks";
import type { SongContent } from "@/lib/api/songs";
import type { Idee, Rejet } from "@/lib/firebase/harmonie";
import { suggestionsEcartees } from "@/lib/firebase/harmonie";
import { apercuDuChangement } from "@/lib/harmonie/suggestions";
import { harmonieDuChant } from "@/lib/harmonie/passages";
import { chiffrerEtiquette } from "@/lib/harmonie/degres";
import { useCatalogue } from "@/lib/harmonie/useHarmonie";
import { donneesDuChant, lettres } from "@/components/accords/LigneIci";
import { formatSectionName } from "@/lib/chordpro/parser";
import { compter } from "@/lib/usage";
import { getTransposedKey } from "@/lib/transpose";

export type IdeeMarge = { avantL: string; apresL: string; tonalite: string };

const cle = (uid: string | null) => (uid ? `perf-idees-harmonie-${uid}` : "perf-idees-harmonie");
export const lireReglageIdees = (uid: string | null) => { try { return localStorage.getItem(cle(uid)) === "1"; } catch { return false; } };
export const ecrireReglageIdees = (uid: string | null, v: boolean) => { try { localStorage.setItem(cle(uid), v ? "1" : "0"); } catch { /* stockage refusé : réglage pour la séance seulement */ } };

const Contexte = createContext<{ idees: Map<string, IdeeMarge>; ouvert: string | null; basculer: (uid: string) => void }>({ idees: new Map(), ouvert: null, basculer: () => {} });
export const FournisseurIdees = Contexte.Provider;

/** La première idée de chaque section (calculées d'abord, puis celles de l'équipe), par uid de bloc.
 *  Rien n'est chargé tant que `actif` est faux. */
export function useIdeesHarmonie(blocks: { kind: string }[], contents: Record<string, SongContent>, actif: boolean) {
  const { fiches } = useCatalogue();
  const [donnees, setDonnees] = useState<Record<string, { rejets: Rejet[]; idees: Idee[] }>>({});
  const sections = useMemo(() => (actif ? (blocks as { kind: string }[]).filter((b): b is SectionBlock => b.kind === "section" && !!(b as SectionBlock).songSlug) : []), [actif, blocks]);
  const slugsCles = [...new Set(sections.map((b) => b.songSlug!))].sort().join("|");

  useEffect(() => {
    let vivant = true;
    for (const slug of slugsCles ? slugsCles.split("|") : []) {
      donneesDuChant(slug).then(([rejets, idees]) => vivant && setDonnees((d) => (d[slug] ? d : { ...d, [slug]: { rejets, idees } }))).catch(() => { /* sans réseau : les idées calculées seules */ });
    }
    return () => { vivant = false; };
  }, [slugsCles]);

  return useMemo(() => {
    const sortie = new Map<string, IdeeMarge>();
    // Un chant par tonalité affichée (une section en 升调 a la sienne).
    const groupes = new Map<string, SectionBlock[]>();
    for (const b of sections) {
      const k = `${b.songSlug}|${b.keyChange ?? b.songKey}`;
      groupes.set(k, [...(groupes.get(k) ?? []), b]);
    }
    for (const [k, blocs] of groupes) {
      const slug = blocs[0].songSlug!;
      // Les accords des sections sont transposés de −capo : les formes affichées, pas la tonalité sonore.
      const tonalite = getTransposedKey(blocs[0].keyChange ?? blocs[0].songKey, -(blocs[0].capo ?? 0));
      const origine = contents[slug]?.ast.metadata.key ?? tonalite;
      const d = donnees[slug];
      const uniques = [...new Map(blocs.map((b) => [b.section.uid, b.section])).values()];
      const { passages } = harmonieDuChant(uniques, tonalite, fiches, d ? suggestionsEcartees(d.rejets) : [], d?.idees ?? []);
      const vus = new Set<string>();
      for (const p of passages) {
        let idee: IdeeMarge | null = null;
        for (const s of p.idees) {
          const e = s.endroits.find((x) => x.sectionUid === p.uid);
          const ap = e && apercuDuChangement(s, tonalite, e);
          if (e && ap) { idee = { avantL: lettres(e.accords, tonalite, tonalite), apresL: lettres(ap.apresListe, tonalite, tonalite), tonalite }; break; }
        }
        for (const i of idee ? [] : p.ideesEquipe) {
          if (!i.avant || !i.apres) continue;
          const coupe = (x: string) => x.split(/\s*–\s*|\s+-\s+|\s+/).filter(Boolean);
          idee = { avantL: lettres(coupe(i.avant), origine, tonalite), apresL: lettres(coupe(i.apres), origine, tonalite), tonalite };
          break;
        }
        // Une seule bande par section : le premier bloc qui la porte.
        const bloc = blocs.find((b) => b.section.uid === p.uid && !vus.has(`${k}|${p.uid}`));
        if (idee && idee.avantL && idee.apresL && bloc) { vus.add(`${k}|${p.uid}`); sortie.set(bloc.uid, idee); }
      }
    }
    return sortie;
  }, [sections, donnees, fiches, contents]);
}

/** Pose le point (dans la marge, à la hauteur du nom) et la bande (passée à `children`, qui la rend sous le nom) ;
 *  sans idée, `children` reçoit `null`. */
export function IdeeHarmonieMarge({ block, children }: { block: SectionBlock; children: (bande: ReactNode) => ReactNode }) {
  const { t } = useTranslation();
  const { idees, ouvert, basculer } = useContext(Contexte);
  const idee = idees.get(block.uid);
  const racine = useRef<HTMLDivElement>(null);
  const [haut, setHaut] = useState(0);
  // Le point est hors de la carte : il lit la couleur des accords dans la carte (une disposition les rend neutres).
  const [teinte, setTeinte] = useState("");
  // Le point se centre sur la ligne du nom, quelle que soit la disposition ; le nom ne bouge pas quand la bande s'ouvre.
  useLayoutEffect(() => {
    const nom = racine.current?.querySelector("[data-section-nom],[data-partition-nom],[data-scene-lettre],[data-repere-pastille]");
    const carte = racine.current?.querySelector("[data-section]");
    if (carte) { const v = getComputedStyle(carte); setTeinte(v.getPropertyValue("--accord-fr").trim() || v.getPropertyValue("--chord-color").trim()); }
    if (nom && racine.current) setHaut(nom.getBoundingClientRect().top + nom.getBoundingClientRect().height / 2 - racine.current.getBoundingClientRect().top - 22);
  });
  if (!idee) return <>{children(null)}</>;
  const nom = formatSectionName(block.section, t);
  const estOuvert = ouvert === block.uid;
  // La couleur des accords de ChordLine (choix du compte, sinon --chord-color), en 中文 comme en français.
  const couleur = "var(--accord-fr, var(--chord-color))";
  const enChiffres = (l: string) => l.split(" ").map((a) => chiffrerEtiquette(a, idee.tonalite)).join(" ");
  const arret = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const bande = estOuvert ? (
    <p data-idee-harmonie-bande className="mb-1 truncate font-chord text-sm font-semibold print:hidden" style={{ color: couleur }}>
      {enChiffres(idee.avantL)} → {enChiffres(idee.apresL)} · {idee.avantL} → {idee.apresL}
    </p>
  ) : null;
  return (
    <div ref={racine} className="relative">
      {/* Zone de toucher de 44 px, point de 8 px, dans la marge ; la zone s'arrête avant le texte du nom ; le toucher ne tourne pas la page. */}
      <button
        type="button"
        data-idee-harmonie={block.uid}
        aria-label={t("performance.ideeHarmonieSection", { nom })}
        aria-expanded={estOuvert}
        onPointerDown={arret}
        onPointerUp={arret}
        onPointerCancel={arret}
        onClick={(e) => { e.stopPropagation(); if (!estOuvert) compter("cmd.louange.harmonie"); basculer(block.uid); }}
        style={{ top: haut }}
        className="absolute -left-[34px] z-10 flex h-11 w-11 items-center justify-center print:hidden"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: teinte || couleur }} />
      </button>
      {children(bande)}
    </div>
  );
}

/** L'état « bande ouverte » : une seule à la fois. */
export function useBandeOuverte() {
  const [ouvert, setOuvert] = useState<string | null>(null);
  return [ouvert, (uid: string) => setOuvert((o) => (o === uid ? null : uid))] as const;
}
