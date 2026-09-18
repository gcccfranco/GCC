import {
  FS_BASE,
  authHeader,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import type { Evenement, Inscription } from "@/types/evenement";
import { modeInscriptions } from "@/lib/evenements/agenda";

// Évènements (lot 6) : evenements/{id} et evenements/{id}/inscriptions/{iid},
// en REST. Sans compte, seule la requête filtrée « pour = eglise » est
// autorisée par les règles ; connecté, on lit tout et on filtre par profil
// (src/lib/access.ts, canSeeEvenement). Les inscriptions et le compteur
// `inscrits` ne s'écrivent que par le serveur (/api/evenements/*).

/** Événement `window` émis après toute écriture : cloche et pages se rechargent. */
export const EVENEMENTS_CHANGED = "evenements-changed";

function docData(raw: RawDoc): { id: string; data: Record<string, unknown> } {
  return {
    id: raw.name.split("/").pop()!,
    data: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])),
  };
}

export function fromFsEvenement(raw: RawDoc): Evenement {
  const { id, data } = docData(raw);
  return {
    id,
    titre: (data.titre as string) ?? "",
    type: (data.type as Evenement["type"]) ?? "loisir",
    pour: (data.pour as Evenement["pour"]) ?? "eglise",
    date: (data.date as string) ?? "",
    heure: (data.heure as string) ?? "",
    heureFin: (data.heureFin as string) ?? "",
    dateFin: (data.dateFin as string) ?? "",
    lieu: (data.lieu as string) ?? "",
    description: (data.description as string) ?? "",
    liens: (data.liens as Evenement["liens"]) ?? [],
    images: (data.images as string[]) ?? [],
    placesMax: typeof data.placesMax === "number" ? data.placesMax : null,
    inscriptions: modeInscriptions({
      inscriptions: data.inscriptions as Evenement["inscriptions"],
      inscriptionOuverte: (data.inscriptionOuverte as boolean) ?? false,
    }),
    inscriptionDebut: (data.inscriptionDebut as string) ?? "",
    inscriptionFin: (data.inscriptionFin as string) ?? "",
    sansCompte: (data.sansCompte as boolean) ?? false,
    lienExterne: (data.lienExterne as string) ?? "",
    contact: (data.contact as string) ?? "",
    organisateurUid: (data.organisateurUid as string) ?? "",
    organisateurNom: (data.organisateurNom as string) ?? "",
    epingle: (data.epingle as boolean) ?? false,
    expiresAt: (data.expiresAt as string | null) ?? null,
    inscrits: typeof data.inscrits === "number" ? data.inscrits : 0,
    createdAt: (data.createdAt as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
  };
}

function fromFsInscription(raw: RawDoc): Inscription {
  const { id, data } = docData(raw);
  return {
    id,
    uid: (data.uid as string | null) ?? null,
    nom: (data.nom as string) ?? "",
    invites: typeof data.invites === "number" ? data.invites : 0,
    createdAt: (data.createdAt as string) ?? "",
  };
}

async function runQuery(parent: string, structuredQuery: Record<string, unknown>): Promise<RawDoc[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}${parent ? `/${parent}` : ""}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => r.document!);
}

/** Tous les évènements lisibles : `publicOnly` (sans compte) = « pour = eglise » seulement. */
export async function listEvenements(publicOnly: boolean): Promise<Evenement[]> {
  const query: Record<string, unknown> = {
    from: [{ collectionId: "evenements" }],
    orderBy: [{ field: { fieldPath: "date" }, direction: "ASCENDING" }],
  };
  if (publicOnly) {
    query.where = { fieldFilter: { field: { fieldPath: "pour" }, op: "EQUAL", value: { stringValue: "eglise" } } };
  }
  return (await runQuery("", query)).map(fromFsEvenement);
}

/** Évènements créés après `sinceMs` (cloche), les plus récents d'abord, bornés à `max`.
 *  `createdAt` est une chaîne ISO : la comparaison de texte suit l'ordre du temps. */
export async function getEvenementsSince(sinceMs: number, max: number): Promise<Evenement[]> {
  const query: Record<string, unknown> = {
    from: [{ collectionId: "evenements" }],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "DESCENDING" }],
    limit: max,
  };
  if (sinceMs > 0) {
    query.where = { fieldFilter: { field: { fieldPath: "createdAt" }, op: "GREATER_THAN", value: { stringValue: new Date(sinceMs).toISOString() } } };
  }
  return (await runQuery("", query)).map(fromFsEvenement);
}

export async function getEvenement(id: string): Promise<Evenement | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${id}`, { headers });
  if (!res.ok) return null;
  return fromFsEvenement((await res.json()) as RawDoc);
}

/** Ma place à un évènement (document inscriptions/{uid}), ou null. */
export async function getInscription(evenementId: string, uid: string): Promise<Inscription | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${evenementId}/inscriptions/${uid}`, { headers });
  if (!res.ok) return null;
  return fromFsInscription((await res.json()) as RawDoc);
}

/** Inscriptions d'un évènement — lisibles par l'organisateur et la coordination (règles). */
export async function listInscriptions(evenementId: string): Promise<Inscription[]> {
  return (await runQuery(`evenements/${evenementId}`, {
    from: [{ collectionId: "inscriptions" }],
    orderBy: [{ field: { fieldPath: "createdAt" }, direction: "ASCENDING" }],
  })).map(fromFsInscription);
}

function changed(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENEMENTS_CHANGED));
}

export async function createEvenement(data: Omit<Evenement, "id">): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data as unknown as Record<string, unknown>) }),
  });
  await checkRest(res);
  changed();
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

/** Modification limitée aux champs donnés (updateMask) ; `inscrits` n'en fait jamais partie. */
export async function updateEvenement(id: string, data: Partial<Omit<Evenement, "id" | "inscrits">>): Promise<void> {
  const fields = { ...data, updatedAt: new Date().toISOString() };
  const headers = await authHeader();
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/evenements/${id}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(fields) }),
  });
  await checkRest(res);
  changed();
}

export async function deleteEvenement(id: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${id}`, { method: "DELETE", headers });
  await checkRest(res);
  changed();
}
