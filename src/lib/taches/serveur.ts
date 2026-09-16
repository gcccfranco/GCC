// Tâches par pôle, côté serveur (lot 7) : vérifier l'appelant, trouver qui
// prévenir, envoyer une fois par destinataire. Serveur uniquement (Admin).

import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { isPoleMember, polesDe } from "@/lib/access";
import { TACHE_POLES, type Tache, type TachePole } from "@/types/tache";

export const ID = /^[\w-]+$/;

export function estPole(v: unknown): v is TachePole {
  return typeof v === "string" && (TACHE_POLES as readonly string[]).includes(v);
}

/** Appelant authentifié et membre du pôle (ou admin), sinon la réponse d'erreur. */
export async function appelantDuPole(
  req: NextRequest,
  pole: TachePole,
): Promise<{ uid: string } | NextResponse> {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let decoded: { uid: string; email?: string };
  try {
    decoded = await verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
  const snap = await adminDb().collection("users").doc(decoded.uid).get();
  const profile = snap.exists ? (snap.data() as { poles?: string[]; serviceRoles?: Record<string, unknown> }) : null;
  if (!isPoleMember({ email: (decoded.email ?? "").toLowerCase() }, profile, pole)) {
    return NextResponse.json({ error: "Pas dans ce pôle" }, { status: 403 });
  }
  return { uid: decoded.uid };
}

export async function lireTache(pole: TachePole, id: string): Promise<Tache | null> {
  const snap = await adminDb().collection("poles").doc(pole).collection("taches").doc(id).get();
  return snap.exists ? ({ ...(snap.data() as Omit<Tache, "id">), id, pole }) : null;
}

/** uid des membres d'un pôle (Louange = un rôle de service). */
export async function membresDuPole(pole: TachePole): Promise<string[]> {
  const snap = await adminDb().collection("users").get();
  return snap.docs.filter((d) => (polesDe(d.data()) as string[]).includes(pole)).map((d) => d.id);
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
