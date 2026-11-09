// Disposition de la partition — par appareil (localStorage), partagée entre la
// fiche chant, la vue setlist et le mode louange (docs/spec-mode-louange-forscore-2.md,
// lot DP). Remplace le booléen « couleurs par section » (chartStylePref.ts).
//
// Reprise des anciens réglages, UNE SEULE FOIS (marque `disposition-migree`) :
// chart-style, à défaut perf-chart-style : "1" → sections, "0" → classique.
// Les deux absentes : un appareil qui porte déjà une autre clé du site était
// utilisé (il voyait les couleurs par section) → sections ; un appareil neuf →
// classique. Les anciennes clés restent en place, jamais écrites ni effacées.
//
// La migration passe dès le chargement du module, que I18nProvider importe
// avant tout effet : sinon des clés posées sans geste à la première visite
// (recentSongs, i18nextLng…) feraient passer un appareil neuf pour un appareil
// utilisé.
export type Disposition = "classique" | "sections" | "reperes" | "scene" | "partition";

export const DISPOSITIONS: Disposition[] = ["classique", "sections", "reperes", "scene", "partition"];

// Les tranches DP-B, DP-C, DP-D y ajoutent reperes, scene, partition quand
// leur rendu existe : rien d'inachevé n'apparaît au menu.
export const DISPOSITIONS_AU_MENU: Disposition[] = ["classique", "sections"];

const KEY = "disposition";
const MARQUE = "disposition-migree";
const ANCIENNE = "chart-style";
const ANCIENNE_MODE_LOUANGE = "perf-chart-style";

function estDisposition(v: unknown): v is Disposition {
  return typeof v === "string" && (DISPOSITIONS as string[]).includes(v);
}

// Une autre clé du site que celles de ce module et de l'ancien réglage ?
function appareilDejaUtilise(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k === null) continue;
    if (k === KEY || k === MARQUE || k === ANCIENNE || k === ANCIENNE_MODE_LOUANGE) continue;
    if (k.startsWith("firebase:")) continue;
    return true;
  }
  return false;
}

export function migrerDisposition() {
  try {
    if (localStorage.getItem(KEY) !== null) return;
    const ancienne = localStorage.getItem(ANCIENNE) ?? localStorage.getItem(ANCIENNE_MODE_LOUANGE);
    let d: Disposition;
    if (ancienne === "1") d = "sections";
    else if (ancienne === "0") d = "classique";
    else d = appareilDejaUtilise() ? "sections" : "classique";
    localStorage.setItem(KEY, d);
    localStorage.setItem(MARQUE, "1");
  } catch { /* stockage indisponible */ }
}

if (typeof window !== "undefined") migrerDisposition();

export function getDispositionPref(): Disposition {
  try {
    migrerDisposition();
    const v = localStorage.getItem(KEY);
    return estDisposition(v) ? v : "classique";
  } catch {
    return "classique";
  }
}

export function setDispositionPref(d: Disposition) {
  try { localStorage.setItem(KEY, d); } catch { /* ignore */ }
}
