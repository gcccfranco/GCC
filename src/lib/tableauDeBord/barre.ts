// Lot U6, B6 (docs/spec-back-office.md, Q13) — barre du bas du Back-Office (téléphone,
// tablette en portrait), règles pures. Exactement 4 onglets (toutes les entrées s'il y en a
// moins), « Plus » toujours à droite ; défaut Accueil · Calendrier · Tâches · Planning,
// complété dans l'ordre du menu si une entrée manque ; une entrée sans droit n'y figure pas.
// La barre choisie est `barreDuBas` de `backOffice/{uid}` (Q5) : absente = défaut, recalculé.
import { ENTREES, type Entree } from "@/types/backOffice";

export const ONGLETS_MAX = 4;
export const BARRE_PAR_DEFAUT: readonly Entree[] = ["tableau", "calendrier", "taches", "planning"];

/** Complète `debut` avec les entrées permises suivantes, dans l'ordre du menu, jusqu'à 4. */
function completer(debut: Entree[], permises: readonly Entree[]): Entree[] {
  const suite = ENTREES.filter((e) => permises.includes(e) && !debut.includes(e));
  return [...debut, ...suite].slice(0, ONGLETS_MAX);
}

/** La barre par défaut d'une personne, d'après ses entrées permises (`entreesBackOffice`). */
export function barreParDefaut(permises: readonly Entree[]): Entree[] {
  return completer(BARRE_PAR_DEFAUT.filter((e) => permises.includes(e)), permises);
}

/**
 * La barre affichée : celle enregistrée, dans son ordre, sans entrée inconnue, en double ou
 * sans droit, 4 au plus, complétée dans l'ordre du menu ; absente (`null`, `undefined`) = défaut.
 */
export function barreAffichee(enregistree: readonly unknown[] | null | undefined, permises: readonly Entree[]): Entree[] {
  if (!Array.isArray(enregistree)) return barreParDefaut(permises);
  const gardees: Entree[] = [];
  for (const e of enregistree) {
    if (typeof e === "string" && permises.includes(e as Entree) && !gardees.includes(e as Entree)) gardees.push(e as Entree);
  }
  return completer(gardees.slice(0, ONGLETS_MAX), permises);
}

/** Les lignes de la feuille « Ta barre du bas » : la barre d'abord, puis les autres entrées
 *  permises dans l'ordre du menu. */
export function listeDeLaFeuille(barre: readonly Entree[], permises: readonly Entree[]): Entree[] {
  return [...barre, ...ENTREES.filter((e) => permises.includes(e) && !barre.includes(e))];
}

/** Coche ou décoche une entrée ; une cinquième est refusée (4 au plus). */
export function basculer(cochees: readonly Entree[], entree: Entree): Entree[] {
  if (cochees.includes(entree)) return cochees.filter((e) => e !== entree);
  return cochees.length >= ONGLETS_MAX ? [...cochees] : [...cochees, entree];
}

/** La barre que donne la feuille : les entrées cochées, dans l'ordre de ses lignes. */
export function barreDeLaFeuille(liste: readonly Entree[], cochees: readonly Entree[]): Entree[] {
  return liste.filter((e) => cochees.includes(e));
}
