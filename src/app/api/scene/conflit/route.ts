import { NextResponse, type NextRequest } from "next/server";
import { adminDb, verifyIdToken } from "@/lib/push/admin";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadNotifLangs } from "@/lib/push/recipients";
import { conflictKey, conflictMessage } from "@/lib/scene/conflit";
import { overlaps } from "@/lib/scene/dimanches";
import type { Creneau } from "@/types/programme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chevauchement de deux créneaux sur scène passé malgré le refus côté client
// (lot 3 bis, docs/spec-programme-scene.md) : le serveur relit les deux
// créneaux, vérifie qu'ils se chevauchent vraiment, puis prévient leurs auteurs
// (push + cloche), une seule fois par paire (notifLog).

const ID = /^[\w-]+$/;

export async function POST(req: NextRequest) {
  const authz = req.headers.get("authorization") ?? "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  try {
    await verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const { programmeId, creneauIds } = (await req.json().catch(() => ({}))) as { programmeId?: string; creneauIds?: string[] };
  if (
    typeof programmeId !== "string" || !ID.test(programmeId) ||
    !Array.isArray(creneauIds) || creneauIds.length !== 2 || creneauIds[0] === creneauIds[1] ||
    !creneauIds.every((id) => typeof id === "string" && ID.test(id))
  ) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }

  const db = adminDb();
  const col = db.collection("programmes").doc(programmeId).collection("creneaux");
  const snaps = await Promise.all(creneauIds.map((id) => col.doc(id).get()));
  if (snaps.some((s) => !s.exists)) return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
  const [a, b] = snaps.map((s) => ({ id: s.id, ...s.data() }) as Creneau);
  if (!overlaps(a, b)) return NextResponse.json({ error: "Pas de chevauchement" }, { status: 400 });

  const key = conflictKey(programmeId, creneauIds);
  const uids = [...new Set([a.auteurUid, b.auteurUid].filter(Boolean))];
  const fresh: string[] = [];
  for (const u of uids) {
    if (!(await db.collection("notifLog").doc(`${key}-${u}`).get()).exists) fresh.push(u);
  }
  if (!fresh.length) return NextResponse.json({ ok: true, notified: 0 });

  const langs = await loadNotifLangs(fresh);
  await Promise.all(
    fresh.map(async (u) => {
      const payload = { ...conflictMessage(a, b, langs.get(u) ?? "fr"), url: "/evenements", tag: key };
      await sendPushToUids([u], payload);
      await recordNotification({ ...payload, kind: "scene", recipients: [u] });
    }),
  );
  const batch = db.batch();
  for (const u of fresh) batch.set(db.collection("notifLog").doc(`${key}-${u}`), { programmeId, uid: u, at: Date.now() });
  await batch.commit();
  return NextResponse.json({ ok: true, notified: fresh.length });
}
