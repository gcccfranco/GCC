// Réservation d'un envoi (docs/spec-corrections-audit.md, A2, S8) : le document notifLog est créé AVANT
// l'envoi, par `create()` qui échoue s'il existe déjà. Deux appels simultanés ne passent donc jamais
// tous les deux ; l'envoi qui échoue rend sa réservation pour que le suivant puisse réessayer.
// Serveur seulement (la base Admin se passe en paramètre, pour les tests).

import { randomUUID } from "node:crypto";

const COLLECTION = "notifLog";

/** Le document existe déjà : code gRPC 6 (Admin SDK) ou son nom. */
function dejaLa(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
}

/** Réserve la clé. Rend `false` si elle l'est déjà (l'envoi a eu lieu, ou est en cours). Avec `delaiMs`,
 *  une réservation plus vieille que ce délai (champ `at`) est reprise, dans une transaction. */
export async function reserverEnvoi(
  db: FirebaseFirestore.Firestore,
  cle: string,
  donnees: Record<string, unknown>,
  options: { delaiMs?: number } = {},
): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(cle);
  try {
    await ref.create(donnees);
    return true;
  } catch (e) {
    if (!dejaLa(e)) throw e;
  }
  const { delaiMs } = options;
  if (!delaiMs) return false;
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const at = snap.exists ? ((snap.data()?.at as number | undefined) ?? 0) : 0;
    if (snap.exists && Date.now() - at < delaiMs) return false;
    tx.set(ref, donnees);
    return true;
  });
}

/** Rend la réservation (l'envoi a échoué) : le prochain appel pourra envoyer. */
export async function rendreEnvoi(db: FirebaseFirestore.Firestore, cle: string): Promise<void> {
  await db.collection(COLLECTION).doc(cle).delete();
}

/** Prend un verrou : comme `reserverEnvoi` avec reprise après `delaiMs`, en y écrivant un jeton aléatoire.
 *  Rend le jeton, ou `null` si le verrou est tenu. */
export async function prendreVerrou(
  db: FirebaseFirestore.Firestore,
  cle: string,
  donnees: Record<string, unknown>,
  delaiMs: number,
): Promise<string | null> {
  const jeton = randomUUID();
  return (await reserverEnvoi(db, cle, { ...donnees, jeton }, { delaiMs })) ? jeton : null;
}

/** Rend un verrou, dans une transaction, seulement s'il porte encore ce jeton (sinon il a été repris : rien à faire). */
export async function rendreVerrou(db: FirebaseFirestore.Firestore, cle: string, jeton: string): Promise<void> {
  const ref = db.collection(COLLECTION).doc(cle);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.jeton === jeton) tx.delete(ref);
  });
}

/** Réserve `${prefixe}-${uid}` pour chaque uid ; rend ceux dont la réservation a réussi. */
export async function reserverPourUids(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefixe: string,
  meta: Record<string, unknown>,
): Promise<string[]> {
  const prises = await Promise.all(
    uids.map(async (u) => ((await reserverEnvoi(db, `${prefixe}-${u}`, { ...meta, uid: u, at: Date.now() })) ? u : null)),
  );
  return prises.filter((u): u is string => u !== null);
}

/** Rend les réservations de `reserverPourUids`. */
export async function rendrePourUids(db: FirebaseFirestore.Firestore, uids: string[], prefixe: string): Promise<void> {
  await Promise.all(uids.map((u) => rendreEnvoi(db, `${prefixe}-${u}`).catch(() => undefined)));
}

/** Première publication d'un trimestre de planning : `true` une seule fois par (planning, année, trimestre),
 *  même si le trimestre est masqué puis republié. */
export function reserverPublication(db: FirebaseFirestore.Firestore, planning: string, annee: number, tri: string, uid: string): Promise<boolean> {
  return reserverEnvoi(db, cleRelease(planning, annee, tri), { at: Date.now(), planning, year: annee, tri, uid });
}

export const cleRelease = (planning: string, annee: number, tri: string) => `release_${planning}_${annee}_${tri}`;

/** Faut-il notifier la publication d'un trimestre ? Oui s'il n'était pas déjà publié ET si la réservation de
 *  première publication réussit (une seule fois par planning, année et trimestre, même après un masquage). */
export async function doitNotifierPublication(
  db: FirebaseFirestore.Firestore,
  planning: string,
  annee: number,
  tri: string,
  uid: string,
  { publier, dejaPublie }: { publier: boolean; dejaPublie: boolean },
): Promise<boolean> {
  return publier && !dejaPublie && (await reserverPublication(db, planning, annee, tri, uid));
}
