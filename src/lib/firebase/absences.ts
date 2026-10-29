import { FS_BASE, authHeader, checkRest, toFsFields, fromFsValue, type RawDoc } from "./setlists";
import type { Absence } from "@/types/absence";

// Congés et absences (SC3, docs/spec-createur-corbeille-absences.md) : users/{uid}/absences/{id},
// en REST comme le reste. Droits : firestore.rules (faitDesPlannings, absenceValide) et
// src/lib/access.ts (canSaisirAbsence, canVoirAbsencesDeTous).

function fromFsAbsence(raw: RawDoc, uid: string): Absence {
  const data = Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)]));
  const motif = typeof data.motif === "string" && data.motif ? data.motif : undefined;
  return { id: raw.name.split("/").pop()!, uid, du: (data.du as string) ?? "", au: (data.au as string) ?? "", ...(motif ? { motif } : {}) };
}

/** Les absences d'une personne, par date de début. */
export async function listerAbsences(uid: string): Promise<Absence[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/users/${uid}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "absences" }],
        orderBy: [{ field: { fieldPath: "du" }, direction: "ASCENDING" }],
      },
    }),
  });
  await checkRest(res);
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows.filter((r) => r.document).map((r) => fromFsAbsence(r.document!, uid));
}

/** Ajoute une absence (identifiant automatique) et rend son identifiant. */
export async function ajouterAbsence(uid: string, v: { du: string; au: string; motif?: string }): Promise<string> {
  const headers = await authHeader();
  const fields: Record<string, unknown> = { du: v.du, au: v.au };
  if (v.motif?.trim()) fields.motif = v.motif.trim();
  const res = await fetch(`${FS_BASE}/users/${uid}/absences`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(fields) }),
  });
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

export async function supprimerAbsence(uid: string, id: string): Promise<void> {
  const headers = await authHeader();
  await checkRest(await fetch(`${FS_BASE}/users/${uid}/absences/${id}`, { method: "DELETE", headers }));
}

/** Les absences de tout le monde d'un coup (collection group) : réservé à qui fait les plannings. Refus → []. */
export async function listerToutesAbsences(): Promise<Absence[]> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "absences", allDescendants: true }] } }),
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<{ document?: RawDoc }>;
  return rows
    .filter((r) => r.document)
    .map((r) => {
      // users/{uid}/absences/{id} : l'uid se lit dans le chemin du document.
      const segments = r.document!.name.split("/documents/")[1]?.split("/") ?? [];
      return fromFsAbsence(r.document!, segments[1] ?? "");
    });
}
