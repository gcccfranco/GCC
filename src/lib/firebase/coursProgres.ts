// Cours d'Harmonie, tranches C2 et C4 (docs/spec-cours-harmonie.md) : ce que
// chacun a fini, dans `coursProgres/{uid}` = `{ fini: { <id du chapitre>: date ISO } }`.
//
// « J'ai fini » et « Annuler » n'écrivent que leur champ (`updateMask`), jamais
// le document entier : deux appareils qui cochent deux chapitres ne s'écrasent
// pas (leçon de `saveProfile`, 19/09/2026). Règles : firestore.rules, miroir
// client `canReadCoursProgres` dans access.ts.

import { FS_BASE, authHeader, checkRest, fromFsValue, type RawDoc } from "./setlists";

export type Progres = Record<string, string>;

/** Chemin de champ Firestore : un id à tirets s'écrit entre accents graves. */
const champ = (id: string) => `fini.\`${id}\``;

function lireFini(doc: RawDoc): Progres {
  const fini = doc.fields?.fini ? fromFsValue(doc.fields.fini) : null;
  return (fini ?? {}) as Progres;
}

export async function getCoursProgres(uid: string): Promise<Progres> {
  const res = await fetch(`${FS_BASE}/coursProgres/${uid}`, { headers: await authHeader() });
  if (res.status === 404) return {};
  await checkRest(res);
  return lireFini((await res.json()) as RawDoc);
}

/** « J'ai fini » (la date) ou « Annuler » (null), pour ce seul chapitre. */
export async function marquerChapitre(uid: string, id: string, date: string | null): Promise<void> {
  const params = new URLSearchParams({ "updateMask.fieldPaths": champ(id) });
  const fields = date ? { fini: { mapValue: { fields: { [id]: { stringValue: date } } } } } : {};
  const res = await fetch(`${FS_BASE}/coursProgres/${uid}?${params}`, {
    method: "PATCH",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  await checkRest(res);
}

/** Toute l'équipe, par uid (C4) : lisible par les admins seulement. */
export async function getProgresDeLEquipe(): Promise<Record<string, Progres>> {
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { ...(await authHeader()), "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "coursProgres" }] } }),
  });
  await checkRest(res);
  const lignes = (await res.json()) as { document?: RawDoc }[];
  return Object.fromEntries(
    lignes.flatMap((l) => (l.document ? [[l.document.name.split("/").pop()!, lireFini(l.document)]] : [])),
  );
}
