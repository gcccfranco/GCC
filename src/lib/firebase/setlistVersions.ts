import { delaiMax } from "@/lib/delaiMax";
import { FS_BASE, authHeader, checkRest, fromFsValue, toFsFields, type RawDoc } from "@/lib/firebase/setlists";
import type { SetlistVersions, VersionItem } from "@/types/setlistVersions";
import { repairCopyIds } from "@/lib/setlist/sectionOrigins";

// Versions perso d'un chant dans une setlist (docs/spec-version-perso.md) :
// sous-collection setlists/{id}/versions, un document par personne. Lu par
// tout connecté (les versions partagées), écrit par son propriétaire seul
// (firestore.rules). Ni historique ni notification : ce n'est pas une
// modification de la setlist.

/** Toutes les versions d'une setlist, par uid de leur auteur. */
export async function getSetlistVersions(setlistId: string): Promise<Record<string, SetlistVersions>> {
  const res = await fetch(`${FS_BASE}/setlists/${setlistId}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "versions" }] } }),
    // Réseau qui traîne : une erreur au bout de 10 s plutôt qu'une page qui attend (la présidence seule s'affiche).
    signal: delaiMax(10_000),
  });
  await checkRest(res);
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  const out: Record<string, SetlistVersions> = {};
  for (const { document } of rows) {
    if (!document) continue;
    const uid = document.name.split("/").pop()!;
    const data = Object.fromEntries(Object.entries(document.fields).map(([k, v]) => [k, fromFsValue(v)]));
    out[uid] = {
      authorUid: String(data.authorUid ?? uid),
      authorName: String(data.authorName ?? ""),
      // « Seulement ce passage » : même réparation à la lecture que les setlists.
      items: Object.fromEntries(
        Object.entries((data.items as Record<string, VersionItem> | null) ?? {}).map(([slug, v]) => [
          slug,
          v.content && v.sectionOrigins ? { ...v, content: repairCopyIds(v.content, v.sectionOrigins) } : v,
        ])
      ),
      choices: (data.choices as Record<string, string> | null) ?? {},
    };
  }
  return out;
}

/** Réécrit mon document en entier (petit document). */
export async function saveSetlistVersions(setlistId: string, uid: string, doc: SetlistVersions): Promise<void> {
  const res = await fetch(`${FS_BASE}/setlists/${setlistId}/versions/${uid}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      fields: {
        ...toFsFields({ ...doc }),
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  await checkRest(res);
}
