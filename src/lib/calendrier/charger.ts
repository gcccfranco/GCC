// Chargement des sources du calendrier (lot U8, tranche C3, docs/spec-calendrier.md ; relecture
// du 05/10/2026). Deux temps, pour que le coût ne croisse pas avec l'histoire :
// - `chargerCalendrier`, une fois par ouverture : planning, évènements, tâches SANS leurs fois,
//   scène, petit déj, setlists, cases vides ;
// - `chargerPeriode`, pour la période affichée : les fois des seules tâches qui y ont une
//   échéance, et mes inscriptions aux évènements ouverts qui y tombent — seulement pour
//   « Seulement moi », seul à s'en servir.
// Une source en panne n'empêche pas les autres de s'afficher, et se nomme (`echecs` : bandeau
// de la page, ligne du widget). Firestore en REST seulement. Le Sheet des évènements se lit à
// part, par période affichée (lireSheetEvenements).

import { estReunion, isAdminUser, polesDe } from "@/lib/access";
import { ORDRE_PASTILLES, type DonneesCalendrier, type ProfilCalendrier, type SourceCalendrier } from "@/lib/calendrier/entrees";
import { getInscription, listEvenements } from "@/lib/firebase/evenements";
import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { getSetlists } from "@/lib/firebase/setlists";
import { listFois, listTachesSeules } from "@/lib/firebase/taches";
import { lirePetitDej } from "@/lib/petitdej/lignes";
import { findMyServices, loadPlanningData, setlistSeances } from "@/lib/planning/names";
import { editionsAffichees } from "@/lib/scene/fetes";
import { planningsCasesVides } from "@/lib/tableauDeBord/donnees";
import { lireGrilles } from "@/lib/tableauDeBord/lecture";
import { echeancesDe } from "@/lib/taches/echeances";
import type { Evenement } from "@/types/evenement";
import { TACHE_POLES, type Tache } from "@/types/tache";

type Utilisateur = { uid: string; email?: string | null };

/** Ce qui se lit une fois : tout sauf le Sheet, les fois des tâches et mes inscriptions. */
export type BaseCalendrier = Omit<DonneesCalendrier, "sheet" | "taches" | "mesInscriptions"> & { taches: Tache[] };

/** Une lecture et les sources qu'elle n'a pas pu lire, dans l'ordre des pastilles. */
export interface LectureCalendrier {
  base: BaseCalendrier;
  echecs: SourceCalendrier[];
}

/** Les sources en échec, une fois chacune, dans l'ordre des pastilles. */
export const enOrdre = (echecs: Iterable<SourceCalendrier>): SourceCalendrier[] => {
  const vues = new Set(echecs);
  return ORDRE_PASTILLES.filter((s) => vues.has(s));
};

/** Les éditions affichées des deux fêtes (Q10), chacune avec ses créneaux. */
async function lireScene(today: string): Promise<DonneesCalendrier["scene"]> {
  const editions = editionsAffichees(await listProgrammes(), today);
  return Promise.all(editions.map(async ({ programme }) => ({ programme: programme!, creneaux: await listCreneaux(programme!.id) })));
}

/** Toutes les sources de Firestore et du planning, sauf le Sheet des évènements ; les tâches sans leurs fois. */
export async function chargerCalendrier(
  user: Utilisateur,
  profile: ProfilCalendrier | null,
  today: string,
  /** Le widget ne montre ni setlists ni cases vides : il ne les lit pas (au tableau de bord, les
   *  setlists ne se lisent qu'une fois, pour « Ce dimanche » et « Setlists à préparer », U6). */
  { pourLeWidget = false }: { pourLeWidget?: boolean } = {},
): Promise<LectureCalendrier> {
  const poles = isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile);
  const echecs: SourceCalendrier[] = [];
  /** Une lecture qui rejette (réseau coupé, Firestore bloqué) : sa valeur vide, et sa source nommée. */
  const sinon = <T,>(vide: T, ...sources: SourceCalendrier[]) => (): T => {
    echecs.push(...sources);
    return vide;
  };
  const [planning, evenements, taches, scene, petitDej, setlists, grilles] = await Promise.all([
    loadPlanningData().catch(sinon(null, "services")),
    listEvenements(false).catch(sinon<Evenement[]>([], "evenements", "reunions")),
    Promise.all(poles.map((p) => listTachesSeules(p).catch(sinon<Tache[]>([], "taches")))).then((l) => l.flat()),
    lireScene(today).catch(sinon([], "scene")),
    // Lecteur de U3 : une lecture en échec donne null (rien, jamais « Libre »).
    lirePetitDej().catch(sinon(null, "petitDej")),
    pourLeWidget ? [] : getSetlists().catch(sinon([], "setlists")),
    // « Cases vides » : les plannings du widget 4 de U6 (qu'on remplit, sinon qu'on publie ; le Culte
    // pour un admin). Illisibles : aucune case vide annoncée.
    pourLeWidget ? undefined : lireGrilles(planningsCasesVides({}, user, profile)).catch(() => undefined),
  ]);
  const nom = profile?.planningName?.trim() ?? "";
  return {
    base: {
      seances: planning ? setlistSeances(planning) : [],
      mesServices: planning && nom ? findMyServices(planning, nom) : [],
      evenements,
      taches,
      scene,
      petitDej,
      setlists,
      grilles,
    },
    echecs: enOrdre(echecs),
  };
}

/** Un évènement qui touche la période (un jour au moins de `date` à `dateFin`). */
const touche = (e: Evenement, debut: string, fin: string) => {
  const dernier = e.dateFin && e.dateFin > e.date ? e.dateFin : e.date;
  return !!e.date && e.date <= fin && dernier >= debut;
};

/** Les données de la période `debut` → `fin` : les fois des tâches qui y ont une échéance (les
 *  autres n'y ont pas d'entrée) ; mes inscriptions, aux évènements ouverts qui y tombent, pour
 *  « Seulement moi » seulement (sinon aucune lecture). */
export async function chargerPeriode(
  base: BaseCalendrier,
  uid: string,
  debut: string,
  fin: string,
  { seulementMoi }: { seulementMoi: boolean },
): Promise<{ donnees: Omit<DonneesCalendrier, "sheet">; echecs: SourceCalendrier[] }> {
  const echecs: SourceCalendrier[] = [];
  const [taches, inscrits] = await Promise.all([
    Promise.all(base.taches.map(async (tache) => ({
      tache,
      fois: echeancesDe(tache, debut, fin).length === 0
        ? []
        : await listFois(tache).catch(() => { echecs.push("taches"); return []; }),
    }))),
    Promise.all((seulementMoi ? base.evenements : [])
      .filter((e) => !estReunion(e) && !e.lienExterne && touche(e, debut, fin))
      .map((e) => getInscription(e.id, uid)
        .then((i) => (i ? e.id : null))
        .catch(() => { echecs.push("evenements"); return null; }))),
  ]);
  return {
    donnees: { ...base, taches, mesInscriptions: inscrits.filter((id): id is string => id !== null) },
    echecs: enOrdre(echecs),
  };
}
