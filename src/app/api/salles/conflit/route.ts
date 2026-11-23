import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { authentifier } from "@/lib/api/authentifier";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadNotifLangs } from "@/lib/push/recipients";
import { conflictKey, conflictMessage, reservationsSeChevauchent } from "@/lib/salles/conflit";
import type { Reservation } from "@/lib/firebase/reservations";
import { apresEnvoi, reserverPuisEnvoyer } from "@/lib/push/reserver";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chevauchement de deux réservations de salle passé malgré le refus côté client (SA9, docs/spec-salles.md, lot 3 ;
// la Scène des fêtes aussi depuis le lot 5, T5c, qui a retiré /api/scene/conflit) : le serveur relit les deux réservations, vérifie qu'elles se chevauchent vraiment (même
// jour, même salle ou lieux liés), puis prévient leurs auteurs (push + cloche), une seule fois par paire (notifLog).

const ID = /^[\w-]+$/;

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  const appelant = await authentifier(req);
  if (appelant instanceof NextResponse) return appelant;

  const { reservationIds } = (await req.json().catch(() => ({}))) as { reservationIds?: string[] };
  if (
    !Array.isArray(reservationIds) || reservationIds.length !== 2 || reservationIds[0] === reservationIds[1] ||
    !reservationIds.every((id) => typeof id === "string" && ID.test(id))
  ) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }

  const db = adminDb();
  const col = db.collection("reservations");
  const snaps = await Promise.all(reservationIds.map((id) => col.doc(id).get()));
  if (snaps.some((s) => !s.exists)) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  const [a, b] = snaps.map((s) => ({ id: s.id, ...s.data() }) as Reservation);
  if (!reservationsSeChevauchent(a, b)) return NextResponse.json({ error: "Pas de chevauchement" }, { status: 400 });

  const key = conflictKey(reservationIds);
  const uids = [...new Set([a.auteurUid, b.auteurUid].filter(Boolean))];
  // Chaque uid est réservé AVANT l'envoi (create) ; rendu si son envoi échoue (comme la Scène).
  const fresh = await reserverPuisEnvoyer(db, uids, key, { reservationIds }, async (reserves, envoyes) => {
    const langs = await loadNotifLangs(reserves);
    const resultats = await Promise.allSettled(
      reserves.map(async (u) => {
        const payload = { ...conflictMessage(a, b, langs.get(u) ?? "fr"), url: "/evenements/salles", tag: key };
        await sendPushToUids([u], payload);
        envoyes.add(u);
        await apresEnvoi(() => recordNotification({ ...payload, kind: "salles", recipients: [u] }), "salles/conflit");
      }),
    );
    const echec = resultats.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (echec) throw echec.reason;
  });
  return NextResponse.json({ ok: true, notified: fresh.length });
}
