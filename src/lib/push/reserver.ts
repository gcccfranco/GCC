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
 *  une réservation plus vieille que ce délai (champ `at`) est reprise, dans une transaction.
 *  Le document porte un jeton (`jetonCreation`) : si le SDK rejoue un commit déjà passé, `create()` répond
 *  ALREADY_EXISTS pour notre propre document ; la relecture reconnaît le jeton et la réservation est à nous. */
export async function reserverEnvoi(
  db: FirebaseFirestore.Firestore,
  cle: string,
  donnees: Record<string, unknown>,
  options: { delaiMs?: number } = {},
): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(cle);
  const jetonCreation = randomUUID();
  const document = { ...donnees, jetonCreation };
  try {
    await ref.create(document);
    return true;
  } catch (e) {
    if (!dejaLa(e)) throw e;
  }
  if ((await ref.get()).data()?.jetonCreation === jetonCreation) return true;
  const { delaiMs } = options;
  if (!delaiMs) return false;
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const at = snap.exists ? ((snap.data()?.at as number | undefined) ?? 0) : 0;
    if (snap.exists && Date.now() - at < delaiMs) return false;
    tx.set(ref, document);
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

/** Réserve `${prefixe}-${uid}` pour chaque uid ; rend ceux dont la réservation a réussi. Si l'une des
 *  réservations lève, celles déjà créées sont rendues, puis l'erreur est relancée. */
export async function reserverPourUids(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefixe: string,
  meta: Record<string, unknown>,
): Promise<string[]> {
  const resultats = await Promise.allSettled(
    uids.map(async (u) => ((await reserverEnvoi(db, `${prefixe}-${u}`, { ...meta, uid: u, at: Date.now() })) ? u : null)),
  );
  const prises = resultats.flatMap((r) => (r.status === "fulfilled" && r.value !== null ? [r.value] : []));
  const echec = resultats.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (echec) {
    await rendrePourUids(db, prises, prefixe);
    throw echec.reason;
  }
  return prises;
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

/** Faut-il notifier la publication d'un trimestre ? Oui si on publie ET si la réservation de première
 *  publication réussit : une seule fois par planning, année et trimestre. Un envoi raté rend la clé, donc le
 *  réessai notifie ; un masquage suivi d'une republication ne renotifie pas, la clé étant là. */
export async function doitNotifierPublication(
  db: FirebaseFirestore.Firestore,
  planning: string,
  annee: number,
  tri: string,
  uid: string,
  { publier }: { publier: boolean },
): Promise<boolean> {
  return publier && (await reserverPublication(db, planning, annee, tri, uid));
}

/** Réponse d'un appel qui trouve le verrou d'envoi d'une setlist tenu par un autre : en automatique, rien à
 *  faire (`skipped: "busy"`) ; en manuel, 409 pour réessayer dans un instant. */
export function reponseEnvoiEnCours(auto: boolean): { status: number; corps: Record<string, unknown> } {
  return auto
    ? { status: 200, corps: { ok: true, skipped: "busy" } }
    : { status: 409, corps: { error: "Envoi en cours, réessaie dans un instant", code: "busy" } };
}

/** Une écriture de suivi faite APRÈS l'envoi (cloche, journal) : si elle échoue, on le journalise, la route répond
 *  200 et la clé n'est pas rendue (des notifications sont parties). */
export async function apresEnvoi(travail: () => Promise<unknown>, contexte: string): Promise<void> {
  try {
    await travail();
  } catch (e) {
    console.error(`[${contexte}] écriture après l'envoi échouée`, e);
  }
}

/** Réserve la clé de `cle`, exécute `envoi`, rend la clé si `envoi` lève (rien n'est parti). `apres` (cloche,
 *  journal) s'exécute une fois l'envoi fait : son échec se journalise et ne rend pas la clé.
 *  Rend `{ pris: false }` si la clé était déjà réservée. */
export async function envoyerReserve<T>(
  db: FirebaseFirestore.Firestore,
  cle: string,
  donnees: Record<string, unknown>,
  options: { delaiMs?: number },
  envoi: () => Promise<T>,
  apres?: (valeur: T) => Promise<unknown>,
): Promise<{ pris: false } | { pris: true; valeur: T }> {
  if (!(await reserverEnvoi(db, cle, donnees, options))) return { pris: false };
  let valeur: T;
  try {
    valeur = await envoi();
  } catch (e) {
    await rendreEnvoi(db, cle).catch(() => undefined);
    throw e;
  }
  if (apres) await apresEnvoi(() => apres(valeur), `envoi ${cle}`);
  return { pris: true, valeur };
}

/** Réserve `${prefixe}-${uid}` pour ces uid (dans le try : une erreur de réservation rend celles prises), puis
 *  exécute `travail(fresh, envoyes)`. `travail` ajoute à `envoyes` chaque uid dont la notification est partie ;
 *  si elle lève, seules les réservations des uid pas encore envoyés sont rendues. Rend les uid réservés. */
export async function reserverPuisEnvoyer(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefixe: string,
  meta: Record<string, unknown>,
  travail: (fresh: string[], envoyes: Set<string>) => Promise<void>,
): Promise<string[]> {
  let fresh: string[] = [];
  const envoyes = new Set<string>();
  try {
    fresh = await reserverPourUids(db, uids, prefixe, meta);
    if (fresh.length) await travail(fresh, envoyes);
  } catch (e) {
    await rendrePourUids(db, fresh.filter((u) => !envoyes.has(u)), prefixe);
    throw e;
  }
  return fresh;
}

/** Suivi des réservations d'un passage du cron : chaque clé prise est notée ; celles dont la notification n'est pas
 *  partie se rendent d'un coup si le passage échoue. */
export function suivreReservations(db: FirebaseFirestore.Firestore) {
  const prises = new Map<string, Set<string>>();
  const envoyees = new Map<string, Set<string>>();
  const dans = (m: Map<string, Set<string>>, prefixe: string) => m.get(prefixe) ?? m.set(prefixe, new Set()).get(prefixe)!;
  return {
    /** Réserve (clé `${prefixe}-${uid}`) et rend les uid réservés. */
    async reserver(uids: string[], prefixe: string, meta: Record<string, unknown>): Promise<string[]> {
      const fresh = await reserverPourUids(db, uids, prefixe, meta);
      for (const u of fresh) dans(prises, prefixe).add(u);
      return fresh;
    },
    /** La notification de ce compte est partie pour ces préfixes. */
    envoye(uid: string, prefixes: string[]) {
      for (const p of prefixes) dans(envoyees, p).add(uid);
    },
    /** Rend toute réservation dont la notification n'est pas partie. */
    async rendreRestantes(): Promise<void> {
      await Promise.all([...prises].map(([prefixe, uids]) =>
        rendrePourUids(db, [...uids].filter((u) => !envoyees.get(prefixe)?.has(u)), prefixe)));
    },
  };
}
