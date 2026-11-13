// Couleur des accords au choix de chacun (lot CA) — par compte sur l'appareil (localStorage ; rien dans Firestore).
// `accords-couleurs-<uid>` (compte) ou `accords-couleurs` (sans compte) : { fr, zh }, hex normalisé, null = couleur d'origine.
// Stockage indisponible ou valeur illisible = couleur d'origine, sans exception ; un choix qui ne peut pas s'enregistrer
// reste en mémoire et s'applique pour la séance. Les abonnés (useSyncExternalStore) se mettent à jour sans rechargement.
import { useSyncExternalStore, useMemo, type CSSProperties } from "react";
import { garderContraste, normaliserHex, FOND_CLAIR, FOND_SOMBRE } from "@/lib/performance/couleurIcones";
import type { Disposition } from "@/lib/dispositionPref";

export type CouleursAccords = { fr: string | null; zh: string | null };
const ORIGINE: CouleursAccords = { fr: null, zh: null };

const cle = (uid: string | null) => (uid ? `accords-couleurs-${uid}` : "accords-couleurs");
const memoire = new Map<string, CouleursAccords>();
const abonnes = new Set<() => void>();

function lire(k: string): CouleursAccords {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? "null");
    const hex = (x: unknown) => (typeof x === "string" ? normaliserHex(x) : null);
    return v && typeof v === "object" ? { fr: hex(v.fr), zh: hex(v.zh) } : ORIGINE;
  } catch {
    return ORIGINE;
  }
}

export function getCouleursAccords(uid: string | null): CouleursAccords {
  const k = cle(uid);
  let c = memoire.get(k);
  if (!c) memoire.set(k, (c = lire(k)));
  return c;
}

/** Choisir une couleur (hex) ou revenir à l'origine (null) pour une langue. */
export function setCouleurAccords(uid: string | null, langue: "fr" | "zh", hex: string | null) {
  const k = cle(uid);
  const h = hex === null ? null : normaliserHex(hex);
  if (hex !== null && !h) return;
  const c = { ...getCouleursAccords(uid), [langue]: h };
  memoire.set(k, c);
  try { localStorage.setItem(k, JSON.stringify(c)); } catch { /* stockage indisponible : le choix vaut pour la séance */ }
  abonnes.forEach((f) => f());
}

const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };

// Fond le plus défavorable de la disposition (constantes de globals.css) : la page, sauf en Scène, où ce sont les teintes
// --sec-*-tint extrêmes (la plus sombre en clair : --sec-bridge-tint ; la plus claire en sombre : --sec-verse-tint).
const FOND_SCENE_CLAIR = "#f0ecf9";
const FOND_SCENE_SOMBRE = "#112320";

/** Style des variables `--accord-fr` / `--accord-zh` (absentes quand rien n'est choisi). `uid` undefined = authentification
 *  en cours : couleur d'origine. À poser sur la racine d'une partition, jamais sur :root. */
export function useCouleursAccords(uid: string | null | undefined, theme: "light" | "dark", disposition: Disposition): CSSProperties | undefined {
  const c = useSyncExternalStore(abonner, () => (uid === undefined ? ORIGINE : getCouleursAccords(uid)), () => ORIGINE);
  return useMemo(() => {
    const sombre = theme === "dark";
    const fond = disposition === "scene" ? (sombre ? FOND_SCENE_SOMBRE : FOND_SCENE_CLAIR) : sombre ? FOND_SOMBRE : FOND_CLAIR;
    const s: Record<string, string> = {};
    // Classique (décision 28) : fond (15 % clair, 16 % sombre) et bordure (33 %) mêlés au fond de la page, lus par getSectionStyle.
    const pose = (l: "fr" | "zh", hex: string | null) => {
      if (!hex) return;
      const v = garderContraste(hex, fond);
      s[`--accord-${l}`] = v;
      s[`--classique-fond-${l}`] = `color-mix(in srgb, ${v} ${sombre ? 16 : 15}%, ${fond})`;
      s[`--classique-bord-${l}`] = `color-mix(in srgb, ${v} 33%, ${fond})`;
    };
    pose("fr", c.fr);
    pose("zh", c.zh);
    return Object.keys(s).length ? (s as CSSProperties) : undefined;
  }, [c, theme, disposition]);
}

/** Choix en cours (réglage) ; `uid` undefined = authentification en cours : couleur d'origine. */
export function useChoixCouleursAccords(uid: string | null | undefined): CouleursAccords {
  return useSyncExternalStore(abonner, () => (uid === undefined ? ORIGINE : getCouleursAccords(uid)), () => ORIGINE);
}
