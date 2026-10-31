// Barre du mode louange (docs/spec-mode-louange-forscore.md) : visible à la toute première ouverture du mode sur
// l'appareil, masquée ensuite. Drapeau `perf-barre-vue` posé à la première ouverture.
// Stockage en try/catch : indisponible = barre jamais vue (elle s'affiche, comme avant).
const CLE = "perf-barre-vue";

/** L'appareil a-t-il déjà ouvert le mode louange (et donc vu la barre) ? */
export function barreDejaVue(): boolean {
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

export function marquerBarreVue() {
  try { localStorage.setItem(CLE, "1"); } catch { /* stockage indisponible */ }
}
