import { FS_BASE, authHeader, checkRest, toFsFields } from "./setlists";
import { oublierGrille } from "@/lib/planning/grille";
import type { DefinitionGrille } from "@/lib/planning/grilles";

// Écriture d'une case de planning (lot 17, décision D1) :
// plannings/{key}/dimanches/{AAAA-MM-JJ}, un champ par colonne. PATCH limité aux
// champs donnés (updateMask), patron de `programmes.ts` l. 84-87 : deux
// personnes qui saisissent deux colonnes du même dimanche ne s'effacent pas.
// Le document se crée s'il n'existe pas. Droits : firestore.rules
// (plannings/{key}/dimanches) et canEditPlanning (src/lib/access.ts).

export type EcritureCase = {
  definition: DefinitionGrille;
  date: string;
  /** Clé de colonne (`piano`…). */
  colonne: string;
  valeur: string;
  /** Nom affiché de l'auteur (infobulle de la case). */
  auteur: string;
  /**
   * Ligne affichée, à recopier en entier parce que ce dimanche n'existe PAS
   * encore dans la grille : tant que l'import initial (G4) n'a pas eu lieu, ses
   * autres cases viennent du Google Sheet, et un document qui ne porterait que
   * la case modifiée les ferait disparaître (la fusion se fait dimanche par
   * dimanche). Absent = le dimanche est déjà dans la grille, on ne touche qu'à
   * sa case.
   */
  semer?: string[];
};

export async function ecrireCase({ definition, date, colonne, valeur, auteur, semer }: EcritureCase): Promise<void> {
  const champs: Record<string, unknown> = {
    date,
    modifieLe: new Date().toISOString(),
    modifiePar: auteur,
    [colonne]: valeur,
  };
  if (semer) {
    for (const c of definition.colonnes) {
      if (!(c.cle in champs)) champs[c.cle] = semer[c.index] ?? "";
    }
  }
  const mask = Object.keys(champs).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/plannings/${definition.key}/dimanches/${date}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ fields: toFsFields(champs) }),
  });
  await checkRest(res);
  oublierGrille(definition.key);
}
