import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { filterUidsByNotifPref, loadNotifLangs, uidsForCategory } from "@/lib/push/recipients";
import { nouvelEvenementMessage } from "@/lib/evenements/rappel";
import { canCreateEvenement, canEditEvenement, poleDuPour } from "@/lib/access";
import { membresDuPole } from "@/lib/taches/serveur";
import type { Evenement } from "@/types/evenement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nouvel évènement (lot 6, docs/spec-evenements.md) : à la création, si
// l'organisateur a coché « prévenir », push + cloche aux membres concernés —
// toute l'église, ou les membres de la section visée — qui n'ont pas
// désactivé « Évènements ». Une seule fois par évènement (notifLog).

export async function POST(req: NextRequest) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let user: { uid: string; email: string };
  try {
    const decoded = await verifyIdToken(token);
    user = { uid: decoded.uid, email: (decoded.email ?? "").toLowerCase() };
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const { evenementId } = (await req.json().catch(() => ({}))) as { evenementId?: string };
  if (typeof evenementId !== "string" || !/^[\w-]+$/.test(evenementId)) {
    return NextResponse.json({ error: "evenementId manquant" }, { status: 400 });
  }

  const db = adminDb();
  const snap = await db.collection("evenements").doc(evenementId).get();
  if (!snap.exists) return NextResponse.json({ error: "Évènement introuvable" }, { status: 404 });
  const e = { id: snap.id, ...snap.data() } as Evenement;
  const profile = ((await db.collection("users").doc(user.uid).get()).data() ?? null) as { annonces?: string[]; poles?: string[] } | null;
  if (!canEditEvenement(user, profile, e) && !canCreateEvenement(user, profile, e.pour)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const logRef = db.collection("notifLog").doc(`evenement-${evenementId}`);
  if ((await logRef.get()).exists) return NextResponse.json({ ok: true, sent: 0, already: true });

  // Réunion de pôle (lot 7) : les membres du pôle.
  const pole = poleDuPour(e.pour);
  const all = e.pour === "eglise"
    ? (await db.collection("users").get()).docs.map((d) => d.id)
    : pole
      ? await membresDuPole(pole)
      : await uidsForCategory(e.pour);
  const uids = (await filterUidsByNotifPref(all, "evenements")).filter((u) => u !== user.uid);
  // Une fournée par langue (lot 8) : chacun reçoit le message dans la sienne.
  const langs = await loadNotifLangs(uids);
  let result: Awaited<ReturnType<typeof sendPushToUids>> | undefined;
  for (const lang of ["fr", "zh-CN"] as const) {
    const groupe = uids.filter((u) => (langs.get(u) ?? "fr") === lang);
    if (!groupe.length) continue;
    const payload = { ...nouvelEvenementMessage(e, lang), url: `/evenements/${evenementId}`, tag: `evenement-${evenementId}` };
    result = await sendPushToUids(groupe, payload);
    await recordNotification({ ...payload, kind: "evenement", recipients: groupe });
  }
  await logRef.set({ at: Date.now(), evenementId, pour: e.pour, recipients: uids.length });
  return NextResponse.json({ ok: true, ...result, sent: uids.length });
}
