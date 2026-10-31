// Lot RS, tranche RS-C (docs/spec-responsabilites.md, « Écrans ») : les fonctions pures de la page
// Équipes › Responsabilités et des mentions « Référent » des fiches. Les référents se lisent dans
// `equipes/{id}` (drapeau `referent` ; `referentSous` pour Louange) ; aucune dépendance Firebase.

import { responsabilitesDe, type ProfilResponsabilites } from "@/lib/acces/responsabilites";
import { EQUIPES, cleNomEquipe } from "@/lib/equipes/table";
import { SOUS_EQUIPES, type MembreEquipe, type SousEquipe } from "@/types/equipe";

/** Une ligne de la section Référents : une équipe, ou une sous-équipe de Louange (`sous`). */
export type LigneReferents = { equipe: string; sous: SousEquipe | null };

/** Une ligne par équipe de l'organigramme, les trois sous-équipes juste après Louange. */
export const LIGNES_REFERENTS: readonly LigneReferents[] = EQUIPES.flatMap((e): LigneReferents[] => [
  { equipe: e.id, sous: null },
  ...(e.id === "louange" ? SOUS_EQUIPES.map((s) => ({ equipe: "louange", sous: s })) : []),
]);

export const cleLigne = (l: LigneReferents) => (l.sous ? `${l.equipe}:${l.sous}` : l.equipe);

type Personne = { uid: string; nom: string };

const estLa = (m: MembreEquipe, p: Personne) => (p.uid ? m.uid === p.uid : !m.uid && m.nom === p.nom);
const referentDeLaLigne = (m: MembreEquipe, sous: SousEquipe | null) =>
  sous ? (m.referentSous ?? []).includes(sous) : m.referent;

/** Les référents d'une ligne, une fois chacun (une personne peut avoir deux lignes dans le document). */
export function referentsDe(membres: readonly MembreEquipe[], sous: SousEquipe | null): Personne[] {
  const vus = new Set<string>();
  const out: Personne[] = [];
  for (const m of membres) {
    if (!referentDeLaLigne(m, sous)) continue;
    const cle = m.uid || `nom:${m.nom}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push({ uid: m.uid, nom: m.nom });
  }
  return out;
}

/** Fait de la personne un référent. Déjà membre : son drapeau se lève (pour une sous-équipe de Louange, elle y entre
 *  aussi, un référent étant de sa sous-équipe) ; sinon elle est ajoutée comme membre référent. */
export function avecReferent(membres: readonly MembreEquipe[], p: Personne, sous: SousEquipe | null): MembreEquipe[] {
  const pose = (m: MembreEquipe): MembreEquipe => sous
    ? {
        ...m,
        sousEquipes: [...new Set([...(m.sousEquipes ?? []), sous])],
        referentSous: [...new Set([...(m.referentSous ?? []), sous])],
      }
    : { ...m, referent: true };
  const existe = membres.some((m) => estLa(m, p));
  if (existe) {
    // Le drapeau se pose sur toutes ses lignes du document, comme `sansReferent` les lève.
    return membres.map((m) => (estLa(m, p) ? pose(m) : m));
  }
  return [...membres, pose({ nom: p.nom, uid: p.uid, mention: "", referent: false, essai: false, groupe: "" })];
}

/** Retire le drapeau, la personne reste membre. */
export function sansReferent(membres: readonly MembreEquipe[], p: Personne, sous: SousEquipe | null): MembreEquipe[] {
  return membres.map((m) => {
    if (!estLa(m, p)) return m;
    return sous ? { ...m, referentSous: (m.referentSous ?? []).filter((s) => s !== sous) } : { ...m, referent: false };
  });
}

type T = (cle: string, options?: Record<string, unknown>) => string;
type ProfilFiche = ProfilResponsabilites & { referentDe?: string[]; referentSous?: string[] };

/** Les mentions « Référent » d'un profil, d'après ses champs recopiés : une par équipe (Louange comprise), puis une par
 *  sous-équipe de Louange. */
export function mentionsReferent(p: ProfilFiche | null | undefined, t: T): string[] {
  const equipes = EQUIPES.filter((e) => (p?.referentDe ?? []).includes(e.id));
  return [
    ...equipes.map((e) => t("responsabilites.referentEquipe", { equipe: t(cleNomEquipe(e.id, true)) })),
    ...SOUS_EQUIPES.filter((s) => (p?.referentSous ?? []).includes(s)).map((s) => t("responsabilites.referentSous", { sous: t(`acces.sousEquipe.${s}`) })),
  ];
}

/** La ligne « Responsabilités » d'une fiche : gestionnaire de planning, Comité Orga, référent ; vide = « Aucune ». */
export function libellesResponsabilites(p: ProfilFiche | null | undefined, t: T): string[] {
  const siennes = responsabilitesDe(p).map((cle) =>
    cle === "orga"
      ? t("acces.responsabilite.orga")
      : t("responsabilites.gestionnaire", { planning: t(`acces.responsabilite.${cle.slice("planning:".length)}`) }));
  return [...siennes, ...mentionsReferent(p, t)];
}
