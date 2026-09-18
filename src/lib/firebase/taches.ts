import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import type { EtatFois, Fois, Prevenir, Repetition, Tache, TachePole } from "@/types/tache";

// Tâches par pôle (lot 7, docs/spec-taches.md) : poles/{pole}/taches/{id} et
// poles/{pole}/taches/{id}/fois/{date}, en REST comme le reste. Droits :
// firestore.rules (isTachePole) et src/lib/access.ts (isPoleMember).

function docData(raw: RawDoc): { id: string; data: Record<string, unknown> } {
  return {
    id: raw.name.split("/").pop()!,
    data: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])),
  };
}

function fromFsTache(raw: RawDoc, pole: TachePole): Tache {
  const { id, data } = docData(raw);
  return {
    id,
    pole,
    titre: (data.titre as string) ?? "",
    responsableUid: (data.responsableUid as string | null) ?? null,
    responsableNom: (data.responsableNom as string) ?? "",
    echeance: (data.echeance as string) ?? "",
    repetition: (data.repetition as Repetition | null) ?? null,
    lien: (data.lien as string) ?? "",
    note: (data.note as string) ?? "",
    prevenir: (data.prevenir as Prevenir) ?? null,
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

const tachePath = (pole: TachePole, id: string) => `poles/${pole}/taches/${id}`;

export type TacheAvecFois = { tache: Tache; fois: Fois[] };

/** Tâches d'un pôle, avec les fois cochées de chacune. */
export async function listTaches(pole: TachePole): Promise<TacheAvecFois[]> {
  const taches = (await runQuery(`poles/${pole}`, "taches", "echeance")).map((r) => fromFsTache(r, pole));
  return Promise.all(
    taches.map(async (tache) => ({
      tache,
      fois: (await runQuery(tachePath(pole, tache.id), "fois", "date")).map(fromFsFois),
    })),
  );
}

export type TacheValues = Omit<Tache, "id" | "pole" | "auteurUid" | "createdAt" | "updatedAt">;

export async function createTache(pole: TachePole, values: TacheValues, auteurUid: string): Promise<string> {
  const now = new Date().toISOString();
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/poles/${pole}/taches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ ...values, pole, auteurUid, createdAt: now, updatedAt: now }) }),
  });
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

export async function updateTache(pole: TachePole, id: string, values: TacheValues): Promise<void> {
  const data = { ...values, updatedAt: new Date().toISOString() } as Record<string, unknown>;
  const headers = await authHeader();
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/${tachePath(pole, id)}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  await checkRest(res);
}

async function remove(path: string): Promise<void> {
  const headers = await authHeader();
  await checkRest(await fetch(`${FS_BASE}/${path}`, { method: "DELETE", headers }));
}

/** Supprime la tâche et ses fois (Firestore ne supprime pas les sous-collections). */
export async function deleteTache(pole: TachePole, id: string, fois: Fois[]): Promise<void> {
  for (const f of fois) await remove(`${tachePath(pole, id)}/fois/${f.date}`);
  await remove(tachePath(pole, id));
}

/** Écrit l'état d'une fois (document nommé par sa date). */
async function ecrireFois(pole: TachePole, id: string, fois: Fois): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${tachePath(pole, id)}/fois/${fois.date}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(fois as unknown as Record<string, unknown>) }),
  });
  await checkRest(res);
}

/** Cycle d'une échéance (lot 13) : À faire → En cours → Terminé → À faire, le
 *  retour à « À faire » supprimant le document. Renvoie le nouvel état (`null`
 *  = plus de document) : seul « terminee » prévient le pôle suivant. */
export async function cyclerEtat(
  pole: TachePole,
  id: string,
  date: string,
  fois: Fois | null,
  par: { uid: string; nom: string },
): Promise<EtatFois | null> {
  if (fois && fois.etat === "terminee") {
    await remove(`${tachePath(pole, id)}/fois/${date}`);
    return null;
  }
  const le = new Date().toISOString();
  const etat: EtatFois = fois ? "terminee" : "encours";
  await ecrireFois(pole, id, { date, parUid: par.uid, parNom: par.nom, le, etat, debutLe: fois?.debutLe || le });
  return etat;
}
