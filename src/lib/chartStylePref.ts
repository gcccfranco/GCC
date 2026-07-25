// Préférence « couleurs par section » (style chart de SectionView) — par
// appareil (localStorage), partagée entre la fiche chant, la vue setlist et le
// mode louange. Activée par défaut. L'ancienne clé perf-chart-style (réglage
// mode louange seul) est reprise si l'utilisateur avait déjà choisi.
const KEY = "chart-style";
const LEGACY_KEY = "perf-chart-style";

export function getChartStylePref(): boolean {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setChartStylePref(v: boolean) {
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
}
