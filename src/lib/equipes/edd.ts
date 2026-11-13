// Sous-équipes de l'EDD (docs/spec-edd-sous-equipes.md) : de l'affichage seulement. Pur : aucune dépendance
// React ni Firebase.

import { SOUS_EQUIPES_EDD, type MembreEquipe, type SousEquipeEdd } from "@/types/equipe";

/** Casse, accents, séparateurs et pluriel final de chaque mot pliés : « Professeur louange » = `professeurs-louange`. */
const plie = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .split(/[\s\-_]+/).filter(Boolean).map((w) => w.replace(/s$/, "")).join(" ");

const CLES_PLIEES = SOUS_EQUIPES_EDD.map((s) => [plie(s), s] as const);

/** Les sous-équipes EDD d'un membre, dans l'ordre E1. Le champ posé fait foi (même vide) ; sinon l'ancien
 *  texte libre `groupe` est lu, et un texte inconnu ne donne rien. */
export function sousEquipesEddDe(m: MembreEquipe): SousEquipeEdd[] {
  const posees = m.sousEquipesEdd;
  if (posees) return SOUS_EQUIPES_EDD.filter((s) => posees.includes(s));
  const g = plie(m.groupe ?? "");
  const trouvee = CLES_PLIEES.find(([cle]) => cle === g);
  return trouvee ? [trouvee[1]] : [];
}

/** Les membres de l'EDD rangés par sous-équipe (une personne figure dans chacune des siennes), le référent EDD
 *  d'abord ; `sans` = ceux qui n'en ont aucune (référent compris), le référent d'abord. */
export function colonnesEdd(membres: MembreEquipe[]) {
  const referentDabord = (liste: MembreEquipe[]) => [...liste.filter((m) => m.referent), ...liste.filter((m) => !m.referent)];
  const parSous = Object.fromEntries(
    SOUS_EQUIPES_EDD.map((s) => [s, referentDabord(membres.filter((m) => sousEquipesEddDe(m).includes(s)))]),
  ) as Record<SousEquipeEdd, MembreEquipe[]>;
  const sans = referentDabord(membres.filter((m) => sousEquipesEddDe(m).length === 0));
  return { parSous, sans, referents: membres.filter((m) => m.referent) };
}
