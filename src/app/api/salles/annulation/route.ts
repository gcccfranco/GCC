import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/push/admin";
import { authentifier } from "@/lib/api/authentifier";
import { sendPushToUids } from "@/lib/push/send";
import { recordNotification } from "@/lib/push/notifications";
import { loadNotifLangs } from "@/lib/push/recipients";
import { isCoordination } from "@/lib/access";
import { annulationKey, annulationMessage, destinatairesAnnulation } from "@/lib/salles/annulation";
import type { Reservation } from "@/lib/firebase/reservations";
import { apresEnvoi, reserverPuisEnvoyer } from "@/lib/push/reserver";
import { BACK_OFFICE } from "@/lib/backOffice"

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La coordination annule la réservation d'un autre avec un motif (AS16, docs/spec-reserver-unique-fetes.md, RS11) :
// le serveur vérifie `isCoordination` sur le profil relu, supprime la réservation (Admin SDK) puis prévient l'auteur et
// les personnes cochées (push + cloche), une seule fois par réservation (notifLog).

const ID = /^[\w-]+$/;

export async function POST(req: NextRequest) {
  // Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : la route n'existe pas en ligne.
  if (!BACK_OFFICE) return new Response(null, { status: 404 })
  const appelant = await authentifier(req);
  if (appelant instanceof NextResponse) return appelant;

  const { reservationId, motif: brut } = (await req.json().catch(() => ({}))) as { reservationId?: unknown; motif?: unknown };
  const motif = typeof brut === "string" ? brut.trim() : "";
  if (typeof reservationId !== "string" || !ID.test(reservationId) || motif.length < 1 || motif.length > 200) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }

  const db = adminDb();
  const profil = (await db.collection("users").doc(appelant.uid).get()).data() ?? null;
  if (!isCoordination({ email: appelant.email }, profil)) return NextResponse.json({ error: "Réservé à la coordination" }, { status: 403 });

  const ref = db.collection("reservations").doc(reservationId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  const r = { id: snap.id, ...snap.data() } as Reservation;
  if (r.auteurUid === appelant.uid) return NextResponse.json({ error: "Sa propre réservation se supprime sans motif" }, { status: 400 });
  await ref.delete();

  // La réservation est retirée : la notification part en meilleur effort (un échec ne doit pas faire croire au client
  // que l'annulation a raté ; un réessai tomberait sur 404 sans rien envoyer).
  const key = annulationKey(reservationId);
  const fresh = await reserverPuisEnvoyer(db, destinatairesAnnulation(r, appelant.uid), key, { reservationId }, async (reserves, envoyes) => {
    const langs = await loadNotifLangs(reserves);
    const resultats = await Promise.allSettled(
      reserves.map(async (u) => {
        const payload = { ...annulationMessage(r, motif, langs.get(u) ?? "fr"), url: "/evenements/salles", tag: key };
        await sendPushToUids([u], payload);
        envoyes.add(u);
        await apresEnvoi(() => recordNotification({ ...payload, kind: "salles", recipients: [u] }), "salles/annulation");
      }),
    );
    const echec = resultats.find((x): x is PromiseRejectedResult => x.status === "rejected");
    if (echec) throw echec.reason;
  }).catch((e) => {
    console.error("salles/annulation : notification non envoyée", e);
    return [] as string[];
  });
  return NextResponse.json({ ok: true, notified: fresh.length });
}
