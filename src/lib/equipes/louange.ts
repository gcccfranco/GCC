// Lot AO-B (docs/spec-acces-organigramme.md, C1, D1 à D4, E1) : ce que les écrans de l'organigramme
// lisent de la ligne d'un membre de Louange ou de Régie. Pur : aucune dépendance React ni Firebase.

import type { ProfilOrganigramme } from "@/lib/acces/organigramme";
import { INSTRUMENTS, SOUS_EQUIPES, type Instrument, type MembreEquipe, type SousEquipe } from "@/types/equipe";
import { SERVICE_LIEUX, type ServiceLieu } from "@/types/user";

/** Nom court d'un lieu : la clé de `equipes.colonne.<clé>` (Franco, Intergroupe, Interfranco, Campus ; 中文 inclus). */
export const COLONNE_LIEU: Record<ServiceLieu, string> = {
  "Culte Francophone": "franco",
  Intergroupe: "intergroupe",
  Interfranco: "interfranco",
  Campus: "campus",
};

/** Les équipes dont la ligne d'un membre porte « Où il sert » (C1). */
export const EQUIPES_A_LIEUX = ["louange", "regie"] as const;
export type EquipeALieux = (typeof EQUIPES_A_LIEUX)[number];
export const porteDesLieux = (id: string): id is EquipeALieux => (EQUIPES_A_LIEUX as readonly string[]).includes(id);

export const sousEquipesDe = (m: MembreEquipe): SousEquipe[] => SOUS_EQUIPES.filter((s) => m.sousEquipes?.includes(s));
export const referentSousDe = (m: MembreEquipe): SousEquipe[] => SOUS_EQUIPES.filter((s) => m.referentSous?.includes(s));
export const lieuxDe = (m: MembreEquipe): ServiceLieu[] => SERVICE_LIEUX.filter((l) => m.lieux?.includes(l));
/** « Ce qu'il joue » ne compte que pour un membre des Musiciens. */
export const joueDe = (m: MembreEquipe): Instrument[] =>
  sousEquipesDe(m).includes("musiciens") ? INSTRUMENTS.filter((i) => m.joue?.includes(i)) : [];

/** Les membres de Louange rangés par sous-équipe (E1 : un membre figure dans chacune des siennes), le référent
 *  de la sous-équipe d'abord ; `sans` = ceux qui n'en ont aucune et ne sont pas déjà montrés comme référent Louange. */
export function colonnesLouange(membres: MembreEquipe[]) {
  const parSous = Object.fromEntries(SOUS_EQUIPES.map((s) => [s, [] as MembreEquipe[]])) as Record<SousEquipe, MembreEquipe[]>;
  for (const s of SOUS_EQUIPES) {
    const siens = membres.filter((m) => sousEquipesDe(m).includes(s));
    parSous[s] = [...siens.filter((m) => referentSousDe(m).includes(s)), ...siens.filter((m) => !referentSousDe(m).includes(s))];
  }
  const sans = membres.filter((m) => sousEquipesDe(m).length === 0 && !m.referent);
  return { parSous, sans, referents: membres.filter((m) => m.referent) };
}

/** Ce que les cases d'une ligne donneront au profil une fois recopiées (`rattachementDe`, côté serveur), sur la base
 *  des autres équipes déjà connues du profil : pour « Ce que ça lui ouvre ». */
export function profilSimule(equipe: EquipeALieux, m: MembreEquipe, profil: ProfilOrganigramme | null | undefined): ProfilOrganigramme {
  const base = profil ?? {};
  const sans = (l: string[] | undefined) => (l ?? []).filter((x) => x !== equipe);
  const out: ProfilOrganigramme = {
    ...base,
    dansEquipes: [...sans(base.dansEquipes), equipe],
    referentDe: m.referent ? [...sans(base.referentDe), equipe] : sans(base.referentDe),
  };
  if (equipe === "regie") return { ...out, lieuxRegie: lieuxDe(m) };
  return {
    ...out,
    sousEquipes: sousEquipesDe(m),
    referentSous: referentSousDe(m),
    lieuxLouange: lieuxDe(m),
    joue: joueDe(m),
  };
}
