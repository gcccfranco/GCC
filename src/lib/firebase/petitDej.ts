import { FS_BASE, authHeader, checkRest, toFsFields, type RawDoc } from "./setlists";
import { lirePetitDej, oublierPetitDej } from "@/lib/petitdej/lignes";
import type { LignePetitDej } from "@/types/petitDej";

// Écriture des lignes du petit déj (lot U3, docs/spec-petit-dej.md), en REST
// avec le jeton du compte, comme le reste du site. Un document par ligne,
// `petitDej/{id}`, id automatique (POST, patron d'`ajouterIdee`) : deux
// personnes ne s'effacent jamais. Droits : firestore.rules (petitDej/{id}) et
// canGererPetitDej / canEditPetitDej (src/lib/access.ts). Chaque écriture
// oublie le cache de lecture (`oublierPetitDej`).

/** Un refus des règles (HTTP 403) : la carte le distingue d'un autre échec. */
export class RefusDesRegles extends Error {}

async function verifier(res: Response): Promise<void> {
  if (res.status === 403) throw new RefusDesRegles("Écriture refusée par les règles Firestore");
  await checkRest(res);
}

async function poser(ligne: Pick<LignePetitDej, "dimanche" | "nom" | "uid" | "auteurUid">): Promise<string> {
  const now = new Date().toISOString();
  const res = await fetch(`${FS_BASE}/petitDej`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ fields: toFsFields({ ...ligne, nom: ligne.nom.trim(), creeLe: now, modifieLe: now }) }),
  });
  await verifier(res);
  oublierPetitDej();
  return ((await res.json()) as RawDoc).name.split("/").pop()!;
}

/**
 * « Je m'inscris » : une ligne à son nom, rattachée à son compte (`uid` et
 * `auteurUid` = soi). Juste avant d'écrire, le dimanche est relu (Q11) : si
 * quelqu'un vient de s'inscrire, rien n'est écrit et ses lignes sont rendues,
 * pour que la page le dise.
 */
export async function inscrire(
  dimanche: string,
  nom: string,
  uid: string,
): Promise<{ id: string } | { deja: LignePetitDej[] }> {
  oublierPetitDej();
  const deja = (await lirePetitDej()).filter((l) => l.dimanche === dimanche);
  if (deja.length) return { deja };
  return { id: await poser({ dimanche, nom, uid, auteurUid: uid }) };
}

/** Une ligne posée pour quelqu'un (écrivains du planning Table, admins) : `uid` vide. */
export function ajouterLigne(dimanche: string, nom: string, auteurUid: string): Promise<string> {
  return poser({ dimanche, nom, uid: "", auteurUid });
}

/** Réécrire le texte d'une ligne ; dimanche, inscrit et auteur ne bougent pas. */
export async function renommerLigne(id: string, nom: string): Promise<void> {
  const data = { nom: nom.trim(), modifieLe: new Date().toISOString() };
  const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${FS_BASE}/petitDej/${id}?${mask}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ fields: toFsFields(data) }),
  });
  await verifier(res);
  oublierPetitDej();
}

export async function retirerLigne(id: string): Promise<void> {
  await verifier(await fetch(`${FS_BASE}/petitDej/${id}`, { method: "DELETE", headers: await authHeader() }));
  oublierPetitDej();
}
