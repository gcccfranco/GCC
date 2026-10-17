// Préférence « partition 简谱 » — par appareil (localStorage), partagée entre
// la page chant, le détail de setlist et le mode louange. Un chant qui a un
// scan s'affiche sur son scan par défaut (docs/spec-jianpu-integration.md,
// lot 1). Trois états :
//  - non réglée (clé absente, ou « auto », l'ancien « Choix du responsable ») :
//    le scan, sauf si le responsable a choisi « Paroles » pour cet item
//    (`jianpuSheet: false`) ;
//  - « always » (interrupteur allumé par la personne) : toujours le scan ;
//  - « never » (interrupteur éteint) : toujours les paroles.
// Le choix de la personne prime sur celui du responsable (D4) : toucher
// l'interrupteur ou le bouton 谱 de la page chant règle la préférence, et on
// ne revient pas à « non réglée » depuis l'interface.
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

/** Ce chant se joue-t-il sur son scan ? `itemChoice` = choix du responsable
 *  pour cet item (`false` = « Paroles », absent = non réglé). L'appelant
 *  vérifie séparément qu'une partition existe. */
export function sheetEnabled(pref: JianpuPref, itemChoice: boolean | undefined): boolean {
  if (pref === "always") return true;
  if (pref === "never") return false;
  return itemChoice !== false;
}

/** L'interrupteur « Partition 简谱 » est allumé tant que la personne ne l'a
 *  pas éteint (reprise : « Jamais » → éteint, le reste → allumé). */
export function interrupteurAllume(pref: JianpuPref): boolean {
  return pref !== "never";
}

/** Préférence écrite quand la personne touche l'interrupteur : réglée. */
export function prefDepuisInterrupteur(on: boolean): JianpuPref {
  return on ? "always" : "never";
}
