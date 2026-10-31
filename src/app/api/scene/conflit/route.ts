import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { authentifier } from "@/lib/api/authentifier";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadNotifLangs } from "@/lib/push/recipients";
import { conflictKey, conflictMessage } from "@/lib/scene/conflit";
import { overlaps } from "@/lib/scene/dimanches";
import type { Creneau } from "@/types/programme";
import { apresEnvoi, reserverPuisEnvoyer } from "@/lib/push/reserver";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chevauchement de deux créneaux sur scène passé malgré le refus côté client
// (lot 3 bis, docs/spec-programme-scene.md) : le serveur relit les deux
// créneaux, vérifie qu'ils se chevauchent vraiment, puis prévient leurs auteurs
// (push + cloche), une seule fois par paire (notifLog).

const ID = /^[\w-]+$/;

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  const appelant = await authentifier(req);
  if (appelant instanceof NextResponse) return appelant;

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
  // Chaque uid est réservé AVANT l'envoi (create), dans le try ; rendu si son envoi échoue. Une cloche ratée après
  // l'envoi se journalise : la notification est partie, la clé reste.
  const fresh = await reserverPuisEnvoyer(db, uids, key, { programmeId }, async (reserves, envoyes) => {
    const langs = await loadNotifLangs(reserves);
    const resultats = await Promise.allSettled(
      reserves.map(async (u) => {
        const payload = { ...conflictMessage(a, b, langs.get(u) ?? "fr"), url: "/evenements", tag: key };
        await sendPushToUids([u], payload);
        envoyes.add(u);
        await apresEnvoi(() => recordNotification({ ...payload, kind: "scene", recipients: [u] }), "scene/conflit");
      }),
    );
    const echec = resultats.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (echec) throw echec.reason;
  });
  return NextResponse.json({ ok: true, notified: fresh.length });
}
