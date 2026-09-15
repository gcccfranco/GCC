import { FS_BASE, authHeader, checkRest, fromFsValue, toFsFields, type RawDoc } from "@/lib/firebase/setlists";

// Versions perso d'un chant dans une setlist (docs/spec-version-perso.md) :
// sous-collection setlists/{id}/versions, un document par personne. Lu par
// tout connecté (les versions partagées), écrit par son propriétaire seul
// (firestore.rules). Ni historique ni notification : ce n'est pas une
// modification de la setlist.

export type VersionItem = {
  /** Source ChordPro complet, tonalité d'origine (comme `contentOverride`) ;
   *  `null` = accords et paroles de la présidence. */
  content: string | null;
  /** Même forme que `structureOverride` ; `null` = structure de la présidence. */
  structure: string[] | null;
  /** Mes accords et paroles sont proposés aux autres. */
  shared: boolean;
};

export type SetlistVersions = {
  authorUid: string;
  authorName: string;
  /** Par chant (`songSlug`). */
  items: Record<string, VersionItem>;
  /** Version choisie par chant : `"presidence"` ou l'uid de son auteur ;
   *  absent = la mienne si j'en ai une, sinon la présidence. */
  choices: Record<string, string>;
};

/** Toutes les versions d'une setlist, par uid de leur auteur. */
export async function getSetlistVersions(setlistId: string): Promise<Record<string, SetlistVersions>> {
  const res = await fetch(`${FS_BASE}/setlists/${setlistId}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "versions" }] } }),
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
      items: (data.items as Record<string, VersionItem> | null) ?? {},
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
