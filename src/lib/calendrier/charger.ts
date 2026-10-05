// Chargement des sources du calendrier (lot U8, tranche C3, docs/spec-calendrier.md).
// Branche les lecteurs existants sur `DonneesCalendrier` (C2) ; une source en
// panne n'empêche pas les autres de s'afficher. Firestore en REST seulement.
// Le Sheet des évènements se lit à part, par mois affiché (lireSheetEvenements).

import { isAdminUser, polesDe } from "@/lib/access";
import type { DonneesCalendrier, LignePetitDejCalendrier, ProfilCalendrier } from "@/lib/calendrier/entrees";
import { getInscription, listEvenements } from "@/lib/firebase/evenements";
import { listCreneaux, listProgrammes } from "@/lib/firebase/programmes";
import { FS_BASE, authHeader, getSetlists } from "@/lib/firebase/setlists";
import { listTaches } from "@/lib/firebase/taches";
import { findMyServices, loadPlanningData, setlistSeances } from "@/lib/planning/names";
import { currentProgramme } from "@/lib/scene/dimanches";
import { TACHE_POLES } from "@/types/tache";

type Utilisateur = { uid: string; email?: string | null };
type Doc = { name: string; fields?: Record<string, { stringValue?: string }> };

/**
 * Lignes `petitDej/{id}` (forme de U3). **Une lecture en échec est une
 * erreur** (jamais « Libre »). À remplacer par `lirePetitDej` de U3
 * (`src/lib/petitdej/lignes.ts`) quand les deux lots se rejoignent.
 */
async function lirePetitDej(): Promise<LignePetitDejCalendrier[]> {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "petitDej" }] } }),
  });
  if (!res.ok) throw new Error(`petitDej illisible (HTTP ${res.status})`);
  return ((await res.json()) as { document?: Doc }[]).flatMap(({ document }) => {
    const champ = (cle: string) => document?.fields?.[cle]?.stringValue ?? "";
    if (!document || !champ("dimanche")) return [];
    return [{ id: document.name.split("/").pop()!, dimanche: champ("dimanche"), nom: champ("nom"), uid: champ("uid") }];
  });
}

async function lireScene(today: string): Promise<DonneesCalendrier["scene"]> {
  const programme = currentProgramme(await listProgrammes(), today);
  return programme ? { programme, creneaux: await listCreneaux(programme.id) } : null;
}

/** Toutes les sources de Firestore et du planning, sauf le Sheet des évènements. */
export async function chargerCalendrier(
  user: Utilisateur,
  profile: ProfilCalendrier | null,
  today: string,
): Promise<Omit<DonneesCalendrier, "sheet">> {
  const poles = isAdminUser(user) ? [...TACHE_POLES] : polesDe(profile);
  const [planning, evenements, taches, scene, petitDej, setlists] = await Promise.all([
    loadPlanningData().catch(() => null),
    listEvenements(false).catch(() => []),
    Promise.all(poles.map((p) => listTaches(p).catch(() => []))).then((l) => l.flat()),
    lireScene(today).catch(() => null),
    lirePetitDej().catch(() => null),
    getSetlists().catch(() => []),
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
  };
}
