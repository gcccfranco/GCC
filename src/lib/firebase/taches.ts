import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import { viderGardesTableau } from "@/lib/tableauDeBord/gardes";
import type { EtatFois, Fois, Prevenir, Repetition, Tache } from "@/types/tache";

// Tâches par équipe (lot 7, docs/spec-taches.md ; lot 1 du chantier « équipes et groupes », EQ6) :
// equipes/{equipe}/taches/{id} et equipes/{equipe}/taches/{id}/fois/{date}, en REST comme le reste.
// Droits : firestore.rules (estDeLEquipe, estReferentDe) et src/lib/access.ts (estDeLEquipe,
// equipesOuCreer, peutCocher).

function docData(raw: RawDoc): { id: string; data: Record<string, unknown> } {
  return {
    id: raw.name.split("/").pop()!,
    data: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])),
  };
}

function fromFsTache(raw: RawDoc, equipe: string): Tache {
  const { id, data } = docData(raw);
  return {
    id,
    equipe,
    titre: (data.titre as string) ?? "",
    responsableUid: (data.responsableUid as string | null) ?? null,
    responsableNom: (data.responsableNom as string) ?? "",
    echeance: (data.echeance as string) ?? "",
    repetition: (data.repetition as Repetition | null) ?? null,
    lien: (data.lien as string) ?? "",
    note: (data.note as string) ?? "",
    prevenir: (data.prevenir as Prevenir) ?? null,
    evenement: (data.evenement as Tache["evenement"]) ?? null,
    auteurUid: (data.auteurUid as string) ?? "",
    createdAt: (data.createdAt as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
  };
}

function fromFsFois(raw: RawDoc): Fois {
  const { id, data } = docData(raw);
  return {
    date: (data.date as string) ?? id,
    parUid: (data.parUid as string) ?? "",
    parNom: (data.parNom as string) ?? "",
    le: (data.le as string) ?? "",
    // Un document d'avant le lot 13 n'a pas d'état : il était forcément terminé.
    etat: (data.etat as EtatFois) ?? "terminee",
    debutLe: (data.debutLe as string) ?? "",
  };
}

async function runQuery(parent: string, collectionId: string, orderBy: string): Promise<RawDoc[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${parent}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        orderBy: [{ field: { fieldPath: orderBy }, direction: "ASCENDING" }],
      },
    }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => r.document!);
}

const tachePath = (equipe: string, id: string) => `equipes/${equipe}/taches/${id}`;

export type TacheAvecFois = { tache: Tache; fois: Fois[] };

/** Tâches d'une équipe, sans leurs fois (le calendrier, lot U8, ne lit que celles de sa période). */
export async function listTachesSeules(equipe: string): Promise<Tache[]> {
  return (await runQuery(`equipes/${equipe}`, "taches", "echeance")).map((r) => fromFsTache(r, equipe));
}

/** Les fois cochées d'une tâche. */
export async function listFois(tache: Pick<Tache, "equipe" | "id">): Promise<Fois[]> {
  return (await runQuery(tachePath(tache.equipe, tache.id), "fois", "date")).map(fromFsFois);
}

/** Toutes les fois d'une équipe en une requête (lot LF, LF5, docs/spec-lectures-firestore.md) : collection
 *  group sous `equipes/{e}`, filtrée sur le champ `equipe` des documents (la règle s'appuie dessus).
 *  Rangées par tâche d'après leur chemin, par date croissante (tri ici : pas d'orderBy, qui demanderait
 *  un index composite). `null` si la requête est refusée (règle pas encore publiée) ou échoue. */
async function listFoisEquipe(equipe: string): Promise<Map<string, Fois[]> | null> {
  try {
    const headers = await authHeader();
    const res = await fetch(`${FS_BASE}/equipes/${equipe}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "fois", allDescendants: true }],
          where: { fieldFilter: { field: { fieldPath: "equipe" }, op: "EQUAL", value: { stringValue: equipe } } },
        },
      }),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ document?: RawDoc }>;
    const parTache = new Map<string, Fois[]>();
    for (const { document } of rows) {
      if (!document) continue;
      // …/documents/equipes/{e}/taches/{t}/fois/{date} : tout autre chemin est écarté.
      const m = document.name.match(/\/documents\/equipes\/([^/]+)\/taches\/([^/]+)\/fois\/[^/]+$/);
      if (!m || m[1] !== equipe) continue;
      const liste = parTache.get(m[2]) ?? [];
      liste.push(fromFsFois(document));
      parTache.set(m[2], liste);
    }
    for (const liste of parTache.values()) liste.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return parTache;
  } catch {
    return null;
  }
}

/** Tâches d'une équipe, avec les fois cochées de chacune : 2 requêtes quel que soit le nombre de tâches
 *  (lot LF, LF5) ; si la requête des fois est refusée, retombe sur une requête par tâche. */
export async function listTaches(equipe: string): Promise<TacheAvecFois[]> {
  const taches = await listTachesSeules(equipe);
  const parTache = await listFoisEquipe(equipe);
  if (parTache) return taches.map((tache) => ({ tache, fois: parTache.get(tache.id) ?? [] }));
  return Promise.all(taches.map(async (tache) => ({ tache, fois: await listFois(tache) })));
}

export type TacheValues = Omit<Tache, "id" | "equipe" | "auteurUid" | "createdAt" | "updatedAt">;

export async function createTache(equipe: string, values: TacheValues, auteurUid: string): Promise<string> {
  const now = new Date().toISOString();
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/equipes/${equipe}/taches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ ...values, equipe, auteurUid, createdAt: now, updatedAt: now }) }),
  });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

export async function updateTache(equipe: string, id: string, values: TacheValues): Promise<void> {
  const data = { ...values, updatedAt: new Date().toISOString() } as Record<string, unknown>;
  const headers = await authHeader();
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/${tachePath(equipe, id)}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  await checkRest(res);
}

async function remove(path: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${path}`, { method: "DELETE", headers });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  await checkRest(res);
}

/** Supprime la tâche et ses fois (Firestore ne supprime pas les sous-collections). */
export async function deleteTache(equipe: string, id: string, fois: Fois[]): Promise<void> {
  for (const f of fois) await remove(`${tachePath(equipe, id)}/fois/${f.date}`);
  await remove(tachePath(equipe, id));
}

/** Écrit l'état d'une fois (document nommé par sa date). */
async function ecrireFois(equipe: string, id: string, fois: Fois): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${tachePath(equipe, id)}/fois/${fois.date}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    // `equipe` : lot LF, LF5 (docs/spec-lectures-firestore.md), pour la requête unique des fois d'une équipe.
    body: JSON.stringify({ fields: toFsFields({ ...fois, equipe } as unknown as Record<string, unknown>) }),
  });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  await checkRest(res);
}

/** Cycle d'une échéance (lot 13) : À faire → En cours → Terminé → À faire, le
 *  retour à « À faire » supprimant le document. Renvoie le nouvel état (`null`
 *  = plus de document) : seul « terminee » prévient l'équipe suivante. */
export async function cyclerEtat(
  equipe: string,
  id: string,
  date: string,
  fois: Fois | null,
  par: { uid: string; nom: string },
): Promise<EtatFois | null> {
  if (fois && fois.etat === "terminee") {
    await remove(`${tachePath(equipe, id)}/fois/${date}`);
    return null;
  }
  const le = new Date().toISOString();
  const etat: EtatFois = fois ? "terminee" : "encours";
  await ecrireFois(equipe, id, { date, parUid: par.uid, parNom: par.nom, le, etat, debutLe: fois?.debutLe || le });
  return etat;
}

/** Déplacer une tâche unique (lot U8, C6) : son échéance seule (masque), et sa fois
 *  commencée, nommée par sa date, qui suit sous la nouvelle date. */
export async function deplacerTache(equipe: string, id: string, vers: string, fois: Fois | null): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${tachePath(equipe, id)}?updateMask.fieldPaths=echeance&updateMask.fieldPaths=updatedAt`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ echeance: vers, updatedAt: new Date().toISOString() }) }),
  });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  await checkRest(res);
  if (fois) {
    await ecrireFois(equipe, id, { ...fois, date: vers });
    await remove(`${tachePath(equipe, id)}/fois/${fois.date}`);
  }
}

/** L'état choisi sur la fiche d'une tâche (lot U4 bis, B4, Q8 : état à trois positions) :
 *  « À faire » (`null`) supprime le document, les deux autres l'écrivent, la date de début
 *  gardée. Mêmes documents que `cyclerEtat`. */
export async function choisirEtat(
  equipe: string,
  id: string,
  date: string,
  fois: Fois | null,
  etat: EtatFois | null,
  par: { uid: string; nom: string },
): Promise<void> {
  if (!etat) {
    if (fois) await remove(`${tachePath(equipe, id)}/fois/${date}`);
    return;
  }
  const le = new Date().toISOString();
  await ecrireFois(equipe, id, { date, parUid: par.uid, parNom: par.nom, le, etat, debutLe: fois?.debutLe || le });
}
