import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import type { Equipe, MembreEquipe } from "@/types/equipe";

// Organigramme (lot 16, docs/spec-organigramme.md) : equipes/{id} en REST comme
// le reste. Droits : firestore.rules (isEquipier) et canEditerEquipes
// (src/lib/access.ts). Le rattachement qui en découle ne s'écrit jamais d'ici —
// le profil reste fermé au navigateur : c'est /api/equipes/rattachement qui le pose.

function fromFsEquipe(raw: RawDoc): Equipe {
  const id = raw.name.split("/").pop()!;
  const data = Object.fromEntries(
    Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)]),
  );
  return {
    id,
    membres: (data.membres as MembreEquipe[]) ?? [],
    updatedAt: (data.updatedAt as string) ?? "",
    parUid: (data.parUid as string) ?? "",
    parNom: (data.parNom as string) ?? "",
  };
}

/** Toutes les équipes. Une réponse en erreur donne une liste vide, sauf avec `strict` : elle lève alors
 *  (l'aperçu de Moi ne la prend pas pour « aucune équipe »). */
export async function listEquipes({ strict = false }: { strict?: boolean } = {}): Promise<Equipe[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "equipes" }] } }),
  });
  if (!res.ok) {
    if (strict) throw new Error(`Lecture des équipes : ${res.status}`);
    return [];
  }
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsEquipe(r.document!));
}

/** Réécrit la liste des membres en bloc (une liste, pas un ensemble de retouches). Le PATCH
 *  porte un masque : l'ancien champ de rattachement, que le relevé de la migration lit encore (EQ-E),
 *  n'est ni écrit ni effacé. */
export async function saveEquipe(
  id: string,
  membres: MembreEquipe[],
  par: { uid: string; nom: string },
): Promise<void> {
  const headers = await authHeader();
  const data = {
    membres: membres as unknown as Record<string, unknown>[],
    updatedAt: new Date().toISOString(),
    parUid: par.uid,
    parNom: par.nom,
  };
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/equipes/${id}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  await checkRest(res);
}

/** Demande au serveur de recalculer `dansEquipes` et `referentDe` des comptes
 *  touchés (route Admin SDK : le navigateur n'écrit jamais un profil). */
export async function majRattachement(uids: string[]): Promise<void> {
  if (uids.length === 0) return;
  const res = await fetch("/api/equipes/rattachement", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ uids }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? `Erreur ${res.status}`);
  }
}
