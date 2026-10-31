import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import { ModifieEntreTemps } from "./programmes";
import { lireGroupe } from "@/lib/groupes/organigramme";
import { TABLE_GROUPES } from "@/lib/groupes/table";
import type { OrganigrammeGroupe } from "@/types/groupe";

// Organigrammes des groupes (lot 2 du chantier « équipes et groupes », docs/spec-organigrammes-groupes.md) :
// groupes/{id} en REST, réécrit en bloc comme equipes/{id}. Droits : firestore.rules (tientGroupe,
// vpDansLePlafond) et canTenirGroupe (src/lib/access.ts). Toute écriture porte l'`updateTime` lu
// (OG37, décision 45) : deux personnes qui enregistrent le même groupe ne s'effacent pas. La recopie
// sur les profils ne s'écrit jamais d'ici : c'est /api/equipes/groupes qui la pose.

export { ModifieEntreTemps };

/** Un groupe lu, avec la version (`updateTime`) à rendre à l'écriture ; `null` = pas encore de document. */
export type GroupeLu = { groupe: OrganigrammeGroupe; version: string | null };

/** Les cinq groupes, dans l'ordre de la table ; un groupe sans document se lit vide. Une réponse en
 *  erreur lève : un groupe vide n'est pas un organigramme à réécrire. */
export async function listGroupes(): Promise<GroupeLu[]> {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "groupes" }] } }),
  });
  if (!res.ok) throw new Error(`Lecture des groupes : ${res.status}`);
  const rows = (await res.json()) as Array<{ document?: RawDoc & { updateTime?: string } }>;
  const docs = rows.filter((r) => r.document).map((r) => r.document!);
  return TABLE_GROUPES.map((def) => {
    const raw = docs.find((d) => d.name.split("/").pop() === def.id);
    const data = raw ? Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])) : {};
    return { groupe: lireGroupe(def.id, data), version: raw?.updateTime ?? null };
  });
}

/** `parNom` du document tel qu'il est maintenant (« Modifié par … entre-temps »). */
async function parNomActuel(id: string): Promise<string> {
  const res = await fetch(`${FS_BASE}/groupes/${id}`, { headers: await authHeader() });
  if (!res.ok) return "";
  const raw = (await res.json()) as RawDoc;
  return (fromFsValue(raw.fields?.parNom) as string | null) ?? "";
}

/**
 * Réécrit le document en bloc, à la condition que personne ne l'ait modifié depuis la lecture
 * (`version`). Sans document (`version` nul, première écriture d'un admin, OG8) : création par
 * `?documentId=` ; déjà créé entre-temps (409) → `ModifieEntreTemps`, comme une version périmée
 * (HTTP 400 `FAILED_PRECONDITION`). Rien n'est écrit alors. Rend la nouvelle version.
 */
export async function enregistrerGroupe(
  groupe: OrganigrammeGroupe,
  version: string | null,
  par: { uid: string; nom: string },
): Promise<string | null> {
  const { id, maxVp, ...reste } = groupe;
  const data: Record<string, unknown> = {
    ...reste,
    ...(maxVp !== undefined ? { maxVp } : {}),
    updatedAt: new Date().toISOString(),
    parUid: par.uid,
    parNom: par.nom,
  };
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const body = JSON.stringify({ fields: toFsFields(data) });
  const res = version
    ? await fetch(`${FS_BASE}/groupes/${id}?currentDocument.updateTime=${encodeURIComponent(version)}`, { method: "PATCH", headers, body })
    : await fetch(`${FS_BASE}/groupes?documentId=${id}`, { method: "POST", headers, body });
  if (res.status === 409) throw new ModifieEntreTemps(await parNomActuel(id));
  if (version && res.status === 400) {
    const json = (await res.clone().json().catch(() => ({}))) as { error?: { status?: string } };
    if (json.error?.status === "FAILED_PRECONDITION") throw new ModifieEntreTemps(await parNomActuel(id));
  }
  await checkRest(res);
  return ((await res.json().catch(() => ({}))) as { updateTime?: string }).updateTime ?? null;
}

type ReponseRoute = { maj: number; ignores: { uid: string; groupe: string }[] };

async function appelerRoute(corps: Record<string, unknown>): Promise<ReponseRoute> {
  const res = await fetch("/api/equipes/groupes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(corps),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<ReponseRoute> & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
  return { maj: json.maj ?? 0, ignores: json.ignores ?? [] };
}

/** Demande au serveur de recopier les droits des comptes cités avant et après l'écriture (OG21). */
export async function majGroupe(groupe: string, uids: string[]): Promise<ReponseRoute> {
  return appelerRoute({ groupe, uids: [...new Set(uids.filter(Boolean))] });
}

/** « Changer de groupe » (admins, OG5) : `groupe` = un id, ou `""` pour « Sans groupe ». */
export async function changerGroupeDe(uid: string, groupe: string): Promise<void> {
  await appelerRoute({ changerGroupe: { uid, groupe } });
}
