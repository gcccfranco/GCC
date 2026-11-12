"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { bordsLibres, bordsParmi, bornerPart, choisirCoupe, type BordsDemi, type GroupeDemi, type SectionDemi, type ZoneDemi } from "@/lib/performance/demiPage";

/** Place (px écran) du rappel du nom de section entre le filet et la reprise de la moitié basse. */
const RESERVE_RAPPEL = 14;

/** Lot FS-E : affichage de la demi-page. Deux calques de la même zone de lecture, rendus par la même page de texte :
 *  la page suivante en haut (rognée au bord bas d'un bloc), la fin de la page en cours dessous (rognée à un bord haut de
 *  bloc ≥ la coupe) ; un filet de 1,5 px, couleur des icônes, et sa poignée (contour, trois traits) à droite, entre les
 *  deux. La coupe tombe toujours entre deux blocs, mesurée à l'écran sur les rendus eux-mêmes, avec 12 px de blanc de part
 *  et d'autre du filet ; un cadre de section rogné est prolongé jusqu'au filet. Sur une page en deux colonnes (de part et
 *  d'autre, sans en-tête pleine largeur), la coupe est verticale : la première colonne de la page suivante à gauche, la
 *  dernière de la page en cours à droite, un filet dans la gouttière et pas de poignée. Les traits d'annotation s'y montrent en
 *  lecture seule : `onZones` rend au parent les zones visibles (px écran) et le décalage de la moitié basse, pour qu'il
 *  rogne et décale deux calques de traits (page suivante en haut, page en cours en bas) comme ceux du texte. */
export function DemiPage({
  clePage, rendreHaut, rendreBas, part, onPart, onPartFin, fontScale, contentPadding, nom, onEchec, onZones,
}: {
  /** Change quand la page, sa mise en page ou la taille du texte changent : remesure. */
  clePage: string;
  rendreHaut: () => ReactNode;
  rendreBas: () => ReactNode;
  part: number;
  onPart: (v: number) => void;
  onPartFin: (v: number) => void;
  fontScale: number;
  contentPadding: CSSProperties;
  nom: string;
  /** Aucune coupe ne convient : le parent passe en tour normal. */
  onEchec: () => void;
  /** Zones visibles de chaque calque (px écran, [x0, y0, x1, y1]) et décalage de la moitié basse ; null quand la demi-page s'éteint. */
  onZones: (z: { haut: Array<[number, number, number, number]>; bas: Array<[number, number, number, number]>; decalage: number } | null) => void;
}) {
  const [glisse, setGlisse] = useState(false);
  const hautRef = useRef<HTMLDivElement>(null);
  const basRef = useRef<HTMLDivElement>(null);
  const basInterieurRef = useRef<HTMLDivElement>(null);
  const [mesure, setMesure] = useState<{ bords: BordsDemi; top: number; left: number; largeur: number; colonnes: { mid: number; ligne: number } | null } | null>(null);
  const partRef = useRef(part);
  partRef.current = part;
  const echecRef = useRef(onEchec);
  echecRef.current = onEchec;
  const vuePourCle = useRef<string | null>(null);
  const fontsPretes = useRef(false);

  const mesurer = useCallback(() => {
    const h = hautRef.current;
    const b = basRef.current;
    if (!h || !b) return;
    // Un groupe = l'en-tête du chant (pleine largeur) ou une colonne de la page : chacun se coupe à ses propres bords de bloc.
    const lire = (couche: HTMLElement, cote: "haut" | "bas"): GroupeDemi[] => {
      const rects = (els: Iterable<Element>) => Array.from(els, (el): [number, number] => {
        const q = el.getBoundingClientRect();
        return [q.top, q.bottom];
      });
      const cadre = couche.getBoundingClientRect();
      const groupes: GroupeDemi[] = [];
      for (const e of couche.querySelectorAll("[data-entete-chant]")) {
        const q = e.getBoundingClientRect();
        groupes.push({ x0: cadre.left, x1: cadre.right, top: q.top, blocs: bordsLibres(rects([e]), cote), lignes: [], sections: [] });
      }
      // Écran d'un scan 简谱 certifié (lot JP-B) : un groupe par fenêtre de scan, ses lignes mesurées d'après leurs bornes
      // en pixels image (`data-jianpu-lignes`) et l'échelle de la fenêtre ; on ne coupe qu'entre deux lignes, jamais dans une.
      for (const f of couche.querySelectorAll("[data-jianpu-tranche]")) {
        const q = f.getBoundingClientRect();
        const [t0, t1] = (f.getAttribute("data-jianpu-tranche") ?? "").split("-").map(Number);
        const echelle = q.height / Math.max(1, t1 - t0);
        const rects = (f.getAttribute("data-jianpu-lignes") ?? "").split(",").filter(Boolean).map((l): [number, number] => {
          const [a, b] = l.split("-").map(Number);
          return [q.top + (a - t0) * echelle, q.top + (b - t0) * echelle];
        });
        groupes.push({ x0: q.left, x1: q.right, top: q.top, blocs: bordsLibres(rects, cote), lignes: [], sections: [], plages: cote === "haut" ? rects : undefined });
      }
      for (const col of couche.querySelectorAll("[data-col-page]")) {
        const q = col.getBoundingClientRect();
        // Bords de ligne : les rangées de vers (les enfants `[data-rangee]` d'une ligne, ou la ligne elle-même) et, pour la
        // reprise en bas, le libellé de chaque section. Les libellés ne servent pas de bord bas : on ne coupe pas sous un titre.
        const rangees: Element[] = [];
        for (const l of col.querySelectorAll("[data-copy-line]")) {
          const r = l.querySelectorAll("[data-rangee]");
          if (r.length > 0) rangees.push(...r); else rangees.push(l);
        }
        const libelles = Array.from(col.querySelectorAll("[data-section] > [data-copy-ignore]:first-child:not([data-repere-gouttiere])"));
        const obstacles = rects([...rangees, ...libelles]);
        const sections: SectionDemi[] = Array.from(col.querySelectorAll("[data-section]"), (sec) => {
          const r = sec.getBoundingClientRect();
          const pastille = sec.querySelector<HTMLElement>("[data-repere-pastille]");
          const libelle = sec.querySelector(":scope > [data-copy-ignore]:first-child:not([data-repere-gouttiere]) > span:last-child");
          const nom = (pastille?.title ?? libelle?.firstChild?.textContent ?? "").trim();
          const cs = getComputedStyle(sec);
          const etiquette = sec.querySelector(":scope > [data-copy-ignore]:first-child:not([data-repere-gouttiere])");
          const retrait = etiquette ? etiquette.getBoundingClientRect().left : r.left + parseFloat(cs.borderLeftWidth || "0") + parseFloat(cs.paddingLeft || "0");
          const bords: Array<{ x: number; w: number; c: string }> = [];
          const gauche = parseFloat(cs.borderLeftWidth || "0");
          const droite = parseFloat(cs.borderRightWidth || "0");
          if (gauche > 0 && cs.borderLeftStyle !== "none") bords.push({ x: r.left, w: gauche, c: cs.borderLeftColor });
          if (droite > 0 && cs.borderRightStyle !== "none") bords.push({ x: r.right - droite, w: droite, c: cs.borderRightColor });
          return { top: r.top, bottom: r.bottom, libelleTop: etiquette?.getBoundingClientRect().top, nom, couleur: cs.getPropertyValue("--sec-c").trim() || cs.color, retrait, bords };
        });
        groupes.push({
          x0: q.left, x1: q.right, top: q.top,
          blocs: bordsLibres(rects(Array.from(col.children)), cote),
          lignes: bordsParmi(rects(cote === "bas" ? rangees : [...rangees, ...libelles]), obstacles, cote),
          sections,
          plages: cote === "haut" ? rects([...rangees, ...libelles]) : undefined,
        });
      }
      return groupes;
    };
    // La moitié basse peut être décalée vers le bas (marges du filet) : on la mesure à sa place d'origine.
    const interieur = basInterieurRef.current;
    const transformee = interieur?.style.transform ?? "";
    if (interieur) interieur.style.transform = "none";
    const bords: BordsDemi = { haut: lire(h, "bas"), bas: lire(b, "haut") };
    if (interieur) interieur.style.transform = transformee;
    const cadre = h.getBoundingClientRect();
    // Deux colonnes : coupe verticale dans la gouttière, sur toute la hauteur (à gauche la page suivante, à droite la page en
    // cours). Seul un en-tête de chant pleine largeur sur la page suivante (un nouveau chant) garde la coupe horizontale : la
    // gouttière le trancherait ; celui de la page en cours est en haut, déjà lu, et sa moitié droite reste en place.
    const colsH = h.querySelectorAll("[data-col-page]");
    const colsB = b.querySelectorAll("[data-col-page]");
    const pleineLargeur = (couche: HTMLElement) => Array.from(couche.querySelectorAll("[data-entete-chant]")).some((e) => !e.closest("[data-col-page]"));
    const hautDesColonnes = (cols: NodeListOf<Element>) => Math.min(...Array.from(cols, (c) => c.getBoundingClientRect().top));
    // La page suivante peut n'avoir qu'une colonne de contenu (page courte en deux colonnes) : elle compte si cette colonne
    // est bien une demi-largeur ; une page suivante en une seule colonne pleine largeur garde la coupe horizontale.
    const demiLargeur = (c: Element) => c.getBoundingClientRect().width < h.getBoundingClientRect().width * 0.6;
    const colonnes = colsH.length >= 1 && colsH.length <= 2 && demiLargeur(colsH[0]) && colsB.length === 2 && !pleineLargeur(h)
      ? {
          mid: (colsH[0].getBoundingClientRect().right + colsB[1].getBoundingClientRect().left) / 2,
          ligne: Math.min(hautDesColonnes(colsH), hautDesColonnes(colsB)),
        }
      : null;
    setMesure({ bords, top: cadre.top, left: cadre.left, largeur: cadre.width, colonnes });
    // L'échec ne se juge qu'à l'arrivée sur la page (avec la part retenue), pas pendant un réglage au doigt.
    // Pas de verdict tant que les polices ne sont pas prêtes : des rangées mesurées avant leur chargement ne valent rien.
    if (!colonnes && fontsPretes.current && vuePourCle.current !== clePageRef.current) {
      vuePourCle.current = clePageRef.current;
      const c = choisirCoupe(bords, partRef.current * window.innerHeight, window.innerHeight, RESERVE_RAPPEL);
      if (!c) echecRef.current();
    }
  }, []);
  const clePageRef = useRef(clePage);
  clePageRef.current = clePage;

  useLayoutEffect(() => {
    fontsPretes.current = false;
    mesurer();
    let raf = 0;
    let annule = false;
    void document.fonts.ready.then(() => { if (!annule) { fontsPretes.current = true; mesurer(); } });
    raf = requestAnimationFrame(() => requestAnimationFrame(mesurer));
    window.addEventListener("resize", mesurer);
    return () => {
      annule = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", mesurer);
    };
  }, [clePage, mesurer]);

  const hauteurFenetre = typeof window === "undefined" ? 0 : window.innerHeight;
  const coupeCalculee = useMemo(() => (mesure && !mesure.colonnes ? choisirCoupe(mesure.bords, part * hauteurFenetre, hauteurFenetre, RESERVE_RAPPEL) : null), [mesure, part, hauteurFenetre]);
  // Dernière coupe valide : pendant un geste, les calques ne se masquent jamais (la poignée resterait démontée, sans pointerup).
  const derniereCoupe = useRef<typeof coupeCalculee>(null);
  if (coupeCalculee) derniereCoupe.current = coupeCalculee;
  const coupe = coupeCalculee ?? (glisse && mesure && !mesure.colonnes ? derniereCoupe.current : null);
  const aLocal = (y: number) => (y - (mesure?.top ?? 0)) / fontScale;
  const yFiletLocal = coupe && mesure ? aLocal(coupe.yCoupe) : 0;
  const pret = !!mesure && (!!mesure.colonnes || !!coupe);
  // Rectangles visibles de chaque calque (px écran) : les colonnes s'étendent jusqu'au milieu de la gouttière, les bords
  // extérieurs jusqu'à ceux du calque ; l'en-tête garde la pleine largeur.
  const zones = useMemo(() => {
    if (!mesure) return null;
    const { left, largeur, top } = mesure;
    const bottom = top + 1e5;
    if (mesure.colonnes) {
      const { mid } = mesure.colonnes;
      // À gauche, toute la hauteur de la page suivante (sa rangée de rappel comprise) ; à droite, toute celle de la page en
      // cours. Deux zones disjointes : rien ne se superpose, rien n'est caché de la colonne qu'on va lire.
      return { haut: [[left, top, mid, bottom]] as Array<[number, number, number, number]>, bas: [[mid, top, left + largeur, bottom]] as Array<[number, number, number, number]> };
    }
    if (!coupe) return null;
    const etendre = (liste: ZoneDemi[]) => {
      const colonnes = liste.filter((z) => z.x1 - z.x0 < largeur * 0.95).sort((p, q) => p.x0 - q.x0);
      colonnes.forEach((z, i) => {
        z.x0 = i === 0 ? left : (colonnes[i - 1].x1 + z.x0) / 2;
        z.x1 = i === colonnes.length - 1 ? left + largeur : (z.x1 + colonnes[i + 1].x0) / 2;
      });
      return liste;
    };
    const copie = (liste: ZoneDemi[]) => etendre(liste.map((z) => ({ ...z })));
    const haut = copie(coupe.haut).filter((z) => z.y > top).map((z): [number, number, number, number] => [z.x0, top, z.x1, z.y]);
    const bas = copie(coupe.bas).filter((z) => Number.isFinite(z.y)).map((z): [number, number, number, number] => [z.x0, z.y, z.x1, bottom]);
    return { haut, bas };
  }, [coupe, mesure]);
  const decalage = coupe?.decalage ?? 0;
  const onZonesRef = useRef(onZones);
  onZonesRef.current = onZones;
  useEffect(() => {
    onZonesRef.current(zones && pret ? { ...zones, decalage } : null);
    return () => onZonesRef.current(null);
  }, [zones, pret, decalage]);
  // Cadre de section rogné par la coupe : ses bords latéraux se prolongent jusqu'au filet (jamais des crochets ouverts).
  const prolongements = useMemo(() => {
    if (!coupe || !mesure) return [];
    const liste: Array<{ x: number; w: number; y0: number; y1: number; c: string }> = [];
    mesure.bords.haut.forEach((g, i) => {
      const y = coupe.haut[i]?.y;
      if (y === undefined) return;
      for (const s of g.sections) if (s.top < y - 0.5 && s.bottom > y + 0.5) for (const b of s.bords ?? []) liste.push({ ...b, y0: y, y1: coupe.yCoupe });
    });
    mesure.bords.bas.forEach((g, i) => {
      const y = coupe.bas[i]?.y;
      if (y === undefined || !Number.isFinite(y)) return;
      const brut = y - coupe.decalage;
      for (const s of g.sections) if (s.top < brut - 0.5 && s.bottom > brut + 0.5) for (const b of s.bords ?? []) liste.push({ ...b, y0: coupe.yCoupe, y1: y });
    });
    return liste.filter((l) => l.y1 > l.y0 + 0.5);
  }, [coupe, mesure]);
  const chemin = (rects: Array<[number, number, number, number]>) => {
    if (!mesure || rects.length === 0) return "inset(100% 0 0 0)";
    const lx = (x: number) => ((x - mesure.left) / fontScale).toFixed(2);
    const ly = (y: number) => aLocal(y).toFixed(2);
    return `path("${rects.map(([x0, y0, x1, y1]) => `M${lx(x0)} ${ly(y0)}H${lx(x1)}V${ly(y1)}H${lx(x0)}Z`).join("")}")`;
  };

  const partDe = (e: React.PointerEvent) => bornerPart(e.clientY / window.innerHeight);
  const derniere = useRef(part);
  // Une part qui ne laisse aucune coupe possible (page suivante à en-tête haut, par exemple) est refusée : on garde l'ancienne.
  const partUtilisable = (v: number) => !mesure || !!mesure.colonnes || !!choisirCoupe(mesure.bords, v * hauteurFenetre, hauteurFenetre, RESERVE_RAPPEL);
  // Valeur du curseur : la part de la moitié basse (la page en cours), de 25 à 75. ↑ monte le filet, donc la valeur augmente.
  const valeur = Math.round((1 - part) * 100);

  return (
    <div data-demi-page-calques data-demi-colonnes={mesure?.colonnes ? "" : undefined} className="relative h-full">
      <div
        ref={hautRef}
        data-demi-haut
        className="absolute inset-0"
        data-demi-zones={zones ? JSON.stringify(zones.haut) : undefined}
        style={{ visibility: pret ? undefined : "hidden", clipPath: zones ? chemin(zones.haut) : undefined }}
      >
        {rendreHaut()}
      </div>
      <div
        ref={basRef}
        data-demi-bas
        className="absolute inset-0"
        data-demi-zones={zones ? JSON.stringify(zones.bas) : undefined}
        style={{ visibility: pret ? undefined : "hidden", clipPath: zones ? chemin(zones.bas) : undefined }}
      >
        <div ref={basInterieurRef} className="h-full" style={{ transform: coupe && coupe.decalage > 0 ? `translateY(${coupe.decalage / fontScale}px)` : undefined }}>
          {rendreBas()}
        </div>
      </div>
      {pret && mesure.colonnes && (
        <div
          data-demi-filet
          data-demi-filet-vertical
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: (mesure.colonnes.mid - mesure.left) / fontScale,
            top: (mesure.colonnes.ligne - mesure.top) / fontScale,
            bottom: 0,
            width: 1.5 / fontScale,
            transform: "translateX(-50%)",
            background: "var(--couleur-icones)",
          }}
        />
      )}
      {pret && coupe && mesure && !mesure.colonnes && (
        <>
          {prolongements.map((l, i) => (
            <div
              key={i}
              data-demi-prolongement
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{ left: (l.x - mesure.left) / fontScale, width: l.w / fontScale, top: aLocal(l.y0), height: (l.y1 - l.y0) / fontScale, background: l.c }}
            />
          ))}
          <div
            data-demi-filet
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `calc(-1 * ${contentPadding.paddingLeft})`,
              right: `calc(-1 * ${contentPadding.paddingRight})`,
              top: yFiletLocal,
              height: 1.5 / fontScale,
              transform: "translateY(-50%)",
              background: "var(--couleur-icones)",
            }}
          />
          {coupe.bas.map((z, i) =>
            z.rappel && Number.isFinite(z.y) ? (
              <div
                key={i}
                data-demi-rappel
                aria-hidden="true"
                className="pointer-events-none absolute flex items-center overflow-hidden"
                style={{
                  left: ((z.rappelX ?? z.x0) - mesure.left) / fontScale,
                  width: (z.x1 - (z.rappelX ?? z.x0)) / fontScale,
                  top: aLocal(z.y) - RESERVE_RAPPEL / fontScale,
                  height: RESERVE_RAPPEL / fontScale,
                  gap: 6 / fontScale,
                  color: z.rappelCouleur || undefined,
                }}
              >
                <span aria-hidden="true" className="shrink-0" style={{ width: 10 / fontScale, height: 2 / fontScale, borderRadius: 2, background: "currentColor" }} />
                <span className="truncate font-bold uppercase tracking-[0.1em]" style={{ fontSize: 11 / fontScale, lineHeight: 1.2 }}>{z.rappel}</span>
              </div>
            ) : null,
          )}
          <div
            role="slider"
            tabIndex={0}
            aria-label={nom}
            aria-orientation="vertical"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={valeur}
            aria-valuetext={`${valeur} %`}
            data-demi-poignee
            data-glisse={glisse ? "" : undefined}
            className="absolute flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--couleur-icones)]"
            style={{
              // À 48 px du bord de la zone de lecture, la pastille hors de la colonne de texte autant que possible ; sa cible
              // de 44 px déborde de 3 px. Elle arrête ses évènements : ni toucher ni balayage ne tournent la page ici.
              right: `calc(-1 * ${contentPadding.paddingRight} + ${45 / fontScale}px)`,
              top: yFiletLocal,
              width: 44 / fontScale,
              height: 44 / fontScale,
              transform: "translateY(-50%)",
              touchAction: "none",
              cursor: "ns-resize",
              zIndex: 2,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setGlisse(true);
              derniere.current = partRef.current;
            }}
            onPointerMove={(e) => {
              if (!glisse) return;
              const v = partDe(e);
              if (!partUtilisable(v)) return;
              derniere.current = v;
              onPart(v);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (!glisse) return;
              setGlisse(false);
              onPartFin(derniere.current);
            }}
            onPointerCancel={() => {
              setGlisse(false);
              onPartFin(derniere.current);
            }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
              e.preventDefault();
              e.stopPropagation();
              // ↑ monte le filet : la part du haut diminue, celle du bas (la valeur) augmente.
              const v = bornerPart(Math.round((partRef.current + (e.key === "ArrowUp" ? -0.05 : 0.05)) * 100) / 100);
              if (!partUtilisable(v)) return;
              onPart(v);
              onPartFin(v);
            }}
          >
            <span
              aria-hidden="true"
              className="flex flex-col items-center justify-center rounded-full bg-background"
              style={{
                width: 38 / fontScale,
                height: 18 / fontScale,
                gap: 2.5 / fontScale,
                border: `${1.5 / fontScale}px solid var(--couleur-icones)`,
              }}
            >
              {[0, 1, 2].map((k) => (
                <span key={k} className="block" style={{ width: 16 / fontScale, height: 1.5 / fontScale, borderRadius: 1, background: "var(--couleur-icones)" }} />
              ))}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
