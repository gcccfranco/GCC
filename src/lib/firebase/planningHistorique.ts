import { FS_BASE, authHeader, checkRest, fromFsValue, toFsFields, type RawDoc } from "./setlists";
import { fusionnerChangements, type ChangementGrille } from "@/lib/planning/historique";
import type { HistoryAuthor } from "./setlistHistory";

// Historique nommé d'un planning (lot 17) : plannings/{key}/history/{entryId},
// mêmes champs que setlists/{id}/history (authorUid, authorName, at, changes).
// Lu par tout connecté, écrit par qui peut remplir le planning, sous son propre
// nom (firestore.rules). Écrire l'historique ne fait jamais échouer la case.

export type EntreeGrille = {
  id: string;
  authorUid: string;
  authorName: string;
  at: Date;
  changes: ChangementGrille[];
};

/** Une retouche moins de 15 min après la précédente, par la même personne, rejoint son entrée (D8). */
const SAME_PASS_MS = 15 * 60_000;

const newEntryId = (author: HistoryAuthor) => `${Date.now().toString(36)}-${author.uid}`;

/** Entrées les plus récentes d'abord (`limit` absent : toutes). */
export async function getHistoriqueGrille(key: string, limit?: number): Promise<EntreeGrille[]> {
  const res = await fetch(`${FS_BASE}/plannings/${key}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "history" }],
        orderBy: [{ field: { fieldPath: "at" }, direction: "DESCENDING" }],
        ...(limit ? { limit } : {}),
      },
    }),
  });
  await checkRest(res);
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.flatMap(({ document }) => {
    if (!document) return [];
    const data = Object.fromEntries(Object.entries(document.fields).map(([k, v]) => [k, fromFsValue(v)]));
    return [{
      id: document.name.split("/").pop()!,
      authorUid: String(data.authorUid ?? ""),
      authorName: String(data.authorName ?? ""),
      at: new Date(data.at as string | Date),
      changes: (data.changes as ChangementGrille[] | null) ?? [],
    }];
  });
}

async function ecrireEntree(key: string, entryId: string, author: HistoryAuthor, changes: ChangementGrille[]) {
  const res = await fetch(`${FS_BASE}/plannings/${key}/history/${entryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      fields: {
        ...toFsFields({ authorUid: author.uid, authorName: author.name, changes }),
        at: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  await checkRest(res);
}

/**
 * Note une case modifiée : elle rejoint l'entrée en cours si la même personne a
 * écrit il y a moins de 15 minutes, sinon elle en ouvre une. Ne lève jamais —
 * la case, elle, est écrite.
 */
export async function noterChangement(
  key: string,
  author: HistoryAuthor,
  changement: ChangementGrille
): Promise<void> {
  try {
    const [derniere] = await getHistoriqueGrille(key, 1);
    const memePassage =
      derniere && derniere.authorUid === author.uid && Date.now() - derniere.at.getTime() < SAME_PASS_MS;
    const entryId = memePassage ? derniere.id : newEntryId(author);
    const changes = fusionnerChangements(memePassage ? derniere.changes : [], changement);
    await ecrireEntree(key, entryId, author, changes);
  } catch {
    // Règles pas encore publiées, hors-ligne… : la case est enregistrée.
  }
}
