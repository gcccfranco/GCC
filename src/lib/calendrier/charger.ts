// Chargement des sources du calendrier (lot U8, tranche C3, docs/spec-calendrier.md).
// Branche les lecteurs existants sur `DonneesCalendrier` (C2) ; une source en
// panne n'empêche pas les autres de s'afficher. Firestore en REST seulement.
// Le Sheet des évènements se lit à part, par mois affiché (lireSheetEvenements).

import { isAdminUser, polesDe } from "@/lib/access";
import type { DonneesCalendrier, ProfilCalendrier } from "@/lib/calendrier/entrees";
import { getInscription, listEvenements } from "@/lib/firebase/evenements";
import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { getSetlists } from "@/lib/firebase/setlists";
import { listTaches } from "@/lib/firebase/taches";
import { lirePetitDej } from "@/lib/petitdej/lignes";
import { findMyServices, loadPlanningData, setlistSeances } from "@/lib/planning/names";
import { currentProgramme } from "@/lib/scene/dimanches";
import { planningsCasesVides } from "@/lib/tableauDeBord/donnees";
import { lireGrilles } from "@/lib/tableauDeBord/lecture";
import { TACHE_POLES } from "@/types/tache";

type Utilisateur = { uid: string; email?: string | null };

async function lireScene(today: string): Promise<DonneesCalendrier["scene"]> {
  const programme = currentProgramme(await listProgrammes(), today);
  return programme ? { programme, creneaux: await listCreneaux(programme.id) } : null;
}

/** Toutes les sources de Firestore et du planning, sauf le Sheet des évènements. */
export async function chargerCalendrier(
  user: Utilisateur,
  profile: ProfilCalendrier | null,
  today: string,
  /** Le widget ne montre ni setlists ni cases vides : il ne les lit pas (au tableau de bord, les
   *  setlists ne se lisent qu'une fois, pour « Ce dimanche » et « Setlists à préparer », U6). */
  { pourLeWidget = false }: { pourLeWidget?: boolean } = {},
): Promise<Omit<DonneesCalendrier, "sheet">> {
  const poles = isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile);
  const [planning, evenements, taches, scene, petitDej, setlists, grilles] = await Promise.all([
    loadPlanningData().catch(() => null),
    listEvenements(false).catch(() => []),
    Promise.all(poles.map((p) => listTaches(p).catch(() => []))).then((l) => l.flat()),
    lireScene(today).catch(() => null),
    // Lecteur de U3 : une lecture en échec donne null (rien, jamais « Libre »).
    lirePetitDej().catch(() => null),
    pourLeWidget ? [] : getSetlists().catch(() => []),
    // « Cases vides » : les plannings du widget 4 de U6 (qu'on remplit, sinon qu'on publie ; le Culte
    // pour un admin). Illisibles : aucune case vide annoncée.
    pourLeWidget ? undefined : lireGrilles(planningsCasesVides({}, user, profile)).catch(() => undefined),
  ]);
  // « Seulement moi » : les évènements où je suis inscrit (une lecture par évènement, comme l'agenda).
  const ouverts = evenements.filter((e) => !e.pour.startsWith("pole:") && !e.pour.startsWith("equipe:") && !e.lienExterne);
  const mesInscriptions = (
    await Promise.all(ouverts.map((e) => getInscription(e.id, user.uid).then((i) => (i ? e.id : null)).catch(() => null)))
  ).filter((id): id is string => id !== null);
  const nom = profile?.planningName?.trim() ?? "";
  return {
    seances: planning ? setlistSeances(planning) : [],
    mesServices: planning && nom ? findMyServices(planning, nom) : [],
    evenements,
    mesInscriptions,
    taches,
    scene,
    petitDej,
    setlists,
    grilles,
  };
}
