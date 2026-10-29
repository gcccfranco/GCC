// Vue d'ensemble des musiciens (lot 16, D6) : jamais ressaisie, toujours
// calculée depuis deux sources déjà lues. La **présence** d'une case vient de
// `serviceRoles` (la catégorie est une clé du profil) ; son **libellé** vient
// du planning quand il nomme l'instrument, et retombe sur le rôle du profil
// sinon — mieux vaut « Musicien » que d'inventer un instrument.
//
// Retours du 06/10/2026 (« Musiciens montre tout le monde ») : la vue ne garde
// que les musiciens. Une case = les instruments que le planning nomme, sinon
// « Musicien » si le profil a ce rôle dans la catégorie ; présidence, chant,
// sono, PPT et régie n'y ont plus de case, et une ligne sans case disparaît.

import { EDD_CLASSES } from "@/lib/planning/utils";
import { findMyServices, type PlanningData } from "@/lib/planning/names";
import { joueDe, lieuxDe, sousEquipesDe } from "@/lib/equipes/louange";
import { INSTRUMENTS as LISTE_INSTRUMENTS, type Instrument, type MembreEquipe } from "@/types/equipe";
import { SERVICE_LIEUX, type ServiceLieu, type ServiceRole } from "@/types/user";

/** Les 8 colonnes, dans l'ordre du Sheet. */
export const COLONNES_MUSICIENS = [
  "paix", "bonte", "fidelite", "campus", "edd", "franco", "intergroupe", "interfranco",
] as const;
export type ColonneMusicien = (typeof COLONNES_MUSICIENS)[number];

/** Catégories de `serviceRoles` qui allument la colonne. */
const CATEGORIES: Record<ColonneMusicien, readonly string[]> = {
  paix: ["Groupe Paix"],
  bonte: ["Groupe Bonté"],
  fidelite: ["Groupe Fidélité"],
  campus: ["Campus"],
  edd: EDD_CLASSES,
  franco: ["Culte Francophone"],
  intergroupe: ["Intergroupe"],
  interfranco: ["Interfranco"],
};

/** Début du nom de service rendu par findMyServices (« Campus (matin) », « EDD 中班 »). */
const SERVICES: Record<ColonneMusicien, string> = {
  paix: "Groupe Paix",
  bonte: "Groupe Bonté",
  fidelite: "Groupe Fidélité",
  campus: "Campus",
  edd: "EDD",
  franco: "Culte Franco",
  intergroupe: "Intergroupe",
  interfranco: "Interfranco",
};

/** Instruments du planning retenus pour la vue des musiciens → clé de libellé
 *  (`equipes.role.<clé>`). Présidence, chant, sono, PPT, orateur… n'y sont pas. */
const INSTRUMENTS: Record<string, string> = {
  "Piano": "piano",
  "Guitare": "guitare",
  "Batterie": "batterie",
  "Cajon": "cajon",
  "Cajon/Batterie": "cajonBatterie",
};

/** Ordre du Sheet : piano, guitare, batterie ; « Musicien » sans instrument à la fin. */
const ORDRE = ["piano", "guitare", "batterie", "cajon", "cajonBatterie", "musicien"];

export type ProfilMusicien = {
  uid: string;
  firstName: string;
  lastName: string;
  planningName: string;
  serviceRoles: Record<string, string[]>;
};

export type LigneMusicien = {
  uid: string;
  nom: string;
  /** Clés de libellé par colonne ; tableau vide = pas de case. */
  cases: Record<ColonneMusicien, string[]>;
};

/** Une ligne par musicien (au moins une case) ; aucune écriture. */
export function matriceMusiciens(profils: ProfilMusicien[], data: PlanningData): LigneMusicien[] {
  const lignes = profils
    .filter((p) => Object.keys(p.serviceRoles).length > 0)
    .map((p) => {
      const services = findMyServices(data, p.planningName);
      const cases = {} as Record<ColonneMusicien, string[]>;
      for (const col of COLONNES_MUSICIENS) {
        const categories = CATEGORIES[col].filter((c) => c in p.serviceRoles);
        if (categories.length === 0) { cases[col] = []; continue; }
        const duPlanning = services
          .filter((s) => s.service.startsWith(SERVICES[col]))
          .map((s) => INSTRUMENTS[s.role])
          .filter(Boolean);
        const musicien = categories.some((c) => (p.serviceRoles[c] as ServiceRole[]).includes("musicien"));
        const duProfil = musicien ? ["musicien"] : [];
        const retenus = duPlanning.length ? duPlanning : duProfil;
        cases[col] = [...new Set(retenus)].sort((a, b) => ORDRE.indexOf(a) - ORDRE.indexOf(b));
      }
      const nom = `${p.firstName} ${p.lastName}`.trim() || p.planningName;
      return { uid: p.uid, nom, cases };
    })
    .filter((l) => COLONNES_MUSICIENS.some((c) => l.cases[c].length > 0));

  const rang = (l: LigneMusicien) => {
    const tous = COLONNES_MUSICIENS.flatMap((c) => l.cases[c]);
    const rangs = tous.map((r) => ORDRE.indexOf(r)).filter((i) => i >= 0);
    return rangs.length ? Math.min(...rangs) : ORDRE.length;
  };
  return lignes.sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom, "fr"));
}

// ─── Nouveau mode (lot AO-B) : la matrice vient de l'organigramme ────────────────────────────

export type LigneMusicienOrganigramme = {
  /** uid, ou le nom d'un membre sans compte. */
  cle: string;
  uid: string;
  nom: string;
  joue: Instrument[];
  lieux: ServiceLieu[];
};

/** Les membres de la sous-équipe Musiciens de Louange, avec ce qu'ils jouent et où ils servent (union si la
 *  personne figure plusieurs fois). Ni `serviceRoles` ni le planning. Piano, guitare… d'abord, puis par nom. */
export function matriceMusiciensOrganigramme(equipes: { id: string; membres: MembreEquipe[] }[]): LigneMusicienOrganigramme[] {
  const parCle = new Map<string, LigneMusicienOrganigramme>();
  for (const m of equipes.find((e) => e.id === "louange")?.membres ?? []) {
    if (!sousEquipesDe(m).includes("musiciens")) continue;
    const cle = m.uid || m.nom;
    const vu = parCle.get(cle);
    const joue = new Set([...(vu?.joue ?? []), ...joueDe(m)]);
    const lieux = new Set([...(vu?.lieux ?? []), ...lieuxDe(m)]);
    parCle.set(cle, {
      cle, uid: m.uid, nom: m.nom,
      joue: LISTE_INSTRUMENTS.filter((i) => joue.has(i)),
      lieux: SERVICE_LIEUX.filter((l) => lieux.has(l)),
    });
  }
  const rang = (l: LigneMusicienOrganigramme) => (l.joue.length ? LISTE_INSTRUMENTS.indexOf(l.joue[0]) : LISTE_INSTRUMENTS.length);
  return [...parCle.values()].sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom, "fr"));
}
