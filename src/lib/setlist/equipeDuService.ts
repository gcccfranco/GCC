// L'équipe d'un service, d'après le planning (lot U4 bis, B2, docs/spec-pages-en-grand.md, Q4) :
// la carte « L'équipe de ce service » de l'aperçu d'une setlist. Pure : les lignes du planning
// (`PlanningData`) et la setlist (catégorie, date, moment) donnent des paires [clé i18n du rôle,
// noms], dans l'ordre des colonnes de la feuille ; une case vide n'est pas rendue. Mêmes index
// que les tables de `lib/planning/names.ts` (CULTE_ROLES, GROUPE_ROLES…).

import type { PlanningData } from "@/lib/planning/names";
import { EDD_PERIODES } from "@/lib/planning/utils";

export type RoleEquipe = [cle: string, noms: string];

const r = (cle: string) => `planning.roles.${cle}`;
const joindre = (...cases: (string | undefined)[]) => cases.map((c) => c?.trim() ?? "").filter(Boolean).join(", ");

function ligne(rows: string[][], date: string): string[] | undefined {
  return rows.find((row) => row[0] === date);
}

function remplis(roles: [string, string | undefined][]): RoleEquipe[] {
  return roles.filter(([, v]) => !!v?.trim() && v.trim() !== "—").map(([cle, v]) => [cle, v!.trim()]);
}

export function equipeDuService(
  data: PlanningData,
  s: { category: string; date: string; moment?: "matin" | "soir" },
): RoleEquipe[] {
  const { category, date } = s;
  switch (category) {
    case "Culte Francophone": {
      const c = ligne(data.culte, date);
      if (!c) return [];
      return remplis([
        [r("presidence"), c[1]], [r("choristes"), joindre(c[2], c[3])], [r("piano"), c[4]], [r("guitare"), c[5]],
        [r("batterie"), c[6]], [r("sono"), c[7]], [r("ppt"), c[8]], [r("orateur"), c[9]], [r("trad"), c[10]],
        [r("sainteCene"), c[11]],
      ]);
    }
    case "Interfranco": {
      const c = ligne(data.interfranco, date);
      if (!c) return [];
      return remplis([
        [r("presidence"), c[1]], [r("choristes"), joindre(c[2], c[3])], [r("piano"), c[4]], [r("guitare"), c[5]],
        [r("cajonBatt"), c[6]], [r("sono"), c[7]], [r("ppt"), c[8]], [r("orateur"), c[9]], [r("trad"), c[10]],
      ]);
    }
    case "Intergroupe": {
      const c = ligne(data.intergroupe, date);
      if (!c) return [];
      return remplis([
        [r("presidence"), c[1]], [r("choristes"), joindre(c[2], c[3], c[4])], [r("piano"), c[5]], [r("guitare"), c[6]],
        [r("cajonBatt"), c[7]], [r("sono"), c[8]], [r("ppt"), c[9]], [r("orateur"), c[10]], [r("trad"), c[11]],
      ]);
    }
    case "Groupe Paix":
    case "Groupe Bonté": {
      const c = ligne(category === "Groupe Paix" ? data.paix : data.bonte, date);
      if (!c) return [];
      return remplis([[r("presidence"), c[1]], [r("musiciens"), c[2]], [r("percussion"), c[5]], [r("orateur"), c[3]]]);
    }
    case "Groupe Fidélité": {
      const f = ligne(data.fidelite, date);
      const m = ligne(data.fideliteMusic, date);
      if (!f && !m) return [];
      return remplis([
        [r("presidence"), f?.[1] || m?.[1]], [r("piano"), m?.[2] || f?.[4]], [r("guitare"), m?.[3]],
        [r("batterie"), m?.[4]], [r("orateur"), f?.[2]],
      ]);
    }
    case "Campus": {
      const seances = data.campus.filter((c) => c.date === date);
      const seance = s.moment
        ? seances.find((c) => (c.d.includes("Soir") ? "soir" : "matin") === s.moment)
        : seances.length === 1 ? seances[0] : undefined;
      if (!seance) return [];
      return remplis([[r("presidence"), seance.pres], [r("choristes"), seance.ch], [r("musiciens"), seance.mu], ["equipes.role.regie", seance.rg]]);
    }
    default: {
      // Une classe de l'EDD (中班, 大班, 高班) : sa ligne, quelle que soit la période.
      for (const pk of EDD_PERIODES) {
        const c = ligne(data.edd?.[pk]?.classes?.[category] ?? [], date);
        if (c) {
          return remplis([
            [r("presidence"), c[1]], [r("suppleant"), c[2]], [r("piano"), c[3]], [r("cajon"), c[4]],
            [r("guitare"), c[5]], [r("cours"), c[6]],
          ]);
        }
      }
      return [];
    }
  }
}
