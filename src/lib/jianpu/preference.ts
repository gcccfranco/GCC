// Préférence « partition 简谱 » — par appareil (localStorage), partagée entre
// le détail de setlist et le mode louange. Le responsable coche le 简谱 par
// chant dans l'éditeur (`jianpuSheet` sur l'item) ; chaque musicien peut
// ensuite suivre ce choix, préférer systématiquement le scan, ou toujours lire
// les paroles — le pianiste et le guitariste lisent la même setlist
// différemment sans se marcher dessus.
export type JianpuPref = "auto" | "always" | "never";

const KEY = "jianpu-sheet-pref";

export function getJianpuPref(): JianpuPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "always" || v === "never" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setJianpuPref(v: JianpuPref) {
  try { localStorage.setItem(KEY, v); } catch { /* stockage indisponible */ }
}

/** Ce chant se joue-t-il sur son scan ? `itemChoice` = case cochée par le
 *  responsable. L'appelant vérifie séparément qu'une partition existe. */
export function sheetEnabled(pref: JianpuPref, itemChoice: boolean | undefined): boolean {
  if (pref === "always") return true;
  if (pref === "never") return false;
  return Boolean(itemChoice);
}
