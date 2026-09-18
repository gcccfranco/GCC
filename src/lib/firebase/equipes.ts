import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import type { Equipe, MembreEquipe } from "@/types/equipe";
import type { Pole } from "@/types/user";

// Organigramme (lot 16, docs/spec-organigramme.md) : equipes/{id} en REST comme
// le reste. Droits : firestore.rules (isEquipier) et canEditerEquipes
// (src/lib/access.ts). Les pôles qui en découlent ne s'écrivent jamais d'ici —
// le profil reste fermé au navigateur : c'est /api/equipes/poles qui les pose.

function fromFsEquipe(raw: RawDoc): Equipe {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)]),
  );
  return {
    id,
    pole: (data.pole as Pole | null) ?? null,
    membres: (data.membres as MembreEquipe[]) ?? [],
    updatedAt: (data.updatedAt as string) ?? "",
    parUid: (data.parUid as string) ?? "",
    parNom: (data.parNom as string) ?? "",
  };
}

export async function listEquipes(): Promise<Equipe[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "equipes" }] } }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsEquipe(r.document!));
}

/** Réécrit une équipe en bloc (la liste des membres est une liste, pas un
 *  ensemble de retouches) et laisse les pôles au serveur. */
export async function saveEquipe(
  id: string,
  valeurs: { pole: Pole | null; membres: MembreEquipe[] },
  par: { uid: string; nom: string },
): Promise<void> {
  const headers = await authHeader();
  const data = {
    pole: valeurs.pole,
    membres: valeurs.membres as unknown as Record<string, unknown>[],
    updatedAt: new Date().toISOString(),
    parUid: par.uid,
    parNom: par.nom,
  };
  const res = await fetch(`${FS_BASE}/equipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  await checkRest(res);
}

/** Demande au serveur de recalculer `users/{uid}.poles` pour les comptes
 *  touchés (route Admin SDK : le navigateur n'écrit jamais un profil). */
export async function majPoles(uids: string[]): Promise<void> {
  if (uids.length === 0) return;
  const res = await fetch("/api/equipes/poles", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ uids }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? `Erreur ${res.status}`);
  }
}
