import { delaiMax } from "@/lib/delaiMax";
import { FS_BASE, authHeader } from "@/lib/firebase/setlists";

function docId(userId: string, setlistId: string, pageKey: string) {
  return `${userId}__${setlistId}__${pageKey}`;
}

/**
 * Charge les traits vectoriels (champ `strokes`, JSON sérialisé).
 * Les anciennes annotations PNG (champ `data`) sont ignorées.
 * `null` = document absent (404) : la page est vide. Une lecture impossible (réseau, 5xx, refus) LÈVE :
 * l'appelant n'initialise pas la page à vide et n'enregistre rien, sinon le premier trait écraserait les anciens.
 */
export async function loadAnnotation(
  userId: string,
  setlistId: string,
  pageKey: string,
): Promise<string | null> {
  const headers = await authHeader();
  const id = docId(userId, setlistId, pageKey);
  const res = await fetch(`${FS_BASE}/annotations/${encodeURIComponent(id)}`, {
    headers,
    signal: delaiMax(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Annotations illisibles (HTTP ${res.status})`);
  const raw = await res.json();
  return (raw.fields?.strokes?.stringValue as string) ?? null;
}

/** Supprime l'ancien document d'annotation (repris dans ma partition). */
export async function deleteAnnotation(userId: string, setlistId: string, pageKey: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/annotations/${encodeURIComponent(docId(userId, setlistId, pageKey))}`, {
    method: "DELETE",
    headers,
    signal: delaiMax(10_000),
  });
  if (!res.ok && res.status !== 404) throw new Error(`Annotation non supprimée (HTTP ${res.status})`);
}
