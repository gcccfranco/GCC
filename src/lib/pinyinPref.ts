// Préférence « pinyin affiché » — par appareil (localStorage), partagée entre
// la vue setlist et le mode louange : masqué avant d'entrer en mode louange,
// il y reste masqué (docs/spec-mode-louange.md). L'ancienne clé du mode louange
// seul (perf-show-pinyin) est reprise si la vue setlist n'a jamais été réglée.
const KEY = "gcc.showPinyin";
const LEGACY_KEY = "perf-show-pinyin";

export function getPinyinPref(): boolean {
  try {
    return (localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)) !== "0";
  } catch {
    return true;
  }
}

export function setPinyinPref(v: boolean) {
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
}
