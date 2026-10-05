// Barre latérale réduite ou dépliée sur ordinateur (lot U4, N3, docs/spec-navigation-grand-ecran.md,
// Q6) — par appareil (localStorage), dépliée par défaut. Le choix est reflété sur
// `<html data-barre="reduite">`, que lit le CSS (bloc « Lot U4 » de globals.css) : au chargement,
// c'est la ligne de script de l'en-tête (`SCRIPT_BARRE_REDUITE`, layout.tsx) qui le pose, avant le
// premier affichage ; sans elle, la page sauterait de 180 px à chaque chargement.
const CLE = "barre-laterale";

export function getBarreReduite(): boolean {
  try {
    return localStorage.getItem(CLE) === "reduite";
  } catch {
    return false;
  }
}

export function setBarreReduite(reduite: boolean) {
  try { localStorage.setItem(CLE, reduite ? "reduite" : "depliee"); } catch { /* ignore */ }
  if (reduite) document.documentElement.dataset.barre = "reduite";
  else delete document.documentElement.dataset.barre;
}

/** Ligne de script de l'en-tête : pose `data-barre` avant le premier affichage. */
export const SCRIPT_BARRE_REDUITE = `try{if(localStorage.getItem('${CLE}')==='reduite')document.documentElement.dataset.barre='reduite'}catch(e){}`;
