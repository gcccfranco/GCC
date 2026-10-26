// Style de lecture du mode louange — un seul par appareil (localStorage),
// « Classique » par défaut (docs/spec-mode-louange-forscore.md, lot L0).
export type StyleLecture = "classique" | "forscore";

const KEY = "perf-style-lecture";

export function getStyleLecturePref(): StyleLecture {
  try {
    return localStorage.getItem(KEY) === "forscore" ? "forscore" : "classique";
  } catch {
    return "classique";
  }
}

export function setStyleLecturePref(v: StyleLecture) {
  try { localStorage.setItem(KEY, v); } catch { /* stockage indisponible */ }
}
