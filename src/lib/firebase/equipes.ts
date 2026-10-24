import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import type { Equipe, MembreEquipe } from "@/types/equipe";
import { ModifieEntreTemps } from "./programmes";

// Organigramme (lot 16, docs/spec-organigramme.md) : equipes/{id} en REST comme
// le reste. Droits : firestore.rules (isEquipier) et canEditerEquipes
// (src/lib/access.ts). Le rattachement qui en découle ne s'écrit jamais d'ici —
// le profil reste fermé au navigateur : c'est /api/equipes/rattachement qui le pose.

function fromFsEquipe(raw: RawDoc & { updateTime?: string }): Equipe {
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
    ...(raw.updateTime ? { version: raw.updateTime } : {}),
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

/** `parNom` du document tel qu'il est maintenant (« Modifié par … entre-temps »). */
async function parNomActuel(id: string): Promise<string> {
  const res = await fetch(`${FS_BASE}/equipes/${id}`, { headers: await authHeader() });
  if (!res.ok) return "";
  const raw = (await res.json()) as RawDoc;
  return (fromFsValue(raw.fields?.parNom) as string | null) ?? "";
}

/** Réécrit la liste des membres en bloc (une liste, pas un ensemble de retouches), à la condition que personne
 *  n'ait modifié le document depuis la lecture (`version`, comme `enregistrerGroupe`) ; sans version, le document
 *  est écrit tel quel. Le PATCH porte un masque : l'ancien champ de rattachement, que le relevé de la migration lit
 *  encore (EQ-E), n'est ni écrit ni effacé. Refusé parce que le document a changé : `ModifieEntreTemps`, rien
 *  n'est écrit. Rend la nouvelle version. */
export async function saveEquipe(
  id: string,
  membres: MembreEquipe[],
  par: { uid: string; nom: string },
  version?: string | null,
): Promise<string | null> {
  const headers = await authHeader();
  const data = {
    membres: membres as unknown as Record<string, unknown>[],
    updatedAt: new Date().toISOString(),
    parUid: par.uid,
    parNom: par.nom,
  };
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const precondition = version ? `&currentDocument.updateTime=${encodeURIComponent(version)}` : "";
  const res = await fetch(`${FS_BASE}/equipes/${id}?${mask}${precondition}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  if (res.status === 409) throw new ModifieEntreTemps(await parNomActuel(id));
  if (version && res.status === 400) {
    const json = (await res.clone().json().catch(() => ({}))) as { error?: { status?: string } };
    if (json.error?.status === "FAILED_PRECONDITION") throw new ModifieEntreTemps(await parNomActuel(id));
  }
  await checkRest(res);
  return ((await res.json().catch(() => ({}))) as { updateTime?: string }).updateTime ?? null;
}

/** Demande au serveur de recalculer `dansEquipes` et `referentDe` des comptes
 *  touchés (route Admin SDK : le navigateur n'écrit jamais un profil). `equipe` : l'équipe éditée, la seule dont
 *  les référents peuvent changer. */
export async function majRattachement(uids: string[], equipe: string): Promise<void> {
  if (uids.length === 0) return;
  const res = await fetch("/api/equipes/rattachement", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ uids, equipe }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(json.error ?? `Erreur ${res.status}`);
  }
}
