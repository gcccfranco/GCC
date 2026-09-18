// Vue d'ensemble des musiciens (lot 16, D6) : jamais ressaisie, toujours
// calculée depuis deux sources déjà lues. La **présence** d'une case vient de
// `serviceRoles` (la catégorie est une clé du profil) ; son **libellé** vient
// du planning quand il nomme l'instrument, et retombe sur le rôle du profil
// sinon — mieux vaut « Musicien » que d'inventer un instrument.

import { EDD_CLASSES } from "@/lib/planning/utils";
import { findMyServices, type PlanningData } from "@/lib/planning/names";
import type { ServiceRole } from "@/types/user";

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

/** Rôles du planning retenus pour la vue des musiciens → clé de libellé
 *  (`equipes.role.<clé>`). Orateur, traduction et repas n'y ont pas leur place. */
const ROLES_PLANNING: Record<string, string> = {
  "Présidence": "presidence",
  "Choriste": "choriste",
  "Piano": "piano",
  "Guitare": "guitare",
  "Batterie": "batterie",
  "Cajon": "cajon",
  "Cajon/Batterie": "cajonBatterie",
  "Sono": "sono",
  "PPT": "ppt",
};

const ROLES_PROFIL: Record<ServiceRole, string> = {
  chanteur: "choriste",
  musicien: "musicien",
  presidence: "presidence",
  regie: "regie",
};

/** Groupement du Sheet : chant d'abord, puis piano, guitare, batterie. */
const ORDRE = [
  "choriste", "piano", "guitare", "batterie", "cajon", "cajonBatterie",
  "presidence", "sono", "ppt", "musicien", "regie",
];

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

/** Une ligne par compte servant au moins quelque part ; aucune écriture. */
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
          .map((s) => ROLES_PLANNING[s.role])
          .filter(Boolean);
        const duProfil = categories
          .flatMap((c) => p.serviceRoles[c] as ServiceRole[])
          .map((r) => ROLES_PROFIL[r])
          .filter(Boolean);
        const retenus = duPlanning.length ? duPlanning : duProfil;
        cases[col] = [...new Set(retenus)].sort((a, b) => ORDRE.indexOf(a) - ORDRE.indexOf(b));
      }
      const nom = `${p.firstName} ${p.lastName}`.trim() || p.planningName;
      return { uid: p.uid, nom, cases };
    });

  const rang = (l: LigneMusicien) => {
    const tous = COLONNES_MUSICIENS.flatMap((c) => l.cases[c]);
    const rangs = tous.map((r) => ORDRE.indexOf(r)).filter((i) => i >= 0);
    return rangs.length ? Math.min(...rangs) : ORDRE.length;
  };
  return lignes.sort((a, b) => rang(a) - rang(b) || a.nom.localeCompare(b.nom, "fr"));
}
