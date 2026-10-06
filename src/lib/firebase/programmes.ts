import {
  FS_BASE,
  authHeader,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import { idEdition, type Fete } from "@/lib/scene/fetes";
import type { Creneau, Duree, Passage, Plage, Programme } from "@/types/programme";

// Programmes de scène (lot 3 bis) : programmes/{id} et programmes/{id}/creneaux/{cid},
// en REST comme le reste. Droits : firestore.rules (isCoordination) et
// src/lib/access.ts (isCoordination, canEditCreneau).

/** Événement `window` émis après toute écriture : la barre d'onglets se recharge. */
export const PROGRAMMES_CHANGED = "programmes-changed";

function docData(raw: RawDoc): { id: string; data: Record<string, unknown> } {
  return {
    id: raw.name.split("/").pop()!,
    data: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])),
  };
}

function fromFsProgramme(raw: RawDoc): Programme {
  const { id, data } = docData(raw);
  return {
    id,
    nom: (data.nom as string) ?? "",
    jourJ: (data.jourJ as string) ?? "",
    debut: (data.debut as string) ?? "",
    visible: (data.visible as boolean) ?? false,
    passages: (data.passages as Passage[]) ?? [],
    createdBy: (data.createdBy as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
    // Saison (lot U1) : seulement si le champ existe — absent = défaut de saisonDe.
    ...(data.fin != null && { fin: data.fin as string }),
    ...(data.plages != null && { plages: data.plages as Plage[] }),
    ...(data.duree != null && { duree: data.duree as Duree }),
    ...(data.quiAutorises != null && { quiAutorises: data.quiAutorises as string[] }),
    ...(data.ouvert != null && { ouvert: data.ouvert as boolean }),
    // Pâques · Noël : seulement si le champ existe — absent = déduit du jour J (feteDe).
    ...(data.fete != null && { fete: data.fete as Programme["fete"] }),
    ...(data.annee != null && { annee: data.annee as number }),
  };
}

function fromFsCreneau(raw: RawDoc): Creneau {
  const { id, data } = docData(raw);
  return {
    id,
    dimanche: (data.dimanche as string) ?? "",
    debut: (data.debut as string) ?? "",
    fin: (data.fin as string) ?? "",
    quoi: (data.quoi as string) ?? "",
    qui: (data.qui as string[]) ?? [],
    note: (data.note as string) ?? "",
    auteurUid: (data.auteurUid as string) ?? "",
    auteurNom: (data.auteurNom as string) ?? "",
    createdAt: (data.createdAt as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
  };
}

async function runQuery(parent: string, collectionId: string, orderBy: string): Promise<RawDoc[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}${parent ? `/${parent}` : ""}:runQuery`, {
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

async function post(path: string, data: Record<string, unknown>): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

/** PATCH limité aux champs donnés (updateMask) : le reste du document est conservé. */
async function patch(path: string, data: Record<string, unknown>): Promise<void> {
  const headers = await authHeader();
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/${path}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  await checkRest(res);
}

async function remove(path: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${path}`, { method: "DELETE", headers });
  await checkRest(res);
}

function changed(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROGRAMMES_CHANGED));
}

// ─── Programmes ──────────────────────────────────────────────────────────────

/** Tous les programmes, masqués compris, par jour J croissant. */
export async function listProgrammes(): Promise<Programme[]> {
  return (await runQuery("", "programmes", "jourJ")).map(fromFsProgramme);
}

export async function getProgramme(id: string): Promise<Programme | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/programmes/${id}`, { headers });
  if (!res.ok) return null;
  return fromFsProgramme((await res.json()) as RawDoc);
}

export async function createProgramme(data: Omit<Programme, "id">): Promise<string> {
  const id = await post("programmes", data as unknown as Record<string, unknown>);
  changed();
  return id;
}

/** Crée l'édition `{fete}-{annee}` (Q6) à la première action de la coordination : `data`
 *  (ses réglages, `reglagesRepris`, sans `visible` : Q11) plus `changement` (ce que la
 *  coordination vient de faire).
 *  Une autre coordination l'a créée entre-temps (409) : seul `changement` s'écrit sur le
 *  document existant. Rend l'identifiant. */
export async function creerEdition(
  fete: Fete,
  annee: number,
  data: Omit<Programme, "id" | "visible">,
  changement: Partial<Omit<Programme, "id" | "visible">> = {},
): Promise<string> {
  const id = idEdition(fete, annee);
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/programmes?documentId=${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ ...data, ...changement } as unknown as Record<string, unknown>) }),
  });
  if (res.status === 409) {
    if (Object.keys(changement).length) await updateProgramme(id, changement);
    return id;
  }
  await checkRest(res);
  changed();
  return id;
}

export async function updateProgramme(id: string, data: Partial<Omit<Programme, "id">>): Promise<void> {
  await patch(`programmes/${id}`, { ...data, updatedAt: new Date().toISOString() });
  changed();
}

/** Supprime le programme et ses créneaux (Firestore ne supprime pas les sous-collections). */
export async function deleteProgramme(id: string): Promise<void> {
  for (const c of await listCreneaux(id)) await remove(`programmes/${id}/creneaux/${c.id}`);
  await remove(`programmes/${id}`);
  changed();
}

// ─── Créneaux ────────────────────────────────────────────────────────────────

/** Créneaux d'un programme, par dimanche croissant (puis heure, côté client). */
export async function listCreneaux(programmeId: string): Promise<Creneau[]> {
  const rows = (await runQuery(`programmes/${programmeId}`, "creneaux", "dimanche")).map(fromFsCreneau);
  return rows.sort((a, b) => (a.dimanche + a.debut).localeCompare(b.dimanche + b.debut));
}

export async function createCreneau(programmeId: string, data: Omit<Creneau, "id">): Promise<string> {
  return post(`programmes/${programmeId}/creneaux`, data as unknown as Record<string, unknown>);
}

export async function updateCreneau(
  programmeId: string,
  id: string,
  data: Partial<Omit<Creneau, "id">>,
): Promise<void> {
  await patch(`programmes/${programmeId}/creneaux/${id}`, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteCreneau(programmeId: string, id: string): Promise<void> {
  await remove(`programmes/${programmeId}/creneaux/${id}`);
}
