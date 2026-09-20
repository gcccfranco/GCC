import { FS_BASE, authHeader, checkRest, fromFsValue, toFsFields, type RawDoc } from "./setlists";

// Harmonie (lot 9, H2 et H3, docs/spec-harmonie.md) : ce que l'équipe écrit
// autour d'un chant, en REST comme le reste du site.
// - `harmonie/{slug}/rejets/{id}` : une idée automatique qui ne marche pas sur
//   ce chant. Elle disparaît **pour tout le monde** ; son auteur ou un admin
//   peut la remettre.
// - `harmonie/{slug}/idees/{id}` : les idées de l'équipe, attachées au chant
//   (donc à toutes les setlists).
// Droits : firestore.rules et src/lib/access.ts.

export type Rejet = {
  /** Nom du document (l'identifiant de suggestion, « / » remplacé par « ~ »). */
  id: string;
  /** L'identifiant de suggestion tel que le moteur l'écrit : `<fiche>__<section>`. */
  suggestion: string;
  uid: string;
  auteur: string;
  creeLe: string;
};

export type Idee = {
  id: string;
  uid: string;
  auteur: string;
  /** Instrument de l'auteur, affiché à côté de son nom. */
  instrument: string;
  texte: string;
  /** Accords avant / après, facultatifs, **en tonalité d'origine du chant**. */
  avant?: string;
  apres?: string;
  /** Fiche du catalogue à laquelle l'idée se rattache. */
  ficheId?: string;
  creeLe: string;
  modifieLe: string;
};

export type IdeeValues = Pick<Idee, "texte" | "avant" | "apres" | "ficheId">;

function docData(raw: RawDoc): { id: string; data: Record<string, unknown> } {
  return {
    id: raw.name.split("/").pop()!,
    data: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])),
  };
}

async function liste(slug: string, collectionId: string): Promise<RawDoc[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/harmonie/${encodeURIComponent(slug)}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId }] } }),
  });
  // Un chant sans document `harmonie/{slug}` répond vide : c'est le cas normal.
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => r.document!);
}

async function remove(path: string): Promise<void> {
  const headers = await authHeader();
  await checkRest(await fetch(`${FS_BASE}/${path}`, { method: "DELETE", headers }));
}

// ─── Idées écartées ──────────────────────────────────────────────────────────

export async function getRejets(slug: string): Promise<Rejet[]> {
  return (await liste(slug, "rejets")).map((raw) => {
    const { id, data } = docData(raw);
    return {
      id,
      suggestion: (data.suggestion as string) ?? id.replace(/~/g, "/"),
      uid: (data.uid as string) ?? "",
      auteur: (data.auteur as string) ?? "",
      creeLe: (data.creeLe as string) ?? "",
    };
  });
}

/** L'identifiant d'une suggestion contient un « / » (id de fiche) : Firestore
 *  n'en veut pas dans un nom de document. */
const cleRejet = (suggestionId: string) => suggestionId.replace(/\//g, "~");

export async function ecarterSuggestion(slug: string, suggestionId: string, qui: { uid: string; auteur: string }): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/harmonie/${encodeURIComponent(slug)}/rejets/${cleRejet(suggestionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ ...qui, suggestion: suggestionId, creeLe: new Date().toISOString() }) }),
  });
  await checkRest(res);
}

export async function remettreSuggestion(slug: string, suggestionId: string): Promise<void> {
  await remove(`harmonie/${encodeURIComponent(slug)}/rejets/${cleRejet(suggestionId)}`);
}

/** Les identifiants de suggestion écartés, dans la forme du moteur. */
export function suggestionsEcartees(rejets: Rejet[]): string[] {
  return rejets.map((r) => r.suggestion);
}

// ─── Idées de l'équipe ───────────────────────────────────────────────────────

export async function getIdees(slug: string): Promise<Idee[]> {
  const idees = (await liste(slug, "idees")).map((raw) => {
    const { id, data } = docData(raw);
    return {
      id,
      uid: (data.uid as string) ?? "",
      auteur: (data.auteur as string) ?? "",
      instrument: (data.instrument as string) ?? "",
      texte: (data.texte as string) ?? "",
      avant: (data.avant as string) || undefined,
      apres: (data.apres as string) || undefined,
      ficheId: (data.ficheId as string) || undefined,
      creeLe: (data.creeLe as string) ?? "",
      modifieLe: (data.modifieLe as string) ?? "",
    };
  });
  return idees.sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}

export async function ajouterIdee(
  slug: string,
  values: IdeeValues,
  qui: { uid: string; auteur: string; instrument: string },
): Promise<string> {
  const now = new Date().toISOString();
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/harmonie/${encodeURIComponent(slug)}/idees`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ ...values, ...qui, creeLe: now, modifieLe: now }) }),
  });
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

export async function modifierIdee(slug: string, id: string, values: IdeeValues): Promise<void> {
  const data = { ...values, modifieLe: new Date().toISOString() } as Record<string, unknown>;
  const headers = await authHeader();
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/harmonie/${encodeURIComponent(slug)}/idees/${id}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  await checkRest(res);
}

export async function supprimerIdee(slug: string, id: string): Promise<void> {
  await remove(`harmonie/${encodeURIComponent(slug)}/idees/${id}`);
}
