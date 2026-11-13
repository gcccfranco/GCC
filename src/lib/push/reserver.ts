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

/** Délai après lequel une réservation du cron sans `envoyeLe` est reprise. */
export const REPRISE_CRON_MS = 5 * 60_000;

/** Relit le document après un ALREADY_EXISTS : un réessai, puis l'erreur. */
async function relire(ref: FirebaseFirestore.DocumentReference): Promise<FirebaseFirestore.DocumentSnapshot> {
  try {
    return await ref.get();
  } catch {
    return ref.get();
  }
}

/** Réserve la clé. Rend le jeton de la réservation, ou `null` si elle l'est déjà (l'envoi a eu lieu, ou est en
 *  cours). Avec `delaiMs`, une réservation plus vieille que ce délai (champ `at`) et sans `envoyeLe` est reprise,
 *  dans une transaction. Le document porte le jeton (`jetonCreation`) : si le SDK rejoue un commit déjà passé,
 *  `create()` répond ALREADY_EXISTS pour notre propre document ; la relecture (réessayée une fois) reconnaît le
 *  jeton et la réservation est à nous. Le jeton sert aussi à ne rendre que sa propre réservation. */
export async function reserverEnvoiJeton(
  db: FirebaseFirestore.Firestore,
  cle: string,
  donnees: Record<string, unknown>,
  options: { delaiMs?: number } = {},
): Promise<string | null> {
  const ref = db.collection(COLLECTION).doc(cle);
  const jetonCreation = randomUUID();
  const document = { ...donnees, jetonCreation };
  try {
    await ref.create(document);
    return jetonCreation;
  } catch (e) {
    if (!dejaLa(e)) throw e;
  }
  try {
    if ((await relire(ref)).data()?.jetonCreation === jetonCreation) return jetonCreation;
  } catch (e) {
    // Relecture impossible : la réservation a peut-être été créée par nous ; on la rend si elle porte notre jeton.
    await rendreEnvoi(db, cle, jetonCreation).catch(() => undefined);
    throw e;
  }
  const { delaiMs } = options;
  if (!delaiMs) return null;
  const reprise = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const at = snap.exists ? ((snap.data()?.at as number | undefined) ?? 0) : 0;
    if (snap.exists && (snap.data()?.envoyeLe || Date.now() - at < delaiMs)) return false;
    tx.set(ref, document);
    return true;
  });
  return reprise ? jetonCreation : null;
}

/** Comme `reserverEnvoiJeton`, rend seulement si la clé est à nous. */
export async function reserverEnvoi(
  db: FirebaseFirestore.Firestore,
  cle: string,
  donnees: Record<string, unknown>,
  options: { delaiMs?: number } = {},
): Promise<boolean> {
  return (await reserverEnvoiJeton(db, cle, donnees, options)) !== null;
}

/** Rend la réservation (l'envoi a échoué), dans une transaction, seulement si elle porte encore ce jeton (sinon
 *  elle a été reprise : rien à faire). Le prochain appel pourra envoyer. */
export async function rendreEnvoi(db: FirebaseFirestore.Firestore, cle: string, jeton: string): Promise<void> {
  const ref = db.collection(COLLECTION).doc(cle);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.jetonCreation === jeton) tx.delete(ref);
  });
}

/** Note que l'envoi est parti (`envoyeLe`), si la réservation porte encore ce jeton : elle n'est plus reprise. */
export async function marquerEnvoye(db: FirebaseFirestore.Firestore, cle: string, jeton: string): Promise<void> {
  const ref = db.collection(COLLECTION).doc(cle);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data()?.jetonCreation === jeton) tx.set(ref, { ...snap.data(), envoyeLe: Date.now() });
  });
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

/** Réserve `${prefixe}-${uid}` pour chaque uid ; rend, pour ceux dont la réservation a réussi, leur jeton. Si l'une
 *  des réservations lève, celles déjà créées sont rendues, puis l'erreur est relancée. */
export async function reserverPourUidsJetons(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefixe: string,
  meta: Record<string, unknown>,
  options: { delaiMs?: number } = {},
): Promise<Map<string, string>> {
  const resultats = await Promise.allSettled(
    uids.map(async (u) => [u, await reserverEnvoiJeton(db, `${prefixe}-${u}`, { ...meta, uid: u, at: Date.now() }, options)] as const),
  );
  const prises = new Map<string, string>();
  for (const r of resultats) if (r.status === "fulfilled" && r.value[1] !== null) prises.set(r.value[0], r.value[1]);
  const echec = resultats.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (echec) {
    await rendrePourUids(db, prises, prefixe);
    throw echec.reason;
  }
  return prises;
}

/** Les uid réservés (voir `reserverPourUidsJetons`). */
export async function reserverPourUids(
  db: FirebaseFirestore.Firestore,
  uids: string[],
  prefixe: string,
  meta: Record<string, unknown>,
  options: { delaiMs?: number } = {},
): Promise<string[]> {
  return [...(await reserverPourUidsJetons(db, uids, prefixe, meta, options)).keys()];
}

/** Rend les réservations de `reserverPourUidsJetons` (uid → jeton) : chacune seulement si elle est encore à nous. */
export async function rendrePourUids(db: FirebaseFirestore.Firestore, jetons: Map<string, string>, prefixe: string): Promise<void> {
  await Promise.all([...jetons].map(([u, jeton]) => rendreEnvoi(db, `${prefixe}-${u}`, jeton).catch(() => undefined)));
}

const cleRelease = (planning: string, annee: number, tri: string) => `release_${planning}_${annee}_${tri}`;

/** Publication d'un trimestre de planning : que faire de la notification ? Masquer : rien. Publier : la
 *  première publication d'un (planning, année, trimestre) réserve la clé `release_…` et envoie ; le masquage
 *  suivi d'une republication ne renotifie pas (`dejaAnnonce`). `envoi` reçoit `parti` (voir `envoyerReserve`) :
 *  un envoi qui lève avant tout envoi rend la clé (le réessai notifie) ; levé après un premier envoi, la clé reste
 *  et la publication est tout de même notifiée (`notified: true`, `partiel: true`). */
export async function notifierPublication(
  db: FirebaseFirestore.Firestore,
  { planning, annee, tri, uid, publier }: { planning: string; annee: number; tri: string; uid: string; publier: boolean },
  envoi: (parti: () => void) => Promise<void>,
): Promise<{ notified: boolean; dejaAnnonce: boolean; partiel: boolean }> {
  if (!publier) return { notified: false, dejaAnnonce: false, partiel: false };
  const r = await envoyerReserve(db, cleRelease(planning, annee, tri), { at: Date.now(), planning, year: annee, tri, uid }, {}, envoi);
  if (!r.pris) return { notified: false, dejaAnnonce: true, partiel: false };
  return { notified: true, dejaAnnonce: false, partiel: r.partiel === true };
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

/** Réserve la clé de `cle`, exécute `envoi`, rend la clé si `envoi` lève AVANT qu'une notification soit partie.
 *  `envoi` reçoit `parti` : à appeler dès le premier envoi réussi. Si `envoi` lève après cela, la clé reste (des
 *  notifications sont parties), l'erreur est journalisée et le résultat porte `partiel: true`. `apres` (cloche,
 *  journal) s'exécute une fois l'envoi fait : son échec se journalise et ne rend pas la clé.
 *  Rend `{ pris: false }` si la clé était déjà réservée. */
export async function envoyerReserve<T>(
  db: FirebaseFirestore.Firestore,
  cle: string,
  donnees: Record<string, unknown>,
  options: { delaiMs?: number },
  envoi: (parti: () => void) => Promise<T>,
  apres?: (valeur: T) => Promise<unknown>,
): Promise<{ pris: false } | { pris: true; valeur: T; partiel?: undefined } | { pris: true; valeur?: undefined; partiel: true }> {
  const jeton = await reserverEnvoiJeton(db, cle, donnees, options);
  if (jeton === null) return { pris: false };
  let valeur: T;
  let envoye = false;
  try {
    valeur = await envoi(() => { envoye = true; });
  } catch (e) {
    if (!envoye) {
      await rendreEnvoi(db, cle, jeton).catch(() => undefined);
      throw e;
    }
    console.error(`[envoi ${cle}] envoi interrompu après un premier envoi réussi`, e);
    return { pris: true, partiel: true };
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
  let jetons = new Map<string, string>();
  const envoyes = new Set<string>();
  try {
    jetons = await reserverPourUidsJetons(db, uids, prefixe, meta);
    const fresh = [...jetons.keys()];
    if (fresh.length) await travail(fresh, envoyes);
  } catch (e) {
    await rendrePourUids(db, new Map([...jetons].filter(([u]) => !envoyes.has(u))), prefixe);
    throw e;
  }
  return [...jetons.keys()];
}

/** Suivi des réservations d'un passage du cron : chaque clé prise est notée ; celles dont la notification n'est pas
 *  partie se rendent d'un coup si le passage échoue. Une réservation porte `at` ; une fois la notification partie,
 *  `envoyeLe` : sans lui, un passage interrompu laisse une clé reprise par le suivant après `REPRISE_CRON_MS`. */
export function suivreReservations(db: FirebaseFirestore.Firestore) {
  const prises = new Map<string, Map<string, string>>();
  const envoyees = new Map<string, Set<string>>();
  const marques: Promise<unknown>[] = [];
  const dans = <V>(m: Map<string, V>, prefixe: string, vide: () => V) => m.get(prefixe) ?? m.set(prefixe, vide()).get(prefixe)!;
  return {
    /** Réserve (clé `${prefixe}-${uid}`) et rend les uid réservés. */
    async reserver(uids: string[], prefixe: string, meta: Record<string, unknown>): Promise<string[]> {
      const jetons = await reserverPourUidsJetons(db, uids, prefixe, meta, { delaiMs: REPRISE_CRON_MS });
      for (const [u, j] of jetons) dans(prises, prefixe, () => new Map()).set(u, j);
      return [...jetons.keys()];
    },
    /** La notification de ce compte est partie pour ces préfixes : `envoyeLe` s'écrit sur chaque réservation. */
    envoye(uid: string, prefixes: string[]) {
      for (const p of prefixes) {
        dans(envoyees, p, () => new Set()).add(uid);
        const jeton = prises.get(p)?.get(uid);
        if (jeton) {
          marques.push(marquerEnvoye(db, `${p}-${uid}`, jeton).catch((e) => console.error(`[cron] envoyeLe non écrit pour ${p}-${uid}`, e)));
        }
      }
    },
    /** Attend les écritures d'`envoyeLe`. */
    async terminer(): Promise<void> {
      await Promise.allSettled(marques);
    },
    /** Rend toute réservation dont la notification n'est pas partie. */
    async rendreRestantes(): Promise<void> {
      await Promise.allSettled(marques);
      await Promise.all([...prises].map(([prefixe, jetons]) =>
        rendrePourUids(db, new Map([...jetons].filter(([u]) => !envoyees.get(prefixe)?.has(u))), prefixe)));
    },
  };
}
