import { FS_BASE, authHeader, checkRest, fromFsValue, lireRequete, toFsFields, type RawDoc } from "./setlists";
import { viderGardesTableau } from "@/lib/tableauDeBord/gardes";
import type { SalleId } from "@/lib/salles/salles";

// Réservations de salles (docs/spec-salles.md, § Modèle, lot 3) : reservations/{id}, en REST comme le reste (jamais le
// SDK WebChannel). Droits : firestore.rules (match /reservations/{id}) et src/lib/access.ts (canVoirSalles,
// canReserverSalle, canEditReservation). Une plage de dates sur un seul champ : aucun index composite.

export interface Reservation {
  id: string;
  salle: SalleId;
  /** « AAAA-MM-JJ ». */
  date: string;
  /** « HH:MM » ; `fin` > `debut`, le même jour (SA7). */
  debut: string;
  fin: string;
  /** Valeur de QUI, `equipe:<id>` (une équipe de l'organigramme) ou texte d'« Autre… », 60 caractères au plus (AR16). */
  pour: string;
  /** 1 à 80 caractères. */
  quoi: string;
  auteurUid: string;
  /** Le prénom de l'auteur, toujours affiché (AR16). */
  auteurNom: string;
  createdAt: string;
  updatedAt: string;
}

function fromFsReservation(raw: RawDoc): Reservation {
  const d = Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])) as Record<string, unknown>;
  const s = (k: string) => (d[k] as string) ?? "";
  return {
    id: raw.name.split("/").pop()!,
    salle: s("salle") as SalleId, date: s("date"), debut: s("debut"), fin: s("fin"), pour: s("pour"), quoi: s("quoi"),
    auteurUid: s("auteurUid"), auteurNom: s("auteurNom"), createdAt: s("createdAt"), updatedAt: s("updatedAt"),
  };
}

/** Les réservations de `du` à `au` compris (« AAAA-MM-JJ »), par date. Lecture en échec : une erreur. */
export async function listReservations(du: string, au: string): Promise<Reservation[]> {
  const borne = (op: string, value: string) => ({ fieldFilter: { field: { fieldPath: "date" }, op, value: { stringValue: value } } });
  const rows = await lireRequete("", {
    from: [{ collectionId: "reservations" }],
    where: { compositeFilter: { op: "AND", filters: [borne("GREATER_THAN_OR_EQUAL", du), borne("LESS_THAN_OR_EQUAL", au)] } },
    orderBy: [{ field: { fieldPath: "date" }, direction: "ASCENDING" }],
  });
  if (!rows) throw new Error("Réservations illisibles");
  return rows.map(fromFsReservation);
}

export async function createReservation(data: Omit<Reservation, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const maintenant = new Date().toISOString();
  const res = await fetch(`${FS_BASE}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ fields: toFsFields({ ...data, createdAt: maintenant, updatedAt: maintenant }) }),
  });
  viderGardesTableau();
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

/** Modifie les champs donnés ; l'auteur ne change pas (les rules le refusent). */
export async function updateReservation(id: string, data: Partial<Omit<Reservation, "id" | "auteurUid" | "auteurNom" | "createdAt">>): Promise<void> {
  const champs = { ...data, updatedAt: new Date().toISOString() };
  const mask = Object.keys(champs).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/reservations/${id}?${mask}&currentDocument.exists=true`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ fields: toFsFields(champs) }),
  });
  viderGardesTableau();
  await checkRest(res);
}

export async function deleteReservation(id: string): Promise<void> {
  const res = await fetch(`${FS_BASE}/reservations/${id}`, { method: "DELETE", headers: await authHeader() });
  viderGardesTableau();
  await checkRest(res);
}
