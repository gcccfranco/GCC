// Lecture des sources de Salles (docs/spec-salles.md, § Modèle, lot 2) : les services du planning (pour la variante du
// dimanche, AR13) et les éditions affichées des fêtes avec leurs créneaux de scène (SA13, lecture seule), comme le
// Calendrier (`src/lib/calendrier/charger.ts`). Une source en panne n'empêche pas l'autre : `echec` le dit. Firestore
// en REST seulement.

import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { loadPlanningData, type PlanningData } from "@/lib/planning/names";
import { editionsAffichees } from "@/lib/scene/fetes";
import type { SourcesSalles } from "./occupations";

/** Les services qui changent la variante d'un dimanche : les dates d'Intergroupe et d'Interfranco du planning. */
export function servicesDeVariante(planning: Pick<PlanningData, "intergroupe" | "interfranco">): SourcesSalles["services"] {
  return [
    ...planning.intergroupe.filter((r) => r[0]).map((r) => ({ date: r[0], service: "Intergroupe" })),
    ...planning.interfranco.filter((r) => r[0]).map((r) => ({ date: r[0], service: "Interfranco" })),
  ];
}

export async function chargerSalles(today: string): Promise<{ sources: SourcesSalles; echec: boolean }> {
  let echec = false;
  const [services, scene] = await Promise.all([
    loadPlanningData().then(servicesDeVariante).catch(() => { echec = true; return []; }),
    listProgrammes()
      .then((programmes) => Promise.all(editionsAffichees(programmes, today).map(async ({ programme }) => ({
        programme: programme!, creneaux: await listCreneaux(programme!.id),
      }))))
      .catch(() => { echec = true; return []; }),
  ]);
  return { sources: { services, scene }, echec };
}
