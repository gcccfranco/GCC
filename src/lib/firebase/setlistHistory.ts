import { auth } from "@/lib/firebase/config";
import { FS_BASE, authHeader, checkRest, fromFsValue, toFsFields, type RawDoc } from "@/lib/firebase/setlists";
import { diffSetlists, mergeChanges, type HistoryChange, type SectionsOf, type SetlistSnapshot } from "@/lib/setlist/history";
import type { UserProfile } from "@/types/user";

// Historique des modifications : sous-collection setlists/{id}/history
// (docs/spec-setlist.md, lot 2). Lecture par tout connecté ; écriture par qui
// peut modifier la setlist, sous son propre nom (firestore.rules). Écrire
// l'historique ne fait jamais échouer l'enregistrement de la setlist.

export type HistoryEntry = {
  id: string;
  authorUid: string;
  authorName: string;
  at: Date;
  changes: HistoryChange[];
};

/** Une retouche moins de 15 min après la précédente, par la même personne, rejoint son entrée. */
const SAME_PASS_MS = 15 * 60_000;

export type HistoryAuthor = { uid: string; name: string };

/** Identifiant d'une nouvelle entrée : préfixé par l'heure, suffixé par l'auteur. */
const newEntryId = (author: HistoryAuthor) => `${Date.now().toString(36)}-${author.uid}`;

/** Entrées les plus récentes d'abord (`limit` absent : toutes). */
export async function getSetlistHistory(setlistId: string, limit?: number): Promise<HistoryEntry[]> {
  const res = await fetch(`${FS_BASE}/setlists/${setlistId}:runQuery`, {
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
      changes: (data.changes as HistoryChange[] | null) ?? [],
    }];
  });
}

async function writeEntry(setlistId: string, entryId: string, author: HistoryAuthor, changes: HistoryChange[]) {
  const res = await fetch(`${FS_BASE}/setlists/${setlistId}/history/${entryId}`, {
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

/** Nom affiché : celui du planning (« Ruth K. »), sinon prénom + initiale, sinon vide (« Quelqu'un » à l'affichage). */
export function historyAuthor(profile: UserProfile | null): HistoryAuthor | null {
  const user = auth.currentUser;
  if (!user) return null;
  const initial = profile?.lastName?.trim().charAt(0);
  const name =
    profile?.planningName?.trim() ||
    [profile?.firstName?.trim(), initial ? `${initial}.` : ""].filter(Boolean).join(" ");
  return { uid: user.uid, name };
}

/** Un passage : l'état de départ, et l'entrée qu'il alimente une fois trouvée. */
export type HistoryPass = {
  setlistId: string;
  author: HistoryAuthor;
  baseline: SetlistSnapshot;
  entryId?: string;
  prior?: HistoryChange[];
  /** Dernier état écrit, et quand : au-delà de 15 min, il devient l'état de départ d'une nouvelle entrée. */
  last?: { at: number; state: SetlistSnapshot };
};

/**
 * Passage à poursuivre pour une nouvelle écriture partie de `base` : le
 * précédent si c'est la même personne et que la setlist n'a pas changé depuis
 * sa dernière écriture (sinon, un autre y a touché : on repart de `base`).
 */
export function continuePass(previous: HistoryPass | null, setlistId: string, author: HistoryAuthor, base: SetlistSnapshot): HistoryPass {
  if (previous?.last && previous.author.uid === author.uid && diffSetlists(previous.last.state, base).length === 0) {
    return previous;
  }
  return { setlistId, author, baseline: base };
}

/** Écrit les phrases du passage (état de départ → `current`). Ne lève jamais.
 *  `sectionsOf` : sections des chants, pour l'avant / après des structures. */
export async function recordHistory(pass: HistoryPass, current: SetlistSnapshot, sectionsOf?: SectionsOf): Promise<void> {
  try {
    if (pass.last && Date.now() - pass.last.at >= SAME_PASS_MS) {
      // Éditeur resté ouvert : la retouche suivante ouvre une nouvelle entrée.
      pass.baseline = pass.last.state;
      pass.entryId = undefined;
      pass.prior = undefined;
    }
    const changes = diffSetlists(pass.baseline, current, sectionsOf);
    if (!pass.entryId) {
      if (changes.length === 0) return;
      const [last] = await getSetlistHistory(pass.setlistId, 1);
      if (last && last.authorUid === pass.author.uid && Date.now() - last.at.getTime() < SAME_PASS_MS) {
        pass.entryId = last.id;
        pass.prior = last.changes;
      } else {
        pass.entryId = newEntryId(pass.author);
        pass.prior = [];
      }
    }
    await writeEntry(pass.setlistId, pass.entryId, pass.author, mergeChanges(pass.prior ?? [], changes));
    pass.last = { at: Date.now(), state: current };
  } catch {
    // Règles pas encore publiées, hors-ligne… : la setlist, elle, est enregistrée.
  }
}

/** Première entrée d'une setlist publiée. Ne lève jamais. */
export async function recordCreation(setlistId: string, author: HistoryAuthor): Promise<void> {
  try {
    await writeEntry(setlistId, newEntryId(author), author, [{ kind: "created" }]);
  } catch {
    // Règles pas encore publiées, hors-ligne… : la setlist, elle, est publiée.
  }
}
