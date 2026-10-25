import type { TFunction } from "i18next"

const POSTES: Record<string, string> = {
  piano: "piano", guitare: "guitare", batterie: "batterie", cajon: "cajon", sono: "sono", ppt: "ppt",
}

/** Un poste du Sheet (« Piano », « PPT »…) dans la langue active ; un libellé inconnu reste tel quel. */
export function poste(t: TFunction, libelle: string): string {
  const cle = POSTES[libelle.trim().toLowerCase()]
  return cle ? t(`planning.roles.${cle}`) : libelle
}

/** « Piano: Léa » → « 钢琴: Léa » en 中文 ; le nom de la personne reste tel quel. Sans « : », tel quel. */
export function cellulePoste(t: TFunction, zh: boolean, texte: string): string {
  const i = texte.indexOf(":")
  if (!zh || i < 0) return texte
  return `${poste(t, texte.slice(0, i))}:${texte.slice(i + 1)}`
}

/** « 5/10 Matin » → « 5/10 上午 » en 中文. */
export function seanceLibelle(t: TFunction, zh: boolean, d: string): string {
  if (!zh) return d
  return d.replace(/\bMatin\b/, t("planning.campus.morning")).replace(/\bSoir\b/, t("planning.campus.evening"))
}
