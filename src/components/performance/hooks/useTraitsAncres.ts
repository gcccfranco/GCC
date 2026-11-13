import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ancrer, ancrerSigne, decouper, estSigne, estTrait, projeter, projeterSigne, type Rect, type Repere } from "@/lib/annotations/ancres";
import type { AnnotationData, Stroke } from "@/lib/annotations/strokes";
import type { ElementTrait, Signe, Trait } from "@/types/partition";

// Traits accrochés au texte (docs/spec-ma-partition.md, § Traits) : mesure du DOM. Le calcul pur est dans
// `src/lib/annotations/ancres.ts`. Repères posés par `SectionView` (`data-trait-slug|section|ligne` sur chaque ligne)
// et par `JianpuSheet` (`data-trait-scan` = rang de l'image, + `data-trait-slug`).

export type TraitsParChant = Record<string, { miens: ElementTrait[]; autres: ElementTrait[] }>;
export type Origine = { slug: string; trait: Trait | Signe; mien: boolean };
export type Projection = { strokes: Stroke[]; origines: Map<Stroke, Origine> };
/** Loupe d'AO : le contenu est translaté puis agrandi ; les mesures sont ramenées à l'espace sans loupe. */
export type Loupe = { zoom: number; pan: { x: number; y: number } };

const VIDE: Projection = { strokes: [], origines: new Map() };
const PAROLES = "[data-paroles], [data-car]";

type Mesure = (r: DOMRect) => Rect;
const mesureDe = ({ zoom, pan }: Loupe): Mesure => (r) => ({
  left: (r.left - pan.x) / zoom, right: (r.right - pan.x) / zoom, top: (r.top - pan.y) / zoom, bottom: (r.bottom - pan.y) / zoom,
});

/** Les nœuds texte des paroles de la ligne (ni accords ni pinyin : ils ne portent ni `data-paroles` ni `data-car`). */
function noeudsParoles(ligne: HTMLElement): Text[] {
  const out: Text[] = [];
  for (const el of ligne.querySelectorAll(PAROLES)) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    // Hors `data-copy-ignore` : ChordLine y met une espace sous un accord sans paroles, présente seulement accords affichés.
    for (let n = w.nextNode(); n; n = w.nextNode()) if ((n as Text).length && !(n as Text).parentElement?.closest("[data-copy-ignore]")) out.push(n as Text);
  }
  return out;
}

function rectCar(noeud: Text, i: number): DOMRect | null {
  const r = document.createRange();
  r.setStart(noeud, i);
  r.setEnd(noeud, i + 1);
  const b = r.getBoundingClientRect();
  return b.width || b.height ? b : null;
}

/** Coin haut-gauche du caractère `car` (le dernier si la ligne est plus courte) et em de la ligne ; sans paroles : la ligne. */
function repereTexte(ligne: HTMLElement, car: number, mesure: Mesure, zoom: number): Repere {
  const boite = ligne.getBoundingClientRect();
  const echelle = (boite.width / (ligne.offsetWidth || 1) || 1) / zoom;
  const noeuds = noeudsParoles(ligne);
  let reste = car;
  for (let k = 0; k < noeuds.length; k++) {
    if (reste >= noeuds[k].length && k < noeuds.length - 1) { reste -= noeuds[k].length; continue; }
    const i = Math.min(reste, noeuds[k].length - 1);
    const r = rectCar(noeuds[k], i);
    if (r) {
      const m = mesure(r);
      return { x: m.left, y: m.top, unite: parseFloat(getComputedStyle(noeuds[k].parentElement!).fontSize) * echelle };
    }
    break;
  }
  const m = mesure(boite);
  return { x: m.left, y: m.top, unite: parseFloat(getComputedStyle(ligne).fontSize) * echelle };
}

/** Rang du caractère des paroles le plus proche du point (`x`, `y`) ; 0 sans paroles. */
function caracterePlusProche(ligne: HTMLElement, x: number, y: number, mesure: Mesure): number {
  let rang = 0;
  let meilleur = 0;
  let dMin = Infinity;
  for (const n of noeudsParoles(ligne)) {
    for (let i = 0; i < n.length; i++, rang++) {
      const r = n.data[i].trim() ? rectCar(n, i) : null;
      if (!r) continue;
      const m = mesure(r);
      const d = Math.hypot(Math.max(m.left - x, 0, x - m.right), Math.max(m.top - y, 0, y - m.bottom));
      if (d < dMin) { dMin = d; meilleur = rang; }
    }
  }
  return meilleur;
}

const horsApercu = (el: Element) => !el.closest("[data-apercu-suivant]");

/** Anciens → nouveau : un tracé écran (espace sans loupe) devient un ou plusieurs traits ancrés, un par ligne touchée.
 *  Un tracé qui commence sur l'image d'un scan s'ancre au scan ; sans ligne ni scan sous la page : rien (rendu vide). */
export function ancrerTrace(s: Stroke, racine: HTMLElement, loupe: Loupe): { slug: string; trait: Trait | Signe }[] {
  const signe = s.tool === "text" || s.tool === "stamp";
  const mesure = mesureDe(loupe);
  const [x0, y0] = s.points[0];
  const dedans = (r: Rect) => x0 >= r.left && x0 <= r.right && y0 >= r.top && y0 <= r.bottom;
  const scans = Array.from(racine.querySelectorAll<HTMLElement>("[data-trait-scan]")).filter(horsApercu).map((el) => ({ el, r: mesure(el.getBoundingClientRect()) }));
  const lignes = Array.from(racine.querySelectorAll<HTMLElement>("[data-trait-section]")).filter(horsApercu).map((el) => ({ el, r: mesure(el.getBoundingClientRect()) }));
  const surScan = scans.find((c) => dedans(c.r)) ?? (lignes.length ? undefined : scans[0]);
  if (surScan) {
    const { el, r } = surScan;
    const [ancre, repere] = [{ scan: true as const, image: Number(el.dataset.traitScan) }, { x: r.left, y: r.top, unite: r.right - r.left }];
    return [{ slug: el.dataset.traitSlug ?? "", trait: signe ? ancrerSigne(s, ancre, repere) : ancrer(s as Parameters<typeof ancrer>[0], ancre, repere) }];
  }
  const out: { slug: string; trait: Trait | Signe }[] = [];
  for (const { ligne, points } of decouper(s.points, lignes.map((l) => l.r))) {
    const { el, r } = lignes[ligne];
    const car = caracterePlusProche(el, points[0][0], points[0][1], mesure);
    const repere = repereTexte(el, car, mesure, loupe.zoom);
    // shortcut: un morceau à plus de 2 em de sa ligne (en-tête, marge, page vide) n'est ancré nulle part et se perd, à reprendre si on veut des traits libres sur la page.
    const loin = Math.min(...points.map(([, y]) => (y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0)));
    // Un texte ou un tampon s'accroche à la ligne la plus proche, sans cette limite (AN-5).
    if (!signe && loin > 2 * repere.unite) continue;
    const ancre = { section: el.dataset.traitSection ?? "", ligne: Number(el.dataset.traitLigne), car };
    out.push({ slug: el.dataset.traitSlug ?? "", trait: signe ? ancrerSigne({ ...s, points }, ancre, repere) : ancrer({ ...s, points } as Parameters<typeof ancrer>[0], ancre, repere) });
  }
  return out;
}

/** Reprise des anciennes annotations (MP-6) : chaque tracé de `data` (px du viewport d'origine) va au chant dont le bloc à
 *  l'écran contient son point de départ (à défaut, le premier chant de la page) et s'ancre à la première ligne de texte de
 *  ce chant sur la page, ou à son scan 简谱 sans ligne, de sorte qu'il reste là où il est à l'écran. */
export function ancrerSurPremiereLigne(data: AnnotationData, racine: HTMLElement, loupe: Loupe): { slug: string; trait: Trait | Signe }[] {
  const mesure = mesureDe(loupe);
  const lignes = Array.from(racine.querySelectorAll<HTMLElement>("[data-trait-section]")).filter(horsApercu);
  const scans = Array.from(racine.querySelectorAll<HTMLElement>("[data-trait-scan]")).filter(horsApercu);
  // Par chant, dans l'ordre de la page : sa première cible (ligne, sinon scan) et la boîte de tous ses éléments.
  const chants = new Map<string, { cible: HTMLElement; scan: boolean; boite: Rect }>();
  for (const [el, scan] of [...lignes.map((l) => [l, false] as const), ...scans.map((l) => [l, true] as const)]) {
    const slug = el.dataset.traitSlug ?? "";
    if (!slug) continue;
    const r = mesure(el.getBoundingClientRect());
    const c = chants.get(slug);
    if (!c) chants.set(slug, { cible: el, scan, boite: r });
    else {
      if (c.scan && !scan) { c.cible = el; c.scan = false; }
      c.boite = { left: Math.min(c.boite.left, r.left), top: Math.min(c.boite.top, r.top), right: Math.max(c.boite.right, r.right), bottom: Math.max(c.boite.bottom, r.bottom) };
    }
  }
  if (!chants.size) return [];
  const [sx, sy] = [window.innerWidth / (data.w || window.innerWidth), window.innerHeight / (data.h || window.innerHeight)];
  const out: { slug: string; trait: Trait | Signe }[] = [];
  for (const s of data.strokes) {
    const e = { ...s, size: s.size * ((sx + sy) / 2), points: s.points.map(([x, y]) => [x * sx, y * sy] as [number, number]) };
    const [x0, y0] = e.points[0];
    const [slug, c] = [...chants].find(([, v]) => x0 >= v.boite.left && x0 <= v.boite.right && y0 >= v.boite.top && y0 <= v.boite.bottom) ?? [...chants][0];
    let ancre: Trait["ancre"];
    let repere: Repere;
    if (!c.scan) {
      ancre = { section: c.cible.dataset.traitSection ?? "", ligne: Number(c.cible.dataset.traitLigne), car: 0 };
      repere = repereTexte(c.cible, 0, mesure, loupe.zoom);
    } else {
      const r = mesure(c.cible.getBoundingClientRect());
      ancre = { scan: true, image: Number(c.cible.dataset.traitScan) };
      repere = { x: r.left, y: r.top, unite: r.right - r.left };
    }
    if (!(repere.unite > 0)) continue;
    out.push({ slug, trait: s.tool === "text" || s.tool === "stamp" ? ancrerSigne(e, ancre, repere) : ancrer(e as Parameters<typeof ancrer>[0], ancre, repere) });
  }
  return out;
}

/** Em (px, espace sans loupe) de la ligne la plus proche du point, pour dimensionner un signe ; 16 sur un scan ou sans ligne. */
export function uniteProche(racine: HTMLElement, loupe: Loupe, x: number, y: number): number {
  const [r] = ancrerTrace({ tool: "stamp", size: 100, color: "", points: [[x, y]] }, racine, loupe);
  return r && "taille" in r.trait && !("scan" in r.trait.ancre) && r.trait.taille > 0 ? 100 / r.trait.taille : 16;
}

// Identité d'un trait dans la signature (un trait réécrit à l'identique n'est pas une nouvelle projection).
const ids = new WeakMap<Trait | Signe, number>();
let suivant = 0;
const idDe = (t: Trait | Signe) => ids.get(t) ?? (ids.set(t, ++suivant), suivant);

/** Projette les traits `traits` sur les lignes (et scans) de `racine()` visibles à l'écran. Refait après chaque rendu
 *  (pagination, taille du texte, disposition), au redimensionnement, à l'arrivée des polices et à toute mutation de la
 *  page (coupure de ligne mesurée) ; l'état ne change que si le dessin change. Une section jouée plusieurs fois donne
 *  un tracé par passage. `actif` faux : la dernière projection reste. */
export function useTraitsAncres({ racine, traits, actif, loupe }: { racine: () => HTMLElement | null; traits: TraitsParChant; actif: boolean; loupe: Loupe }): Projection {
  const [projection, setProjection] = useState<Projection>(VIDE);
  const signature = useRef("");
  const dernier = useRef({ racine, traits, actif, loupe });
  dernier.current = { racine, traits, actif, loupe };

  const mesurer = useCallback(() => {
    const { racine, traits, actif, loupe } = dernier.current;
    if (!actif) return;
    const el = racine();
    const strokes: Stroke[] = [];
    const origines = new Map<Stroke, Origine>();
    if (el && Object.values(traits).some((t) => t.miens.length || t.autres.length)) {
      const mesure = mesureDe(loupe);
      const lignes = new Map<string, HTMLElement[]>();
      for (const l of el.querySelectorAll<HTMLElement>("[data-trait-section]")) {
        if (!horsApercu(l)) continue;
        const k = `${l.dataset.traitSlug}\n${l.dataset.traitSection}\n${l.dataset.traitLigne}`;
        lignes.set(k, [...(lignes.get(k) ?? []), l]);
      }
      const scans = new Map<string, HTMLElement[]>();
      for (const l of el.querySelectorAll<HTMLElement>("[data-trait-scan]")) {
        if (!horsApercu(l)) continue;
        const k = `${l.dataset.traitSlug}\n${l.dataset.traitScan}`;
        scans.set(k, [...(scans.get(k) ?? []), l]);
      }
      for (const [slug, { miens, autres }] of Object.entries(traits)) {
        for (const [mien, liste] of [[true, miens], [false, autres]] as const) {
          for (const trait of liste.filter((e): e is Trait | Signe => estTrait(e) || estSigne(e))) {
            const a = trait.ancre;
            const cibles = "scan" in a ? scans.get(`${slug}\n${a.image}`) : lignes.get(`${slug}\n${a.section}\n${a.ligne}`);
            for (const cible of cibles ?? []) {
              let repere: Repere;
              if ("scan" in a) {
                const r = mesure(cible.getBoundingClientRect());
                repere = { x: r.left, y: r.top, unite: r.right - r.left };
              } else repere = repereTexte(cible, a.car, mesure, loupe.zoom);
              if (!(repere.unite > 0)) continue;
              const stroke = trait.outil === "text" || trait.outil === "stamp" ? projeterSigne(trait, repere) : projeter(trait, repere);
              strokes.push(stroke);
              origines.set(stroke, { slug, trait, mien });
            }
          }
        }
      }
    }
    // Les tracés sont en px de l'espace sans loupe ; la loupe est appliquée par le canvas.
    const sig = strokes.map((s) => `${idDe(origines.get(s)!.trait)}:${origines.get(s)!.mien}:${Math.round(s.size * 10)}:${s.points.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(" ")}`).join("|");
    if (sig === signature.current) return;
    signature.current = sig;
    setProjection(strokes.length ? { strokes, origines } : VIDE);
  }, []);

  // Après chaque rendu : la signature évite toute boucle.
  useLayoutEffect(mesurer);
  useLayoutEffect(() => {
    if (!actif) return;
    let image = 0;
    const planifier = () => { cancelAnimationFrame(image); image = requestAnimationFrame(mesurer); };
    const racineEl = racine();
    const mo = new MutationObserver(planifier);
    const ro = new ResizeObserver(planifier);
    if (racineEl) {
      mo.observe(racineEl, { subtree: true, childList: true, attributes: true });
      ro.observe(racineEl);
    }
    window.addEventListener("resize", planifier);
    document.fonts?.addEventListener?.("loadingdone", planifier);
    document.fonts?.ready.then(planifier);
    return () => {
      cancelAnimationFrame(image);
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", planifier);
      document.fonts?.removeEventListener?.("loadingdone", planifier);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la racine se relit à chaque rendu par `dernier`
  }, [actif, mesurer, racine()]);

  return projection;
}
