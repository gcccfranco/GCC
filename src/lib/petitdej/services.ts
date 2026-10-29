// Petit déj (lot U3, docs/spec-petit-dej.md) : les services d'un compte,
// rattachés par son `uid` (Q9). À part de `lignes.ts`, que `sheets.ts` importe :
// ces fonctions s'appuient sur `names.ts`, qui importe `sheets.ts` (pas de cycle).

import type { LignePetitDej } from "@/types/petitDej"
import { findMyServices, normalizeName, splitNames, type PlanningData, type ServiceEntry } from "@/lib/planning/names"

/**
 * Les petits déj rattachés à un compte par son `uid` (Q9) : une ligne posée par
 * « Je m'inscris » compte pour son inscrit même réécrite (« Famille Martin ») et
 * sans nom de planning. Un dimanche dont une ligne porte déjà son nom de
 * planning est laissé à `findMyServices`, qui le trouve dans les rangées : pas
 * de doublon. Une ligne posée pour quelqu'un (`uid` vide) ne se rattache que par
 * son texte.
 */
export function servicesPetitDejDuCompte(lignes: LignePetitDej[], uid: string, planningName: string): ServiceEntry[] {
  if (!uid) return []
  const nom = normalizeName(planningName)
  const porteSonNom = (texte: string) => !!nom && splitNames(texte).some((n) => normalizeName(n) === nom)
  const trouvesParLeNom = new Set(lignes.filter((l) => porteSonNom(l.nom)).map((l) => l.dimanche))
  const dates = new Set(lignes.filter((l) => l.uid === uid && !trouvesParLeNom.has(l.dimanche)).map((l) => l.dimanche))
  return [...dates].sort().map((date) => ({ date, service: "Petit déj", role: "Équipe", leader: "" }))
}

/**
 * Les services d'un compte (PD3) : par son nom de planning (`findMyServices`,
 * rien sans nom) et ses petits déj par `uid` (`servicesPetitDejDuCompte`), sans
 * doublon, triés comme `findMyServices`. « Ton prochain service » et « Mes services ».
 */
export function servicesDuCompte(data: PlanningData, lignes: LignePetitDej[], uid: string, planningName: string): ServiceEntry[] {
  return [
    ...(planningName.trim() ? findMyServices(data, planningName) : []),
    ...servicesPetitDejDuCompte(lignes, uid, planningName),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.service.localeCompare(b.service))
}
