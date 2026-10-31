import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import type { Sujet } from "@/types/reunion";
import { listReunionsDu } from "./evenements";
import { copieReprise, reunionsALire, sujetsAReprendre, type SujetAReprendre } from "@/lib/reunions/sujets";

// Sujets d'une réunion (lot U6, R1) : evenements/{id}/sujets/{sid}, en REST
// comme le reste. Droits : firestore.rules (match /sujets/{sid}) et
// src/lib/access.ts (estDeLaReunion, peutRetirerSujet, peutOrdonnerSujets).

function fromFsSujet(raw: RawDoc): Sujet {
  const data = Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)]));
  return {
    id: raw.name.split("/").pop()!,
    texte: (data.texte as string) ?? "",
    auteurUid: (data.auteurUid as string) ?? "",
    auteurNom: (data.auteurNom as string) ?? "",
    creeLe: (data.creeLe as string) ?? "",
    ordre: typeof data.ordre === "number" ? data.ordre : 0,
    traite: (data.traite as boolean) ?? false,
    reprisDans: (data.reprisDans as string | null) ?? null,
    repriseDe: (data.repriseDe as Sujet["repriseDe"]) ?? null,
  };
}

/** Tous les sujets de la réunion, dans l'ordre de lecture (le tri se fait à l'affichage). */
export async function listSujets(reunionId: string): Promise<Sujet[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "sujets" }] } }),
  });
  await checkRest(res);
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsSujet(r.document!));
}

export async function ajouterSujet(reunionId: string, sujet: Omit<Sujet, "id">): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}/sujets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(sujet as unknown as Record<string, unknown>) }),
  });
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

/** Rang ou « traité », seuls champs que l'organisateur change (updateMask). */
export async function majSujet(reunionId: string, sujetId: string, champs: Partial<Pick<Sujet, "ordre" | "traite">>): Promise<void> {
  const headers = await authHeader();
  const mask = Object.keys(champs).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}/sujets/${sujetId}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(champs) }),
  });
  await checkRest(res);
}

export async function retirerSujet(reunionId: string, sujetId: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}/sujets/${sujetId}`, { method: "DELETE", headers });
  await checkRest(res);
}

// ─── R2 : reprise des sujets non traités ────────────────────────────────────

/** Le sujet a été repris dans la réunion `dans` : seul champ écrit (la règle
 *  n'accepte que lui, et une seule fois). */
export async function marquerRepris(reunionId: string, sujetId: string, dans: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/evenements/${reunionId}/sujets/${sujetId}?updateMask.fieldPaths=reprisDans`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ reprisDans: dans }) }),
  });
  await checkRest(res);
}

/** Sujets laissés par les dernières réunions déjà commencées du public `pour`
 *  (`reunionsALire`), à proposer à la création d'une nouvelle. Une lecture
 *  refusée ou perdue compte pour « rien à reprendre » : la création ne s'arrête
 *  jamais là-dessus. */
export async function lireSujetsAReprendre(pour: string, nowIso: string): Promise<SujetAReprendre[]> {
  try {
    const commencees = reunionsALire(await listReunionsDu(pour), nowIso);
    const lus = await Promise.all(commencees.map(async (reunion) => ({
      reunion, sujets: await listSujets(reunion.id).catch(() => [] as Sujet[]),
    })));
    return sujetsAReprendre(lus, nowIso);
  } catch {
    return [];
  }
}

/** « Oui, les reprendre » : chaque sujet est recopié dans la nouvelle réunion,
 *  puis marqué repris dans l'ancienne — dans cet ordre, pour qu'un échec ne
 *  perde jamais un sujet (copie ratée : il reste rouge et sera reproposé ;
 *  marquage raté : la copie existe, l'original sera reproposé une fois de trop). */
export async function reprendreSujets(liste: SujetAReprendre[], nouvelleId: string, parUid: string): Promise<void> {
  for (const [ordre, a] of liste.entries()) {
    try {
      await ajouterSujet(nouvelleId, copieReprise(a, parUid, ordre));
      await marquerRepris(a.reunion.id, a.sujet.id, nouvelleId);
    } catch {
      // On passe au suivant : la fiche de la nouvelle réunion montre ce qui a été repris.
    }
  }
}
