// Tâches par équipe, côté serveur (lot 7 ; lot 1 du chantier « équipes et groupes », EQ11, EQ12) :
// vérifier l'appelant, trouver qui prévenir ou rappeler, envoyer une fois par destinataire. Serveur
// uniquement (Admin).

import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { equipesDe, estDeLEquipe, estReferentDe, peutCocher } from "@/lib/access";
import type { Tache } from "@/types/tache";

export const ID = /^[\w-]+$/;

/** Un id d'équipe (EQ2) : pas borné à la table, comme `equipeDuPour` (les comités du lot 2 s'y
 *  brancheront). */
export function estEquipe(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9-]+$/.test(v);
}

/** L'équipe d'une tâche d'après son chemin (EQ12) : `equipes/{e}/taches/{id}` → e. Une tâche restée à
 *  l'ancien chemin (migration pas lancée) n'en a pas : le cron ne la rappelle pas, ni deux fois. */
export function equipeDuChemin(chemin: string): string | null {
  return /^equipes\/([^/]+)\/taches\/[^/]+$/.exec(chemin)?.[1] ?? null;
}

/** Appelant authentifié (jeton vérifié), sinon la réponse d'erreur. */
export async function appelant(req: NextRequest): Promise<{ uid: string; email: string } | NextResponse> {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  try {
    const decoded = await verifyIdToken(token);
    return { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
}

/** Ce que revérifient /api/taches/assigne et /fait (EQ11), dans la base passée (testable) : l'appelant
 *  est de l'équipe, d'après son profil lu par le serveur (403 « Pas dans cette équipe ») ; la tâche
 *  existe (404) ; « assigne » : il en est référent, seul qui crée ou modifie nomme un responsable ;
 *  « fait » : il peut la cocher (`peutCocher`, décision 41). Rend la tâche, ou le refus. */
export async function tacheDeLAppelant(
  db: FirebaseFirestore.Firestore,
  qui: { uid: string; email: string },
  equipe: string,
  tacheId: string,
  geste: "assigne" | "fait",
): Promise<Tache | { status: number; error: string }> {
  const snap = await db.collection("users").doc(qui.uid).get();
  const profile = snap.exists ? (snap.data() as Parameters<typeof estDeLEquipe>[1]) : null;
  if (!estDeLEquipe(qui, profile, equipe)) return { status: 403, error: "Pas dans cette équipe" };
  const doc = await db.collection("equipes").doc(equipe).collection("taches").doc(tacheId).get();
  if (!doc.exists) return { status: 404, error: "Tâche introuvable" };
  const tache = { ...(doc.data() as Omit<Tache, "id" | "equipe">), id: tacheId, equipe };
  if (geste === "assigne" && !estReferentDe(qui, profile, equipe)) return { status: 403, error: "Réservé aux référents de l'équipe" };
  if (geste === "fait" && !peutCocher(qui, profile, { ...tache, responsableUid: tache.responsableUid ?? null })) {
    return { status: 403, error: "Tu ne peux pas cocher cette tâche" };
  }
  return tache;
}

/** uid des membres d'une équipe (lot 1 du chantier « équipes et groupes », EQ11) : les profils
 *  dont `equipesDe` la contient — `dansEquipes`, et pour « louange » toute personne qui a un rôle
 *  de service (décision 5). Un admin qui n'y figure pas n'est pas destinataire (EQ3). La base se
 *  passe pour les tests (évènement d'équipe, `destinatairesEvenement`). */
export async function membresDeLEquipe(equipe: string, db: FirebaseFirestore.Firestore = adminDb()): Promise<string[]> {
  const snap = await db.collection("users").get();
  return snap.docs.filter((d) => equipesDe(d.data()).includes(equipe)).map((d) => d.id);
}

/** uid des référents d'une équipe (EQ12) : les profils dont `referentDe` la contient. Pour
 *  « louange », les référents de TEAM LOUANGE. La base se passe pour les tests. */
export async function referentsDeLEquipe(equipe: string, db: FirebaseFirestore.Firestore = adminDb()): Promise<string[]> {
  const snap = await db.collection("users").get();
  return snap.docs.filter((d) => ((d.data().referentDe as string[] | undefined) ?? []).includes(equipe)).map((d) => d.id);
}

/** Qui rappeler d'une tâche (cron, EQ12) : son responsable ; sans responsable, les référents de son
 *  équipe, et non plus tous ses membres (décision 41 : le rappel va à qui peut la cocher). Une équipe
 *  sans référent : personne. */
export async function ciblesDuRappel(
  tache: Pick<Tache, "equipe" | "responsableUid">,
  db: FirebaseFirestore.Firestore = adminDb(),
): Promise<string[]> {
  return tache.responsableUid ? [tache.responsableUid] : referentsDeLEquipe(tache.equipe, db);
}

/** Garde les uid pas encore prévenus pour cette clé, et les marque. */
export async function premiereFois(uids: string[], key: string, meta: Record<string, unknown>): Promise<string[]> {
  const db = adminDb();
  const fresh: string[] = [];
  for (const u of uids) {
    if (!(await db.collection("notifLog").doc(`${key}-${u}`).get()).exists) fresh.push(u);
  }
  if (fresh.length) {
    const batch = db.batch();
    for (const u of fresh) batch.set(db.collection("notifLog").doc(`${key}-${u}`), { ...meta, uid: u, at: Date.now() });
    await batch.commit();
  }
  return fresh;
}
