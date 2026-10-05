import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import type { Sujet } from "@/types/reunion";

// Sujets d'une réunion (lot U6, R1) : evenements/{id}/sujets/{sid}, en REST
// comme le reste. Droits : firestore.rules (match /sujets/{sid}) et
// src/lib/access.ts (estDeLaReunion, peutRetirerSujet, peutOrdonnerSujets).

function fromFsSujet(raw: RawDoc): Sujet {
  const data = Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)]));
  return {
    id: raw.name.split("/").pop()!,
    texte: (data.texte as string) ?? "",
    auteurUid: (data.auteurUid as string) ?? "",
    auteurNom: (data.auteurNom as string) ?? "",
    creeLe: (data.creeLe as string) ?? "",
    ordre: typeof data.ordre === "number" ? data.ordre : 0,
    traite: (data.traite as boolean) ?? false,
    reprisDans: (data.reprisDans as string | null) ?? null,
    repriseDe: (data.repriseDe as Sujet["repriseDe"]) ?? null,
  };
}

/** Tous les sujets de la réunion, dans l'ordre de lecture (le tri se fait à l'affichage). */
export async function listSujets(reunionId: string): Promise<Sujet[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "sujets" }] } }),
  });
  await checkRest(res);
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsSujet(r.document!));
}

export async function ajouterSujet(reunionId: string, sujet: Omit<Sujet, "id">): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}/sujets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(sujet as unknown as Record<string, unknown>) }),
  });
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

/** Rang ou « traité », seuls champs que l'organisateur change (updateMask). */
export async function majSujet(reunionId: string, sujetId: string, champs: Partial<Pick<Sujet, "ordre" | "traite">>): Promise<void> {
  const headers = await authHeader();
  const mask = Object.keys(champs).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}/sujets/${sujetId}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(champs) }),
  });
  await checkRest(res);
}

export async function retirerSujet(reunionId: string, sujetId: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}/sujets/${sujetId}`, { method: "DELETE", headers });
  await checkRest(res);
}
