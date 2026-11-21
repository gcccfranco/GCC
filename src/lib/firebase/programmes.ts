import {
  FS_BASE,
  authHeader,
  lireRequete,
  checkRest,
  toFsFields,
  fromFsValue,
  type RawDoc,
} from "./setlists";
import { viderGardesTableau } from "@/lib/tableauDeBord/gardes";
import { idEdition, type Fete } from "@/lib/scene/fetes";
import { libelleQui } from "@/lib/fetes/qui";
import { creneauDeReservation } from "@/lib/scene/rappels";
import { listReservationsDeFete, type Reservation } from "./reservations";
import type { Creneau, Duree, Passage, Plage, Programme } from "@/types/programme";

// Programmes de scène (lot 3 bis) : programmes/{id} ; leurs créneaux sont des réservations de la Scène depuis le lot 5
// du chantier AR (§ Créneaux ci-dessous). En REST comme le reste. Droits : firestore.rules (isCoordination) et
// src/lib/access.ts (isCoordination, canEditCreneau).

/** Événement `window` émis après toute écriture : la barre d'onglets se recharge. */
export const PROGRAMMES_CHANGED = "programmes-changed";

/** Écriture refusée (retouches v18, D20) : le programme a changé depuis la version lue. `prenom` :
 *  qui l'a modifié entre-temps (vide s'il n'est pas connu). Rien n'a été écrit. */
export class ModifieEntreTemps extends Error {
  constructor(readonly prenom: string) {
    super("Programme modifié entre-temps");
  }
}

function docData(raw: RawDoc): { id: string; data: Record<string, unknown> } {
  return {
    id: raw.name.split("/").pop()!,
    data: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([k, v]) => [k, fromFsValue(v)])),
  };
}

function fromFsProgramme(raw: RawDoc & { updateTime?: string }): Programme {
  const { id, data } = docData(raw);
  return {
    id,
    nom: (data.nom as string) ?? "",
    jourJ: (data.jourJ as string) ?? "",
    debut: (data.debut as string) ?? "",
    passages: (data.passages as Passage[]) ?? [],
    createdBy: (data.createdBy as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
    // Saison (lot U1) : seulement si le champ existe — absent = défaut de saisonDe.
    ...(data.fin != null && { fin: data.fin as string }),
    ...(data.plages != null && { plages: data.plages as Plage[] }),
    ...(data.duree != null && { duree: data.duree as Duree }),
    ...(data.quiAutorises != null && { quiAutorises: data.quiAutorises as string[] }),
    ...(data.ouvert != null && { ouvert: data.ouvert as boolean }),
    ...(data.fermees != null && { fermees: data.fermees as boolean }),
    // Pâques · Noël : seulement si le champ existe — absent = déduit du jour J (feteDe).
    ...(data.fete != null && { fete: data.fete as Programme["fete"] }),
    ...(data.annee != null && { annee: data.annee as number }),
    ...(data.modifiePar != null && { modifiePar: data.modifiePar as string }),
    ...(raw.updateTime && { version: raw.updateTime }),
  };
}

async function runQuery(parent: string, collectionId: string, orderBy: string): Promise<RawDoc[]> {
  return (await lireRequete(parent, {
    from: [{ collectionId }],
    orderBy: [{ field: { fieldPath: orderBy }, direction: "ASCENDING" }],
  })) ?? [];
}

async function post(path: string, data: Record<string, unknown>): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  await checkRest(res);
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

/** PATCH limité aux champs donnés (updateMask) : le reste du document est conservé. `version` :
 *  l'`updateTime` lu ; le document a changé depuis (HTTP 400 `FAILED_PRECONDITION`) → `false`,
 *  rien n'est écrit. */
async function patch(path: string, data: Record<string, unknown>, version?: string): Promise<boolean> {
  const headers = await authHeader();
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const precondition = version ? `&currentDocument.updateTime=${encodeURIComponent(version)}` : "";
  const res = await fetch(`${FS_BASE}/${path}?${mask}${precondition}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    // Un champ `undefined` est dans le masque mais pas dans le corps : Firestore le retire (pas de `null` écrit).
    body: JSON.stringify({ fields: toFsFields(Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))) }),
  });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  if (version && res.status === 400) {
    const json = (await res.clone().json().catch(() => ({}))) as { error?: { status?: string } };
    if (json.error?.status === "FAILED_PRECONDITION") return false;
  }
  await checkRest(res);
  return true;
}

async function remove(path: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/${path}`, { method: "DELETE", headers });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  await checkRest(res);
}

function changed(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROGRAMMES_CHANGED));
}

// ─── Programmes ──────────────────────────────────────────────────────────────

/** Tous les programmes, masqués compris, par jour J croissant. */
export async function listProgrammes(): Promise<Programme[]> {
  return (await runQuery("", "programmes", "jourJ")).map(fromFsProgramme);
}

export async function getProgramme(id: string): Promise<Programme | null> {
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/programmes/${id}`, { headers });
  if (!res.ok) return null;
  return fromFsProgramme((await res.json()) as RawDoc);
}

/** Crée l'édition `{fete}-{annee}` (Q6) à la première action de la coordination : `data`
 *  (ses réglages, `reglagesRepris`) plus `changement` (ce que la
 *  coordination vient de faire).
 *  Une autre coordination l'a créée entre-temps (409) : seul `changement` s'écrit sur le
 *  document existant — sauf `protege` (l'ordre de passage, D20) : `ModifieEntreTemps`, rien
 *  n'est écrit, comme sur une édition modifiée depuis la lecture. Rend l'identifiant. */
export async function creerEdition(
  fete: Fete,
  annee: number,
  data: Omit<Programme, "id">,
  changement: Partial<Omit<Programme, "id">> = {},
  protege = false,
): Promise<string> {
  const id = idEdition(fete, annee);
  const headers = await authHeader();
  const res = await fetch(`${FS_BASE}/programmes?documentId=${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ fields: toFsFields({ ...data, ...changement } as unknown as Record<string, unknown>) }),
  });
  viderGardesTableau(); // lot LF, docs/spec-lectures-firestore.md
  if (res.status === 409) {
    if (protege) throw new ModifieEntreTemps((await getProgramme(id))?.modifiePar ?? "");
    if (Object.keys(changement).length) await updateProgramme(id, changement);
    return id;
  }
  await checkRest(res);
  changed();
  return id;
}

/** `version` (l'`updateTime` lu, D20) : l'écriture n'a lieu que si personne n'a modifié le programme
 *  depuis ; sinon `ModifieEntreTemps`, avec le prénom de qui l'a modifié. */
export async function updateProgramme(
  id: string,
  data: Partial<Omit<Programme, "id" | "version">>,
  version?: string,
): Promise<void> {
  const ecrit = await patch(`programmes/${id}`, { ...data, updatedAt: new Date().toISOString() }, version);
  if (!ecrit) throw new ModifieEntreTemps((await getProgramme(id))?.modifiePar ?? "");
  changed();
}

// ─── Créneaux ────────────────────────────────────────────────────────────────
// Lot 5 du chantier AR, T5a (docs/spec-salles.md, AR19, AR20) : un créneau de fête est une réservation de la Grande salle (AS14),
// `reservations/{id}` avec `salle: "grande"` (anciens : "scene") et `fete` = l'id du programme ; `dimanche` s'y écrit `date`, et `pour`
// reçoit le libellé des `qui` pour Salles. Mêmes noms et même type `Creneau` qu'avant : les écrans suivent. Les anciens
// `programmes/{id}/creneaux` ne sont plus lus (AR19) ; le cron des rappels lit aussi `reservations` (T5c). Droits : firestore.rules
// (match /reservations/{id}, feteReservable) et src/lib/access.ts (canReserverPour, canEditReservation).

/** Le libellé des `qui` (en français), 60 caractères au plus (SA7) ; 200 quand des personnes sont choisies (AS15, rules : `pour` <= 200). */
export function pourDe(qui: string[], max = 60): string {
  return qui.map((q) => libelleQui(q)).join(", ").slice(0, max);
}

/** Un créneau de fête lu comme la réservation qu'il est (inverse de `creneauDeReservation`) : la feuille « Réserver » la modifie. */
export function reservationDeCreneau(programmeId: string, c: Creneau): Reservation {
  return {
    id: c.id, salle: "grande", date: c.dimanche, debut: c.debut, fin: c.fin, ...(c.libre && { libre: true }), pour: pourDe(c.qui), quoi: c.quoi,
    fete: programmeId, qui: c.qui, ...(c.personnes && { personnes: c.personnes }), note: c.note, auteurUid: c.auteurUid, auteurNom: c.auteurNom, createdAt: c.createdAt, updatedAt: c.updatedAt,
  };
}

/** Les champs d'un créneau, écrits dans une réservation : `dimanche` devient `date`, `qui` donne `pour`. */
function versReservation(data: Partial<Omit<Creneau, "id">>): Record<string, unknown> {
  const { dimanche, ...reste } = data;
  return { ...reste, ...(dimanche !== undefined && { date: dimanche }), ...(data.qui && { pour: pourDe(data.qui) }) };
}

/** Créneaux d'un programme, par dimanche puis heure. Lecture en échec : aucun créneau, comme avant. */
export async function listCreneaux(programmeId: string): Promise<Creneau[]> {
  return (await listReservationsDeFete(programmeId).catch(() => [])).map(creneauDeReservation);
}

export async function createCreneau(programmeId: string, data: Omit<Creneau, "id">): Promise<string> {
  return post("reservations", { salle: "grande", fete: programmeId, ...versReservation(data) });
}

export async function updateCreneau(
  programmeId: string,
  id: string,
  data: Partial<Omit<Creneau, "id">>,
): Promise<void> {
  await patch(`reservations/${id}`, { ...versReservation(data), updatedAt: new Date().toISOString() });
}

export async function deleteCreneau(programmeId: string, id: string): Promise<void> {
  await remove(`reservations/${id}`);
}
