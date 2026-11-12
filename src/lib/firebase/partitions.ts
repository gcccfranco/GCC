import { delaiMax } from "@/lib/delaiMax";
import { FS_BASE, authHeader, checkRest, fromFsValue, toFsFields, type RawDoc } from "@/lib/firebase/setlists";
import { repairCopyIds } from "@/lib/setlist/sectionOrigins";
import type { ChoixPartitions, Partition } from "@/types/partition";

// Ma partition (docs/spec-ma-partition.md, « Rangement ») : `partitions/{uid}__{songSlug}`, un document par personne
// et par chant, et `partitions/{uid}__choix` pour le choix de lecture. Lu par son propriétaire ou les personnes de
// `sharedWith`, écrit par son propriétaire seul (firestore.rules ; miroir client : canLirePartition /
// canEcrirePartition dans src/lib/access.ts).

/** Id d'une partition (propriétaire + chant). */
export function idPartition(uid: string, slug: string): string {
  return `${uid}__${slug}`;
}

const idChoix = (uid: string) => idPartition(uid, "choix");

function fieldsToObject(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, fromFsValue(v)]));
}

/** Une partition avec le chant qu'elle range (le `songSlug` vient de l'id du document, il n'y est pas écrit). */
export type PartitionDeChant = Partition & { slug: string };

function versPartition(doc: RawDoc): PartitionDeChant {
  const id = decodeURIComponent(doc.name.split("/").pop()!);
  const d = fieldsToObject(doc.fields);
  const content = (d.content as string | null) ?? null;
  const sectionOrigins = (d.sectionOrigins as Record<string, string> | null) ?? undefined;
  const jianpuChords = (d.jianpuChords as Partition["jianpuChords"] | null) ?? undefined;
  return {
    slug: id.slice(id.indexOf("__") + 2),
    ownerUid: String(d.ownerUid ?? ""),
    ownerName: String(d.ownerName ?? ""),
    base: (d.base as string | null) ?? null,
    // Même réparation à la lecture que les versions perso (« Seulement ce passage »).
    content: content && sectionOrigins ? repairCopyIds(content, sectionOrigins) : content,
    structure: (d.structure as string[] | null) ?? null,
    ...(sectionOrigins ? { sectionOrigins } : {}),
    ...(jianpuChords ? { jianpuChords } : {}),
    key: (d.key as string | null) ?? null,
    traits: (d.traits as Partition["traits"] | null) ?? [],
    sharedWith: (d.sharedWith as string[] | null) ?? [],
    sharedTraits: d.sharedTraits === true,
    ...(d.updatedAt ? { updatedAt: d.updatedAt as Date } : {}),
  };
}

/** Ma partition de ce chant ; `null` = document absent (404). Une lecture impossible (réseau, 5xx, refus) LÈVE :
 *  l'appelant n'initialise pas à vide et n'enregistre rien, sinon la première retouche écraserait les anciennes. */
export async function lirePartition(uid: string, slug: string): Promise<PartitionDeChant | null> {
  const res = await fetch(`${FS_BASE}/partitions/${encodeURIComponent(idPartition(uid, slug))}`, {
    headers: await authHeader(),
    signal: delaiMax(10_000),
  });
  if (res.status === 404) return null;
  await checkRest(res);
  return versPartition((await res.json()) as RawDoc);
}

/** Les partitions où mon uid figure dans `sharedWith`. Lève si la requête échoue. */
export async function lirePartitionsPartageesAvecMoi(uid: string): Promise<PartitionDeChant[]> {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "partitions" }],
        where: { fieldFilter: { field: { fieldPath: "sharedWith" }, op: "ARRAY_CONTAINS", value: { stringValue: uid } } },
      },
    }),
    signal: delaiMax(10_000),
  });
  await checkRest(res);
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => versPartition(r.document!));
}

/** Toutes mes partitions (`ownerUid == uid`) ; le document de choix n'a pas de `ownerUid`, il n'en est pas. Lève si la requête échoue. */
export async function lireMesPartitions(uid: string): Promise<PartitionDeChant[]> {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "partitions" }],
        where: { fieldFilter: { field: { fieldPath: "ownerUid" }, op: "EQUAL", value: { stringValue: uid } } },
      },
    }),
    signal: delaiMax(10_000),
  });
  await checkRest(res);
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => versPartition(r.document!));
}

/** Erreur d'écriture portant le statut HTTP (absent = le réseau a échoué avant toute réponse) : la file hors ligne
 *  distingue ainsi un 5xx, qui se rejoue, d'un refus, qui se remonte. */
export type ErreurEcriture = Error & { status?: number };

async function verifier(res: Response): Promise<void> {
  try {
    await checkRest(res);
  } catch (e) {
    throw Object.assign(e as Error, { status: res.status });
  }
}

/** Réécrit le document en entier ; `updatedAt` est horodaté ici. Lève si l'écriture échoue. */
export async function enregistrerPartition(p: PartitionDeChant): Promise<void> {
  const { slug, updatedAt: _ignore, ...doc } = p;
  void _ignore;
  const propres = Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== undefined));
  const res = await fetch(`${FS_BASE}/partitions/${encodeURIComponent(idPartition(p.ownerUid, slug))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      fields: { ...toFsFields(propres), updatedAt: { timestampValue: new Date().toISOString() } },
    }),
    signal: delaiMax(10_000),
  });
  await verifier(res);
}

export async function supprimerPartition(uid: string, slug: string): Promise<void> {
  const res = await fetch(`${FS_BASE}/partitions/${encodeURIComponent(idPartition(uid, slug))}`, {
    method: "DELETE",
    headers: await authHeader(),
    signal: delaiMax(10_000),
  });
  await checkRest(res);
}

/** Mon choix de lecture ; `null` = pas encore de document. Lève si la lecture échoue. */
export async function lireChoix(uid: string): Promise<ChoixPartitions | null> {
  const res = await fetch(`${FS_BASE}/partitions/${encodeURIComponent(idChoix(uid))}`, {
    headers: await authHeader(),
    signal: delaiMax(10_000),
  });
  if (res.status === 404) return null;
  await checkRest(res);
  const d = fieldsToObject(((await res.json()) as RawDoc).fields);
  return {
    choices: (d.choices as ChoixPartitions["choices"] | null) ?? {},
    partageTout: (d.partageTout as string[] | null) ?? [],
  };
}

export async function enregistrerChoix(uid: string, choix: ChoixPartitions): Promise<void> {
  const res = await fetch(`${FS_BASE}/partitions/${encodeURIComponent(idChoix(uid))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      fields: { ...toFsFields({ choices: choix.choices, partageTout: choix.partageTout }), updatedAt: { timestampValue: new Date().toISOString() } },
    }),
    signal: delaiMax(10_000),
  });
  await checkRest(res);
}
